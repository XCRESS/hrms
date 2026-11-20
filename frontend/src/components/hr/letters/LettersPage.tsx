import { useState } from 'react';
import { Link } from 'react-router';
import { Eye, FileStack, Loader2, Plus, Send, Stamp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { useLetterPdf, useLetterTemplates, useLetterheads, useLetters, useSendLetter } from '@/hooks/queries';
import type { LetterListParams, LetterSummary } from '@/types/letters';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import { SetupChecklist } from './SetupChecklist';
import { usePdfPreview } from './usePdfPreview';
import { STATUS_LABEL, STATUS_VARIANT, errorMessage } from './shared';

const ALL = 'all';

const LettersPage = () => {
  const [status, setStatus] = useState<LetterListParams['status'] | typeof ALL>(ALL);
  const [template, setTemplate] = useState(ALL);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const filtered = status !== ALL || template !== ALL || q.trim() !== '';
  const params: LetterListParams = { page, q: q.trim() || undefined, ...(status !== ALL && { status }), ...(template !== ALL && { template }) };
  const { data, isLoading, error } = useLetters(params);
  const { data: templates = [] } = useLetterTemplates(true);
  const { data: letterheads = [] } = useLetterheads();
  const pdf = useLetterPdf();
  const send = useSendLetter();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { preview, show, close } = usePdfPreview();
  const letters = data?.letters ?? [];
  const pages = data?.pagination.totalPages ?? 1;
  const noLettersYet = !filtered && !isLoading && !error && data?.pagination.total === 0;

  const onView = async (letter: LetterSummary) => {
    try {
      show(await pdf.mutateAsync({ kind: 'issued', id: letter._id }), `${letter.referenceNo} — ${letter.recipient.name}`, `${letter.referenceNo ?? 'letter'} ${letter.recipient.name}`);
    } catch (e) {
      toast({ variant: 'error', title: 'Could not open the PDF', description: errorMessage(e) });
    }
  };

  const onResend = async (letter: LetterSummary) => {
    if (!letter.recipient.email) return;
    if (!(await confirm({ title: 'Send this letter again?', description: `It will be emailed to ${letter.recipient.email} with the PDF attached.`, confirmText: 'Send' }))) return;
    try {
      await send.mutateAsync({ id: letter._id });
      toast({ variant: 'success', title: `Sent to ${letter.recipient.email}` });
    } catch (e) {
      toast({ variant: 'error', title: 'Could not send', description: errorMessage(e) });
    }
  };

  const busyFor = (id: string) => (pdf.isPending && pdf.variables?.kind === 'issued' && pdf.variables.id === id) || (send.isPending && send.variables?.id === id);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Letters</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-1.5"><Link to="/letters/letterheads"><Stamp className="h-4 w-4" /> Letterheads</Link></Button>
          <Button asChild variant="outline" className="gap-1.5"><Link to="/letters/templates"><FileStack className="h-4 w-4" /> Templates</Link></Button>
          <Button asChild className="gap-1.5"><Link to="/letters/new"><Plus className="h-4 w-4" /> New letter</Link></Button>
        </div>
      </div>

      {noLettersYet ? (
        <SetupChecklist hasLetterhead={letterheads.length > 0} hasTemplate={templates.some((t) => t.active)} />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_14rem]">
            <Input aria-label="Search by recipient or reference number" placeholder="Search recipient or reference no." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1); }}>
              <SelectTrigger aria-label="Status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {(['draft', 'issued', 'sent', 'void'] as const).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={template} onValueChange={(v) => { setTemplate(v); setPage(1); }}>
              <SelectTrigger aria-label="Template" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All templates</SelectItem>
                {templates.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Recipient</th>
                  <th scope="col" className="px-4 py-2 font-medium">Letter</th>
                  <th scope="col" className="px-4 py-2 font-medium">Reference</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2 font-medium">Date</th>
                  <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {letters.map((l) => {
                  const issued = l.status !== 'draft' && l.status !== 'issuing';
                  return (
                    <tr key={l._id} className="hover:bg-muted/50">
                      <td className="px-4 py-2.5"><Link to={`/letters/${l._id}`} className="font-medium hover:underline">{l.recipient.name}</Link></td>
                      <td className="px-4 py-2.5">{l.templateName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{l.referenceNo ?? '—'}</td>
                      <td className="px-4 py-2.5"><Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{new Date(l.issuedAt ?? l.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-2 py-1.5 text-right whitespace-nowrap">
                        {busyFor(l._id) && <Loader2 className="mr-2 inline h-4 w-4 animate-spin text-muted-foreground" aria-label="Working" />}
                        {issued && (
                          <Button variant="ghost" size="icon" aria-label={`View ${l.referenceNo}`} title="View PDF" onClick={() => onView(l)} disabled={busyFor(l._id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {issued && l.status !== 'void' && l.recipient.email && (
                          <Button variant="ghost" size="icon" aria-label={`Send ${l.referenceNo} again`} title={`Send to ${l.recipient.email}`} onClick={() => onResend(l)} disabled={busyFor(l._id)}>
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading letters…</p>}
            {error && <p className="p-6 text-center text-sm text-destructive">{errorMessage(error)}</p>}
            {!isLoading && !error && letters.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No letters match these filters.</p>}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>Previous</Button>
              <span className="text-muted-foreground">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>Next</Button>
            </div>
          )}
        </>
      )}
      <PdfPreviewDialog preview={preview} onClose={close} />
    </div>
  );
};

export default LettersPage;
