import { DateTime } from 'luxon';
import { IST_TIMEZONE } from '../../utils/timezone.js';
import { salutationFor } from './format.js';

export type FieldType = 'text' | 'longText' | 'date' | 'money' | 'number';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  group: 'employee' | 'company' | 'letter' | 'signatory' | 'recipient';
}

export interface LetterEmployee {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  employeeId: string;
  position: string;
  department: string;
  employmentType: string;
  reportingSupervisor: string;
  address?: string;
  email: string;
  phone: string;
  joiningDate: Date;
}

const field = (group: FieldDef['group'], key: string, label: string, type: FieldType = 'text'): FieldDef => ({ key: `${group}.${key}`, label, type, group });

export const AUTO_FIELDS: FieldDef[] = [
  field('employee', 'salutation', 'Salutation (Mr./Ms.)'),
  field('employee', 'fullName', 'Full name'),
  field('employee', 'firstName', 'First name'),
  field('employee', 'lastName', 'Last name'),
  field('employee', 'code', 'Employee code'),
  field('employee', 'position', 'Position'),
  field('employee', 'department', 'Department'),
  field('employee', 'employmentType', 'Employment type'),
  field('employee', 'reportingSupervisor', 'Reporting supervisor'),
  field('employee', 'address', 'Address', 'longText'),
  field('employee', 'email', 'Email'),
  field('employee', 'phone', 'Phone'),
  field('employee', 'joiningDate', 'Joining date', 'date'),
  field('company', 'name', 'Company name'),
  field('company', 'address', 'Company address', 'longText'),
  field('letter', 'date', 'Letter date', 'date'),
  field('letter', 'referenceNo', 'Reference number'),
  field('signatory', 'name', 'Signatory name'),
  field('signatory', 'designation', 'Signatory designation'),
];

export const RECIPIENT_FIELDS: FieldDef[] = [
  field('recipient', 'name', 'Recipient name'),
  field('recipient', 'email', 'Recipient email'),
  field('recipient', 'address', 'Recipient address', 'longText'),
];

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = { fulltime: 'Full-time', intern: 'Intern', remote: 'Remote' };

const isoDate = (d: Date): string => DateTime.fromJSDate(d, { zone: IST_TIMEZONE }).toISODate() ?? '';

/** Raw values for every AUTO_FIELDS key; employee keys are empty strings when there is no employee. */
export const resolveAutoValues = (ctx: {
  employee?: LetterEmployee;
  company: { name: string; address?: string };
  letterhead: { signatory: { name: string; designation: string } };
  letterDate: Date;
  referenceNo?: string;
}): Record<string, string> => {
  const e = ctx.employee;
  return {
    'employee.salutation': e ? salutationFor(e.gender) : '',
    'employee.fullName': e ? `${e.firstName} ${e.lastName}` : '',
    'employee.firstName': e?.firstName ?? '',
    'employee.lastName': e?.lastName ?? '',
    'employee.code': e?.employeeId ?? '',
    'employee.position': e?.position ?? '',
    'employee.department': e?.department ?? '',
    'employee.employmentType': e ? (EMPLOYMENT_TYPE_LABEL[e.employmentType] ?? e.employmentType) : '',
    'employee.reportingSupervisor': e?.reportingSupervisor ?? '',
    'employee.address': e?.address ?? '',
    'employee.email': e?.email ?? '',
    'employee.phone': e?.phone ?? '',
    'employee.joiningDate': e ? isoDate(e.joiningDate) : '',
    'company.name': ctx.company.name,
    'company.address': ctx.company.address ?? '',
    'letter.date': isoDate(ctx.letterDate),
    'letter.referenceNo': ctx.referenceNo ?? '',
    'signatory.name': ctx.letterhead.signatory.name,
    'signatory.designation': ctx.letterhead.signatory.designation,
  };
};

/** Field key → label, for messages. */
export const fieldLabelsFor = (askFields: Array<{ key: string; label: string }>): Record<string, string> => ({
  ...Object.fromEntries([...AUTO_FIELDS, ...RECIPIENT_FIELDS].map((f) => [f.key, f.label])),
  ...Object.fromEntries(askFields.map((f) => [`ask.${f.key}`, f.label])),
});

/** Field key → type for a template: catalogue fields plus its ask fields (`ask.<key>`). */
export const fieldTypesFor = (askFields: Array<{ key: string; type: FieldType }>): Record<string, FieldType> => ({
  ...Object.fromEntries([...AUTO_FIELDS, ...RECIPIENT_FIELDS].map((f) => [f.key, f.type])),
  ...Object.fromEntries(askFields.map((f) => [`ask.${f.key}`, f.type])),
});
