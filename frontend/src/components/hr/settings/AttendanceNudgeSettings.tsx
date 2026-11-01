import { BellRing } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AttendanceNudgeSettings as Nudges } from './types';

interface Props {
  nudges: Nudges;
  onChange: (next: Nudges) => void;
  workStartTime: string;
  lateThreshold: string;
  workEndTime: string;
  disabled?: boolean;
}

const shift = (hhmm: string, minutes: number): string => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours % 12 || 12}:${String(mins).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
};

type Key = keyof Nudges;

export default function AttendanceNudgeSettings({ nudges, onChange, workStartTime, lateThreshold, workEndTime, disabled }: Props) {
  const set = <K extends Key>(key: K, patch: Partial<Nudges[K]>) =>
    onChange({ ...nudges, [key]: { ...nudges[key], ...patch } });

  const rows: Array<{
    key: Key;
    title: string;
    audience: string;
    field: 'minutesBefore' | 'minutesAfter';
    unit: string;
    max: number;
    min: number;
    when: (minutes: number) => string;
  }> = [
    {
      key: 'checkInReminder',
      title: 'Check-in reminder',
      audience: "Employees who haven't checked in",
      field: 'minutesBefore',
      unit: 'min before late mark',
      min: 5,
      max: 120,
      when: (m) => shift(lateThreshold, -m),
    },
    {
      key: 'missedCheckIn',
      title: 'Missed check-in',
      audience: 'Still not in and not on leave',
      field: 'minutesAfter',
      unit: 'min after late mark',
      min: 0,
      max: 240,
      when: (m) => shift(lateThreshold, m),
    },
    {
      key: 'missedCheckOut',
      title: 'Forgot to check out',
      audience: 'Checked in but never checked out',
      field: 'minutesAfter',
      unit: 'min after work ends',
      min: 0,
      max: 360,
      when: (m) => shift(workEndTime, m),
    },
    {
      key: 'hrDigest',
      title: 'HR morning digest',
      audience: 'HR & admins: present, late, absent, pending requests',
      field: 'minutesAfter',
      unit: 'min after work starts',
      min: 0,
      max: 480,
      when: (m) => shift(workStartTime, m),
    },
  ];

  return (
    <section aria-labelledby="nudges-title" className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <BellRing className="mt-0.5 size-5 text-primary" />
        <div>
          <h3 id="nudges-title" className="text-base sm:text-lg font-semibold text-foreground">
            Attendance nudges
          </h3>
          <p className="text-sm text-muted-foreground">
            Push and inbox alerts, sent once per person per day. Weekends, holidays and approved leave are skipped.
            Times follow each department's own schedule.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const config = nudges[row.key];
          const value = (config as Record<string, number | boolean>)[row.field] as number;
          const inputId = `nudge-${row.key}`;
          return (
            <li key={row.key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`${inputId}-enabled`}
                  checked={config.enabled}
                  disabled={disabled}
                  onCheckedChange={(checked) => set(row.key, { enabled: checked === true })}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor={`${inputId}-enabled`} className="font-medium text-foreground">
                    {row.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">{row.audience}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-7 sm:pl-0">
                <Input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={row.min}
                  max={row.max}
                  value={value}
                  disabled={disabled || !config.enabled}
                  aria-label={`${row.title}: ${row.unit}`}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next)) {
                      set(row.key, { [row.field]: Math.min(row.max, Math.max(row.min, Math.round(next))) } as Partial<Nudges[typeof row.key]>);
                    }
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {row.unit}
                  {config.enabled && <span className="text-foreground"> · {row.when(value)}</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
