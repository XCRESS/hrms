import { tool } from 'ai';
import { z } from 'zod';
import { Types } from 'mongoose';
import { expenseQuery } from '../../expenseQueries.js';
import { parseISTDateString, toIST } from '../../../utils/timezone.js';
import { emptyView, splitByPersonInput, summarizeForModel, withPersonTabs, type ResultView } from '../views.js';
import { ALL_ROLES, STAFF_ROLES, type AssistantToolDef } from './types.js';
import { isoDate, objectId } from './attendance.js';

interface ExpenseRow {
  _id: Types.ObjectId;
  employee?: { _id: Types.ObjectId; firstName?: string; lastName?: string; employeeId?: string; department?: string } | null;
  employeeName?: string;
  date: Date;
  item: string;
  amount: number;
  status: string;
}

const statusInput = z.enum(['pending', 'approved', 'rejected']).optional();

const dateBounds = (startDate?: string, endDate?: string) => ({
  ...(startDate ? { startDate: parseISTDateString(startDate).startOf('day').toJSDate() } : {}),
  ...(endDate ? { endDate: parseISTDateString(endDate).endOf('day').toJSDate() } : {}),
});

const personName = (e: ExpenseRow) =>
  e.employee ? `${e.employee.firstName ?? ''} ${e.employee.lastName ?? ''}`.trim().replace(/\s+/g, ' ') : (e.employeeName ?? 'Unknown');

const periodLabel = (startDate?: string, endDate?: string) => {
  const fmt = (d: string) => parseISTDateString(d).toFormat('d LLL yyyy');
  if (startDate && endDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  if (startDate) return `from ${fmt(startDate)}`;
  if (endDate) return `until ${fmt(endDate)}`;
  return 'all time';
};

const totals = (expenses: ExpenseRow[]) => {
  const sum = (list: ExpenseRow[]) => Math.round(list.reduce((s, e) => s + (e.amount ?? 0), 0) * 100) / 100;
  return [
    { key: 'total', label: 'Total amount', value: sum(expenses), kind: 'currency' as const, sumOf: 'amount' },
    { key: 'count', label: 'Expenses', value: expenses.length },
    {
      key: 'pending',
      label: 'Pending',
      value: expenses.filter((e) => e.status === 'pending').length,
      tone: 'warning' as const,
      filter: { column: 'status', equals: 'pending' },
    },
  ];
};

const lineItems = (expenses: ExpenseRow[], withPerson: boolean): Pick<ResultView, 'columns' | 'rows'> => ({
  columns: [
    { key: 'date', label: 'Date', kind: 'date' },
    ...(withPerson ? [{ key: 'name', label: 'Name', kind: 'text' as const }] : []),
    { key: 'item', label: 'Item', kind: 'text' },
    { key: 'amount', label: 'Amount', kind: 'currency' },
    { key: 'status', label: 'Status', kind: 'status' },
  ],
  rows: expenses.map((e) => ({
    id: e._id.toString(),
    date: toIST(e.date).toISODate(),
    name: personName(e),
    item: e.item,
    amount: e.amount,
    status: e.status,
  })),
});

const expensesSummaryTool: AssistantToolDef = {
  name: 'expenses_summary',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description:
        'Company expenses in a date range, for everyone or only the given employees (ids from find_employee). groupBy "employee" gives one row per person with their total; "none" lists every expense. One call covers all statuses unless the user asked for one.',
      inputSchema: z.object({
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        status: statusInput,
        groupBy: z.enum(['employee', 'none']),
        employees: z.array(objectId).max(50).optional().describe('Only these employees'),
        splitByPerson: splitByPersonInput,
      }),
      execute: async ({ startDate, endDate, status, groupBy, employees, splitByPerson }): Promise<ResultView> => {
        const expenses = (await expenseQuery({
          ...dateBounds(startDate, endDate),
          ...(status ? { status } : {}),
          ...(employees?.length ? { employee: employees.map((id) => new Types.ObjectId(id)) } : {}),
        }).lean()) as unknown as ExpenseRow[];
        const people = employees?.length ? [...new Set(expenses.map(personName))].join(', ') : '';
        const title = `Expenses · ${periodLabel(startDate, endDate)}${status ? ` · ${status}` : ''}${people ? ` · ${people}` : ''}`;
        if (!expenses.length) return emptyView(title, 'No expenses in this period');

        if (groupBy === 'none' || splitByPerson) {
          const view: ResultView = { kind: 'result', title, ...lineItems(expenses, true), tiles: totals(expenses), defaultView: 'table', link: { label: 'Expenses', href: '/admin/expenses' } };
          return withPersonTabs(view, splitByPerson);
        }

        const byPerson = new Map<string, { id: string; name: string; employeeId: string | null; department: string | null; count: number; total: number }>();
        for (const e of expenses) {
          const key = e.employee?._id.toString() ?? personName(e);
          const row = byPerson.get(key) ?? {
            id: key,
            name: personName(e),
            employeeId: e.employee?.employeeId ?? null,
            department: e.employee?.department ?? null,
            count: 0,
            total: 0,
          };
          row.count += 1;
          row.total = Math.round((row.total + (e.amount ?? 0)) * 100) / 100;
          byPerson.set(key, row);
        }
        return {
          kind: 'result',
          title,
          columns: [
            { key: 'name', label: 'Name', kind: 'text' },
            { key: 'total', label: 'Total', kind: 'currency' },
            { key: 'count', label: 'Expenses', kind: 'number' },
            { key: 'department', label: 'Department', kind: 'text' },
          ],
          rows: [...byPerson.values()].sort((a, b) => b.total - a.total),
          tiles: totals(expenses).slice(0, 2),
          chart: { type: 'bar', x: 'name', series: [{ key: 'total', label: 'Total' }] },
          defaultView: 'chart',
          link: { label: 'Expenses', href: '/admin/expenses' },
        };
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

const myExpensesTool: AssistantToolDef = {
  name: 'my_expenses',
  roles: ALL_ROLES,
  build: (ctx) =>
    tool({
      description: "The current user's own expense claims, optionally within a date range.",
      inputSchema: z.object({ startDate: isoDate.optional(), endDate: isoDate.optional(), status: statusInput }),
      execute: async ({ startDate, endDate, status }): Promise<ResultView> => {
        if (!ctx.caller.employee) return emptyView('My expenses', 'No employee profile is linked to your account.');
        const expenses = (await expenseQuery({
          employee: ctx.caller.employee,
          ...dateBounds(startDate, endDate),
          ...(status ? { status } : {}),
        }).lean()) as unknown as ExpenseRow[];
        const title = `My expenses · ${periodLabel(startDate, endDate)}`;
        if (!expenses.length) return emptyView(title, 'No expenses in this period');
        return { kind: 'result', title, ...lineItems(expenses, false), tiles: totals(expenses), defaultView: 'table', link: { label: 'My expenses', href: '/expenses/my' } };
      },
      toModelOutput: ({ output }) => summarizeForModel(output),
    }),
};

export const expenseTools = [expensesSummaryTool, myExpensesTool];
