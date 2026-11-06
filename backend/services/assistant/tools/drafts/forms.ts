import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import Holiday from '../../../../models/Holiday.model.js';
import Employee from '../../../../models/Employee.model.js';
import SalarySlip from '../../../../models/SalarySlip.model.js';
import SalaryStructure from '../../../../models/SalaryStructure.model.js';
import { AttendanceDataService } from '../../../attendance/AttendanceDataService.js';
import { getDayType } from '../../../workCalendar.js';
import { holidaySchema, submitInquirySchema } from '../../../../validators/hr.schemas.js';
import { submitTaskReportSchema } from '../../../../validators/content.schemas.js';
import { createLeaveSchema, createRegularizationSchema, createWFHRequestSchema } from '../../../../validators/request.schemas.js';
import { createSalarySlipSchema, createSalaryStructureSchema } from '../../../../validators/salary.schemas.js';
import { parseISTDateString } from '../../../../utils/timezone.js';
import { checkAgainst, draftForModel, nextDraftIdentity, type Draft, type DraftKind } from '../../drafts.js';
import { ALL_ROLES, STAFF_ROLES, type AssistantToolDef, type ToolContext } from '../types.js';
import { isoDate, objectId } from '../attendance.js';
import { EARNING_KEYS } from '../salary.js';

const draftIdInput = z.string().max(40).optional().describe('Pass the existing draftId when revising a draft; omit for a new one.');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm');

const makeDraft = <F>(ctx: ToolContext, draftKind: DraftKind, draftId: string | undefined, fields: F, issues: string[], extra: Partial<Draft<F>> = {}): Draft<F> => ({
  kind: 'draft',
  draftKind,
  ...nextDraftIdentity(ctx.history, draftId),
  fields,
  issues,
  ...extra,
});

const draftTool = <S extends z.ZodType, F>(
  name: string,
  roles: AssistantToolDef['roles'],
  description: string,
  inputSchema: S,
  execute: (input: z.infer<S>, ctx: ToolContext) => Promise<Draft<F>>
): AssistantToolDef => ({
  name,
  roles,
  build: (ctx) =>
    tool({
      description,
      inputSchema,
      execute: (input: z.infer<S>) => execute(input, ctx),
      toModelOutput: ({ output }: { output: Draft<F> }) => draftForModel(output),
    }),
});

const noEmployee = 'No employee profile is linked to your account.';
const prettyDay = (date: string) => parseISTDateString(date).toFormat('ccc d LLL yyyy');

export interface HolidayFields { title: string; date: string; type: 'public' | 'optional' | 'restricted'; isOptional: boolean; description: string }

