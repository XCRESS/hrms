import type { CreateSalarySlipInput, SalarySlipStatusInput, BulkSalarySlipStatusInput, BulkGenerateSalarySlipsInput } from '../validators/salary.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canAccessEmployee, paramValue } from '../utils/helpers.js';
import type { Response } from 'express';
import mongoose from 'mongoose';
import SalarySlip from '../models/SalarySlip.model.js';
import Employee from '../models/Employee.model.js';
import SalaryStructure from '../models/SalaryStructure.model.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import NotificationService from '../services/notificationService.js';
import { DateTime } from 'luxon';
import type { IAuthRequest } from '../types/index.js';

export const createOrUpdateSalarySlip = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeId, month, year, earnings, deductions, taxRegime, enableTaxDeduction } = req.body as CreateSalarySlipInput;

  if (!employeeId || !month || !year || !earnings || !earnings.basic) {
    res.status(400).json(formatResponse(false, 'Employee ID, month, year, and basic salary are required'));
    return;
  }

  const employee = await Employee.findOne({ employeeId });
  if (!employee) {
    res.status(404).json(formatResponse(false, 'Employee not found'));
    return;
  }

  if (!req.user) {
    res.status(401).json(formatResponse(false, 'Authentication required'));
    return;
  }

  const salarySlipData = {
    employee: employee._id,
    employeeId,
    month,
    year,
    earnings: {
      basic: earnings.basic,
      hra: earnings.hra || 0,
      conveyance: earnings.conveyance || 0,
      medical: earnings.medical || 0,
      lta: earnings.lta || 0,
      specialAllowance: earnings.specialAllowance || 0,
      mobileAllowance: earnings.mobileAllowance || 0
    },
    deductions: {
      incomeTax: 0,
      customDeductions: deductions.customDeductions || []
    },
    taxRegime,
    enableTaxDeduction,
    createdBy: req.user._id
  };

  const existingSalarySlip = await SalarySlip.findOne({ employee: employee._id, month, year });

  let salarySlip;
  if (existingSalarySlip) {
    Object.assign(existingSalarySlip, salarySlipData);
    salarySlip = await existingSalarySlip.save();
  } else {
    salarySlip = new SalarySlip(salarySlipData);
    await salarySlip.save();
  }

  await salarySlip.populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

  res.status(200).json(formatResponse(true, 'Salary slip saved successfully', salarySlip));
}, { onDuplicate: 'Salary slip already exists for this employee and month/year' });

export const getSalarySlip = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);
  const month = paramValue(req.params.month);
  const year = paramValue(req.params.year);

  if (!employeeId || !month || !year) {
    res.status(400).json(formatResponse(false, 'Employee ID, month, and year are required'));
    return;
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);

  if (!canAccessEmployee(req.user, decodedEmployeeId)) {
    res.status(403).json(formatResponse(false, 'Access forbidden'));
    return;
  }

  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    res.status(404).json(formatResponse(false, 'Employee not found'));
    return;
  }

  const filter: { employee: unknown; month: number; year: number; status?: string } = {
    employee: employee._id,
    month: parseInt(month, 10),
    year: parseInt(year, 10)
  };

  if (req.user?.role === 'employee') {
    filter.status = 'finalized';
  }

  const salarySlip = await SalarySlip.findOne(filter)
    .populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

  if (!salarySlip) {
    res.status(404).json(formatResponse(false, 'Salary slip not found'));
    return;
  }

  res.status(200).json(formatResponse(true, 'Salary slip fetched successfully', salarySlip));
});

export const getEmployeeSalarySlips = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);

  if (!employeeId) {
    res.status(400).json(formatResponse(false, 'Employee ID is required'));
    return;
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);
  const { page = '1', limit = '10' } = req.query;

  if (!canAccessEmployee(req.user, decodedEmployeeId)) {
    res.status(403).json(formatResponse(false, 'Access forbidden'));
    return;
  }

  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    res.status(404).json(formatResponse(false, 'Employee not found'));
    return;
  }

  const pageNum = parseInt(typeof page === 'string' ? page : '1', 10);
  const limitNum = parseInt(typeof limit === 'string' ? limit : '10', 10);
  const skip = (pageNum - 1) * limitNum;

  const filter: { employee: unknown; status?: string } = { employee: employee._id };

  if (req.user?.role === 'employee') {
    filter.status = 'finalized';
  }

  const [salarySlips, total] = await Promise.all([
    SalarySlip.find(filter)
      .populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limitNum),
    SalarySlip.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json(formatResponse(true, 'Salary slips fetched successfully', {
    salarySlips,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum
    }
  }));
});

