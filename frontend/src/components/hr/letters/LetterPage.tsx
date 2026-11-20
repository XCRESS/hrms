import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Ban, Eye, FileCheck2, Loader2, MoreHorizontal, PenLine, Save, Send, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  useDeleteLetter,
  useIssueLetter,
  useIssuedLetterPdf,
  useLetter,
  useLetterFields,
  useLetterPdf,
  useLetterTemplate,
  useLetterWording,
  useLetterhead,
  useSendLetter,
  useUpdateLetter,
  useVoidLetter,
} from '@/hooks/queries';
import type { Letter, LetterDoc, LetterTemplate } from '@/types/letters';
import { LetterEditor } from './editor/LetterEditor';
import { LetterValuesForm } from './LetterValuesForm';
import { PdfFrame } from './PdfFrame';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { usePdfPreview } from './usePdfPreview';
import { STATUS_LABEL, STATUS_VARIANT, collectFieldKeys, errorMessage, fieldOptionsFor } from './shared';

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const EMAIL = /^\S+@\S+\.\S+$/;

const WordingEditor = ({ letter, onDone }: { letter: Letter; onDone: () => void }) => {
  const { toast } = useToast();
  const { data: wording, isLoading, error } = useLetterWording(letter._id, true);
  const { data: letterhead } = useLetterhead(letter.company);
  const update = useUpdateLetter();
  const [body, setBody] = useState<LetterDoc | null>(null);

  const save = async (next: LetterDoc | null) => {
    try {
      await update.mutateAsync({ id: letter._id, body: next });
      toast({ variant: 'success', title: next ? 'Wording saved for this letter' : 'Wording reset to the template' });
      onDone();
    } catch (e) {
      toast({ variant: 'error', title: 'Could not save wording', description: errorMessage(e) });
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Preparing the text…</p>;
  if (error || !wording) return <p className="text-sm text-destructive">{errorMessage(error, 'Fill in the required values first.')}</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Changes apply to this letter only. The reference number and date stay as placeholders until you issue.</p>
      <LetterEditor value={wording} onChange={setBody} fields={[]} marginsMm={letterhead?.marginsMm} pageSize={letterhead?.pageSize} mode="letter" />
      <div className="flex flex-wrap justify-end gap-2">
        {letter.body && <Button variant="ghost" onClick={() => save(null)} disabled={update.isPending}>Reset to template</Button>}
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={() => save(body ?? wording)} disabled={update.isPending || !body} className="gap-1.5">
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save wording
        </Button>
      </div>
    </div>
  );
};

const DraftView = ({ letter, template }: { letter: Letter; template: LetterTemplate }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { data: catalogue } = useLetterFields();
  const update = useUpdateLetter();
  const issue = useIssueLetter();
  const send = useSendLetter();
  const remove = useDeleteLetter();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();
  const [editingWording, setEditingWording] = useState(false);
  const [values, setValues] = useState(letter.values);

  const used = collectFieldKeys(template.body).filter((k) => !k.startsWith('letter.'));
  const options = fieldOptionsFor(template.kind, catalogue, template.askFields);
  const shown = options.filter((f) => used.includes(f.key) || f.source === 'ask' || f.key.startsWith('recipient.'));
  const recipientFields = (catalogue?.recipient ?? []).map((f) => ({ key: f.key, label: f.label, type: f.type, source: 'recipient' as const, group: 'Recipient' }));
  const fields = [...shown, ...recipientFields.filter((r) => !shown.some((s) => s.key === r.key))];
  const required = new Set([...used, ...template.askFields.filter((f) => f.required).map((f) => `ask.${f.key}`), 'recipient.name']);
  const dirty = fields.some((f) => (values[f.key] ?? '') !== (letter.values[f.key] ?? ''));
  const missing = fields.filter((f) => required.has(f.key) && !values[f.key]?.trim());
  const recipientEmail = (values['recipient.email'] ?? '').trim();
  const busy = update.isPending || issue.isPending || send.isPending || pdf.isPending;

  /** Saves on-screen values first, so preview and issue never use stale ones. Returns false if the user backed out. */
  const saveValues = async (): Promise<boolean> => {
    if (!dirty) return true;
    if (letter.body && !(await confirm({ title: 'Discard wording changes?', description: 'You edited this letter’s wording. Saving new values rebuilds the text from the template.', confirmText: 'Save and discard', destructive: true }))) return false;
    try {
      await update.mutateAsync({ id: letter._id, values: Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? ''])) });
      return true;
    } catch (e) {
      toast({ variant: 'error', title: 'Could not save values', description: errorMessage(e) });
      return false;
    }
  };

  const onSave = async () => {
    if (await saveValues()) toast({ variant: 'success', title: 'Values saved' });
  };

  const onEditWording = async () => {
    if (!editingWording && !(await saveValues())) return;
    setEditingWording((v) => !v);
  };

  const onPreview = async () => {
    if (!(await saveValues())) return;
    try {
      show(await pdf.mutateAsync({ kind: 'draft', id: letter._id }), `${letter.templateName} — ${values['recipient.name'] ?? letter.recipient.name}`, `draft ${letter.recipient.name}`);
    } catch (e) {
      toast({ variant: 'error', title: 'Preview failed', description: errorMessage(e) });
    }
  };

  const onIssue = async (andSend: boolean) => {
    if (!(await saveValues())) return;
    const description = andSend
      ? `Issuing assigns a reference number and locks the letter, then emails it to ${recipientEmail}.`
      : 'Issuing assigns a reference number and locks the letter. Corrections after this need a new letter.';
    if (!(await confirm({ title: andSend ? 'Issue and send this letter?' : 'Issue this letter?', description, confirmText: andSend ? 'Issue and send' : 'Issue' }))) return;
    try {
      const issued = await issue.mutateAsync(letter._id);
      if (!andSend) {
        toast({ variant: 'success', title: `Issued ${issued.referenceNo ?? ''}` });
        return;
      }
      try {
        await send.mutateAsync({ id: letter._id, to: recipientEmail });
        toast({ variant: 'success', title: `Issued ${issued.referenceNo ?? ''} and sent to ${recipientEmail}` });
      } catch (e) {
        toast({ variant: 'error', title: `Issued ${issued.referenceNo ?? ''}, but sending failed`, description: `${errorMessage(e)} You can send it again from this page.` });
      }
    } catch (e) {
      toast({ variant: 'error', title: 'Could not issue', description: errorMessage(e) });
    }
  };

  const onDelete = async () => {
    if (!(await confirm({ title: 'Delete this draft?', description: 'The draft is removed. Nothing was issued.', confirmText: 'Delete', destructive: true }))) return;
    await remove.mutateAsync(letter._id);
    navigate('/letters');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {missing.length ? `Still needed: ${missing.map((f) => f.label).join(', ')}` : 'All required values are filled in.'}
          {dirty && ' · Unsaved changes'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="gap-1.5" disabled={busy}><MoreHorizontal className="h-4 w-4" /> More</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              {[
                { label: 'Save values', icon: <Save className="h-4 w-4" />, run: onSave, disabled: !dirty },
                { label: editingWording ? 'Back to values' : letter.body ? 'Edit wording (edited)' : 'Edit wording for this letter', icon: <PenLine className="h-4 w-4" />, run: onEditWording, disabled: false },
                { label: 'Issue without sending', icon: <FileCheck2 className="h-4 w-4" />, run: () => onIssue(false), disabled: missing.length > 0 },
                { label: 'Delete draft', icon: <Trash2 className="h-4 w-4" />, run: onDelete, disabled: false },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={item.run}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button variant="outline" className="gap-1.5" onClick={onPreview} disabled={busy}>
            {pdf.isPending || update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => onIssue(true)}
            disabled={busy || missing.length > 0 || !EMAIL.test(recipientEmail)}
            title={EMAIL.test(recipientEmail) ? undefined : 'Add the recipient’s email to send'}
          >
            {issue.isPending || send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Issue &amp; send
          </Button>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        {editingWording ? (
          <WordingEditor letter={letter} onDone={() => setEditingWording(false)} />
        ) : (
          <LetterValuesForm fields={fields} required={required} values={values} onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))} />
        )}
      </div>
      <PdfPreviewDialog preview={preview} onClose={close} />
    </div>
  );
};

