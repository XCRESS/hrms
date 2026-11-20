import { useRef, useState } from 'react';
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
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { usePdfPreview } from './usePdfPreview';
import { errorMessage, fieldOptionsFor } from './shared';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

const TemplateForm = ({ template }: { template?: LetterTemplate }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const editorRef = useRef<LetterEditorHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<LetterTemplateInput>(() => ({
    name: template?.name ?? '',
    kind: template?.kind ?? 'employee',
    company: template?.company ?? '',
    body: template?.body ?? EMPTY_DOC,
    askFields: template?.askFields ?? [],
    email: template?.email ?? { subject: 'Your letter from {{company.name}}', body: 'Dear {{recipient.name}},\n\nPlease find your letter attached.\n\nRegards,\n{{signatory.name}}\n{{signatory.designation}}' },
  }));
  const patch = (next: Partial<LetterTemplateInput>) => setForm((f) => ({ ...f, ...next }));

  const { data: companies = [] } = useCompanies();
  const { data: catalogue } = useLetterFields();
  const { data: letterhead } = useLetterhead(form.company || undefined);
  const save = useSaveLetterTemplate();
  const importDocx = useImportDocx();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();

  const fields = fieldOptionsFor(form.kind, catalogue, form.askFields);
  const canSave = form.name.trim() && form.company && form.email.subject.trim() && form.email.body.trim();

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    if (!editorRef.current?.isEmpty() && !(await confirm({ title: 'Replace the letter text?', description: 'Importing replaces everything in the editor with the Word file’s text.', confirmText: 'Replace' }))) return;
    try {
      const { html, messages } = await importDocx.mutateAsync(file);
      editorRef.current?.setHtml(html);
      toast({ variant: 'success', title: 'Word file imported', description: messages.length ? `${messages.length} item(s) could not be converted exactly; check the text.` : 'Replace personal details with fields.' });
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
      const saved = await save.mutateAsync({ id: template?._id, input: form });
      toast({ variant: 'success', title: 'Template saved' });
      if (!template) navigate(`/letters/templates/${saved._id}`, { replace: true });
    } catch (error) {
      toast({ variant: 'error', title: 'Could not save', description: errorMessage(error) });
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Back to templates">
            <Link to="/letters/templates"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-xl font-semibold">{template ? 'Edit template' : 'New template'}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="outline" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={importDocx.isPending}>
            {importDocx.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Import .docx
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={onPreview} disabled={!form.company || pdf.isPending}>
            {pdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview PDF
          </Button>
          <Button className="gap-1.5" onClick={onSave} disabled={!canSave || save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="template-name">Name</Label>
          <Input id="template-name" value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Appointment letter" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-kind">Letter for</Label>
          <Select value={form.kind} onValueChange={(kind) => patch({ kind: kind as LetterKind })} disabled={Boolean(template)}>
            <SelectTrigger id="template-kind"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">An employee (fills from their record)</SelectItem>
              <SelectItem value="manual">Someone not in the system (e.g. offer letter)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="template-company">Company and letterhead</Label>
          <Select value={form.company} onValueChange={(company) => patch({ company })}>
            <SelectTrigger id="template-company"><SelectValue placeholder="Choose a company" /></SelectTrigger>
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <LetterEditor ref={editorRef} value={form.body} onChange={(body) => patch({ body })} fields={fields} marginsMm={letterhead?.marginsMm} pageSize={letterhead?.pageSize} mode="template" />

        <aside className="space-y-6 rounded-lg border border-border bg-card p-4 lg:self-start">
          <AskFieldsPanel fields={form.askFields} onChange={(askFields) => patch({ askFields })} />
          <section className="space-y-3" aria-labelledby="email-heading">
            <div>
              <h3 id="email-heading" className="text-sm font-semibold">Email</h3>
              <p className="text-xs text-muted-foreground">Sent with the PDF attached. Use fields like {'{{recipient.name}}'}.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" value={form.email.subject} onChange={(e) => patch({ email: { ...form.email, subject: e.target.value } })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea id="email-body" className="h-40" value={form.email.body} onChange={(e) => patch({ email: { ...form.email, body: e.target.value } })} />
            </div>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Available fields</summary>
              <ul className="mt-2 space-y-1">
                {fields.map((f) => <li key={f.key}><code>{`{{${f.key}}}`}</code> — {f.label}</li>)}
              </ul>
            </details>
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
