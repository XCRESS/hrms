import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Ban, Eye, FileCheck2, Loader2, PenLine, Send, Trash2 } from 'lucide-react';
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
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { usePdfPreview } from './usePdfPreview';
import { STATUS_LABEL, STATUS_VARIANT, collectFieldKeys, errorMessage, fieldOptionsFor } from './shared';

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

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
  const remove = useDeleteLetter();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();
  const [editingWording, setEditingWording] = useState(false);

  const used = collectFieldKeys(template.body).filter((k) => !k.startsWith('letter.'));
  const options = fieldOptionsFor(template.kind, catalogue, template.askFields);
  const shown = options.filter((f) => used.includes(f.key) || f.source === 'ask' || f.source === 'recipient' || f.key.startsWith('recipient.'));
  const recipientFields = (catalogue?.recipient ?? []).map((f) => ({ key: f.key, label: f.label, type: f.type, source: 'recipient' as const, group: 'Recipient' }));
  const fields = [...shown, ...recipientFields.filter((r) => !shown.some((s) => s.key === r.key))];
  const required = new Set([...used, ...template.askFields.filter((f) => f.required).map((f) => `ask.${f.key}`), 'recipient.name']);

  const saveValues = async (values: Record<string, string>) => {
    if (letter.body && !(await confirm({ title: 'Discard wording changes?', description: 'You edited this letter’s wording. Saving new values rebuilds the text from the template.', confirmText: 'Save and discard', destructive: true }))) return;
    try {
      await update.mutateAsync({ id: letter._id, values });
      toast({ variant: 'success', title: 'Values saved' });
    } catch (e) {
      toast({ variant: 'error', title: 'Could not save', description: errorMessage(e) });
    }
  };

  const onPreview = async () => {
    try {
      show(await pdf.mutateAsync({ kind: 'draft', id: letter._id }), `${letter.templateName} — ${letter.recipient.name}`, `draft ${letter.recipient.name}`);
    } catch (e) {
      toast({ variant: 'error', title: 'Preview failed', description: errorMessage(e) });
    }
  };

  const onIssue = async () => {
    if (!(await confirm({ title: 'Issue this letter?', description: 'Issuing assigns a reference number and locks the letter. Corrections after this need a new letter.', confirmText: 'Issue' }))) return;
    try {
      const issued = await issue.mutateAsync(letter._id);
      toast({ variant: 'success', title: `Issued ${issued.referenceNo ?? ''}` });
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
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" className="gap-1.5" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete draft</Button>
        <Button variant="outline" className="gap-1.5" onClick={() => setEditingWording((v) => !v)}><PenLine className="h-4 w-4" /> {letter.body ? 'Wording edited' : 'Edit wording'}</Button>
        <Button variant="outline" className="gap-1.5" onClick={onPreview} disabled={pdf.isPending}>
          {pdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Preview
        </Button>
        <Button className="gap-1.5" onClick={onIssue} disabled={issue.isPending}>
          {issue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Issue
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        {editingWording ? (
          <WordingEditor letter={letter} onDone={() => setEditingWording(false)} />
        ) : (
          <LetterValuesForm key={JSON.stringify(letter.values)} fields={fields} required={required} initial={letter.values} saving={update.isPending} onSave={saveValues} />
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
  const pdf = useLetterPdf();
  const send = useSendLetter();
  const voidLetter = useVoidLetter();
  const remove = useDeleteLetter();
  const { preview, show, close } = usePdfPreview();
  const [to, setTo] = useState(letter.recipient.email ?? '');
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState('');
  const filename = `${letter.referenceNo ?? 'letter'} ${letter.recipient.name}`;

  const onView = async () => {
    try {
      show(await pdf.mutateAsync({ kind: 'issued', id: letter._id }), `${letter.referenceNo} — ${letter.recipient.name}`, filename);
    } catch (e) {
      toast({ variant: 'error', title: 'Could not open the PDF', description: errorMessage(e) });
    }
  };

  const onSend = async () => {
    try {
      const sent = await send.mutateAsync({ id: letter._id, to: to.trim() || undefined });
      toast({ variant: 'success', title: `Sent to ${sent.sends[sent.sends.length - 1]?.to ?? to}` });
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
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {letter.status !== 'void' && <Button variant="ghost" className="gap-1.5" onClick={() => setVoidOpen(true)}><Ban className="h-4 w-4" /> Void</Button>}
        {letter.status === 'void' && letter.kind === 'manual' && <Button variant="ghost" className="gap-1.5" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete permanently</Button>}
        <Button variant="outline" className="gap-1.5" onClick={onView} disabled={pdf.isPending}>
          {pdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} View PDF
        </Button>
      </div>

      {letter.status === 'void' && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Voided{letter.voidReason ? `: ${letter.voidReason}` : ''}</p>
      )}

      {letter.status !== 'void' && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4 md:p-6" aria-labelledby="send-heading">
          <h2 id="send-heading" className="text-sm font-semibold">Send by email</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="send-to" className="sr-only">Recipient email</Label>
            <Input id="send-to" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
            <Button className="gap-1.5" onClick={onSend} disabled={!to.trim() || send.isPending}>
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {letter.sends.length ? 'Send again' : 'Send'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The PDF is attached. Replies come to your email address.</p>
        </section>
      )}

      {letter.sends.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4 md:p-6" aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-2 text-sm font-semibold">Sent</h2>
          <ul className="space-y-1 text-sm">
            {letter.sends.map((s) => <li key={`${s.to}-${s.at}`}>{s.to} <span className="text-muted-foreground">· {formatDate(s.at)}</span></li>)}
          </ul>
        </section>
      )}

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
      <PdfPreviewDialog preview={preview} onClose={close} />
    </div>
  );
};

const LetterPage = () => {
  const { id } = useParams();
  const { data: letter, isLoading, error } = useLetter(id);
  const { data: template } = useLetterTemplate(letter?.status === 'draft' ? letter.template : undefined);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{errorMessage(error, 'Letter not found')}</p>}
      {letter?.status === 'draft' && template && <DraftView letter={letter} template={template} />}
      {letter && letter.status !== 'draft' && <IssuedView letter={letter} />}
    </div>
  );
};

export default LetterPage;
