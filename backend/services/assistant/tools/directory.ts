import { tool } from 'ai';
import { z } from 'zod';
import Employee from '../../../models/Employee.model.js';
import { escapeRegExp } from '../../../utils/helpers.js';
import { summarizeForModel, type ResultView } from '../views.js';
import { STAFF_ROLES, type AssistantToolDef } from './types.js';

interface DirectoryRow {
  _id: { toString(): string };
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: string;
  position?: string;
  email?: string;
  isActive?: boolean;
}

const exact = (value: string) => new RegExp(`^\\s*${escapeRegExp(value)}\\s*$`, 'i');
const prefix = (value: string) => new RegExp(`^\\s*${escapeRegExp(value)}`, 'i');
const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`.trim().replace(/\s+/g, ' ');

const editDistance = (a: string, b: string): number => {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = prev[j]!;
      prev[j] = Math.min(above + 1, prev[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length]!;
};

/** Exact matches on full name, first name, employeeId or email; otherwise name-prefix candidates, then names within two typos. */
export const searchDirectory = async (query: string, includeInactive = false): Promise<{ rows: DirectoryRow[]; exact: boolean }> => {
  const q = query.trim().replace(/\s+/g, ' ');
  const [first = q, ...rest] = q.split(' ');
  const activeFilter = includeInactive ? {} : { isActive: true };
  const projection = 'firstName lastName employeeId department position email isActive';

  const candidates = await Employee.find({
    ...activeFilter,
    $or: [{ firstName: exact(first) }, { email: exact(q) }, { employeeId: exact(q) }],
  })
    .select(projection)
    .limit(50)
    .lean<DirectoryRow[]>();

  const lower = q.toLowerCase();
  const matches = candidates.filter((e) =>
    rest.length
      ? fullName(e).toLowerCase() === lower
      : e.firstName.trim().toLowerCase() === lower || e.employeeId.trim().toLowerCase() === lower || e.email?.trim().toLowerCase() === lower
  );
  if (matches.length) return { rows: matches, exact: true };

  const closest = await Employee.find({ ...activeFilter, $or: [{ firstName: prefix(first) }, { lastName: prefix(first) }] })
    .select(projection)
    .limit(10)
    .lean<DirectoryRow[]>();
  if (closest.length) return { rows: closest, exact: false };

  const everyone = await Employee.find(activeFilter).select(projection).limit(2000).lean<DirectoryRow[]>();
  const distance = (e: DirectoryRow) =>
    Math.min(editDistance(lower, e.firstName.trim().toLowerCase()), editDistance(lower, fullName(e).toLowerCase()));
  const near = everyone
    .map((e) => ({ e, d: distance(e) }))
    .filter(({ d }) => d <= 2)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map(({ e }) => e);
  return { rows: near, exact: false };
};

export const toDirectoryView = (rows: DirectoryRow[], title: string, subtitle?: string): ResultView => ({
  kind: 'result',
  title,
  ...(subtitle ? { subtitle } : {}),
  columns: [
    { key: 'name', label: 'Name', kind: 'text' },
    { key: 'employeeId', label: 'Employee ID', kind: 'text' },
    { key: 'department', label: 'Department', kind: 'text' },
    { key: 'position', label: 'Designation', kind: 'text' },
    { key: 'email', label: 'Email', kind: 'text' },
    { key: 'status', label: 'Status', kind: 'status' },
  ],
  rows: rows.map((e) => ({
    id: e._id.toString(),
    name: fullName(e),
    employeeId: e.employeeId,
    department: e.department ?? null,
    position: e.position ?? null,
    email: e.email ?? null,
    status: e.isActive === false ? 'inactive' : 'active',
  })),
  defaultView: 'table',
  link: { label: 'Employee directory', href: '/employees' },
});

export const findEmployeeTool: AssistantToolDef = {
  name: 'find_employee',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description:
        'Look up employees by full name, first name, employee ID or email. Use it to resolve a person before any per-person tool; those tools take the `id` returned here.',
      inputSchema: z.object({
        query: z.string().trim().min(1).max(100),
        includeInactive: z.boolean().optional().describe('Include deactivated employees, e.g. to reactivate someone.'),
      }),
      execute: async ({ query, includeInactive }) => {
        const { rows, exact: isExact } = await searchDirectory(query, includeInactive ?? false);
        return toDirectoryView(
          rows,
          `Directory: "${query}"`,
          rows.length === 0 ? 'No match' : isExact ? undefined : 'No exact match; closest names'
        );
      },
      toModelOutput: ({ output }) => summarizeForModel(output, 10),
    }),
};
