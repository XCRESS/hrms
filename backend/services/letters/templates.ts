import { DateTime } from 'luxon';
import { IST_TIMEZONE } from '../../utils/timezone.js';
import type { IAskField, LetterKind } from '../../models/LetterTemplate.model.js';
import { letterDocSchema, type LetterDoc } from '../../validators/letter.schemas.js';
import { detectFields } from './detect.js';
import { docxToDoc } from './docx.js';
import { AUTO_FIELDS, RECIPIENT_FIELDS, resolveAutoValues } from './fields.js';
import { previewReferenceNo } from './referenceNo.js';
import { collectFieldKeys } from './resolve.js';

const allowedKeys = (kind: LetterKind, askFields: Pick<IAskField, 'key'>[]): Set<string> => {
  const catalogue = kind === 'employee' ? AUTO_FIELDS : [...AUTO_FIELDS.filter((f) => f.group !== 'employee'), ...RECIPIENT_FIELDS];
  return new Set([...catalogue.map((f) => f.key), ...askFields.map((f) => `ask.${f.key}`)]);
};

/** Field keys in `body` that a template of this kind cannot fill. */
export const templateFieldProblems = (kind: LetterKind, body: LetterDoc, askFields: Pick<IAskField, 'key'>[]): string[] => {
  const allowed = allowedKeys(kind, askFields);
  return collectFieldKeys(body).filter((key) => !allowed.has(key));
};

const SAMPLE_EMPLOYEE = {
  firstName: 'Asha',
  lastName: 'Verma',
  gender: 'female' as const,
  employeeId: 'EMP/0001',
  position: 'Senior Associate',
  department: 'Operations',
  employmentType: 'fulltime',
  reportingSupervisor: 'Reporting Manager',
  address: 'Flat 12, Green Park\nNew Delhi 110016',
  email: 'asha.verma@example.com',
  phone: '9876543210',
  joiningDate: new Date(),
};

const sampleAskValue = (field: IAskField, today: string): string => {
  if (field.default) return field.default;
  if (field.type === 'date') return today;
  if (field.type === 'money') return '50000';
  if (field.type === 'number') return '1';
  return `[${field.label}]`;
};

/** Values for previewing a template before any real person is chosen. */
export const sampleValues = (
  askFields: IAskField[],
  company: { name: string; address?: string },
  letterhead: { signatory: { name: string; designation: string }; referencePrefix: string }
): Record<string, string> => {
  const now = new Date();
  const today = DateTime.fromJSDate(now, { zone: IST_TIMEZONE }).toISODate() ?? '';
  const signatory = { name: letterhead.signatory.name || '[Signatory]', designation: letterhead.signatory.designation || '[Designation]' };
  return {
    ...resolveAutoValues({ employee: SAMPLE_EMPLOYEE, company, letterhead: { signatory }, letterDate: now, referenceNo: previewReferenceNo(letterhead.referencePrefix, now) }),
    'recipient.name': `${SAMPLE_EMPLOYEE.firstName} ${SAMPLE_EMPLOYEE.lastName}`,
    'recipient.email': SAMPLE_EMPLOYEE.email,
    'recipient.address': SAMPLE_EMPLOYEE.address,
    ...Object.fromEntries(askFields.map((f) => [`ask.${f.key}`, sampleAskValue(f, today)])),
  };
};

export interface ImportedLetter {
  doc: LetterDoc;
  found: Array<{ key: string; label: string; count: number }>;
  warnings: string[];
}

/**
 * Converts a Word letter into a template body. When `personValues` (the auto
 * values of the person the letter was written for) is given, their details in
 * the text become fields.
 */
export const importWordLetter = async (buffer: Buffer, personValues?: Record<string, string>): Promise<ImportedLetter> => {
  const { doc, warnings } = await docxToDoc(buffer);
  if (!personValues) return { doc: letterDocSchema.parse(doc), found: [], warnings };

  const types = Object.fromEntries(AUTO_FIELDS.filter((f) => f.group !== 'letter').map((f) => [f.key, f.type]));
  const detected = detectFields(doc, personValues, types);
  const labels = new Map(AUTO_FIELDS.map((f) => [f.key, f.label]));
  return {
    doc: letterDocSchema.parse(detected.doc),
    found: Object.entries(detected.found).map(([key, count]) => ({ key, label: labels.get(key) ?? key, count })),
    warnings,
  };
};
