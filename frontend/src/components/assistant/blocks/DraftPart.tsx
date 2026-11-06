import { ArrowUp } from 'lucide-react';
import type { Draft } from '../types';
import { useDraftEntries, lastOf } from './draftEntries';
import { AnnouncementBlock, EmailBlock } from './WritingBlock';
import { FormBlock } from './FormBlock';
import { ApprovalBlock } from './ApprovalBlock';
import { SalaryBatchBlock } from './SalaryBatchBlock';
import { SalaryBlock } from './SalaryBlock';
import { EmployeeStatusBlock, RoleChangeBlock } from './ConfirmActionBlock';
import { AttendanceFixBlock } from './AttendanceFixBlock';

/** A draft renders once, at its first revision's spot, always showing the latest revision; later revisions leave a pointer. */
export function DraftPart({ draft, toolCallId }: { draft: Draft; toolName: string; toolCallId: string }) {
  const registered = useDraftEntries(draft.draftId);
  const entries = registered.length ? registered : [{ messageId: '', toolCallId, draft }];

  if (entries[0]!.toolCallId !== toolCallId) {
    return (
      <button
        type="button"
        onClick={() => document.getElementById(`draft-${draft.draftId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        className="my-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ArrowUp className="size-3.5" aria-hidden />
        Updated the draft above
      </button>
    );
  }

  // Keyed by the latest revision so checklist selections reset when the AI sends a new list.
  const key = lastOf(entries).toolCallId;
  switch (draft.draftKind) {
    case 'announcement':
      return <AnnouncementBlock entries={entries} />;
    case 'email':
      return <EmailBlock entries={entries} />;
    case 'approval':
      return <ApprovalBlock key={key} entries={entries} />;
    case 'salaryBatch':
      return <SalaryBatchBlock key={key} entries={entries} />;
    case 'salaryStructure':
    case 'salarySlip':
      return <SalaryBlock entries={entries} />;
    case 'attendanceFix':
      return <AttendanceFixBlock key={key} entries={entries} />;
    case 'roleChange':
      return <RoleChangeBlock entries={entries} />;
    case 'employeeStatus':
      return <EmployeeStatusBlock entries={entries} />;
    default:
      return <FormBlock entries={entries} />;
  }
}
