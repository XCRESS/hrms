import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import type { DateTime } from 'luxon';
import Employee from '../../../models/Employee.model.js';
import { AttendanceReportService } from '../../attendance/AttendanceReportService.js';
import { parseISTDateString, toIST } from '../../../utils/timezone.js';
import { emptyView, splitByPersonInput, summarizeForModel, withPersonTabs, type Cell, type ColumnSpec, type ResultView } from '../views.js';
import { ALL_ROLES, STAFF_ROLES, type AssistantToolDef } from './types.js';

const MAX_RANGE_DAYS = 93;

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Use the id returned by find_employee');

export const istDay = (date: string): Date => parseISTDateString(date).startOf('day').toJSDate();

/** Clamps the end to today and rejects inverted or over-long ranges. */
export const resolveRange = (startDate: string, endDate: string, now: DateTime): { start: Date; end: Date } | { error: string } => {
  const start = parseISTDateString(startDate).startOf('day');
  const requestedEnd = parseISTDateString(endDate).startOf('day');
  const today = now.startOf('day');
  const end = requestedEnd > today ? today : requestedEnd;
  if (start > end) return { error: 'That range has not started yet, or the start is after the end.' };
  if (end.diff(start, 'days').days + 1 > MAX_RANGE_DAYS) return { error: `Please pick a range of ${MAX_RANGE_DAYS} days or less.` };
  return { start: start.toJSDate(), end: end.toJSDate() };
};

type Percentage = number | { percentage: number };
// The report service returns { percentage, … }; older callers typed it as a number.
const percentOf = (value: Percentage) => (typeof value === 'number' ? value : value.percentage);

const time = (value: unknown): string | null => (value ? toIST(value as Date).toFormat('HH:mm') : null);

interface DayFlags { isLate?: boolean; isLeave?: boolean; isHoliday?: boolean; isWeekend?: boolean }
interface ProcessedDay {
  date?: Date | string;
  employee?: { _id: Types.ObjectId; employeeId: string; firstName: string; lastName: string };
  employeeName?: string;
  checkIn?: Date | null;
  checkOut?: Date | null;
  status: string;
  workHours?: number | null;
  flags?: DayFlags;
  holidayTitle?: string;
}

export const dayStatus = (r: ProcessedDay): string => {
  if (r.status !== 'absent') return r.status;
  if (r.flags?.isLeave) return 'on leave';
  if (r.flags?.isHoliday) return 'holiday';
  if (r.flags?.isWeekend) return 'weekly off';
  return 'absent';
};

const cleanName = (first = '', last = '') => `${first} ${last}`.trim().replace(/\s+/g, ' ');

const DAY_COLUMNS = {
  name: { key: 'name', label: 'Name', kind: 'text' },
  employeeId: { key: 'employeeId', label: 'Employee ID', kind: 'text' },
  department: { key: 'department', label: 'Department', kind: 'text' },
  checkIn: { key: 'checkIn', label: 'Check-in', kind: 'time' },
  checkOut: { key: 'checkOut', label: 'Check-out', kind: 'time' },
  workHours: { key: 'workHours', label: 'Hours', kind: 'hours' },
  status: { key: 'status', label: 'Status', kind: 'status' },
} as const satisfies Record<string, ColumnSpec>;
type DayColumn = keyof typeof DAY_COLUMNS;
const DAY_COLUMN_KEYS = Object.keys(DAY_COLUMNS) as [DayColumn, ...DayColumn[]];

const statusTiles = (rows: Record<string, Cell>[]) => {
  const count = (status: string) => rows.filter((r) => r.status === status).length;
  return [
    { key: 'present', label: 'Present', value: count('present'), tone: 'positive' as const, filter: { column: 'status', equals: 'present' } },
    { key: 'absent', label: 'Absent', value: count('absent'), tone: 'negative' as const, filter: { column: 'status', equals: 'absent' } },
    { key: 'half-day', label: 'Half-day', value: count('half-day'), tone: 'warning' as const, filter: { column: 'status', equals: 'half-day' } },
    { key: 'leave', label: 'On leave', value: count('on leave'), tone: 'neutral' as const, filter: { column: 'status', equals: 'on leave' } },
    { key: 'late', label: 'Late', value: rows.filter((r) => r.late === 'yes').length, tone: 'warning' as const, filter: { column: 'late', equals: 'yes' } },
  ];
};

