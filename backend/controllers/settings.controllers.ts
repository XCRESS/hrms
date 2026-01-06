import type { Response } from 'express';
import Settings from '../models/Settings.model.js';
import Employee from '../models/Employee.model.js';
import Department from '../models/Department.model.js';
import SchedulerService from '../services/schedulerService.js';
import { formatResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
  const output: Record<string, unknown> = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        output[key] = deepMerge((target[key] as Record<string, unknown>) || {}, sourceValue as Record<string, unknown>);
      } else {
        output[key] = sourceValue;
      }
    }
  }

  return output;
};

export const getGlobalSettings = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await Settings.getGlobalSettings();

    if (!settings) {
      res.status(404).json(formatResponse(false, 'No global settings found'));
      return;
    }

    res.json(formatResponse(true, 'Global settings retrieved successfully', settings.toObject()));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err, stack: err.stack }, 'Error fetching global settings');
    res.status(500).json(formatResponse(false, 'Server error while fetching settings', err.message));
  }
};

export const updateGlobalSettings = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { attendance, notifications, general } = req.body as {
      attendance?: Record<string, unknown>;
      notifications?: Record<string, unknown>;
      general?: Record<string, unknown>;
    };

    if (!attendance && !notifications && !general) {
      res.status(400).json(formatResponse(false, 'At least one settings section is required'));
      return;
    }

    let settings = await Settings.findOne({ scope: 'global' });

    if (!settings) {
      const newSettings: Record<string, unknown> = {
        scope: 'global',
        lastUpdatedBy: req.user?._id || null
      };

      if (attendance) newSettings.attendance = attendance;
      if (notifications) newSettings.notifications = notifications;
      if (general) newSettings.general = general;

      settings = new Settings(newSettings);
    } else {
      if (attendance) {
        settings.attendance = deepMerge(
          settings.attendance as unknown as Record<string, unknown>,
          attendance
        ) as unknown as typeof settings.attendance;
        settings.markModified('attendance');
      }
      if (notifications) {
        settings.notifications = deepMerge(
          settings.notifications as unknown as Record<string, unknown>,
          notifications
        ) as unknown as typeof settings.notifications;
        settings.markModified('notifications');
      }
      if (general) {
        settings.general = deepMerge(
          settings.general as unknown as Record<string, unknown>,
          general
        ) as unknown as typeof settings.general;
        settings.markModified('general');
      }
      settings.lastUpdatedBy = req.user?._id || settings.lastUpdatedBy;
    }

    const savedSettings = await settings.save();

    res.json(formatResponse(true, 'Global settings updated successfully', savedSettings.toObject()));
  } catch (error) {
    const err = error as { code?: number; name?: string; message?: string };
    logger.error({ err, code: err.code, name: err.name }, 'Error updating global settings');

    if (err.code === 11000) {
      res.status(409).json(formatResponse(false, 'Settings conflict. Please refresh and try again.', err.message));
    } else if (err.name === 'ValidationError') {
      res.status(400).json(formatResponse(false, 'Invalid settings data', err.message));
    } else {
      res.status(500).json(formatResponse(false, 'Server error while updating settings', err.message));
    }
  }
};

export const getDepartmentSettings = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { department } = req.params;

    if (!department) {
      res.status(400).json(formatResponse(false, 'Department parameter is required'));
      return;
    }

    const settings = await Settings.findOne({ scope: 'department', department });

    if (!settings) {
      res.status(404).json(formatResponse(false, 'Department settings not found'));
      return;
    }

    res.json(formatResponse(true, 'Department settings retrieved successfully', settings.toObject()));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching department settings');
    res.status(500).json(formatResponse(false, 'Server error while fetching department settings', err.message));
  }
};

export const updateDepartmentSettings = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { department } = req.params;
    const { attendance, general } = req.body as {
      attendance?: Record<string, unknown>;
      general?: Record<string, unknown>;
    };

    if (!department) {
      res.status(400).json(formatResponse(false, 'Department parameter is required'));
      return;
    }

    let settings = await Settings.findOne({ scope: 'department', department });

    if (!settings) {
      const newSettings: Record<string, unknown> = {
        scope: 'department',
        department,
        lastUpdatedBy: req.user?._id || null
      };
      if (attendance) newSettings.attendance = attendance;
      if (general) newSettings.general = general;

      settings = new Settings(newSettings);
    } else {
      if (attendance) {
        settings.attendance = deepMerge(
          settings.attendance as unknown as Record<string, unknown>,
          attendance
        ) as unknown as typeof settings.attendance;
        settings.markModified('attendance');
      }
      if (general) {
        settings.general = deepMerge(
          settings.general as unknown as Record<string, unknown>,
          general
        ) as unknown as typeof settings.general;
        settings.markModified('general');
      }
      settings.lastUpdatedBy = req.user?._id || settings.lastUpdatedBy;
    }

    await settings.save();

    res.json(formatResponse(true, 'Department settings updated successfully', settings.toObject()));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error updating department settings');
    res.status(500).json(formatResponse(false, 'Server error while updating department settings', err.message));
  }
};

