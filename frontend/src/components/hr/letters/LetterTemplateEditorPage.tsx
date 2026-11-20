import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Eye, FileUp, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useCompanies, useLetterFields, useLetterPdf, useLetterTemplate, useLetterhead, useImportDocx, useSaveLetterTemplate } from '@/hooks/queries';
import type { LetterKind, LetterTemplate, LetterTemplateInput } from '@/types/letters';
import { AskFieldsPanel } from './AskFieldsPanel';
import { LetterEditor, type LetterEditorHandle } from './editor/LetterEditor';
import { FieldListPanel } from './FieldListPanel';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { usePdfPreview } from './usePdfPreview';
import { collectFieldKeys, errorMessage, fieldOptionsFor, removeFields } from './shared';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };
const DEFAULT_EMAIL = {
  subject: 'Your letter from {{company.name}}',
  body: 'Dear {{recipient.name}},\n\nPlease find your letter attached.\n\nRegards,\n{{signatory.name}}\n{{signatory.designation}}',
};

const draftKey = (id?: string) => `letter-template-draft:${id ?? 'new'}`;

const readDraft = (id?: string): LetterTemplateInput | null => {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as LetterTemplateInput) : null;
  } catch {
    return null;
  }
};

const fromTemplate = (template?: LetterTemplate): LetterTemplateInput => ({
  name: template?.name ?? '',
  kind: template?.kind ?? 'employee',
  company: template?.company ?? '',
  body: template?.body ?? EMPTY_DOC,
  askFields: template?.askFields ?? [],
  email: template?.email ?? DEFAULT_EMAIL,
});

type EmailTarget = 'subject' | 'body';

