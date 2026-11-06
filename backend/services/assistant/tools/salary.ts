import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import { DateTime } from 'luxon';
import Employee from '../../../models/Employee.model.js';
import SalarySlip from '../../../models/SalarySlip.model.js';
import SalaryStructure from '../../../models/SalaryStructure.model.js';
import { salarySlipFilter } from '../../salary/salarySlipQueries.js';
import { countWorkingDays } from '../../workCalendar.js';
import { AttendanceReportService } from '../../attendance/AttendanceReportService.js';
import { IST_TIMEZONE } from '../../../utils/timezone.js';
import { emptyView, summarizeForModel, type ResultView } from '../views.js';
import { ALL_ROLES, STAFF_ROLES, type AssistantToolDef, type ToolContext } from './types.js';
import { objectId } from './attendance.js';

export const EARNING_KEYS = ['basic', 'hra', 'conveyance', 'medical', 'lta', 'specialAllowance', 'mobileAllowance'] as const;
export const EARNING_LABELS: Record<(typeof EARNING_KEYS)[number], string> = {
  basic: 'Basic',
  hra: 'HRA',
  conveyance: 'Conveyance',
  medical: 'Medical',
  lta: 'LTA',
  specialAllowance: 'Special allowance',
  mobileAllowance: 'Mobile allowance',
};

const cleanName = (first?: string, last?: string) => `${first ?? ''} ${last ?? ''}`.trim().replace(/\s+/g, ' ');
const monthLabel = (month: number, year: number) => DateTime.fromObject({ year, month, day: 1 }).toFormat('LLL yyyy');

const slipsView = async (employee: Types.ObjectId, finalizedOnly: boolean, year: number | undefined, title: string): Promise<ResultView> => {
  const slips = await SalarySlip.find(salarySlipFilter(employee, { finalizedOnly, ...(year ? { year } : {}) }))
    .sort({ year: -1, month: -1 })
    .limit(36)
    .select('month year grossSalary totalDeductions netSalary status taxRegime')
    .lean();
  if (!slips.length) return emptyView(title, finalizedOnly ? 'No published salary slips yet' : 'No salary slips');
  return {
    kind: 'result',
    title,
    columns: [
      { key: 'period', label: 'Month', kind: 'text' },
      { key: 'gross', label: 'Gross', kind: 'currency' },
      { key: 'deductions', label: 'Deductions', kind: 'currency' },
      { key: 'net', label: 'Net pay', kind: 'currency' },
      { key: 'regime', label: 'Tax regime', kind: 'text' },
      ...(finalizedOnly ? [] : [{ key: 'status', label: 'Status', kind: 'status' as const }]),
    ],
    rows: slips.map((s) => ({
      id: s._id.toString(),
      period: monthLabel(s.month, s.year),
      gross: s.grossSalary ?? null,
      deductions: s.totalDeductions ?? null,
      net: s.netSalary ?? null,
      regime: s.taxRegime ?? null,
      status: s.status ?? null,
    })),
    chart: { type: 'line', x: 'period', series: [{ key: 'net', label: 'Net pay' }] },
    defaultView: 'table',
    link: { label: 'Salary slips', href: finalizedOnly ? '/salary-slips/my' : '/salary-slips' },
  };
};

const employeeName = async (id: Types.ObjectId) => {
  const e = await Employee.findById(id).select('firstName lastName department').lean();
  return e ? { name: cleanName(e.firstName, e.lastName), department: e.department ?? null } : null;
};

const salarySlipsTool: AssistantToolDef = {
  name: 'salary_slips',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description: "An employee's salary slips (drafts and published), newest first. Resolve the person with find_employee first.",
      inputSchema: z.object({ employee: objectId, year: z.number().int().min(2000).max(2100).optional() }),
      execute: async ({ employee, year }) => {
        const id = new Types.ObjectId(employee);
        const who = await employeeName(id);
        if (!who) return emptyView('Salary slips', 'Employee not found');
        return slipsView(id, false, year, `Salary slips · ${who.name}`);
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 12),
    }),
};

const mySalarySlipsTool: AssistantToolDef = {
  name: 'my_salary_slips',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: "The current user's own salary slips. Only published (finalized) slips are visible to employees.",
      inputSchema: z.object({ year: z.number().int().min(2000).max(2100).optional() }),
      execute: async ({ year }) => {
        if (!ctx.caller.employee) return emptyView('My salary slips', 'No employee profile is linked to your account.');
        return slipsView(ctx.caller.employee, ctx.caller.role === 'employee', year, 'My salary slips');
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 12),
    }),
};

