import type { CreateCompanyInput, UpdateCompanyInput, CompanyIdParams } from '../validators/settings.schemas.js';
import type { Response } from 'express';
import Company from '../models/Company.model.js';
import Employee from '../models/Employee.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { formatResponse } from '../utils/response.js';
import { getValidatedParams } from '../middlewares/zodValidation.middleware.js';
import type { IAuthRequest } from '../types/index.js';

const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

const findByNameIgnoringCase = (name: string) =>
  Company.findOne({ name }).collation(CASE_INSENSITIVE).select('_id name').lean();

export const getCompanies = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const companies = await Company.find().select('name address').sort({ name: 1 }).lean();

  // Headcount is for HR/admin management only.
  if (req.user?.role === 'employee') {
    res.json(formatResponse(true, 'Companies retrieved successfully', { companies }));
    return;
  }

  const counts = await Employee.aggregate<{ _id: string; count: number }>([
    { $match: { isActive: true } },
    { $group: { _id: '$companyName', count: { $sum: 1 } } },
  ]);
  const countByName = new Map(counts.map((c) => [c._id, c.count]));

  res.json(formatResponse(true, 'Companies retrieved successfully', {
    companies: companies.map((c) => ({ ...c, employeeCount: countByName.get(c.name) ?? 0 })),
  }));
});

export const addCompany = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { name, address } = req.body as CreateCompanyInput;

  const existing = await findByNameIgnoringCase(name);
  if (existing) {
    throw new ConflictError(`Company '${existing.name}' already exists`);
  }

  const company = await Company.create({ name, address });
  res.status(201).json(formatResponse(true, 'Company created successfully', company.toObject()));
});

export const updateCompany = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<CompanyIdParams>(req);
  const { name, address } = req.body as UpdateCompanyInput;

  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  const conflict = await findByNameIgnoringCase(name);
  if (conflict && !conflict._id.equals(company._id)) {
    throw new ConflictError(`Company '${conflict.name}' already exists`);
  }

  const oldName = company.name;
  company.name = name;
  company.address = address;
  await company.save();

  // Inactive employees included: their historical salary slips resolve the
  // company (and its address) by this name.
  const { modifiedCount } = oldName === name
    ? { modifiedCount: 0 }
    : await Employee.updateMany({ companyName: oldName }, { $set: { companyName: name } });

  res.json(formatResponse(true, 'Company updated successfully', {
    company: company.toObject(),
    employeesUpdated: modifiedCount,
  }));
});

export const deleteCompany = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { id } = getValidatedParams<CompanyIdParams>(req);

  const company = await Company.findById(id).select('name').lean();
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  const employeeCount = await Employee.countDocuments({ companyName: company.name });
  if (employeeCount > 0) {
    throw new ConflictError(
      `${employeeCount} employee${employeeCount === 1 ? ' is' : 's are'} (including inactive) assigned to '${company.name}'. Reassign them before deleting.`
    );
  }

  await Company.deleteOne({ _id: company._id });
  res.json(formatResponse(true, 'Company deleted successfully', { name: company.name }));
});