const draftHoliday = draftTool(
  'draft_holiday',
  STAFF_ROLES,
  'Draft (or revise) a company holiday as an editable form. Nothing is added until the user confirms. Use web search first if you need the date of a festival.',
  z.object({
    draftId: draftIdInput,
    title: z.string().max(200),
    date: isoDate,
    type: z.enum(['public', 'optional', 'restricted']).optional(),
    description: z.string().max(500).optional(),
  }),
  async ({ draftId, title, date, type, description }, ctx): Promise<Draft<HolidayFields>> => {
    const fields: HolidayFields = { title, date, type: type ?? 'public', isOptional: type === 'optional', description: description ?? '' };
    const issues = checkAgainst(holidaySchema, fields);
    const start = parseISTDateString(date).startOf('day');
    const existing = await Holiday.findOne({ isActive: true, date: { $gte: start.toJSDate(), $lte: start.endOf('day').toJSDate() } }).select('name').lean();
    if (existing) issues.push(`${prettyDay(date)} is already a holiday: ${existing.name}`);
    const nearby = await Holiday.find({
      isActive: true,
      date: { $gte: start.minus({ days: 7 }).toJSDate(), $lte: start.plus({ days: 7 }).endOf('day').toJSDate() },
    })
      .select('name date')
      .sort({ date: 1 })
      .lean();

    const alternatives: Draft<HolidayFields>['alternatives'] = [];
    const dayType = await getDayType(start);
    if (dayType.type !== 'working') {
      for (let next = start.plus({ days: 1 }), i = 0; i < 7; next = next.plus({ days: 1 }), i++) {
        if ((await getDayType(next)).type === 'working') {
          const iso = next.toISODate()!;
          alternatives.push({ label: `Use ${next.toFormat('ccc d LLL')} instead`, fields: { date: iso } });
          break;
        }
      }
    }
    const notes = [
      dayType.type !== 'working' ? `${prettyDay(date)} is already a ${dayType.type === 'holiday' ? 'holiday' : 'weekly off'}.` : '',
      nearby.length ? `Holidays already set nearby: ${nearby.map((h) => `${parseISTDateString(h.date.toISOString()).toFormat('ccc d LLL')} ${h.name}`).join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    return makeDraft(ctx, 'holiday', draftId, fields, issues, {
      ...(alternatives.length ? { alternatives } : {}),
      ...(notes ? { notes } : {}),
    });
  }
);

export interface TaskReportCheckoutFields { tasks: string[]; checkOut: boolean; date: string }

const draftTaskReportCheckout = draftTool(
  'draft_task_report_checkout',
  ALL_ROLES,
  "Draft (or revise) today's task report for the current user, optionally followed by check-out. The user confirms before anything is submitted.",
  z.object({ draftId: draftIdInput, tasks: z.array(z.string().trim().min(1).max(500)).max(30), checkOut: z.boolean() }),
  async ({ draftId, tasks, checkOut }, ctx): Promise<Draft<TaskReportCheckoutFields>> => {
    const fields = { tasks, checkOut, date: ctx.now.toISODate()! };
    const issues = checkAgainst(submitTaskReportSchema, { tasks, date: fields.date });
    let notes: string | undefined;
    if (!ctx.caller.employee) issues.push(noEmployee);
    else if (checkOut) {
      const today = await AttendanceDataService.findAttendanceByEmployeeAndDate(ctx.caller.employee, ctx.now.toJSDate());
      if (!today?.checkIn) notes = "You haven't checked in today, so check-out is off.";
      else if (today.checkOut) notes = 'You have already checked out today, so check-out is off.';
      if (notes) fields.checkOut = false;
    }
    return makeDraft(ctx, 'taskReportCheckout', draftId, fields, issues, notes ? { notes } : {});
  }
);

export interface LeaveFields { leaveType: 'full-day' | 'half-day'; startDate: string; endDate: string; reason: string }

const draftLeave = draftTool(
  'draft_leave_request',
  ALL_ROLES,
  'Draft (or revise) a leave request for the current user. Leave type is full-day or half-day.',
  z.object({
    draftId: draftIdInput,
    leaveType: z.enum(['full-day', 'half-day']),
    startDate: isoDate,
    endDate: isoDate.optional(),
    reason: z.string().max(500),
  }),
  async ({ draftId, leaveType, startDate, endDate, reason }, ctx): Promise<Draft<LeaveFields>> => {
    const fields: LeaveFields = { leaveType, startDate, endDate: endDate ?? startDate, reason };
    const issues = checkAgainst(createLeaveSchema, { ...fields, leaveMode: fields.endDate === startDate ? 'single' : 'multi' });
    if (!ctx.caller.employee) issues.push(noEmployee);
    if (fields.endDate < startDate) issues.push('The end date is before the start date.');
    return makeDraft(ctx, 'leave', draftId, fields, issues);
  }
);

export interface WFHFields { reason: string }

const draftWFH = draftTool(
  'draft_wfh_request',
  ALL_ROLES,
  'Draft (or revise) a work-from-home request for today for the current user. The request captures their location when they submit it.',
  z.object({ draftId: draftIdInput, reason: z.string().max(500) }),
  async ({ draftId, reason }, ctx): Promise<Draft<WFHFields>> => {
    const issues = checkAgainst(createWFHRequestSchema.pick({ reason: true }), { reason });
    if (!ctx.caller.employee) issues.push(noEmployee);
    return makeDraft(ctx, 'wfh', draftId, { reason }, issues);
  }
);

export interface RegularizationFields { date: string; requestedCheckIn: string; requestedCheckOut: string; reason: string }

const draftRegularization = draftTool(
  'draft_regularization_request',
  ALL_ROLES,
  'Draft (or revise) an attendance regularization request for the current user (correct check-in/out times for a past day).',
  z.object({ draftId: draftIdInput, date: isoDate, requestedCheckIn: hhmm, requestedCheckOut: hhmm, reason: z.string().max(500) }),
  async ({ draftId, ...fields }, ctx): Promise<Draft<RegularizationFields>> => {
    const issues = checkAgainst(createRegularizationSchema, fields);
    if (!ctx.caller.employee) issues.push(noEmployee);
    if (fields.date > ctx.now.toISODate()!) issues.push('Regularization is for past days.');
    return makeDraft(ctx, 'regularization', draftId, fields, issues);
  }
);

export interface HelpFields { subject: string; description: string; category: string; priority: 'low' | 'medium' | 'high' }

const draftHelp = draftTool(
  'draft_help_request',
  ALL_ROLES,
  'Draft (or revise) a help-desk request to HR for the current user.',
  z.object({
    draftId: draftIdInput,
    subject: z.string().max(300),
    description: z.string().max(5000),
    category: z.string().max(100).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  }),
  async ({ draftId, subject, description, category, priority }, ctx): Promise<Draft<HelpFields>> => {
    const fields: HelpFields = { subject, description, category: category ?? 'general', priority: priority ?? 'medium' };
    return makeDraft(ctx, 'help', draftId, fields, checkAgainst(submitInquirySchema, fields));
  }
);

type Earnings = Record<(typeof EARNING_KEYS)[number], number>;
const earningsInput = z.object(Object.fromEntries(EARNING_KEYS.map((k) => [k, z.number().min(0).max(100_000_000).optional()])) as Record<(typeof EARNING_KEYS)[number], z.ZodOptional<z.ZodNumber>>);
const fullEarnings = (base: Partial<Earnings> | null | undefined, overlay: Partial<Earnings> = {}): Earnings =>
  Object.fromEntries(EARNING_KEYS.map((k) => [k, overlay[k] ?? base?.[k] ?? 0])) as Earnings;
const cleanName = (first?: string, last?: string) => `${first ?? ''} ${last ?? ''}`.trim().replace(/\s+/g, ' ');

export interface SalaryStructureFields { employeeId: string; employeeName: string; earnings: Earnings; current: Earnings | null }

const draftSalaryStructure = draftTool(
  'draft_salary_structure',
  STAFF_ROLES,
  "Draft (or revise) a change to an employee's salary structure as an editable earnings table showing current vs new. Only the components you pass change. Saved only when the user confirms.",
  z.object({ draftId: draftIdInput, employee: objectId, earnings: earningsInput }),
  async ({ draftId, employee, earnings }, ctx): Promise<Draft<SalaryStructureFields>> => {
    const id = new Types.ObjectId(employee);
    const [emp, structure] = await Promise.all([
      Employee.findById(id).select('firstName lastName employeeId').lean(),
      SalaryStructure.findOne({ employee: id, isActive: true }).select('earnings').lean(),
    ]);
    if (!emp) return makeDraft(ctx, 'salaryStructure', draftId, { employeeId: '', employeeName: '', earnings: fullEarnings(null), current: null }, ['Employee not found']);
    const current = structure ? fullEarnings(structure.earnings as unknown as Partial<Earnings>) : null;
    const fields: SalaryStructureFields = {
      employeeId: emp.employeeId,
      employeeName: cleanName(emp.firstName, emp.lastName),
      earnings: fullEarnings(current, earnings),
      current,
    };
    return makeDraft(ctx, 'salaryStructure', draftId, fields, checkAgainst(createSalaryStructureSchema, { employeeId: fields.employeeId, earnings: fields.earnings }));
  }
);

export interface SalarySlipFields {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  earnings: Earnings;
  customDeductions: { name: string; amount: number }[];
  taxRegime: 'old' | 'new';
  enableTaxDeduction: boolean;
}

const draftSalarySlip = draftTool(
  'draft_salary_slip',
  STAFF_ROLES,
  "Draft (or revise) one employee's salary slip for a month as an editable table, prefilled from the existing slip or their salary structure. Saved as a draft slip only when the user confirms; publishing is separate.",
  z.object({
    draftId: draftIdInput,
    employee: objectId,
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    earnings: earningsInput.optional(),
    customDeductions: z.array(z.object({ name: z.string().max(100), amount: z.number().min(0) })).max(10).optional(),
    taxRegime: z.enum(['old', 'new']).optional(),
    enableTaxDeduction: z.boolean().optional(),
  }),
  async ({ draftId, employee, month, year, earnings, customDeductions, taxRegime, enableTaxDeduction }, ctx): Promise<Draft<SalarySlipFields>> => {
    const id = new Types.ObjectId(employee);
    const [emp, existing, structure] = await Promise.all([
      Employee.findById(id).select('firstName lastName employeeId').lean(),
      SalarySlip.findOne({ employee: id, month, year }).select('earnings deductions taxRegime enableTaxDeduction status').lean(),
      SalaryStructure.findOne({ employee: id, isActive: true }).select('earnings').lean(),
    ]);
    const base = (existing?.earnings ?? structure?.earnings ?? null) as unknown as Partial<Earnings> | null;
    const existingDeductions = ((existing?.deductions as { customDeductions?: { name?: string; amount?: number }[] } | undefined)?.customDeductions ?? []).map((d) => ({
      name: d.name ?? '',
      amount: d.amount ?? 0,
    }));
    const fields: SalarySlipFields = {
      employeeId: emp?.employeeId ?? '',
      employeeName: emp ? cleanName(emp.firstName, emp.lastName) : '',
      month,
      year,
      earnings: fullEarnings(base, earnings ?? {}),
      customDeductions: customDeductions ?? existingDeductions,
      taxRegime: taxRegime ?? (existing?.taxRegime as 'old' | 'new' | undefined) ?? 'new',
      enableTaxDeduction: enableTaxDeduction ?? existing?.enableTaxDeduction ?? true,
    };
    const issues = emp
      ? checkAgainst(createSalarySlipSchema, { ...fields, deductions: { customDeductions: fields.customDeductions } })
      : ['Employee not found'];
    if (!base) issues.push('No existing slip or active salary structure to start from; fill in the earnings.');
    if (existing?.status === 'finalized') issues.push('This slip is published. Unpublish it first to change it.');
    return makeDraft(ctx, 'salarySlip', draftId, fields, issues);
  }
);

export const formDraftTools = [
  draftHoliday,
  draftTaskReportCheckout,
  draftLeave,
  draftWFH,
  draftRegularization,
  draftHelp,
  draftSalaryStructure,
  draftSalarySlip,
];
