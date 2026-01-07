import type { Response } from 'express';
import Leave from '../models/Leave.model.js';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import NotificationService from '../services/notificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';
import type { LeaveStatus } from '../types/index.js';

export const requestLeave = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { leaveType, startDate, endDate, reason } = req.body as {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  };

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

  const leave = await Leave.create({
    employee: employee._id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    leaveType,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    reason
  });

  NotificationService.notifyHR('leave_request', {
    employee: req.user.name,
    employeeId: req.user.employeeId,
    type: leaveType,
    date: startDate,
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

  const leaves = await Leave.find({ employee: employee._id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    leaves
  });
});

export const getAllLeaves = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.query;
    const filter: { employee?: unknown } = {};

    if (employeeId && typeof employeeId === 'string') {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employee = employee._id;
      }
    }

    const leaves = await Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      leaves
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Failed to fetch leave requests');
    res.status(500).json({
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

export const updateLeaveStatus = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { leaveId } = req.params;
  const { status } = req.body as { status: string };

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

  const employee = await Employee.findById(leave.employee);

  NotificationService.notifyEmployee(employee?.employeeId || '', 'leave_status_update', {
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
