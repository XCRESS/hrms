import type { Response } from 'express';
import TaskReport from '../models/TaskReport.model.js';
import Employee from '../models/Employee.model.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

const formatResponse = (success: boolean, message: string, data: unknown = null, errors: unknown = null) => {
  const response: Record<string, unknown> = { success, message };
  if (data) response.data = data;
  if (errors) response.errors = errors;
  return response;
};

const getEmployeeObjectId = async (user: { employee?: unknown; employeeId?: string; email?: string }) => {
  if (user.employee) return user.employee;

  if (user.employeeId) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    return employee ? employee._id : null;
  }

  if (user.email) {
    const employee = await Employee.findOne({ email: user.email });
    return employee ? employee._id : null;
  }

  return null;
};

export const submitTaskReport = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      logger.error('submitTaskReport: No user found in request');
      res.status(401).json(formatResponse(false, 'Authentication required', null, { auth: 'No valid user found' }));
      return;
    }

    logger.info({ userId: req.user._id, email: req.user.email, role: req.user.role }, 'submitTaskReport: User found');

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      logger.error({ userId: req.user._id, employeeId: req.user.employeeId }, 'submitTaskReport: No employee ObjectId found for user');
      res.status(400).json(formatResponse(false, 'No linked employee profile found for user'));
      return;
    }

    logger.info({ employeeObjId }, 'submitTaskReport: Employee ObjectId found');

    const { tasks, date } = req.body as { tasks: unknown; date?: string };

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      logger.error({ tasks }, 'submitTaskReport: Invalid tasks data');
      res.status(400).json(formatResponse(false, 'Tasks array is required and cannot be empty'));
      return;
    }

    const validTasks = tasks.filter(task => task && typeof task === 'string' && task.trim() !== '');
    if (validTasks.length === 0) {
      logger.error({ tasks, validTasks }, 'submitTaskReport: No valid tasks after filtering');
      res.status(400).json(formatResponse(false, 'At least one non-empty task is required'));
      return;
    }

    const reportDate = date ? new Date(date) : new Date();

    const existingReport = await TaskReport.findOne({
      employee: employeeObjId,
      date: {
        $gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()),
        $lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 1)
      }
    });

    if (existingReport) {
      existingReport.tasks = validTasks;
      existingReport.updatedAt = new Date();

      if (!existingReport.employeeId) {
        const employee = await Employee.findById(employeeObjId);
        if (employee) {
          existingReport.employeeId = employee.employeeId;
        }
      }

      await existingReport.save();
      res.json(formatResponse(true, 'Task report updated successfully', { taskReport: existingReport }));
      return;
    } else {
      const employee = await Employee.findById(employeeObjId);
      if (!employee) {
        logger.error({ employeeObjId }, 'submitTaskReport: Employee not found');
        res.status(400).json(formatResponse(false, 'Employee profile not found'));
        return;
      }

      const taskReport = new TaskReport({
        employee: employeeObjId,
        employeeId: employee.employeeId,
        tasks: validTasks,
        date: reportDate
      });

      logger.info({ employee: employeeObjId, employeeId: employee.employeeId, tasks: validTasks, date: reportDate }, 'submitTaskReport: Attempting to save task report');

      await taskReport.save();

      const populatedReport = await TaskReport.findById(taskReport._id)
        .populate('employee', 'firstName lastName employeeId department');

      logger.info({ taskReportId: taskReport._id }, 'submitTaskReport: Task report saved successfully');
      res.status(201).json(formatResponse(true, 'Task report submitted successfully', { taskReport: populatedReport }));
      return;
    }

  } catch (err) {
    const error = err as { name?: string; errors?: Record<string, { message: string }>; code?: number; message?: string; keyValue?: unknown };

    logger.error({ err, body: req.body, user: { userId: req.user?._id, employeeId: req.user?.employeeId, employee: req.user?.employee } }, 'Error submitting task report');

    if (error.name === 'ValidationError' && error.errors) {
      const validationErrors: Record<string, string> = {};
      for (const key of Object.keys(error.errors)) {
        const errorObj = error.errors[key];
        if (errorObj) {
          validationErrors[key] = errorObj.message;
        }
      }
      logger.error({ validationErrors }, 'Validation errors');
      res.status(400).json(formatResponse(false, 'Validation failed', null, validationErrors));
      return;
    }

    if (error.code === 11000) {
      logger.error({ keyValue: error.keyValue }, 'Duplicate key error');
      res.status(409).json(formatResponse(false, 'A task report already exists for this date', null, { duplicate: 'Task report for this date already exists' }));
      return;
    }

    res.status(500).json(formatResponse(false, 'Failed to submit task report.', null, { server: error.message || 'Unknown error' }));
  }
};

export const getMyTaskReports = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse(false, 'Authentication required', null, { auth: 'No valid user found' }));
      return;
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      res.status(400).json(formatResponse(false, 'No linked employee profile found for user'));
      return;
    }

    const { startDate, endDate } = req.query;
    const filter: { employee: unknown; date?: { $gte?: Date; $lte?: Date } } = { employee: employeeObjId };

    if (startDate && typeof startDate === 'string') {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      if (!filter.date) filter.date = {};
      filter.date.$gte = startOfDay;
    }
    if (endDate && typeof endDate === 'string') {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      if (!filter.date) filter.date = {};
      filter.date.$lte = endOfDay;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      TaskReport.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName employeeId department'),
      TaskReport.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json(
      formatResponse(true, 'My task reports retrieved successfully.', {
        reports,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      })
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Error fetching my task reports');
    res.status(500).json(formatResponse(false, 'Failed to retrieve my task reports.', null, { server: error.message }));
  }
};

export const getTaskReports = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const filter: { employee?: unknown; date?: { $gte?: Date; $lte?: Date } } = {};

    if (employeeId && typeof employeeId === 'string') {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employee = employee._id;
      } else {
        res.json(formatResponse(true, 'No reports found for this employee ID.', { records: [] }));
        return;
      }
    }

    if (startDate && typeof startDate === 'string') {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      if (!filter.date) filter.date = {};
      filter.date.$gte = startOfDay;
    }
    if (endDate && typeof endDate === 'string') {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      if (!filter.date) filter.date = {};
      filter.date.$lte = endOfDay;
    }

    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      TaskReport.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName employeeId department'),
      TaskReport.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json(
      formatResponse(true, 'Task reports retrieved successfully.', {
        reports,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      })
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Error fetching task reports');
    res.status(500).json(formatResponse(false, 'Failed to retrieve task reports.', null, { server: error.message }));
  }
};
