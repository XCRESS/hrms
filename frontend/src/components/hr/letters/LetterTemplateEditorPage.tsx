import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Eye, FileUp, Loader2, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useCompanies, useLetterFields, useLetterPdf, useLetterTemplate, useLetterhead, useSaveLetterTemplate } from '@/hooks/queries';
import type { LetterKind, LetterTemplate, LetterTemplateInput } from '@/types/letters';
import { AskFieldsPanel } from './AskFieldsPanel';
import { LetterEditor, type LetterEditorHandle } from './editor/LetterEditor';
import { FieldListPanel } from './FieldListPanel';
import { TokenTextEditor, type TokenTextEditorHandle } from './editor/TokenTextEditor';
import { StarterPicker } from './StarterPicker';
import type { StarterTemplate } from './starterTemplates';
import { ImportWordDialog, type ImportOutcome } from './ImportWordDialog';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { usePdfPreview } from './usePdfPreview';
import { DEFAULT_TEMPLATE_EMAIL, collectFieldKeys, errorMessage, fieldOptionsFor, hasContent, keyFromLabel, removeFields } from './shared';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

const draftKey = (id?: string) => `letter-template-draft:${id ?? 'new'}`;

const readDraft = (id?: string): LetterTemplateInput | null => {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as LetterTemplateInput) : null;
  } catch {
    return null;
  }
};

const fromTemplate = (template?: LetterTemplate | StarterTemplate): LetterTemplateInput => ({
  name: template?.name ?? '',
  kind: template?.kind ?? 'employee',
  company: template && 'company' in template ? template.company : '',
  body: template?.body ?? EMPTY_DOC,
  askFields: template?.askFields ?? [],
  email: template?.email ?? DEFAULT_TEMPLATE_EMAIL,
});

type EmailTarget = 'subject' | 'body';

