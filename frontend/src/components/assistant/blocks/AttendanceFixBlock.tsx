import { useState } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateAttendanceRecord } from '@/hooks/queries/useAttendance';
import { BULK_CONFIRM_THRESHOLD, type AttendanceFixFields } from '../types';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftCommit, type CommitOutcome } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ChecklistRows } from './ChecklistRows';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

const prettyDate = (iso: string) => format(new Date(`${iso}T00:00:00`), 'EEE d MMM');
// Attendance times are IST wall-clock times, whatever the browser's zone.
const istIso = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`).toISOString();

export function AttendanceFixBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const fields = latest.draft.fields as unknown as AttendanceFixFields;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(fields.rows.filter((r) => r.preselected).map((r) => r.recordId)));
  const [time, setTime] = useState(fields.checkOutTime);
  const { commit, pending, error, receipt } = useDraftCommit(latest);
  const updateRecord = useUpdateAttendanceRecord();

  const title = `Missing check-outs · ${fields.employeeName}`;
  if (receipt) return <Receipt receipt={receipt} title={title} />;

  const run = () =>
    commit(async (): Promise<CommitOutcome> => {
      const rows = fields.rows.filter((r) => selected.has(r.recordId));
      const failed: string[] = [];
      for (const row of rows) {
        try {
          await updateRecord.mutateAsync({ recordId: row.recordId, updateData: { checkOut: istIso(row.date, time) } });
        } catch {
          failed.push(prettyDate(row.date));
        }
      }
      if (failed.length === rows.length) throw new Error('None of the check-outs could be saved.');
      const done = rows.length - failed.length;
      return {
        summary: `Check-out set to ${time} on ${done} day${done === 1 ? '' : 's'} for ${fields.employeeName}${failed.length ? `; failed: ${failed.join(', ')}` : ''}`,
        link: '/dashboard',
        committedFields: { checkOutTime: time, recordIds: rows.map((r) => r.recordId) },
      };
    });

  const count = selected.size;
  const invalidTime = !/^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  return (
    <DraftFrame
      anchorId={`draft-${latest.draft.draftId}`}
      title={title}
      subtitle={`${fields.rows.length} day${fields.rows.length === 1 ? '' : 's'} with a check-in but no check-out`}
      issues={[...latest.draft.issues, ...(invalidTime ? ['Pick a check-out time'] : [])]}
      error={error}
      footer={
        <>
          <span className="mr-auto" />
          <ConfirmBulk
            label={`Set check-out on ${count} day${count === 1 ? '' : 's'}`}
            confirmLabel={`Yes, update ${count}`}
            warning={`This changes ${count} attendance records.`}
            requireSecondPress={count > BULK_CONFIRM_THRESHOLD}
            disabled={count === 0 || invalidTime}
            pending={pending}
            onConfirm={run}
          />
        </>
      }
    >
      {fields.rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor={`${latest.draft.draftId}-time`}>Check-out time (IST)</Label>
              <Input id={`${latest.draft.draftId}-time`} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-36" />
            </div>
          </div>
          <ChecklistRows
            label="days"
            items={fields.rows.map((r) => ({ id: r.recordId, title: prettyDate(r.date), meta: `checked in ${r.checkIn}`, flag: r.flag }))}
            selected={selected}
            onChange={setSelected}
          />
        </div>
      )}
    </DraftFrame>
  );
}
