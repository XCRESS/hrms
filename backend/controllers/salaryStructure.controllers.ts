import type { CreateSalaryStructureInput } from '../validators/salary.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paramValue } from '../utils/helpers.js';
import type { Response } from 'express';
import SalaryStructure from '../models/SalaryStructure.model.js';
import SalarySlip from '../models/SalarySlip.model.js';
import Employee from '../models/Employee.model.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

export const createOrUpdateSalaryStructure = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeId, earnings } = req.body as CreateSalaryStructureInput;

  if (!employeeId || !earnings || !earnings.basic) {
    res.status(400).json(formatResponse(false, 'Employee ID and basic salary are required'));
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

  const structureData = {
    employee: employee._id,
    employeeId,
    earnings: {
      basic: earnings.basic,
      hra: earnings.hra || 0,
      conveyance: earnings.conveyance || 0,
      medical: earnings.medical || 0,
      lta: earnings.lta || 0,
      specialAllowance: earnings.specialAllowance || 0,
      mobileAllowance: earnings.mobileAllowance || 0
    },
    isActive: true,
    lastUpdatedBy: req.user._id
  };

  logger.info({
    employeeObjectId: employee._id,
    employeeId,
    earnings: structureData.earnings,
    isActive: structureData.isActive
  }, 'createOrUpdateSalaryStructure: Structure data to save');

  const existingStructure = await SalaryStructure.findOne({ employee: employee._id });
  logger.info({ exists: !!existingStructure }, 'createOrUpdateSalaryStructure: Existing structure found');

  let salaryStructure;
  if (existingStructure) {
    logger.info({ id: existingStructure._id }, 'createOrUpdateSalaryStructure: Updating existing structure');
    Object.assign(existingStructure, structureData);
    salaryStructure = await existingStructure.save();
    logger.info({ id: salaryStructure._id }, 'createOrUpdateSalaryStructure: Updated structure saved');
  } else {
    logger.info('createOrUpdateSalaryStructure: Creating new structure');
    const newStructureData = {
      ...structureData,
      createdBy: req.user._id
    };
    salaryStructure = new SalaryStructure(newStructureData);
    await salaryStructure.save();
    logger.info({ id: salaryStructure._id }, 'createOrUpdateSalaryStructure: New structure created');
  }

  const verificationStructure = await SalaryStructure.findOne({
    employee: employee._id,
    isActive: true
  });

  logger.info({ exists: !!verificationStructure }, 'createOrUpdateSalaryStructure: Verification - structure exists after save');
  if (verificationStructure) {
    logger.info({
      id: verificationStructure._id,
      employeeId: verificationStructure.employeeId,
      isActive: verificationStructure.isActive,
      grossSalary: verificationStructure.grossSalary
    }, 'createOrUpdateSalaryStructure: Verification - structure details');
  }

  logger.info({
    id: salaryStructure._id,
    employeeId: salaryStructure.employeeId,
    isActive: salaryStructure.isActive,
    grossSalary: salaryStructure.grossSalary
  }, 'createOrUpdateSalaryStructure: Structure saved successfully');

  await salaryStructure.populate('employee', 'firstName lastName employeeId department position');

  res.status(200).json(formatResponse(true, 'Salary structure saved successfully', salaryStructure));
}, { onDuplicate: 'Salary structure already exists for this employee' });

export const getSalaryStructure = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);

  if (!employeeId) {
    res.status(400).json(formatResponse(false, 'Employee ID is required'));
    return;
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);
  logger.info({ employeeId: decodedEmployeeId }, 'getSalaryStructure: Looking for employeeId');

  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    logger.info({ employeeId: decodedEmployeeId }, 'getSalaryStructure: Employee not found');
    res.status(404).json(formatResponse(false, 'Employee not found'));
    return;
  }

  logger.info({ id: employee._id, employeeId: employee.employeeId }, 'getSalaryStructure: Found employee');

  const salaryStructure = await SalaryStructure.findOne({
    employee: employee._id,
    isActive: true
  }).populate('employee', 'firstName lastName employeeId department position');

  const allStructuresForEmployee = await SalaryStructure.find({ employee: employee._id });
  logger.info({ count: allStructuresForEmployee.length }, 'getSalaryStructure: All structures for employee (including inactive)');
  logger.info({ found: !!salaryStructure }, 'getSalaryStructure: Active structure found');

  if (!salaryStructure) {
    logger.info({
      employeeObjectId: employee._id,
      structures: allStructuresForEmployee.map(s => ({
        id: s._id,
        employeeId: s.employeeId,
        isActive: s.isActive,
        createdAt: s.createdAt
      }))
    }, 'getSalaryStructure: All structures for this employee');

    res.status(404).json(formatResponse(false, 'No salary structure found for this employee', null, {
      reason: 'NO_STRUCTURE',
      employeeId: decodedEmployeeId,
      employeeObjectId: employee._id.toString(),
      totalStructuresFound: allStructuresForEmployee.length
    }));
    return;
  }

  res.status(200).json(formatResponse(true, 'Salary structure fetched successfully', salaryStructure));
});

