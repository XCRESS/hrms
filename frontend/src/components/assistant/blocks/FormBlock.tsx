import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EnhancedDatePicker from '@/components/ui/enhanced-datepicker';
import { useCreateHoliday } from '@/hooks/queries/useHolidays';
import { useRequestLeave } from '@/hooks/queries/useLeaves';
import { useRequestWFH } from '@/hooks/queries/useWFH';
import { useRequestRegularization } from '@/hooks/queries/useRegularizations';
import { useSubmitHelpInquiry } from '@/hooks/queries/useHelp';
import { useSubmitTaskReport } from '@/hooks/queries/useTaskReports';
import { useCheckOut } from '@/hooks/queries/useAttendance';
import { acquireBestFix } from '@/utils/geolocation';
import type { CreateHelpInquiryDto, CreateWFHRequestDto, LeaveRequestDto } from '@/types';
import type { DraftKind, HelpFields, HolidayFields, LeaveFields, RegularizationFields, TaskReportCheckoutFields, WFHFields } from '../types';
import { type DraftEntry, lastOf } from './draftEntries';
import { useDraftVersions } from './useDraftVersions';
import { useDraftCommit, type CommitOutcome } from './useDraftActions';
import { DraftFrame } from './DraftFrame';
import { ConfirmBulk } from './ConfirmBulk';
import { Receipt } from './Receipt';

type FormFields = HolidayFields | TaskReportCheckoutFields | LeaveFields | WFHFields | RegularizationFields | HelpFields;

const TITLES: Partial<Record<DraftKind, string>> = {
  holiday: 'New holiday',
  taskReportCheckout: 'Task report',
  leave: 'Leave request',
  wfh: 'Work from home request',
  regularization: 'Attendance regularization',
  help: 'Help request',
};

const toDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00`) : null);
const toIso = (date: Date | null) => (date ? format(date, 'yyyy-MM-dd') : '');
const prettyDate = (iso: string) => (iso ? format(new Date(`${iso}T00:00:00`), 'EEE d MMM yyyy') : '');

function DateField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (iso: string) => void }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1" id={id}>
        <EnhancedDatePicker value={toDate(value)} onChange={(d) => onChange(toIso(d))} />
      </div>
    </div>
  );
}

function TextField({ id, label, value, onChange, type = 'text' }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}

function LongField({ id, label, value, onChange, rows = 3 }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="mt-1" />
    </div>
  );
}

function TaskList({ id, tasks, onChange }: { id: string; tasks: string[]; onChange: (tasks: string[]) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">What you worked on</legend>
      {tasks.map((task, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={task} aria-label={`Task ${i + 1}`} onChange={(e) => onChange(tasks.map((t, j) => (j === i ? e.target.value : t)))} id={`${id}-${i}`} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove task ${i + 1}`} onClick={() => onChange(tasks.filter((_, j) => j !== i))}>
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...tasks, ''])}>
        <Plus className="size-3.5" />
        Add task
      </Button>
    </fieldset>
  );
}

const requiredIssues = (kind: DraftKind, f: FormFields): string[] => {
  const missing = (cond: boolean, msg: string) => (cond ? [msg] : []);
  switch (kind) {
    case 'holiday': {
      const h = f as HolidayFields;
      return [...missing(!h.title.trim(), 'Add a name'), ...missing(!h.date, 'Pick a date')];
    }
    case 'taskReportCheckout':
      return missing(!(f as TaskReportCheckoutFields).tasks.some((t) => t.trim()), 'Add at least one task');
    case 'leave': {
      const l = f as LeaveFields;
      return [...missing(!l.startDate, 'Pick a start date'), ...missing(!l.reason.trim(), 'Add a reason'), ...missing(!!l.endDate && l.endDate < l.startDate, 'End date is before the start')];
    }
    case 'wfh':
      return missing((f as WFHFields).reason.trim().length < 10, 'Give a reason of at least 10 characters');
    case 'regularization': {
      const r = f as RegularizationFields;
      return [...missing(!r.date, 'Pick the day'), ...missing(!r.reason.trim(), 'Add a reason')];
    }
    case 'help': {
      const h = f as HelpFields;
      return [...missing(!h.subject.trim(), 'Add a subject'), ...missing(!h.description.trim(), 'Describe the issue')];
    }
    default:
      return [];
  }
};

