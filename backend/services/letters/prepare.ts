import type { Types } from 'mongoose';
import Company from '../../models/Company.model.js';
import Employee from '../../models/Employee.model.js';
import LetterTemplate from '../../models/LetterTemplate.model.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import type { CreateLetterInput } from '../../validators/letter.schemas.js';
import type { LetterEmployee } from './fields.js';
import { buildDraftValues } from './issue.js';
import { loadLetterhead } from './letterheads.js';
import { EMPLOYEE_FIELDS } from './person.js';

/** Everything a new letter needs, resolved and validated, without saving anything. */
export const prepareLetter = async (input: CreateLetterInput) => {
  const template = await LetterTemplate.findOne({ _id: input.template, active: true }).select('name kind company body askFields').lean();
  if (!template) throw new NotFoundError('Template not found');

  const company = await Company.findById(template.company).select('name address').lean();
  if (!company) throw new NotFoundError('The template’s company no longer exists');

  let employee: (LetterEmployee & { _id: Types.ObjectId; companyName?: string }) | null = null;
  if (template.kind === 'employee') {
    if (!input.employee) throw new ValidationError('Choose an employee for this letter');
    employee = await Employee.findById(input.employee).select(EMPLOYEE_FIELDS).lean<LetterEmployee & { _id: Types.ObjectId; companyName?: string }>();
    if (!employee) throw new NotFoundError('Employee not found');
  } else if (!input.recipient) {
    throw new ValidationError('Enter the recipient’s name and email');
  }

  const letterhead = await loadLetterhead(template.company, { withPdf: true });
  const values = buildDraftValues({
    kind: template.kind,
    askFields: template.askFields,
    employee: employee ?? undefined,
    company,
    letterhead,
    recipient: input.recipient,
    overrides: input.values,
  });
  const employeeCompanyMismatch = Boolean(employee?.companyName && employee.companyName.toLowerCase() !== company.name.toLowerCase());
  return { template, employee, letterhead, values, employeeCompanyMismatch };
};