export const getAllSalaryStructures = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { page = '1', limit = '10', search } = req.query;

  const filter: { isActive: boolean; employee?: { $in: unknown[] } } = { isActive: true };

  const pageNum = parseInt(typeof page === 'string' ? page : '1', 10);
  const limitNum = parseInt(typeof limit === 'string' ? limit : '10', 10);
  const skip = (pageNum - 1) * limitNum;

  let query = SalaryStructure.find(filter)
    .populate('employee', 'firstName lastName employeeId department position')
    .sort({ createdAt: -1 });

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

    query = SalaryStructure.find(filter)
      .populate('employee', 'firstName lastName employeeId department position')
      .sort({ createdAt: -1 });
  }

  const [salaryStructures, total] = await Promise.all([
    query.skip(skip).limit(limitNum),
    SalaryStructure.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  res.status(200).json(formatResponse(true, 'Salary structures fetched successfully', {
    salaryStructures,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum
    }
  }));
});

export const deleteSalaryStructure = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeeId = paramValue(req.params.employeeId);

  if (!employeeId) {
    res.status(400).json(formatResponse(false, 'Employee ID is required'));
    return;
  }

  const decodedEmployeeId = decodeURIComponent(employeeId);
  logger.info({ employeeId: decodedEmployeeId }, 'deleteSalaryStructure: Looking for employeeId');

  const employee = await Employee.findOne({ employeeId: decodedEmployeeId });
  if (!employee) {
    logger.info({ employeeId: decodedEmployeeId }, 'deleteSalaryStructure: Employee not found');
    res.status(404).json(formatResponse(false, 'Employee not found'));
    return;
  }

  if (!req.user) {
    res.status(401).json(formatResponse(false, 'Authentication required'));
    return;
  }

  const salaryStructure = await SalaryStructure.findOneAndUpdate(
    { employee: employee._id },
    {
      isActive: false,
      lastUpdatedBy: req.user._id
    },
    { new: true }
  );

  if (!salaryStructure) {
    res.status(404).json(formatResponse(false, 'Salary structure not found'));
    return;
  }

  res.status(200).json(formatResponse(true, 'Salary structure deleted successfully'));
});

const findEmployeesWithoutStructure = async () =>
  Employee.find({
    isActive: true,
    _id: { $nin: await SalaryStructure.distinct('employee', { isActive: true }) }
  });

export const getEmployeesWithoutStructure = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const employeesWithoutStructure = await findEmployeesWithoutStructure();

  res.status(200).json(formatResponse(true, 'Employees without salary structure fetched successfully', employeesWithoutStructure));
});

export const getSalaryStatistics = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [
    totalEmployees,
    activeSalaryStructures,
    employeesWithoutStructure,
    currentMonthSlips,
    totalSalaryStructures,
    allActiveSalaryStructures
  ] = await Promise.all([
    Employee.countDocuments({ isActive: true }),

    SalaryStructure.countDocuments({ isActive: true }),

    findEmployeesWithoutStructure(),

    SalarySlip.countDocuments({
      month: currentMonth,
      year: currentYear
    }),

    SalaryStructure.countDocuments({}),

    SalaryStructure.find({ isActive: true })
  ]);

  const totalGrossSalary = allActiveSalaryStructures.reduce((sum, structure) => {
    return sum + (structure.grossSalary || 0);
  }, 0);

  const sortedStructures = allActiveSalaryStructures
    .sort((a, b) => (b.grossSalary || 0) - (a.grossSalary || 0));

  const highestPaid = sortedStructures.length > 0 ? sortedStructures[0]?.grossSalary || 0 : 0;
  const lowestPaid = sortedStructures.length > 0 ? sortedStructures[sortedStructures.length - 1]?.grossSalary || 0 : 0;

  const statistics = {
    overview: {
      totalEmployees,
      activeSalaryStructures,
      employeesWithoutStructure: employeesWithoutStructure.length,
      currentMonthSlips,
      totalSalaryStructures
    },
    financial: {
      totalGrossSalary,
      highestPaid,
      lowestPaid
    },
    currentMonth: {
      month: currentMonth,
      year: currentYear,
      slipsGenerated: currentMonthSlips,
      slipsRemaining: activeSalaryStructures - currentMonthSlips
    }
  };

  logger.info({
    totalEmployees,
    activeSalaryStructures,
    employeesWithoutStructure: employeesWithoutStructure.length,
    currentMonthSlips,
    totalGrossSalary
  }, 'Salary statistics calculated');

  res.status(200).json(formatResponse(true, 'Salary statistics fetched successfully', statistics));
});