export const deleteDepartmentSettings = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { department } = req.params;

    if (!department) {
      res.status(400).json(formatResponse(false, 'Department parameter is required'));
      return;
    }

    const deleted = await Settings.findOneAndDelete({ scope: 'department', department });

    if (!deleted) {
      res.status(404).json(formatResponse(false, 'Department settings not found'));
      return;
    }

    res.json(formatResponse(true, 'Department settings deleted successfully. Will use global settings.'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error deleting department settings');
    res.status(500).json(formatResponse(false, 'Server error while deleting department settings', err.message));
  }
};

export const getEffectiveSettings = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { department } = req.query;

    const effectiveSettings = await Settings.getEffectiveSettings(typeof department === 'string' ? department : undefined);

    res.json(formatResponse(true, 'Effective settings retrieved successfully', effectiveSettings));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching effective settings');
    res.status(500).json(formatResponse(false, 'Server error while fetching effective settings', err.message));
  }
};

export const getDepartments = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await Department.find({ isActive: true })
      .select('name')
      .sort({ name: 1 })
      .lean();

    const departmentNames = departments.map(dept => dept.name);

    res.json(formatResponse(true, 'Departments retrieved successfully', { departments: departmentNames }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching departments');
    res.status(500).json(formatResponse(false, 'Server error while fetching departments', err.message));
  }
};

export const getDepartmentStats = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });

    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const employees = await Employee.find(
          { department: dept.name, isActive: true },
          { firstName: 1, lastName: 1, employeeId: 1, email: 1, joiningDate: 1 }
        ).sort({ firstName: 1, lastName: 1 });

        return {
          _id: dept._id,
          name: dept.name,
          isActive: dept.isActive,
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt,
          employeeCount: employees.length,
          employees: employees
        };
      })
    );

    departmentStats.sort((a, b) => {
      if (b.employeeCount !== a.employeeCount) {
        return b.employeeCount - a.employeeCount;
      }
      return a.name.localeCompare(b.name);
    });

    res.json(formatResponse(true, 'Department statistics retrieved successfully', { departments: departmentStats }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching department stats');
    res.status(500).json(formatResponse(false, 'Server error while fetching department statistics', err.message));
  }
};

export const addDepartment = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body as { name: string };

    if (!name || !name.trim()) {
      res.status(400).json(formatResponse(false, 'Department name is required'));
      return;
    }

    const trimmedName = name.trim();

    const existingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
      isActive: true
    });

    if (existingDepartment) {
      res.status(409).json(formatResponse(false, 'Department already exists', { existingName: existingDepartment.name }));
      return;
    }

    const department = await Department.create({ name: trimmedName });

    res.json(formatResponse(true, 'Department created successfully', {
      _id: department._id,
      name: department.name,
      isActive: department.isActive,
      createdAt: department.createdAt,
      employeeCount: 0
    }));
  } catch (error) {
    const err = error as { code?: number; message?: string };
    logger.error({ err }, 'Error adding department');

    if (err.code === 11000) {
      res.status(409).json(formatResponse(false, 'Department already exists'));
      return;
    }

    res.status(500).json(formatResponse(false, 'Server error while adding department', err.message));
  }
};