const attendanceDayTool: AssistantToolDef = {
  name: 'attendance_day',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description: "Everyone's attendance for one day: check-in, check-out, hours and status, with absences per the work calendar.",
      inputSchema: z.object({
        date: isoDate,
        columns: z.array(z.enum(DAY_COLUMN_KEYS)).optional().describe('Only these columns, when the user asked for specific ones. Status is always kept.'),
      }),
      execute: async ({ date, columns }): Promise<ResultView> => {
        const data = (await AttendanceReportService.generateDashboardData(istDay(date))) as {
          records: ProcessedDay[];
          isWorkingDay: boolean;
          dayType: string;
        };
        const departments = new Map(
          (await Employee.find({ isActive: true }).select('_id department').lean()).map((e) => [e._id.toString(), e.department ?? null])
        );
        const rows = data.records.map((r) => ({
          id: r.employee?._id.toString() ?? null,
          name: cleanName(r.employee?.firstName, r.employee?.lastName) || (r.employeeName ?? ''),
          employeeId: r.employee?.employeeId ?? null,
          department: r.employee ? departments.get(r.employee._id.toString()) ?? null : null,
          checkIn: time(r.checkIn),
          checkOut: time(r.checkOut),
          workHours: r.workHours ?? null,
          status: dayStatus(r),
          late: r.flags?.isLate ? 'yes' : 'no',
        }));
        const wanted = new Set<DayColumn>([...(columns?.length ? columns : DAY_COLUMN_KEYS), 'status']);
        return {
          kind: 'result',
          title: `Attendance · ${parseISTDateString(date).toFormat('ccc d LLL yyyy')}`,
          ...(data.isWorkingDay ? {} : { subtitle: `Not a working day (${data.dayType})` }),
          columns: DAY_COLUMN_KEYS.filter((k) => wanted.has(k)).map((k) => DAY_COLUMNS[k]),
          rows,
          tiles: statusTiles(rows),
          defaultView: 'table',
          link: { label: 'Attendance dashboard', href: '/dashboard' },
        };
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

const attendanceRangeTool: AssistantToolDef = {
  name: 'attendance_range',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description: 'Per-employee attendance summary over a date range (max 93 days): working days, present, absent, half-days, leave, hours and attendance %.',
      inputSchema: z.object({ startDate: isoDate, endDate: isoDate, department: z.string().trim().max(200).optional() }),
      execute: async ({ startDate, endDate, department }): Promise<ResultView> => {
        const range = resolveRange(startDate, endDate, ctx.now);
        if ('error' in range) return emptyView('Attendance summary', range.error);
        const report = (await AttendanceReportService.generateCustomReport({
          startDate: range.start,
          endDate: range.end,
          ...(department ? { departments: [department] } : {}),
          includeCharts: false,
        })) as {
          employeeReports: {
            employee: { _id: Types.ObjectId; employeeId: string; firstName: string; lastName: string; department?: string };
            summary: { totalWorkingDays: number; presentDays: number; absentDays: number; halfDays: number; leaveDays: number; totalWorkHours: number };
            attendancePercentage: Percentage;
          }[];
        };
        const rows = report.employeeReports.map(({ employee, summary, attendancePercentage }) => ({
          id: employee._id.toString(),
          name: cleanName(employee.firstName, employee.lastName),
          employeeId: employee.employeeId,
          department: employee.department ?? null,
          workingDays: summary.totalWorkingDays,
          present: summary.presentDays,
          absent: summary.absentDays,
          halfDays: summary.halfDays,
          leave: summary.leaveDays,
          hours: Math.round(summary.totalWorkHours * 10) / 10,
          percent: percentOf(attendancePercentage),
        }));
        const fmt = (d: Date) => toIST(d).toFormat('d LLL yyyy');
        return {
          kind: 'result',
          title: `Attendance summary · ${fmt(range.start)} – ${fmt(range.end)}`,
          ...(department ? { subtitle: department } : {}),
          columns: [
            { key: 'name', label: 'Name', kind: 'text' },
            { key: 'workingDays', label: 'Working days', kind: 'number' },
            { key: 'present', label: 'Present', kind: 'number' },
            { key: 'absent', label: 'Absent', kind: 'number' },
            { key: 'halfDays', label: 'Half-days', kind: 'number' },
            { key: 'leave', label: 'Leave', kind: 'number' },
            { key: 'hours', label: 'Hours', kind: 'hours' },
            { key: 'percent', label: 'Attendance %', kind: 'number' },
          ],
          rows,
          tiles: [
            { key: 'people', label: 'Employees', value: rows.length },
            { key: 'absent', label: 'Absent days', value: rows.reduce((s, r) => s + r.absent, 0), tone: 'negative' },
            { key: 'leave', label: 'Leave days', value: rows.reduce((s, r) => s + r.leave, 0) },
          ],
          chart: { type: 'bar', x: 'name', series: [{ key: 'percent', label: 'Attendance %' }] },
          defaultView: 'table',
          link: { label: 'Attendance dashboard', href: '/dashboard' },
        };
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

export const personAttendanceView = async (employeeObjIds: Types.ObjectId[], start: Date, end: Date): Promise<ResultView> => {
  const employees = await Employee.find({ _id: { $in: employeeObjIds } })
    .select('_id firstName lastName employeeId department position joiningDate')
    .lean();
  if (!employees.length) return emptyView('Attendance', 'Employee not found');

  const reports = (await AttendanceReportService.generateEmployeeReports(employees, start, end)) as {
    employee: { firstName: string; lastName: string };
    records: ProcessedDay[];
    summary: { totalWorkingDays: number; totalWorkHours: number };
    attendancePercentage: Percentage;
  }[];
  if (!reports.length) return emptyView('Attendance', 'No attendance data');

  const several = reports.length > 1;
  const rows = reports.flatMap((report) =>
    report.records.map((r) => ({
      name: cleanName(report.employee.firstName, report.employee.lastName),
      date: r.date ? toIST(r.date as Date).toISODate() : null,
      day: r.date ? toIST(r.date as Date).toFormat('ccc') : null,
      checkIn: time(r.checkIn),
      checkOut: time(r.checkOut),
      workHours: r.workHours ?? null,
      status: dayStatus(r),
      late: r.flags?.isLate ? 'yes' : 'no',
    }))
  );
  const fmt = (d: Date) => toIST(d).toFormat('d LLL yyyy');
  const names = reports.length > 4 ? `${reports.length} employees` : reports.map((r) => cleanName(r.employee.firstName, r.employee.lastName)).join(', ');
  const subtitle = reports.length > 4 ? undefined : reports
    .map((r) => `${several ? `${cleanName(r.employee.firstName, r.employee.lastName)}: ` : ''}${percentOf(r.attendancePercentage)}% attendance, ${Math.round(r.summary.totalWorkHours * 10) / 10}h over ${r.summary.totalWorkingDays} working days`)
    .join(' · ');
  return {
    kind: 'result',
    title: `${names} · ${fmt(start)} – ${fmt(end)}`,
    ...(subtitle ? { subtitle } : {}),
    columns: [
      ...(several ? [{ key: 'name', label: 'Name', kind: 'text' as const }] : []),
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'day', label: 'Day', kind: 'text' },
      { key: 'checkIn', label: 'Check-in', kind: 'time' },
      { key: 'checkOut', label: 'Check-out', kind: 'time' },
      { key: 'workHours', label: 'Hours', kind: 'hours' },
      { key: 'status', label: 'Status', kind: 'status' },
    ],
    rows,
    tiles: statusTiles(rows),
    defaultView: 'table',
  };
};

const attendancePersonTool: AssistantToolDef = {
  name: 'attendance_person',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        'Day-by-day attendance over a range (max 93 days) for named employees (ids from find_employee, all in one call), or for every active employee when employees is omitted. Use attendance_range instead for one summary row per person.',
      inputSchema: z.object({ employees: z.array(objectId).min(1).max(50).optional(), startDate: isoDate, endDate: isoDate, splitByPerson: splitByPersonInput }),
      execute: async ({ employees, startDate, endDate, splitByPerson }) => {
        const range = resolveRange(startDate, endDate, ctx.now);
        if ('error' in range) return emptyView('Attendance', range.error);
        const ids = employees?.length
          ? employees.map((id) => new Types.ObjectId(id))
          : (await Employee.find({ isActive: true }).select('_id').sort({ firstName: 1 }).limit(200).lean()).map((e) => e._id);
        return withPersonTabs(await personAttendanceView(ids, range.start, range.end), splitByPerson);
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 31),
    }),
};

const myAttendanceTool: AssistantToolDef = {
  name: 'my_attendance',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: "The current user's own day-by-day attendance over a range (max 93 days).",
      inputSchema: z.object({ startDate: isoDate, endDate: isoDate }),
      execute: async ({ startDate, endDate }) => {
        if (!ctx.caller.employee) return emptyView('My attendance', 'No employee profile is linked to your account.');
        const range = resolveRange(startDate, endDate, ctx.now);
        if ('error' in range) return emptyView('My attendance', range.error);
        const view = await personAttendanceView([ctx.caller.employee], range.start, range.end);
        return { ...view, link: { label: 'My attendance', href: '/attendance/my' } };
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 31),
    }),
};

export const attendanceTools = [attendanceDayTool, attendanceRangeTool, attendancePersonTool, myAttendanceTool];