const TemplateForm = ({ template, starter, startWithImport = false }: { template?: LetterTemplate; starter?: StarterTemplate; startWithImport?: boolean }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const editorRef = useRef<LetterEditorHandle>(null);
  const subjectRef = useRef<TokenTextEditorHandle>(null);
  const bodyRef = useRef<TokenTextEditorHandle>(null);
  const [emailVersion, setEmailVersion] = useState(0);
  const [emailTarget, setEmailTarget] = useState<EmailTarget>('body');

  const [saved, setSaved] = useState(() => JSON.stringify(fromTemplate(template)));
  const [restored, setRestored] = useState(() => {
    const draft = readDraft(template?._id);
    return Boolean(draft && JSON.stringify(draft) !== JSON.stringify(fromTemplate(template)));
  });
  const [form, setForm] = useState<LetterTemplateInput>(() => (restored ? readDraft(template?._id) : null) ?? fromTemplate(template ?? starter));
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
  const [importing, setImporting] = useState(startWithImport);
  const [summary, setSummary] = useState<ImportOutcome | null>(null);
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();

  const fields = fieldOptionsFor(form.kind, catalogue, form.askFields);
  const missing = [!form.name.trim() && 'a name', !form.company && 'a company', !form.email.subject.trim() && 'an email subject', !form.email.body.trim() && 'an email message'].filter(Boolean);

  const discardRestored = () => {
    const original = fromTemplate(template);
    setForm(original);
    editorRef.current?.setDoc(original.body);
    setEmailVersion((v) => v + 1);
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

  const insertIntoEmail = (key: string) => (emailTarget === 'subject' ? subjectRef : bodyRef).current?.insertField(key);

  const onImported = (outcome: ImportOutcome) => {
    editorRef.current?.setDoc(outcome.doc);
    const known = new Set(form.askFields.map((f) => f.key));
    const added = outcome.newAskFields.filter((f) => !known.has(f.key));
    if (added.length) patch({ askFields: [...form.askFields, ...added] });
    setImporting(false);
    setSummary(outcome);
  };

  const onCreateDetail = (label: string, defaultValue?: string): string => {
    const key = keyFromLabel(label, form.askFields.map((f) => f.key));
    patch({ askFields: [...form.askFields, { key, label, type: 'text', required: !defaultValue, ...(defaultValue ? { default: defaultValue } : {}) }] });
    return `ask.${key}`;
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
          <Button variant="outline" className="gap-1.5" onClick={() => setImporting(true)}>
            <FileUp className="h-4 w-4" /> Import Word letter
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={onPreview} disabled={!form.company || pdf.isPending} title={form.company ? undefined : 'Choose a company first'}>
            {pdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview PDF
          </Button>
          {template && !dirty && (
            <Button asChild variant="outline" className="gap-1.5">
              <Link to={`/letters/new?template=${template._id}`}><Send className="h-4 w-4" /> Issue a letter</Link>
            </Button>
          )}
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
          <Label htmlFor="template-kind">Who is this template for?</Label>
          <Select value={form.kind} onValueChange={(kind) => void changeKind(kind as LetterKind)} disabled={Boolean(template)}>
            <SelectTrigger id="template-kind" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employees (details filled in automatically)</SelectItem>
              <SelectItem value="manual">New candidates / people not in the HRMS</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">You choose the person each time you issue a letter.</p>
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

      {summary && (
        <div className="space-y-1 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm" role="status">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">
              {summary.converted.length
                ? `Imported. Turned ${summary.converted.reduce((n, f) => n + f.count, 0)} details into fields: ${summary.converted.map((f) => (f.count > 1 ? `${f.label} ×${f.count}` : f.label)).join(', ')}.`
                : 'Imported.'}
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSummary(null)}>Dismiss</Button>
          </div>
          <p className="text-muted-foreground">Check the text, then select anything else that changes per letter (a grade, a date, a city) and choose <strong>Make this a field</strong>.</p>
          {summary.warnings.map((w) => <p key={w} className="text-muted-foreground">{w}</p>)}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LetterEditor ref={editorRef} value={form.body} onChange={(body) => patch({ body })} fields={fields} marginsMm={letterhead?.marginsMm} pageSize={letterhead?.pageSize} mode="template" onCreateDetail={onCreateDetail} />

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
              <TokenTextEditor key={`subject-${emailVersion}`} id="email-subject" ref={subjectRef} singleLine fields={fields} onFocus={() => setEmailTarget('subject')} value={form.email.subject} onChange={(subject) => setForm((f) => ({ ...f, email: { ...f.email, subject } }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Message</Label>
              <TokenTextEditor key={`body-${emailVersion}`} id="email-body" ref={bodyRef} fields={fields} onFocus={() => setEmailTarget('body')} className="min-h-40" value={form.email.body} onChange={(body) => setForm((f) => ({ ...f, email: { ...f.email, body } }))} />
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
      {importing && (
        <ImportWordDialog
          kind={form.kind}
          replacing={hasContent(form.body)}
          fields={fields}
          askFields={form.askFields}
          onClose={() => setImporting(false)}
          onImported={onImported}
          onError={(error) => toast({ variant: 'error', title: 'Import failed', description: errorMessage(error) })}
        />
      )}
    </div>
  );
};

const LetterTemplateEditorPage = () => {
  const { id } = useParams();
  const { data: template, isLoading, error } = useLetterTemplate(id);
  const [start, setStart] = useState<{ starter?: StarterTemplate; importWord?: boolean } | null>(() => (id || readDraft() ? {} : null));

  if (id && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading template…</div>;
  if (id && (error || !template)) return <div className="p-8 text-center text-destructive">{errorMessage(error, 'Template not found')}</div>;
  if (!start) return <StarterPicker onPick={setStart} />;
  return <TemplateForm key={template?._id ?? 'new'} template={template} starter={start.starter} startWithImport={start.importWord} />;
};

export default LetterTemplateEditorPage;
