import Company from '../../models/Company.model.js';
import Employee from '../../models/Employee.model.js';
import { NotFoundError } from '../../utils/errors.js';
import { resolveAutoValues, type LetterEmployee } from './fields.js';
import { loadLetterhead } from './letterheads.js';

export const EMPLOYEE_FIELDS = 'firstName lastName gender employeeId position department employmentType reportingSupervisor address email phone joiningDate companyName';

/** The employee's printable details (employee.*, company.*, signatory.*), as their letters would show them. */
export const personValues = async (employeeId: string): Promise<Record<string, string>> => {
  const employee = await Employee.findById(employeeId).select(EMPLOYEE_FIELDS).lean<LetterEmployee & { companyName?: string }>();
  if (!employee) throw new NotFoundError('Employee not found');

  const company = employee.companyName
    ? await Company.findOne({ name: employee.companyName }).collation({ locale: 'en', strength: 2 }).select('name address').lean()
    : null;
  const letterhead = company ? await loadLetterhead(company._id) : null;
  const values = resolveAutoValues({
    employee,
    company: { name: company?.name ?? employee.companyName ?? '', address: company?.address },
    letterhead: { signatory: letterhead?.signatory ?? { name: '', designation: '' } },
    letterDate: new Date(),
  });
  return Object.fromEntries(Object.entries(values).filter(([key]) => !key.startsWith('letter.')));
};
