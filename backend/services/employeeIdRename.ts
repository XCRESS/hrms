import mongoose, { type Model } from 'mongoose';
import Employee from '../models/Employee.model.js';
import User from '../models/User.model.js';
import EmployeeDocument from '../models/EmployeeDocument.model.js';
import RegularizationRequest from '../models/Regularization.model.js';
import SalarySlip from '../models/SalarySlip.model.js';
import SalaryStructure from '../models/SalaryStructure.model.js';
import TaskReport from '../models/TaskReport.model.js';
import WFHRequest from '../models/WFHRequest.model.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/** Every collection holding a copy of the employeeId string. A new copy must be added here. */
export const COPIES: Model<any>[] = [User, EmployeeDocument, RegularizationRequest, SalarySlip, SalaryStructure, TaskReport, WFHRequest];

const transactionsUnsupported = (error: unknown): boolean =>
  (error as { code?: number }).code === 20 ||
  String((error as Error).message).includes('Transaction numbers are only allowed');

/**
 * Changes an employee's human-facing ID and every stored copy of it.
 *
 * Without a replica set there are no transactions, so it falls back to running
 * the same writes in order, copies first and the Employee last. A failure part
 * way leaves the Employee on the old ID, and retrying the rename completes it.
 */
export const renameEmployeeId = async (
  employeeObjId: string,
  requestedId: string
): Promise<{ from: string; to: string }> => {
  const employee = await Employee.findById(employeeObjId).select('employeeId').lean();
  if (!employee) throw new NotFoundError('Employee not found');

  const from = employee.employeeId;
  const to = requestedId.trim().toUpperCase();
  if (from === to) return { from, to };

  if (await Employee.exists({ employeeId: to, _id: { $ne: employee._id } })) {
    throw new ConflictError(`Employee ID '${to}' is already in use`);
  }

  const apply = async (session?: mongoose.ClientSession): Promise<void> => {
    for (const model of COPIES) {
      await model.updateMany({ employeeId: from }, { $set: { employeeId: to } }, { session });
    }
    await Employee.updateOne({ _id: employee._id }, { $set: { employeeId: to } }, { session });
  };

  try {
    await mongoose.connection.transaction((session) => apply(session));
  } catch (error) {
    if (!transactionsUnsupported(error)) throw error;
    logger.warn('MongoDB has no transactions here; renaming employee ID without one');
    await apply();
  }

  logger.info({ employee: String(employee._id), from, to }, 'Employee ID renamed');
  return { from, to };
};