export const getAllSalarySlips = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { month, year, page = '1', limit = '10', employeeId, search } = req.query;

  const filter: { month?: number; year?: number; employee?: unknown } = {};
  if (month && typeof month === 'string') filter.month = parseInt(month, 10);
  if (year && typeof year === 'string') filter.year = parseInt(year, 10);

  if (employeeId && typeof employeeId === 'string') {
    const employee = await Employee.findOne({ employeeId });
    if (employee) filter.employee = employee._id;
  }

  if (search && typeof search === 'string') {
    const employees = await Employee.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ]
    });

    const employeeIds = employees.map(emp => emp._id);
    filter.employee = { $in: employeeIds };
  }

  const pageNum = parseInt(typeof page === 'string' ? page : '1', 10);
  const limitNum = parseInt(typeof limit === 'string' ? limit : '10', 10);
  const skip = (pageNum - 1) * limitNum;

  const [salarySlips, total] = await Promise.all([
    SalarySlip.find(filter)
      .populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    SalarySlip.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json(formatResponse(true, 'Salary slips fetched successfully', {
    salarySlips,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum
    }
  }));
});

export const deleteSalarySlip = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);
  const month = paramValue(req.params.month);
  const year = paramValue(req.params.year);

  if (!employeeId || !month || !year) {
    res.status(400).json(formatResponse(false, 'Employee ID, month, and year are required'));
    return;
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);

  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    res.status(404).json(formatResponse(false, 'Employee not found'));
    return;
  }

  const salarySlip = await SalarySlip.findOneAndDelete({
    employee: employee._id,
    month: parseInt(month, 10),
    year: parseInt(year, 10)
  });

  if (!salarySlip) {
    res.status(404).json(formatResponse(false, 'Salary slip not found'));
    return;
  }

  res.status(200).json(formatResponse(true, 'Salary slip deleted successfully'));
});

export const getTaxCalculation = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { grossSalary, taxRegime = 'new' } = req.query;

  if (!grossSalary || isNaN(Number(grossSalary))) {
    res.status(400).json(formatResponse(false, 'Valid gross salary is required'));
    return;
  }

  const tempSalarySlip = new SalarySlip({
    employee: null,
    employeeId: 'temp',
    month: 1,
    year: 2025,
    earnings: { basic: 0 },
    taxRegime: typeof taxRegime === 'string' ? taxRegime : 'new',
    createdBy: null
  });

  const annualGross = parseFloat(grossSalary as string) * 12;
  const regime = typeof taxRegime === 'string' ? taxRegime : 'new';
  const annualTax = tempSalarySlip.calculateIncomeTax(annualGross, regime as 'old' | 'new');
  const monthlyTax = annualTax / 12;

  res.status(200).json(formatResponse(true, 'Tax calculation completed', {
    monthlyGross: parseFloat(grossSalary as string),
    annualGross,
    monthlyTax,
    annualTax,
    taxRegime,
    standardDeduction: taxRegime === 'new' ? 75000 : 50000,
    rebateLimit: taxRegime === 'new' ? 1200000 : 500000,
    maxRebate: taxRegime === 'new' ? 60000 : 12500
  }));
});

const notifyPayslipPublished = (employee: mongoose.Types.ObjectId, month: number, year: number): void => {
  void NotificationService.notifyEmployee(
    employee,
    'payslip_published',
    { period: DateTime.fromObject({ year, month }).toFormat('LLLL yyyy') },
    { dedupeKey: (userId) => `payslip:${userId}:${year}-${month}` }
  );
};

export const updateSalarySlipStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);
  const month = paramValue(req.params.month);
  const year = paramValue(req.params.year);
  const { status } = req.body as SalarySlipStatusInput;

  if (!status) {
    res.status(400).json(formatResponse(false, 'Status is required'));
    return;
  }

  if (!employeeId || !month || !year) {
    res.status(400).json(formatResponse(false, 'Employee ID, month, and year are required'));
    return;
  }

  if (!['draft', 'finalized'].includes(status)) {
    res.status(400).json(formatResponse(false, "Status must be either 'draft' or 'finalized'"));
    return;
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);
  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    res.status(404).json(formatResponse(false, 'Employee not found'));
    return;
  }

  const salarySlip = await SalarySlip.findOneAndUpdate(
    {
      employee: employee._id,
      month: parseInt(month, 10),
      year: parseInt(year, 10)
    },
    { status },
    { new: true }
  ).populate('employee', 'firstName lastName employeeId department position bankName bankAccountNumber panNumber joiningDate companyName email');

  if (!salarySlip) {
    res.status(404).json(formatResponse(false, 'Salary slip not found'));
    return;
  }

  if (status === 'finalized') {
    notifyPayslipPublished(employee._id, parseInt(month, 10), parseInt(year, 10));
  }

  res.status(200).json(formatResponse(true, `Salary slip ${status === 'finalized' ? 'published' : 'unpublished'} successfully`, salarySlip));
});

export const bulkUpdateSalarySlipStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { salarySlips, status } = req.body as BulkSalarySlipStatusInput;

  if (!salarySlips || !Array.isArray(salarySlips) || !status) {
    res.status(400).json(formatResponse(false, 'Salary slips array and status are required'));
    return;
  }

  if (!['draft', 'finalized'].includes(status)) {
    res.status(400).json(formatResponse(false, "Status must be either 'draft' or 'finalized'"));
    return;
  }

  const updatePromises = salarySlips.map(async ({ employeeId, month, year }) => {
    const employee = await Employee.findOne({ employeeId });
    if (!employee) return null;

    const slip = await SalarySlip.findOneAndUpdate(
      {
        employee: employee._id,
        month: parseInt(String(month), 10),
        year: parseInt(String(year), 10)
      },
      { status },
      { new: true }
    );
    if (slip && status === 'finalized') {
      notifyPayslipPublished(employee._id, slip.month, slip.year);
    }
    return slip;
  });

  const results = await Promise.all(updatePromises);
  const updated = results.filter(result => result !== null);

  res.status(200).json(formatResponse(true, `${updated.length} salary slips ${status === 'finalized' ? 'published' : 'unpublished'} successfully`, {
    updatedCount: updated.length,
    totalRequested: salarySlips.length
  }));
});

type BulkGenerateOutcome = 'created' | 'updated' | 'skipped' | 'failed';

interface BulkGenerateResult {
  employeeId: string;
  employeeName: string;
  outcome: BulkGenerateOutcome;
  message: string | null;
}

/**
 * Builds draft slips from each employee's active salary structure. Finalized
 * slips are skipped: rewriting one would silently change a payslip the
 * employee can already see.
 */
export const bulkGenerateSalarySlips = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeIds, month, year, taxRegime, enableTaxDeduction } = req.body as BulkGenerateSalarySlipsInput;

  if (!req.user) {
    res.status(401).json(formatResponse(false, 'Authentication required'));
    return;
  }

  const uniqueIds = [...new Set(employeeIds)];
  const employees = await Employee.find({ employeeId: { $in: uniqueIds } })
    .select('_id employeeId firstName lastName')
    .lean();
  const employeeObjIds = employees.map((e) => e._id);

  const [structures, existingSlips] = await Promise.all([
    SalaryStructure.find({ employee: { $in: employeeObjIds }, isActive: true }).select('employee earnings').lean(),
    SalarySlip.find({ employee: { $in: employeeObjIds }, month, year }),
  ]);

  const employeeById = new Map(employees.map((e) => [e.employeeId, e]));
  const structureByEmployee = new Map(structures.map((s) => [s.employee.toString(), s]));
  const slipByEmployee = new Map(existingSlips.map((s) => [s.employee.toString(), s]));

  const results: BulkGenerateResult[] = [];

  for (const employeeId of uniqueIds) {
    const employee = employeeById.get(employeeId);
    if (!employee) {
      results.push({ employeeId, employeeName: employeeId, outcome: 'failed', message: 'Employee not found' });
      continue;
    }

    const key = employee._id.toString();
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    const structure = structureByEmployee.get(key);
    if (!structure) {
      results.push({ employeeId, employeeName, outcome: 'failed', message: 'No active salary structure' });
      continue;
    }

    const existing = slipByEmployee.get(key);
    if (existing?.status === 'finalized') {
      results.push({
        employeeId,
        employeeName,
        outcome: 'skipped',
        message: 'Already published. Unpublish it to regenerate.'
      });
      continue;
    }

    const { basic, hra, conveyance, medical, lta, specialAllowance, mobileAllowance } = structure.earnings;
    const fields = {
      earnings: { basic, hra, conveyance, medical, lta, specialAllowance, mobileAllowance },
      taxRegime,
      enableTaxDeduction
    };

    try {
      if (existing) {
        // Custom deductions (loan recovery, advances) are entered per slip; keep them.
        Object.assign(existing, fields);
        await existing.save();
        results.push({ employeeId, employeeName, outcome: 'updated', message: null });
      } else {
        await SalarySlip.create({
          ...fields,
          employee: employee._id,
          employeeId,
          month,
          year,
          deductions: { incomeTax: 0, customDeductions: [] },
          createdBy: req.user._id
        });
        results.push({ employeeId, employeeName, outcome: 'created', message: null });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err, employeeId, month, year }, 'Bulk salary slip generation failed for employee');
      results.push({ employeeId, employeeName, outcome: 'failed', message: err.message });
    }
  }

  const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };
  for (const result of results) summary[result.outcome]++;

  res.status(200).json(formatResponse(true, 'Bulk generation complete', { results, summary }));
});
