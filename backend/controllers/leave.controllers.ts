import type { CreateLeaveInput, UpdateLeaveStatusInput, RequestListQuery } from '../validators/request.schemas.js';
import { requestFilter } from '../services/requestQueries.js';
import type { Response } from 'express';
import Leave from '../models/Leave.model.js';
import Employee from '../models/Employee.model.js';
import NotificationService from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { countWorkingDays, getDayType } from '../services/workCalendar.js';
import logger from '../utils/logger.js';
import { getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import type { IAuthRequest } from '../types/index.js';
import type { LeaveStatus } from '../types/index.js';

export const requestLeave = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { leaveMode, leaveType, startDate, endDate, date, reason } = req.body as CreateLeaveInput;

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  if (!req.user.employeeId || typeof req.user.employeeId !== 'string' || req.user.employeeId.trim() === '') {
    throw new ValidationError('You must be linked to an employee profile to request leave. Please contact HR.');
  }

  const employee = await Employee.findOne({ employeeId: req.user.employeeId });
  if (!employee) {
    throw new NotFoundError('Employee profile not found');
  }

  // Determine the effective mode and dates
  const effectiveMode = leaveMode || 'single';
  let leaveStartDate: Date;
  let leaveEndDate: Date;
  let numberOfDays: number;

  if (effectiveMode === 'multi') {
    // Multi-day mode
    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required for multi-day leave');
    }

    leaveStartDate = new Date(startDate);
    leaveEndDate = new Date(endDate);

    if (isNaN(leaveStartDate.getTime()) || isNaN(leaveEndDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    if (leaveStartDate > leaveEndDate) {
      throw new ValidationError('Start date must be on or before end date');
    }

    const result = await countWorkingDays(leaveStartDate, leaveEndDate, employee.department || null);
    numberOfDays = result.workingDays;

    if (numberOfDays === 0) {
      throw new ValidationError('The selected date range contains no working days');
    }
  } else {
    // Single-day mode (backward compatible with old `date` field)
    const singleDate = startDate || date;
    if (!singleDate) {
      throw new ValidationError('Date is required');
    }

    leaveStartDate = new Date(singleDate);
    leaveEndDate = new Date(singleDate);

    if (isNaN(leaveStartDate.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    const dayType = await getDayType(leaveStartDate, employee.department || null);
    if (dayType.type !== 'working') {
      throw new ValidationError(
        `The selected date is not a working day (${dayType.type === 'holiday' ? dayType.holidayTitle : dayType.reason})`
      );
    }

    numberOfDays = leaveType === 'half-day' ? 0.5 : 1;
  }

  // For multi-day, force leaveType to full-day
  const effectiveLeaveType = effectiveMode === 'multi' ? 'full-day' : leaveType;

  const leave = await Leave.create({
    employee: employee._id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    leaveType: effectiveLeaveType,
    startDate: leaveStartDate,
    endDate: leaveEndDate,
    reason,
    numberOfDays
  });

  NotificationService.notifyHR('leave_request', {
    employee: `${employee.firstName} ${employee.lastName}`,
    employeeId: employee.employeeId,
    type: effectiveLeaveType,
    date: startDate || date,
    reason
  }).catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to send leave request notification');
  });

  res.status(201).json({
    success: true,
    message: 'Leave request submitted successfully',
    leave
  });
});

/**
 * Preview leave days — returns the working day count and breakdown
 * for a given date range. Used by the frontend to show a live preview
 * before the employee submits.
 */
export const previewLeaveDays = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  if (!startDate || !endDate) {
    throw new ValidationError('startDate and endDate query parameters are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format');
  }

  if (start > end) {
    throw new ValidationError('Start date must be on or before end date');
  }

  const employee = req.user?.employeeId
    ? await Employee.findOne({ employeeId: req.user.employeeId }).select('department').lean()
    : null;
  const result = await countWorkingDays(start, end, employee?.department || null);

  res.json({
    success: true,
    ...result
  });
});

export const getMyLeaves = asyncHandler(async (req: IAuthRequest, res: Response) => {
  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  if (!req.user.employeeId) {
    throw new ValidationError('No employee profile linked');
  }

  const employee = await Employee.findOne({ employeeId: req.user.employeeId });
  if (!employee) {
    throw new NotFoundError('Employee profile not found');
  }

  const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 }).lean();

  res.json({
    success: true,
    leaves
  });
});

export const getAllLeaves = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeId, startDate, endDate, status, page, limit } =
    getValidatedQuery<RequestListQuery>(req);
  const employee = employeeId ? await Employee.findOne({ employeeId }).select('_id').lean() : null;
  const filter: { status?: string } = requestFilter({
    ...(employee ? { employee: employee._id } : {}),
    ...(status ? { status } : {}),
    ...(startDate ? { createdFrom: new Date(startDate) } : {}),
    ...(endDate ? { createdTo: new Date(endDate) } : {}),
  });

  // Counts ignore the status filter so the UI can badge every status at once.
  const countFilter = { ...filter };
  delete countFilter.status;

  const [leaves, total, statusCounts] = await Promise.all([
    Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Leave.countDocuments(filter),
    Leave.aggregate<{ _id: string; count: number }>([
      { $match: countFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    leaves,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
  });
});

export const updateLeaveStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { leaveId } = req.params;
  const { status } = req.body as UpdateLeaveStatusInput;

  if (!['approved', 'rejected'].includes(status)) {
    throw new ValidationError('Invalid status');
  }

  const leave = await Leave.findById(leaveId);

  if (!leave) {
    throw new NotFoundError('Leave request not found');
  }

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  leave.status = status as LeaveStatus;
  leave.approvedBy = req.user._id;
  await leave.save();

  NotificationService.notifyEmployee(leave.employee, 'leave_status_update', {
    status,
    type: leave.leaveType,
    date: leave.startDate.toDateString(),
    reason: leave.reason
  }).catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Failed to send leave status notification');
  });

  res.json({
    success: true,
    message: `Leave request ${status}`,
    leave
  });
});