const salaryStructureTool: AssistantToolDef = {
  name: 'salary_structure',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description: "An employee's active salary structure: each earnings component and the monthly gross.",
      inputSchema: z.object({ employee: objectId }),
      execute: async ({ employee }): Promise<ResultView> => {
        const id = new Types.ObjectId(employee);
        const who = await employeeName(id);
        if (!who) return emptyView('Salary structure', 'Employee not found');
        const structure = await SalaryStructure.findOne({ employee: id, isActive: true }).select('earnings grossSalary').lean();
        if (!structure) return emptyView(`Salary structure · ${who.name}`, 'No active salary structure');
        const earnings = structure.earnings as unknown as Partial<Record<(typeof EARNING_KEYS)[number], number>>;
        return {
          kind: 'result',
          title: `Salary structure · ${who.name}`,
          columns: [
            { key: 'component', label: 'Component', kind: 'text' },
            { key: 'amount', label: 'Monthly', kind: 'currency' },
          ],
          rows: EARNING_KEYS.map((k) => ({ id: k, component: EARNING_LABELS[k], amount: earnings[k] ?? 0 })),
          tiles: [{ key: 'gross', label: 'Monthly gross', value: structure.grossSalary, kind: 'currency' }],
          defaultView: 'table',
          link: { label: 'Salary structures', href: '/salary-structures' },
        };
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

const PAY_FORMULA = 'payable = monthlyGross / workingDays × (present + 0.5 × halfDays + approvedLeave)';

const payInputsView = async (ctx: ToolContext, employee: Types.ObjectId, month: number, year: number): Promise<ResultView> => {
  const emp = await Employee.findById(employee).select('_id firstName lastName employeeId department position joiningDate').lean();
  if (!emp) return emptyView('Pay inputs', 'Employee not found');

  const monthStart = DateTime.fromObject({ year, month, day: 1 }, { zone: IST_TIMEZONE }).startOf('day');
  const monthEnd = monthStart.endOf('month').startOf('day');
  const today = ctx.now.startOf('day');
  if (monthStart > today) return emptyView('Pay inputs', 'That month has not started yet.');
  const through = monthEnd > today ? today : monthEnd;

  const [{ workingDays }, reports, structure] = await Promise.all([
    countWorkingDays(monthStart.toJSDate(), monthEnd.toJSDate(), emp.department ?? null),
    AttendanceReportService.generateEmployeeReports([emp], monthStart.toJSDate(), through.toJSDate()),
    SalaryStructure.findOne({ employee, isActive: true }).select('grossSalary').lean(),
  ]);
  const summary = (reports[0] as { summary: { presentDays: number; halfDays: number; leaveDays: number; absentDays: number } } | undefined)?.summary;
  const name = cleanName(emp.firstName, emp.lastName);
  const values = {
    workingDays,
    present: summary?.presentDays ?? 0,
    halfDays: summary?.halfDays ?? 0,
    approvedLeave: summary?.leaveDays ?? 0,
    absent: summary?.absentDays ?? 0,
    monthlyGross: structure?.grossSalary ?? null,
  };
  const partial = through < monthEnd;
  return {
    kind: 'result',
    title: `Pay inputs · ${name} · ${monthStart.toFormat('LLL yyyy')}`,
    subtitle: [
      partial ? `Month to date (through ${through.toFormat('d LLL')})` : 'Full month',
      structure ? null : 'No active salary structure',
    ]
      .filter(Boolean)
      .join(' · '),
    columns: [
      { key: 'input', label: 'Input', kind: 'text' },
      { key: 'value', label: 'Value', kind: 'number' },
    ],
    rows: [],
    tiles: [
      { key: 'workingDays', label: 'Working days in month', value: values.workingDays },
      { key: 'present', label: 'Present', value: values.present, tone: 'positive' },
      { key: 'halfDays', label: 'Half-days', value: values.halfDays, tone: 'warning' },
      { key: 'approvedLeave', label: 'Approved leave', value: values.approvedLeave },
      { key: 'absent', label: 'Absent', value: values.absent, tone: 'negative' },
      ...(values.monthlyGross != null ? [{ key: 'monthlyGross', label: 'Monthly gross', value: values.monthlyGross, kind: 'currency' as const }] : []),
    ],
    defaultView: 'table',
  };
};

const payInputsForModel = (view: ResultView) => ({
  type: 'json' as const,
  value: {
    title: view.title,
    ...(view.subtitle ? { subtitle: view.subtitle } : {}),
    inputs: Object.fromEntries((view.tiles ?? []).map((t) => [t.key, t.value])),
    formula: PAY_FORMULA,
    note: 'Compute it and show the working on one line. Say it is an estimate; the finalized salary slip is authoritative.',
  },
});

const monthInput = z.object({ month: z.number().int().min(1).max(12), year: z.number().int().min(2000).max(2100) });

const payInputsTool: AssistantToolDef = {
  name: 'pay_inputs',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description: "Inputs for an employee's pay for days worked in a month (working days, attendance, monthly gross) plus the formula to apply.",
      inputSchema: monthInput.extend({ employee: objectId }),
      execute: async ({ employee, month, year }) => payInputsView(ctx, new Types.ObjectId(employee), month, year),
      toModelOutput: ({ output }) => payInputsForModel(output),
    }),
};

const myPayInputsTool: AssistantToolDef = {
  name: 'my_pay_inputs',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: "Inputs for the current user's own pay for days worked in a month, plus the formula to apply.",
      inputSchema: monthInput,
      execute: async ({ month, year }) => {
        if (!ctx.caller.employee) return emptyView('My pay inputs', 'No employee profile is linked to your account.');
        return payInputsView(ctx, ctx.caller.employee, month, year);
      },
      toModelOutput: ({ output }) => payInputsForModel(output),
    }),
};

export const salaryTools = [salarySlipsTool, mySalarySlipsTool, salaryStructureTool, payInputsTool, myPayInputsTool];
