import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useBulkReviewRegularizations } from '@/hooks/queries/useRegularizations';
import { useBulkUpdateExpenseStatus } from '@/hooks/queries/useExpenses';
import { useUpdateLeaveStatus } from '@/hooks/queries/useLeaves';
import { useUpdateWFHStatus } from '@/hooks/queries/useWFH';
import { BULK_CONFIRM_THRESHOLD, type ApprovalFields } from '../types';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftCommit, type CommitOutcome } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ChecklistRows } from './ChecklistRows';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

const DOMAIN_LABEL: Record<ApprovalFields['domain'], string> = {
  leave: 'leave requests',
  wfh: 'work-from-home requests',
  regularization: 'regularization requests',
  expense: 'expenses',
};

export function ApprovalBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const fields = latest.draft.fields as unknown as ApprovalFields;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(fields.rows.filter((r) => r.preselected).map((r) => r.id)));
  const [comment, setComment] = useState('');
  const { commit, pending, error, receipt } = useDraftCommit(latest);

  const bulkRegularizations = useBulkReviewRegularizations();
  const bulkExpenses = useBulkUpdateExpenseStatus();
  const updateLeave = useUpdateLeaveStatus();
  const updateWFH = useUpdateWFHStatus();

  const label = DOMAIN_LABEL[fields.domain];
  if (receipt) return <Receipt receipt={receipt} title={`Review of ${label}`} />;

  const decide = (status: 'approved' | 'rejected') =>
    commit(async (): Promise<CommitOutcome> => {
      const ids = fields.rows.filter((r) => selected.has(r.id)).map((r) => r.id);
      const reviewComment = comment.trim() || undefined;
      const failed: string[] = [];
      if (fields.domain === 'regularization') await bulkRegularizations.mutateAsync({ ids, status, reviewComment });
      else if (fields.domain === 'expense') await bulkExpenses.mutateAsync({ ids, status, reviewComment });
      else {
        for (const id of ids) {
          try {
            if (fields.domain === 'leave') await updateLeave.mutateAsync({ leaveId: id, status });
            else await updateWFH.mutateAsync({ requestId: id, status, reviewComment });
          } catch {
            failed.push(fields.rows.find((r) => r.id === id)?.employeeName ?? id);
          }
        }
        if (failed.length === ids.length) throw new Error(`None of the ${label} could be updated.`);
      }
      const done = ids.length - failed.length;
      return {
        summary: `${done} ${label} ${status}${failed.length ? `; ${failed.length} failed (${failed.join(', ')})` : ''}`,
        link: fields.domain === 'expense' ? '/admin/expenses' : '/admin/requests',
        committedFields: { domain: fields.domain, status, ids },
      };
    });

  const count = selected.size;
  const needsSecond = count > BULK_CONFIRM_THRESHOLD;
  const warning = `This affects ${count} ${label} and can't be undone from HR Buddy.`;

  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title={`Review ${label}`}
      subtitle={`${fields.rows.length} pending`}
      issues={latest.draft.issues}
      error={error}
      footer={
        <>
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" aria-label="Review comment" className="h-8 min-w-40 flex-1" />
          <ConfirmBulk label={`Reject ${count}`} confirmLabel={`Yes, reject ${count}`} warning={warning} requireSecondPress={needsSecond} variant="destructive" disabled={count === 0} pending={pending} onConfirm={() => decide('rejected')} />
          <ConfirmBulk label={`Approve ${count}`} confirmLabel={`Yes, approve ${count}`} warning={warning} requireSecondPress={needsSecond} disabled={count === 0} pending={pending} onConfirm={() => decide('approved')} />
        </>
      }
    >
      {fields.rows.length > 0 && (
        <ChecklistRows
          label={label}
          items={fields.rows.map((r) => ({ id: r.id, title: r.employeeName, meta: r.date, detail: r.detail, flag: r.flag }))}
          selected={selected}
          onChange={setSelected}
        />
      )}
    </DraftFrame>
  );
}
