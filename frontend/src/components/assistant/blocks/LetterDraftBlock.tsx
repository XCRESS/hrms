import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateLetter, useIssueLetter, useLetterPdf, useSendLetter } from '@/hooks/queries';
import { LetterValuesForm } from '@/components/hr/letters/LetterValuesForm';
import { PdfPreviewDialog } from '@/components/hr/letters/PdfPreviewDialog';
import { usePdfPreview } from '@/components/hr/letters/usePdfPreview';
import type { LetterDraftFields } from '../types';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftVersions } from './useDraftVersions';
import { useDraftCommit, type CommitOutcome } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

const EMAIL = /^\S+@\S+\.\S+$/;

/** A letter HR Buddy prepared: check the values, preview the PDF, then issue (and email) it. */
export function LetterDraftBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const versions = useDraftVersions(entries.map((e) => e.draft.fields as unknown as LetterDraftFields));
  const fields = versions.current;
  const { commit, pending, error, setError, receipt } = useDraftCommit(latest);
  const createLetter = useCreateLetter();
  const issue = useIssueLetter();
  const send = useSendLetter();
  const pdf = useLetterPdf();
  const { preview, show, close } = usePdfPreview();

  const who = fields.employeeName ?? fields.values['recipient.name'] ?? '';
  const title = `${fields.templateName || 'Letter'}${who ? ` · ${who}` : ''}`;
  if (receipt) return <Receipt receipt={receipt} title={title} />;

  const set = (patch: Partial<LetterDraftFields>) => versions.edit({ ...fields, ...patch });
  const formFields = fields.entries.map((e) => ({ ...e, source: 'auto' as const, group: e.key.startsWith('recipient.') ? 'Recipient' : 'Details' }));
  const required = new Set(fields.entries.filter((e) => e.required).map((e) => e.key));
  const missing = fields.entries.filter((e) => e.required && !fields.values[e.key]?.trim()).map((e) => e.label);
  const blocking = latest.draft.issues.filter((i) => !i.startsWith('Still needed'));
  const issues = [...blocking, ...(missing.length ? [`Still needed: ${missing.join(', ')}`] : [])];
  const canSend = EMAIL.test(fields.sendTo.trim());

  const letterInput = () => ({
    template: fields.templateId,
    employee: fields.employeeId ?? undefined,
    recipient: fields.kind === 'manual' ? { name: fields.values['recipient.name'] ?? '', email: fields.values['recipient.email'] ?? '', address: fields.values['recipient.address'] || undefined } : undefined,
    values: fields.values,
  });

  const onPreview = async () => {
    try {
      show(await pdf.mutateAsync({ kind: 'unsaved', input: letterInput() }), title);
    } catch (e) {
      setError((e as Error).message || 'Could not create the preview');
    }
  };

  const issueLetter = (andSend: boolean) =>
    commit(async (): Promise<CommitOutcome> => {
      const { _id: id } = await createLetter.mutateAsync(letterInput());
      const issued = await issue.mutateAsync(id);
      const to = fields.sendTo.trim();
      if (andSend) await send.mutateAsync({ id, to });
      return {
        summary: andSend ? `Issued ${issued.referenceNo ?? ''} and emailed it to ${to}` : `Issued ${issued.referenceNo ?? ''} for ${who}`,
        link: `/letters/${id}`,
        committedFields: { letterId: id, referenceNo: issued.referenceNo ?? null, sentTo: andSend ? to : null },
      };
    });

  const busy = pending || pdf.isPending;

  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title={title}
      subtitle="Check the details, preview, then issue"
      notes={latest.draft.notes}
      issues={issues}
      error={error}
      versions={versions}
      footer={
        <>
          <Button size="sm" variant="outline" className="mr-auto gap-1.5" onClick={onPreview} disabled={busy || blocking.length > 0}>
            {pdf.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} Preview
          </Button>
          <ConfirmBulk label="Issue only" confirmLabel="Yes, issue" warning="Assigns a reference number and locks the letter." requireSecondPress variant="default" disabled={issues.length > 0 || busy} pending={pending} onConfirm={() => issueLetter(false)} />
          <ConfirmBulk label="Issue & send" confirmLabel={`Yes, issue and email ${fields.sendTo}`} warning="Locks the letter and emails the PDF." requireSecondPress disabled={issues.length > 0 || !canSend || busy} pending={pending} onConfirm={() => issueLetter(true)} />
        </>
      }
    >
      <LetterValuesForm fields={formFields} required={required} values={fields.values} onChange={(key, value) => set({ values: { ...fields.values, [key]: value } })} />
      <div className="space-y-1.5">
        <Label htmlFor={`${latest.draft.draftId}-send-to`}>Send to</Label>
        <Input id={`${latest.draft.draftId}-send-to`} type="email" value={fields.sendTo} onChange={(e) => set({ sendTo: e.target.value })} placeholder="name@example.com" />
      </div>
      <PdfPreviewDialog preview={preview} onClose={close} />
    </DraftFrame>
  );
}