export function FormBlock({ entries }: { entries: DraftEntry[] }) {
  const latest = lastOf(entries);
  const draft = latest.draft;
  const kind = draft.draftKind;
  const versions = useDraftVersions(entries.map((e) => e.draft.fields as unknown as FormFields));
  const fields = versions.current;
  const { commit, pending, error, receipt } = useDraftCommit(latest);

  const createHoliday = useCreateHoliday();
  const requestLeave = useRequestLeave();
  const requestWFH = useRequestWFH();
  const requestRegularization = useRequestRegularization();
  const submitHelp = useSubmitHelpInquiry();
  const submitTaskReport = useSubmitTaskReport();
  const checkOut = useCheckOut();

  const title = TITLES[kind] ?? 'Request';
  if (receipt) return <Receipt receipt={receipt} title={title} />;

  const set = (patch: Partial<FormFields>) => versions.edit({ ...fields, ...patch } as FormFields);
  const id = (name: string) => `${draft.draftId}-${name}`;
  const issues = requiredIssues(kind, fields);

  const run = async (): Promise<CommitOutcome> => {
    switch (kind) {
      case 'holiday': {
        const h = fields as HolidayFields;
        await createHoliday.mutateAsync({ title: h.title.trim(), date: h.date, description: h.description || undefined, isOptional: h.type === 'optional' });
        return { summary: `${h.title.trim()} added as a holiday on ${prettyDate(h.date)}`, link: '/holidays', committedFields: { ...h } };
      }
      case 'taskReportCheckout': {
        const t = fields as TaskReportCheckoutFields;
        const tasks = t.tasks.map((x) => x.trim()).filter(Boolean);
        if (t.checkOut) {
          const location = await acquireBestFix().catch(() => undefined);
          await checkOut.mutateAsync({ tasks, ...(location ?? {}) });
          return { summary: `Task report submitted and checked out (${tasks.length} task${tasks.length === 1 ? '' : 's'})`, link: '/attendance/my', committedFields: { tasks, checkedOut: true } };
        }
        await submitTaskReport.mutateAsync({ tasks });
        return { summary: `Task report submitted (${tasks.length} task${tasks.length === 1 ? '' : 's'})`, link: '/task-reports/my', committedFields: { tasks } };
      }
      case 'leave': {
        const l = fields as LeaveFields;
        const endDate = l.endDate || l.startDate;
        await requestLeave.mutateAsync({ leaveMode: endDate === l.startDate ? 'single' : 'multi', leaveType: l.leaveType, startDate: l.startDate, endDate, reason: l.reason.trim() } as LeaveRequestDto);
        return { summary: `Leave requested for ${prettyDate(l.startDate)}${endDate !== l.startDate ? ` – ${prettyDate(endDate)}` : ''}`, link: '/requests', committedFields: { ...l } };
      }
      case 'wfh': {
        const w = fields as WFHFields;
        const location = await acquireBestFix().catch(() => undefined);
        await requestWFH.mutateAsync({ reason: w.reason.trim(), ...(location ?? {}) } as unknown as CreateWFHRequestDto);
        return { summary: 'Work-from-home request sent to HR', link: '/requests', committedFields: { ...w } };
      }
      case 'regularization': {
        const r = fields as RegularizationFields;
        await requestRegularization.mutateAsync({ date: r.date, requestedCheckIn: r.requestedCheckIn, requestedCheckOut: r.requestedCheckOut, reason: r.reason.trim() });
        return { summary: `Regularization requested for ${prettyDate(r.date)}`, link: '/requests', committedFields: { ...r } };
      }
      default: {
        const h = fields as HelpFields;
        await submitHelp.mutateAsync({ subject: h.subject.trim(), description: h.description.trim(), category: h.category, priority: h.priority } as CreateHelpInquiryDto);
        return { summary: `Help request “${h.subject.trim()}” sent to HR`, committedFields: { ...h } };
      }
    }
  };

  const actionLabel: Partial<Record<DraftKind, string>> = {
    holiday: 'Add holiday',
    taskReportCheckout: (fields as TaskReportCheckoutFields).checkOut ? 'Submit & check out' : 'Submit report',
    leave: 'Request leave',
    wfh: 'Send request',
    regularization: 'Send request',
    help: 'Send to HR',
  };

  return (
    <DraftFrame
      anchorId={`draft-${draft.draftId}`}
      title={title}
      subtitle={kind === 'taskReportCheckout' ? prettyDate((fields as TaskReportCheckoutFields).date) : undefined}
      notes={draft.notes}
      issues={issues}
      error={error}
      versions={versions}
      footer={
        <>
          {draft.alternatives?.map((alt) => (
            <Button key={alt.label} variant="outline" size="sm" onClick={() => set(alt.fields as Partial<FormFields>)}>
              {alt.label}
            </Button>
          ))}
          <span className="mr-auto" />
          <ConfirmBulk label={actionLabel[kind] ?? 'Confirm'} confirmLabel="Yes" warning="" requireSecondPress={false} disabled={issues.length > 0} pending={pending} onConfirm={() => commit(run)} />
        </>
      }
    >
      {kind === 'holiday' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField id={id('title')} label="Holiday" value={(fields as HolidayFields).title} onChange={(title) => set({ title })} />
          <DateField id={id('date')} label="Date" value={(fields as HolidayFields).date} onChange={(date) => set({ date })} />
          <div>
            <Label htmlFor={id('type')}>Type</Label>
            <Select value={(fields as HolidayFields).type} onValueChange={(type) => set({ type: type as HolidayFields['type'], isOptional: type === 'optional' })}>
              <SelectTrigger id={id('type')} className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public holiday</SelectItem>
                <SelectItem value="optional">Optional holiday</SelectItem>
                <SelectItem value="restricted">Restricted holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TextField id={id('desc')} label="Description (optional)" value={(fields as HolidayFields).description} onChange={(description) => set({ description })} />
        </div>
      )}

      {kind === 'taskReportCheckout' && (
        <div className="space-y-3">
          <TaskList id={id('task')} tasks={(fields as TaskReportCheckoutFields).tasks} onChange={(tasks) => set({ tasks })} />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={(fields as TaskReportCheckoutFields).checkOut} onCheckedChange={(v) => set({ checkOut: v === true })} />
            Check me out when I submit
          </label>
        </div>
      )}

      {kind === 'leave' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={id('type')}>Leave</Label>
            <Select value={(fields as LeaveFields).leaveType} onValueChange={(leaveType) => set({ leaveType: leaveType as LeaveFields['leaveType'] })}>
              <SelectTrigger id={id('type')} className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-day">Full day</SelectItem>
                <SelectItem value="half-day">Half day</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div />
          <DateField id={id('start')} label="From" value={(fields as LeaveFields).startDate} onChange={(startDate) => set({ startDate })} />
          <DateField id={id('end')} label="To" value={(fields as LeaveFields).endDate} onChange={(endDate) => set({ endDate })} />
          <div className="sm:col-span-2">
            <LongField id={id('reason')} label="Reason" value={(fields as LeaveFields).reason} onChange={(reason) => set({ reason })} />
          </div>
        </div>
      )}

      {kind === 'wfh' && <LongField id={id('reason')} label="Reason" value={(fields as WFHFields).reason} onChange={(reason) => set({ reason })} />}

      {kind === 'regularization' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <DateField id={id('date')} label="Day" value={(fields as RegularizationFields).date} onChange={(date) => set({ date })} />
          <TextField id={id('in')} label="Check-in" type="time" value={(fields as RegularizationFields).requestedCheckIn} onChange={(requestedCheckIn) => set({ requestedCheckIn })} />
          <TextField id={id('out')} label="Check-out" type="time" value={(fields as RegularizationFields).requestedCheckOut} onChange={(requestedCheckOut) => set({ requestedCheckOut })} />
          <div className="sm:col-span-3">
            <LongField id={id('reason')} label="Reason" value={(fields as RegularizationFields).reason} onChange={(reason) => set({ reason })} />
          </div>
        </div>
      )}

      {kind === 'help' && (
        <div className="space-y-3">
          <TextField id={id('subject')} label="Subject" value={(fields as HelpFields).subject} onChange={(subject) => set({ subject })} />
          <LongField id={id('desc')} label="Details" rows={5} value={(fields as HelpFields).description} onChange={(description) => set({ description })} />
        </div>
      )}
    </DraftFrame>
  );
}