const IssuedView = ({ letter }: { letter: Letter }) => {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: blob, isLoading: pdfLoading, error: pdfError } = useIssuedLetterPdf(letter._id);
  const send = useSendLetter();
  const voidLetter = useVoidLetter();
  const remove = useDeleteLetter();
  const [to, setTo] = useState(letter.recipient.email ?? '');
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState('');
  const filename = `${letter.referenceNo ?? 'letter'} ${letter.recipient.name}`;

  const onSend = async () => {
    try {
      await send.mutateAsync({ id: letter._id, to: to.trim() || undefined });
      toast({ variant: 'success', title: `Sent to ${to.trim()}` });
    } catch (e) {
      toast({ variant: 'error', title: 'Could not send', description: errorMessage(e) });
    }
  };

  const onVoid = async () => {
    try {
      await voidLetter.mutateAsync({ id: letter._id, reason: reason.trim() });
      setVoidOpen(false);
      toast({ variant: 'success', title: 'Letter voided' });
    } catch (e) {
      toast({ variant: 'error', title: 'Could not void', description: errorMessage(e) });
    }
  };

  const onDelete = async () => {
    if (!(await confirm({ title: 'Delete this offer letter permanently?', description: 'The PDF and the candidate’s details are erased. Use this for data-deletion requests.', confirmText: 'Delete', destructive: true }))) return;
    try {
      await remove.mutateAsync(letter._id);
      navigate('/letters');
    } catch (e) {
      toast({ variant: 'error', title: 'Could not delete', description: errorMessage(e) });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-lg border border-border bg-card p-3">
        {pdfLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading the letter…</p>}
        {pdfError && <p className="p-6 text-center text-sm text-destructive">{errorMessage(pdfError, 'Could not load the PDF')}</p>}
        {blob && <PdfFrame key={letter._id} blob={blob} title={filename} filename={filename} />}
      </div>

      <div className="space-y-4">
        {letter.status === 'void' ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Voided{letter.voidReason ? `: ${letter.voidReason}` : ''}</p>
        ) : (
          <section className="space-y-3 rounded-lg border border-border bg-card p-4" aria-labelledby="send-heading">
            <h2 id="send-heading" className="text-sm font-semibold">Send by email</h2>
            <Label htmlFor="send-to" className="sr-only">Recipient email</Label>
            <Input id="send-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
            <Button className="w-full gap-1.5" onClick={onSend} disabled={!EMAIL.test(to.trim()) || send.isPending}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {letter.sends.length ? 'Send again' : 'Send'}
            </Button>
            <p className="text-xs text-muted-foreground">The PDF is attached. Replies come to your email address.</p>
          </section>
        )}

        {letter.sends.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="history-heading">
            <h2 id="history-heading" className="mb-2 text-sm font-semibold">Sent</h2>
            <ul className="space-y-1 text-sm">
              {letter.sends.map((s) => <li key={`${s.to}-${s.at}`} className="break-all">{s.to} <span className="text-muted-foreground">· {formatDate(s.at)}</span></li>)}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          {letter.status !== 'void' && <Button variant="ghost" className="gap-1.5" onClick={() => setVoidOpen(true)}><Ban className="h-4 w-4" /> Void</Button>}
          {letter.status === 'void' && letter.kind === 'manual' && <Button variant="ghost" className="gap-1.5" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete permanently</Button>}
        </div>
      </div>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Void {letter.referenceNo}?</DialogTitle>
            <DialogDescription>The letter keeps its number and PDF but is marked void. Issue a new letter to correct it.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="void-reason">Reason</Label>
          <Textarea id="void-reason" className="h-24" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onVoid} disabled={reason.trim().length < 3 || voidLetter.isPending}>Void letter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LetterPage = () => {
  const { id } = useParams();
  const { data: letter, isLoading, error } = useLetter(id);
  const { data: template } = useLetterTemplate(letter?.status === 'draft' ? letter.template : undefined);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to letters">
          <Link to="/letters"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{letter ? `${letter.templateName} — ${letter.recipient.name}` : 'Letter'}</h1>
          {letter && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={STATUS_VARIANT[letter.status]}>{STATUS_LABEL[letter.status]}</Badge>
              {letter.referenceNo && <span>{letter.referenceNo}</span>}
              {letter.issuedAt && <span>· issued {formatDate(letter.issuedAt)}</span>}
            </p>
          )}
        </div>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{errorMessage(error, 'Letter not found')}</p>}
      {letter?.status === 'draft' && template && <DraftView key={letter._id} letter={letter} template={template} />}
      {letter && letter.status !== 'draft' && <IssuedView letter={letter} />}
    </div>
  );
};

export default LetterPage;
