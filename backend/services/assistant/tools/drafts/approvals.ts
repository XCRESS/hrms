import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import Leave from '../../../../models/Leave.model.js';
import Employee from '../../../../models/Employee.model.js';
import User from '../../../../models/User.model.js';
import SalarySlip from '../../../../models/SalarySlip.model.js';
import SalaryStructure from '../../../../models/SalaryStructure.model.js';
import { listRequestItems, type RequestDomain, type RequestItem } from '../../../requestQueries.js';
import { toIST } from '../../../../utils/timezone.js';
import { BULK_CONFIRM_THRESHOLD, draftForModel, nextDraftIdentity, type Draft } from '../../drafts.js';
import { STAFF_ROLES, type AssistantToolDef } from '../types.js';
import { isoDate, objectId } from '../attendance.js';
import { createdRange } from '../requests.js';

const draftIdInput = z.string().max(40).optional().describe('Pass the existing draftId when revising a draft; omit for a new one.');
const cleanName = (first?: string, last?: string) => `${first ?? ''} ${last ?? ''}`.trim().replace(/\s+/g, ' ');

export interface ApprovalRow { id: string; employeeName: string; date: string; detail: string; preselected: boolean; flag?: string }
export interface ApprovalFields { domain: RequestDomain; decision: 'approved' | 'rejected'; rows: ApprovalRow[] }

/** Flags regularizations for days the employee was on approved leave; computed, not left to the model. */
const leaveConflicts = async (items: RequestItem[]): Promise<Map<string, string>> => {
  const dated = items.filter((i) => i.employee && i.date);
  if (!dated.length) return new Map();
  const dates = dated.map((i) => i.date!).sort();
  const leaves = await Leave.find({
    status: 'approved',
    employee: { $in: [...new Set(dated.map((i) => i.employee!))].map((id) => new Types.ObjectId(id)) },
    startDate: { $lte: toIST(dates.at(-1)!).endOf('day').toJSDate() },
    endDate: { $gte: toIST(dates[0]!).startOf('day').toJSDate() },
  })
    .select('employee startDate endDate')
    .lean();
  const flags = new Map<string, string>();
  for (const item of dated) {
    const onLeave = leaves.some(
      (l) => String(l.employee) === item.employee && toIST(l.startDate).toISODate()! <= item.date! && toIST(l.endDate).toISODate()! >= item.date!
    );
    if (onLeave) flags.set(item.id, 'Was on approved leave that day');
  }
  return flags;
};

const draftApprovalsTool: AssistantToolDef = {
  name: 'draft_approvals',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        'Prepare an approve/reject list of pending requests (leave, wfh, regularization or expense) as a checklist the user confirms. Dates filter on when the request was made. Every row starts ticked; untick rows that need a human look via `uncheck`, always with a reason.',
      inputSchema: z.object({
        draftId: draftIdInput,
        domain: z.enum(['leave', 'wfh', 'regularization', 'expense']),
        decision: z.enum(['approved', 'rejected']),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        uncheck: z.array(z.object({ id: z.string(), reason: z.string().max(200) })).max(100).optional(),
      }),
      execute: async ({ draftId, domain, decision, startDate, endDate, uncheck }): Promise<Draft<ApprovalFields>> => {
        const items = await listRequestItems(domain, { status: 'pending', ...createdRange(startDate, endDate) });
        const flags = domain === 'regularization' ? await leaveConflicts(items) : new Map<string, string>();
        const unticked = new Map((uncheck ?? []).map((u) => [u.id, u.reason]));
        const rows: ApprovalRow[] = items.map((i) => {
          const flag = unticked.get(i.id) ?? flags.get(i.id);
          return { id: i.id, employeeName: i.employeeName, date: i.dateLabel, detail: i.detail, preselected: !flag, ...(flag ? { flag } : {}) };
        });
        const count = rows.filter((r) => r.preselected).length;
        return {
          kind: 'draft',
          draftKind: 'approval',
          ...nextDraftIdentity(ctx.history, draftId),
          fields: { domain, decision, rows },
          issues: rows.length ? [] : ['No pending requests match.'],
          bulk: { count, requiresSecondConfirm: count > BULK_CONFIRM_THRESHOLD },
        };
      },
      toModelOutput: ({ output }) => ({
        type: 'json' as const,
        value: {
          ...(draftForModel(output).value as Record<string, string | number | string[]>),
          rows: output.fields.rows.slice(0, 30).map((r) => ({ id: r.id, name: r.employeeName, date: r.date, detail: r.detail, ...(r.flag ? { flag: r.flag } : {}) })),
          totalRows: output.fields.rows.length,
        },
      }),
    }),
};

export interface SalaryBatchRow { employeeId: string; employeeName: string; preselected: boolean; flag?: string }
export interface SalaryBatchFields { action: 'generate' | 'publish' | 'unpublish'; month: number; year: number; taxRegime: 'old' | 'new'; enableTaxDeduction: boolean; rows: SalaryBatchRow[] }

