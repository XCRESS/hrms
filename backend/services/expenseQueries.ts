import type { Types } from 'mongoose';
import Expense from '../models/Expense.model.js';

export interface ExpenseFilter {
  employee?: Types.ObjectId | Types.ObjectId[];
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

/** Newest first, with the employee's name, id and department populated. */
export const expenseQuery = ({ employee, status, startDate, endDate }: ExpenseFilter) => {
  const filter: Record<string, unknown> = {};
  if (employee) filter.employee = Array.isArray(employee) ? { $in: employee } : employee;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.date = { ...(startDate ? { $gte: startDate } : {}), ...(endDate ? { $lte: endDate } : {}) };
  }
  return Expense.find(filter).populate('employee', 'firstName lastName employeeId department').sort({ date: -1 });
};
