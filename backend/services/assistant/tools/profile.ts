import { tool } from 'ai';
import { z } from 'zod';
import Employee from '../../../models/Employee.model.js';
import { toIST } from '../../../utils/timezone.js';
import { emptyView, type Cell, type ResultView } from '../views.js';
import { STAFF_ROLES, type AssistantToolDef } from './types.js';
import { objectId } from './attendance.js';

const FIELDS: [section: string, key: string, label: string][] = [
  ['Work', 'employeeId', 'Employee ID'],
  ['Work', 'position', 'Designation'],
  ['Work', 'department', 'Department'],
  ['Work', 'employmentType', 'Employment type'],
  ['Work', 'joiningDate', 'Joining date'],
  ['Work', 'reportingSupervisor', 'Reports to'],
  ['Work', 'officeAddress', 'Office'],
  ['Work', 'companyName', 'Company'],
  ['Work', 'isActive', 'Status'],
  ['Contact', 'email', 'Email'],
  ['Contact', 'phone', 'Phone'],
  ['Contact', 'address', 'Address'],
  ['Contact', 'emergencyContactName', 'Emergency contact'],
  ['Contact', 'emergencyContactNumber', 'Emergency number'],
  ['Personal', 'gender', 'Gender'],
  ['Personal', 'dateOfBirth', 'Date of birth'],
  ['Personal', 'maritalStatus', 'Marital status'],
  ['Personal', 'fatherName', "Father's name"],
  ['Personal', 'fatherPhone', "Father's phone"],
  ['Personal', 'motherName', "Mother's name"],
  ['Personal', 'motherPhone', "Mother's phone"],
  ['Identity & bank', 'aadhaarNumber', 'Aadhaar'],
  ['Identity & bank', 'panNumber', 'PAN'],
  ['Identity & bank', 'paymentMode', 'Payment mode'],
  ['Identity & bank', 'bankName', 'Bank'],
  ['Identity & bank', 'bankAccountNumber', 'Account number'],
  ['Identity & bank', 'bankIFSCCode', 'IFSC'],
];

/** Shown in full to HR in the block; masked in what the model reads. */
const SENSITIVE = new Set(['aadhaarNumber', 'panNumber', 'bankAccountNumber']);
const mask = (value: string) => (value.length > 4 ? `${'•'.repeat(Math.min(value.length - 4, 8))}${value.slice(-4)}` : '••••');

const display = (key: string, value: unknown): Cell => {
  if (value === undefined || value === null || value === '') return null;
  if (key === 'isActive') return value === false ? 'inactive' : 'active';
  if (value instanceof Date) return toIST(value).toFormat('d LLL yyyy');
  if (typeof value === 'number') return value;
  return String(value).trim();
};

const fullName = (doc: Record<string, unknown>) => `${String(doc.firstName ?? '')} ${String(doc.lastName ?? '')}`.trim().replace(/\s+/g, ' ');

const profileView = (docs: Record<string, unknown>[]): ResultView => {
  const single = docs.length === 1 ? docs[0] : undefined;
  return {
    kind: 'result',
    title: single ? fullName(single) : `Employee profiles · ${docs.length} people`,
    ...(single ? { subtitle: [single.position, single.department].filter(Boolean).join(' · ') || undefined } : {}),
    columns: [
      { key: 'name', label: 'Name', kind: 'text' },
      { key: 'section', label: 'Section', kind: 'text' },
      { key: 'field', label: 'Field', kind: 'text' },
      { key: 'value', label: 'Value', kind: 'text' },
    ].filter((c) => !single || c.key !== 'name') as ResultView['columns'],
    rows: docs.flatMap((doc) =>
      FIELDS.map(([section, key, label]) => ({ id: `${String(doc._id)}:${key}`, fieldKey: key, name: fullName(doc), section, field: label, value: display(key, doc[key]) })).filter(
        (r) => r.value !== null
      )
    ),
    defaultView: 'table',
    ...(single ? { link: { label: 'Open in directory', href: `/employees/${encodeURIComponent(String(single.employeeId ?? ''))}` } } : { splitBy: 'name' }),
  };
};

const employeeProfileTool: AssistantToolDef = {
  name: 'employee_profile',
  roles: STAFF_ROLES,
  build: () =>
    tool({
      description:
        'Full directory profiles (work, contact, personal, identity and bank details) for one or more employees, shown together with a tab per person. Resolve each person with find_employee first and pass all ids in one call.',
      inputSchema: z.object({ employees: z.array(objectId).min(1).max(10) }),
      execute: async ({ employees }): Promise<ResultView> => {
        const docs = (await Employee.find({ _id: { $in: employees } }).lean()) as Record<string, unknown>[];
        const byId = new Map(docs.map((d) => [String(d._id), d]));
        const found = employees.map((id) => byId.get(id)).filter((d): d is Record<string, unknown> => Boolean(d));
        return found.length ? profileView(found) : emptyView('Employee profile', 'Employee not found');
      },
      toModelOutput: ({ output }) => {
        const people = new Map<string, Record<string, Cell>>();
        for (const r of output.rows) {
          const person = String(r.name ?? output.title);
          const details = people.get(person) ?? {};
          details[String(r.field)] = SENSITIVE.has(String(r.fieldKey)) && typeof r.value === 'string' ? mask(r.value) : (r.value ?? null);
          people.set(person, details);
        }
        return {
          type: 'json' as const,
          value: {
            profiles: [...people].map(([name, details]) => ({ name, details })),
            note: 'The user sees the full profiles as a table with a tab per person. Do not repeat them; identity and bank numbers are masked here on purpose.',
          },
        };
      },
    }),
};

export const profileTools = [employeeProfileTool];