const salaryBatchRows = async (action: SalaryBatchFields['action'], month: number, year: number, department?: string): Promise<SalaryBatchRow[]> => {
  const employees = await Employee.find({ isActive: true, ...(department ? { department } : {}) })
    .select('_id firstName lastName employeeId')
    .sort({ firstName: 1 })
    .lean();
  const ids = employees.map((e) => e._id);
  const slips = await SalarySlip.find({ employee: { $in: ids }, month, year }).select('employee status').lean();
  const slipBy = new Map(slips.map((s) => [String(s.employee), s.status]));

  if (action === 'generate') {
    const withStructure = new Set((await SalaryStructure.find({ employee: { $in: ids }, isActive: true }).select('employee').lean()).map((s) => String(s.employee)));
    return employees
      .filter((e) => withStructure.has(String(e._id)))
      .map((e) => {
        const published = slipBy.get(String(e._id)) === 'finalized';
        return {
          employeeId: e.employeeId,
          employeeName: cleanName(e.firstName, e.lastName),
          preselected: !published,
          ...(published ? { flag: 'Already published; unpublish to regenerate' } : {}),
        };
      });
  }
  const wanted = action === 'publish' ? 'draft' : 'finalized';
  return employees
    .filter((e) => slipBy.get(String(e._id)) === wanted)
    .map((e) => ({ employeeId: e.employeeId, employeeName: cleanName(e.firstName, e.lastName), preselected: true }));
};

const draftSalaryBatchTool: AssistantToolDef = {
  name: 'draft_salary_batch',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        "Prepare a month's salary slips in bulk as a checklist the user confirms: generate (draft slips from salary structures), publish (finalize drafts so employees see them) or unpublish.",
      inputSchema: z.object({
        draftId: draftIdInput,
        action: z.enum(['generate', 'publish', 'unpublish']),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2000).max(2100),
        department: z.string().max(200).optional(),
        taxRegime: z.enum(['old', 'new']).optional(),
        enableTaxDeduction: z.boolean().optional(),
      }),
      execute: async ({ draftId, action, month, year, department, taxRegime, enableTaxDeduction }): Promise<Draft<SalaryBatchFields>> => {
        const rows = await salaryBatchRows(action, month, year, department);
        const count = rows.filter((r) => r.preselected).length;
        const none = { generate: 'No active employees with a salary structure.', publish: 'No draft slips to publish for that month.', unpublish: 'No published slips for that month.' };
        return {
          kind: 'draft',
          draftKind: 'salaryBatch',
          ...nextDraftIdentity(ctx.history, draftId),
          fields: { action, month, year, taxRegime: taxRegime ?? 'new', enableTaxDeduction: enableTaxDeduction ?? true, rows },
          issues: rows.length ? [] : [none[action]],
          bulk: { count, requiresSecondConfirm: action === 'publish' || count > BULK_CONFIRM_THRESHOLD },
        };
      },
      toModelOutput: ({ output }) => draftForModel(output),
    }),
};

type Role = 'admin' | 'hr' | 'employee';
export interface RoleChangeFields { userId: string; name: string; email: string; fromRole: Role; toRole: Role }

const proposeRoleChangeTool: AssistantToolDef = {
  name: 'propose_role_change',
  roles: ['admin'],
  build: (ctx) =>
    tool({
      description: "Propose changing the role (admin, hr, employee) of an employee's user account as a one-press confirm card. Resolve the person with find_employee first.",
      inputSchema: z.object({ employee: objectId, role: z.enum(['admin', 'hr', 'employee']) }),
      execute: async ({ employee, role }): Promise<Draft<RoleChangeFields>> => {
        const [emp, user] = await Promise.all([
          Employee.findById(employee).select('firstName lastName').lean(),
          User.findOne({ employee: new Types.ObjectId(employee) }).select('_id name email role').lean(),
        ]);
        const fields: RoleChangeFields = {
          userId: user?._id.toString() ?? '',
          name: user?.name ?? cleanName(emp?.firstName, emp?.lastName),
          email: user?.email ?? '',
          fromRole: (user?.role as Role | undefined) ?? 'employee',
          toRole: role,
        };
        const issues = !user
          ? ['This employee has no linked user account.']
          : String(user._id) === String(ctx.caller.userId)
            ? ["You can't change your own role."]
            : user.role === role
              ? [`${fields.name} is already ${role === 'hr' ? 'HR' : role}.`]
              : [];
        return { kind: 'draft', draftKind: 'roleChange', ...nextDraftIdentity(ctx.history, undefined), fields, issues };
      },
      toModelOutput: ({ output }) => draftForModel(output),
    }),
};

export interface EmployeeStatusFields { employeeObjId: string; name: string; employeeId: string; fromActive: boolean; toActive: boolean }

const proposeEmployeeStatusTool: AssistantToolDef = {
  name: 'propose_employee_status',
  roles: STAFF_ROLES,
  build: (ctx) =>
    tool({
      description:
        'Propose deactivating (active=false) or reactivating (active=true) an employee as a one-press confirm card. Deactivation also blocks their login. Resolve the person with find_employee (includeInactive for reactivation) first.',
      inputSchema: z.object({ employee: objectId, active: z.boolean() }),
      execute: async ({ employee, active }): Promise<Draft<EmployeeStatusFields>> => {
        const emp = await Employee.findById(employee).select('firstName lastName employeeId isActive').lean();
        const fields: EmployeeStatusFields = {
          employeeObjId: employee,
          name: cleanName(emp?.firstName, emp?.lastName),
          employeeId: emp?.employeeId ?? '',
          fromActive: emp?.isActive !== false,
          toActive: active,
        };
        const issues = !emp
          ? ['Employee not found.']
          : ctx.caller.employee && String(ctx.caller.employee) === employee
            ? ["You can't change your own status."]
            : fields.fromActive === active
              ? [`${fields.name} is already ${active ? 'active' : 'inactive'}.`]
              : [];
        return { kind: 'draft', draftKind: 'employeeStatus', ...nextDraftIdentity(ctx.history, undefined), fields, issues };
      },
      toModelOutput: ({ output }) => draftForModel(output),
    }),
};

export const approvalDraftTools = [draftApprovalsTool, draftSalaryBatchTool, proposeRoleChangeTool, proposeEmployeeStatusTool];