const TemplateForm = ({ template }: { template?: LetterTemplate }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const editorRef = useRef<LetterEditorHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [emailTarget, setEmailTarget] = useState<EmailTarget>('body');

  const [saved, setSaved] = useState(() => JSON.stringify(fromTemplate(template)));
  const [restored, setRestored] = useState(() => {
    const draft = readDraft(template?._id);
    return Boolean(draft && JSON.stringify(draft) !== JSON.stringify(fromTemplate(template)));
  });
  const [form, setForm] = useState<LetterTemplateInput>(() => (restored ? readDraft(template?._id) : null) ?? fromTemplate(template));
  const patch = (next: Partial<LetterTemplateInput>) => setForm((f) => ({ ...f, ...next }));
  const dirty = JSON.stringify(form) !== saved;

  useEffect(() => {
    try {
      if (dirty) localStorage.setItem(draftKey(template?._id), JSON.stringify(form));
      else localStorage.removeItem(draftKey(template?._id));
    } catch {
      // Storage full or disabled: the form still works, it just isn't kept across visits.
    }
  }, [form, dirty, template?._id]);

  const { data: companies = [] } = useCompanies();
  const { data: catalogue } = useLetterFields();
  const { data: letterhead } = useLetterhead(form.company || undefined);
  const save = useSaveLetterTemplate();
  const importDocx = useImportDocx();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();

  const fields = fieldOptionsFor(form.kind, catalogue, form.askFields);
  const missing = [!form.name.trim() && 'a name', !form.company && 'a company', !form.email.subject.trim() && 'an email subject', !form.email.body.trim() && 'an email message'].filter(Boolean);

  const discardRestored = () => {
    const original = fromTemplate(template);
    setForm(original);
    editorRef.current?.setDoc(original.body);
    setRestored(false);
  };

  const changeKind = async (kind: LetterKind) => {
    const allowed = new Set(fieldOptionsFor(kind, catalogue, form.askFields).map((f) => f.key));
    const stray = collectFieldKeys(form.body).filter((key) => !allowed.has(key));
    if (stray.length) {
      const labels = stray.map((key) => fields.find((f) => f.key === key)?.label ?? key).join(', ');
      const ok = await confirm({
        title: 'Remove fields that won’t apply?',
        description: `A letter for ${kind === 'manual' ? 'someone not in the system' : 'an employee'} can’t fill: ${labels}. They will be removed from the text.`,
        confirmText: 'Switch and remove',
        destructive: true,
      });
      if (!ok) return;
      const body = removeFields(form.body, (key) => stray.includes(key));
      editorRef.current?.setDoc(body);
      patch({ kind, body });
      return;
    }
    patch({ kind });
  };

  const insertIntoEmail = (key: string) => {
    const token = `{{${key}}}`;
    const element = emailTarget === 'subject' ? subjectRef.current : bodyRef.current;
    const current = form.email[emailTarget];
    const start = element?.selectionStart ?? current.length;
    const end = element?.selectionEnd ?? current.length;
    patch({ email: { ...form.email, [emailTarget]: current.slice(0, start) + token + current.slice(end) } });
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    if (!editorRef.current?.isEmpty() && !(await confirm({ title: 'Replace the letter text?', description: 'Importing replaces everything in the editor with the Word file’s text.', confirmText: 'Replace' }))) return;
    try {
      const { html, messages } = await importDocx.mutateAsync(file);
      editorRef.current?.setHtml(html);
      toast({ variant: 'success', title: 'Word file imported', description: messages.length ? `${messages.length} item(s) could not be converted exactly; check the text, including alignment.` : 'Check alignment, then replace personal details with fields.' });
    } catch (error) {
      toast({ variant: 'error', title: 'Import failed', description: errorMessage(error) });
    }
  };

  const onPreview = async () => {
    try {
      const blob = await pdf.mutateAsync({ kind: 'template', input: { kind: form.kind, company: form.company, body: form.body, askFields: form.askFields } });
      show(blob, `${form.name || 'Template'} — preview`);
    } catch (error) {
      toast({ variant: 'error', title: 'Preview failed', description: errorMessage(error) });
    }
  };

  const onSave = async () => {
    try {
      const result = await save.mutateAsync({ id: template?._id, input: form });
      setSaved(JSON.stringify(form));
      setRestored(false);
      toast({ variant: 'success', title: 'Template saved' });
      if (!template) {
        localStorage.removeItem(draftKey());
        navigate(`/letters/templates/${result._id}`, { replace: true });
      }
    } catch (error) {
      toast({ variant: 'error', title: 'Could not save', description: errorMessage(error) });
    }
  };

  return (
    <div className="mx-auto max-w-[96rem] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to templates">
            <Link to="/letters/templates"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-semibold">{template ? 'Edit template' : 'New template'}</h1>
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes (kept on this device)</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {missing.length > 0 && <span className="text-xs text-muted-foreground">Add {missing.join(', ')} to save</span>}
          <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={importDocx.isPending}>
            {importDocx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Import .docx
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={onPreview} disabled={!form.company || pdf.isPending} title={form.company ? undefined : 'Choose a company first'}>
            {pdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview PDF
          </Button>
          <Button className="gap-1.5" onClick={onSave} disabled={missing.length > 0 || !dirty || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        </div>
      </div>

      {restored && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-4 py-2 text-sm" role="status">
          <span>Restored your unsaved changes from last time.</span>
          <Button variant="ghost" size="sm" onClick={discardRestored}>Discard them</Button>
        </div>
      )}

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="template-name">Name</Label>
          <Input id="template-name" value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Appointment letter" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-kind">Letter for</Label>
          <Select value={form.kind} onValueChange={(kind) => void changeKind(kind as LetterKind)} disabled={Boolean(template)}>
            <SelectTrigger id="template-kind" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">An employee (fills from their record)</SelectItem>
              <SelectItem value="manual">Someone not in the system (e.g. offer letter)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-company">Company and letterhead</Label>
          <Select value={form.company} onValueChange={(company) => patch({ company })}>
            <SelectTrigger id="template-company" className="w-full"><SelectValue placeholder="Choose a company" /></SelectTrigger>
            <SelectContent>
              {companies.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {form.company && letterhead === null && (
            <p className="text-xs text-muted-foreground">
              No letterhead yet — previews use a plain page. <Link to="/letters/letterheads" className="underline">Set it up</Link>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LetterEditor ref={editorRef} value={form.body} onChange={(body) => patch({ body })} fields={fields} marginsMm={letterhead?.marginsMm} pageSize={letterhead?.pageSize} mode="template" />

        <aside className="space-y-6 rounded-lg border border-border bg-card p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto">
          <FieldListPanel fields={fields} onInsert={(key) => editorRef.current?.insertField(key)} />
          <AskFieldsPanel fields={form.askFields} onChange={(askFields) => patch({ askFields })} onInsert={(key) => editorRef.current?.insertField(key)} />
          <section className="space-y-3" aria-labelledby="email-heading">
            <div>
              <h3 id="email-heading" className="text-sm font-semibold">Email</h3>
              <p className="text-xs text-muted-foreground">Sent with the PDF attached.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" ref={subjectRef} onFocus={() => setEmailTarget('subject')} value={form.email.subject} onChange={(e) => patch({ email: { ...form.email, subject: e.target.value } })} data-gramm="false" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea id="email-body" ref={bodyRef} onFocus={() => setEmailTarget('body')} className="h-40" value={form.email.body} onChange={(e) => patch({ email: { ...form.email, body: e.target.value } })} data-gramm="false" />
            </div>
            <Select value="" onValueChange={insertIntoEmail}>
              <SelectTrigger className="w-full" aria-label={`Insert a field into the email ${emailTarget === 'subject' ? 'subject' : 'message'}`}>
                <SelectValue placeholder={`Insert field into ${emailTarget === 'subject' ? 'subject' : 'message'}…`} />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </section>
        </aside>
      </div>

      <PdfPreviewDialog preview={preview} onClose={close} />
    </div>
  );
};

const LetterTemplateEditorPage = () => {
  const { id } = useParams();
  const { data: template, isLoading, error } = useLetterTemplate(id);

  if (id && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading template…</div>;
  if (id && (error || !template)) return <div className="p-8 text-center text-destructive">{errorMessage(error, 'Template not found')}</div>;
  return <TemplateForm key={template?._id ?? 'new'} template={template} />;
};

export default LetterTemplateEditorPage;
