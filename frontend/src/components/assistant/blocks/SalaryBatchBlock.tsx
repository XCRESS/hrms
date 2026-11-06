import { useState } from 'react';
import { format } from 'date-fns';
import { useBulkGenerateSalarySlips, useBulkUpdateSalarySlipStatus } from '@/hooks/queries/useSalary';
import { BULK_CONFIRM_THRESHOLD, type SalaryBatchFields } from '../types';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftCommit, type CommitOutcome } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ChecklistRows } from './ChecklistRows';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

const ACTION = {
  generate: { title: 'Generate salary slips', button: 'Generate', done: 'generated' },
  publish: { title: 'Publish salary slips', button: 'Publish', done: 'published' },
  unpublish: { title: 'Unpublish salary slips', button: 'Unpublish', done: 'moved back to draft' },
} as const;

export function SalaryBatchBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const fields = latest.draft.fields as unknown as SalaryBatchFields;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(fields.rows.filter((r) => r.preselected).map((r) => r.employeeId)));
  const { commit, pending, error, receipt } = useDraftCommit(latest);
  const generate = useBulkGenerateSalarySlips();
  const updateStatus = useBulkUpdateSalarySlipStatus();

  const action = ACTION[fields.action];
  const period = format(new Date(fields.year, fields.month - 1, 1), 'MMMM yyyy');
  if (receipt) return <Receipt receipt={receipt} title={`${action.title} · ${period}`} />;

  const run = () =>
    commit(async (): Promise<CommitOutcome> => {
      const employeeIds = fields.rows.filter((r) => selected.has(r.employeeId)).map((r) => r.employeeId);
      if (fields.action === 'generate') {
        const result = await generate.mutateAsync({ employeeIds, month: fields.month, year: fields.year, taxRegime: fields.taxRegime, enableTaxDeduction: fields.enableTaxDeduction });
        const s = result?.summary;
        return {
          summary: s ? `${period}: ${s.created} created, ${s.updated} updated, ${s.skipped} skipped, ${s.failed} failed` : `${employeeIds.length} slips generated for ${period}`,
          link: '/salary-slips',
          committedFields: { action: fields.action, month: fields.month, year: fields.year, employeeIds },
        };
      }
      await updateStatus.mutateAsync({
        salarySlips: employeeIds.map((employeeId) => ({ employeeId, month: fields.month, year: fields.year })),
        status: fields.action === 'publish' ? 'finalized' : 'draft',
      });
      return {
        summary: `${employeeIds.length} ${period} slip${employeeIds.length === 1 ? '' : 's'} ${action.done}`,
        link: '/salary-slips',
        committedFields: { action: fields.action, month: fields.month, year: fields.year, employeeIds },
      };
    });

  const count = selected.size;
  const isPublish = fields.action === 'publish';

  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title={`${action.title} · ${period}`}
      subtitle={fields.action === 'generate' ? `Tax regime: ${fields.taxRegime} · TDS ${fields.enableTaxDeduction ? 'on' : 'off'}` : undefined}
      issues={latest.draft.issues}
      error={error}
      footer={
        <>
          <span className="mr-auto" />
          <ConfirmBulk
            label={`${action.button} ${count}`}
            confirmLabel={`Yes, ${action.button.toLowerCase()} ${count}`}
            warning={isPublish ? 'Employees will see these slips immediately.' : `This affects ${count} salary slips.`}
            requireSecondPress={isPublish || count > BULK_CONFIRM_THRESHOLD}
            disabled={count === 0}
            pending={pending}
            onConfirm={run}
          />
        </>
      }
    >
      {fields.rows.length > 0 && (
        <ChecklistRows
          label="employees"
          items={fields.rows.map((r) => ({ id: r.employeeId, title: r.employeeName, meta: r.employeeId, flag: r.flag }))}
          selected={selected}
          onChange={setSelected}
        />
      )}
    </DraftFrame>
  );
}