export const renameDepartment = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { oldName } = req.params;
    const { newName } = req.body as { newName: string };

    if (!oldName || !newName || !newName.trim()) {
      res.status(400).json(formatResponse(false, 'Both old and new department names are required'));
      return;
    }

    const trimmedNewName = newName.trim();

    const conflictingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedNewName)}$`, 'i') },
      isActive: true
    });

    if (conflictingDepartment && conflictingDepartment.name !== oldName) {
      res.status(409).json(formatResponse(false, 'Department name already exists', { existingName: conflictingDepartment.name }));
      return;
    }

    const department = await Department.findOne({ name: oldName, isActive: true });
    if (!department) {
      res.status(404).json(formatResponse(false, 'Department not found', { requestedName: oldName }));
      return;
    }

    await Department.findByIdAndUpdate(department._id, { name: trimmedNewName });

    const employeeUpdateResult = await Employee.updateMany(
      { department: oldName, isActive: true },
      { $set: { department: trimmedNewName } }
    );

    const settingsUpdateResult = await Settings.updateMany(
      { scope: 'department', department: oldName },
      { $set: { department: trimmedNewName } }
    );

    res.json(formatResponse(true, 'Department renamed successfully', {
      oldName,
      newName: trimmedNewName,
      employeesUpdated: employeeUpdateResult.modifiedCount,
      settingsUpdated: settingsUpdateResult.modifiedCount
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error renaming department');
    res.status(500).json(formatResponse(false, 'Server error while renaming department', err.message));
  }
};

export const deleteDepartment = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.params;

    if (!name) {
      res.status(400).json(formatResponse(false, 'Department name is required'));
      return;
    }

    const department = await Department.findOne({ name, isActive: true });
    if (!department) {
      res.status(404).json(formatResponse(false, 'Department not found', { requestedName: name }));
      return;
    }

    const employeeCount = await Employee.countDocuments({ department: name, isActive: true });

    await Department.findByIdAndDelete(department._id);

    const employeeUpdateResult = await Employee.updateMany(
      { department: name, isActive: true },
      { $unset: { department: 1 } }
    );

    const settingsDeleteResult = await Settings.deleteMany({
      scope: 'department',
      department: name
    });

    res.json(formatResponse(true, 'Department deleted successfully', {
      departmentName: name,
      employeesUpdated: employeeUpdateResult.modifiedCount,
      settingsDeleted: settingsDeleteResult.deletedCount,
      affectedEmployees: employeeCount
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error deleting department');
    res.status(500).json(formatResponse(false, 'Server error while deleting department', err.message));
  }
};

export const assignEmployeeToDepartment = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { departmentName } = req.params;
    const { employeeId } = req.body as { employeeId: string };

    if (!departmentName || !employeeId) {
      res.status(400).json(formatResponse(false, 'Department name and employee ID are required'));
      return;
    }

    const department = await Department.findOne({ name: departmentName, isActive: true });
    if (!department) {
      res.status(404).json(formatResponse(false, 'Department not found'));
      return;
    }

    const employee = await Employee.findOne({ employeeId, isActive: true });
    if (!employee) {
      res.status(404).json(formatResponse(false, 'Employee not found'));
      return;
    }

    const oldDepartment = employee.department;

    await Employee.findByIdAndUpdate(employee._id, { department: departmentName });

    res.json(formatResponse(true, 'Employee assigned to department successfully', {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      oldDepartment: oldDepartment || null,
      newDepartment: departmentName
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error assigning employee to department');
    res.status(500).json(formatResponse(false, 'Server error while assigning employee', err.message));
  }
};

export const getAvailableEmployees = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { departmentName } = req.params;

    const allEmployees = await Employee.find(
      { isActive: true },
      { employeeId: 1, firstName: 1, lastName: 1, email: 1, department: 1 }
    ).sort({ firstName: 1, lastName: 1 });

    const employeesInDepartment = allEmployees.filter(emp => emp.department === departmentName);
    const employeesInOtherDepartments = allEmployees.filter(emp => emp.department && emp.department !== departmentName);
    const employeesWithoutDepartment = allEmployees.filter(emp => !emp.department);

    res.json(formatResponse(true, 'Available employees retrieved successfully', {
      departmentName,
      employeesInDepartment,
      employeesInOtherDepartments,
      employeesWithoutDepartment,
      totals: {
        inDepartment: employeesInDepartment.length,
        inOtherDepartments: employeesInOtherDepartments.length,
        withoutDepartment: employeesWithoutDepartment.length,
        total: allEmployees.length
      }
    }));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error fetching available employees');
    res.status(500).json(formatResponse(false, 'Server error while fetching employees', err.message));
  }
};

export const rescheduleDailyHrAttendanceReport = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    await SchedulerService.scheduleDailyHrAttendanceReport();

    res.json(formatResponse(true, 'Daily HR attendance report job rescheduled successfully'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error rescheduling daily HR attendance report');
    res.status(500).json(formatResponse(false, 'Failed to reschedule daily HR attendance report', err.message));
  }
};

export const testDailyHrAttendanceReport = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    await SchedulerService.sendDailyHrAttendanceReport();

    res.json(formatResponse(true, 'Daily HR attendance report sent successfully. Check HR email inboxes.'));
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error({ err }, 'Error testing daily HR attendance report');
    res.status(500).json(formatResponse(false, 'Failed to send test report', err.message));
  }
};

export default {
  getGlobalSettings,
  updateGlobalSettings,
  getDepartmentSettings,
  updateDepartmentSettings,
  deleteDepartmentSettings,
  getEffectiveSettings,
  getDepartments,
  getDepartmentStats,
  addDepartment,
  renameDepartment,
  deleteDepartment,
  assignEmployeeToDepartment,
  getAvailableEmployees,
  rescheduleDailyHrAttendanceReport,
  testDailyHrAttendanceReport
};
