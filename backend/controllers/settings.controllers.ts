import type { UpdateGlobalSettingsInput, UpdateDepartmentSettingsInput, CreateDepartmentInput, RenameDepartmentInput, AssignEmployeeToDepartmentInput, GetEffectiveSettingsQuery, RunRegularizationCleanupInput } from '../validators/settings.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Response } from 'express';
import Settings from '../models/Settings.model.js';
import Employee from '../models/Employee.model.js';
import Department from '../models/Department.model.js';
import SchedulerService from '../services/schedulerService.js';
import settingsService from '../services/settings/SettingsService.js';
import { formatResponse } from '../utils/response.js';
import { paramValue } from '../utils/helpers.js';
import { getValidatedQuery } from '../middlewares/zodValidation.middleware.js';
import type { IAuthRequest } from '../types/index.js';

const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Merge a validated partial settings section into the stored section.
 * Delegates to the model's mergeSettings so there is one merge implementation.
 */
const mergeSection = <T>(existing: T, incoming: Record<string, unknown>): T =>
  Settings.mergeSettings(
    existing as unknown as Record<string, unknown>,
    incoming
  ) as unknown as T;

export const getGlobalSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const settings = await Settings.getGlobalSettings();

  if (!settings) {
    res.status(404).json(formatResponse(false, 'No global settings found'));
    return;
  }

  res.json(formatResponse(true, 'Global settings retrieved successfully', settings.toObject()));
});

export const updateGlobalSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { attendance, notifications, general, requestRetention } = req.body as UpdateGlobalSettingsInput;

  if (!attendance && !notifications && !general && !requestRetention) {
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
    if (requestRetention) newSettings.requestRetention = requestRetention;

    settings = new Settings(newSettings);
  } else {
    if (attendance) {
      settings.attendance = mergeSection(settings.attendance, attendance);
      settings.markModified('attendance');
    }
    if (notifications) {
      settings.notifications = mergeSection(settings.notifications, notifications);
      settings.markModified('notifications');
    }
    if (general) {
      settings.general = mergeSection(settings.general, general);
      settings.markModified('general');
    }
    if (requestRetention) {
      settings.requestRetention = mergeSection(settings.requestRetention, requestRetention);
      settings.markModified('requestRetention');
    }
    settings.lastUpdatedBy = req.user?._id || settings.lastUpdatedBy;
  }

  const savedSettings = await settings.save();

  // Global settings are the base of every department's merged result,
  // so clear the entire cache - not just the global key.
  settingsService.clearCache();

  res.json(formatResponse(true, 'Global settings updated successfully', savedSettings.toObject()));
}, { onDuplicate: 'Settings conflict. Please refresh and try again.' });

export const getDepartmentSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const department = paramValue(req.params.department);

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
});

export const updateDepartmentSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const department = paramValue(req.params.department);
  const { attendance, general } = req.body as UpdateDepartmentSettingsInput;

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
      settings.attendance = mergeSection(settings.attendance, attendance);
      settings.markModified('attendance');
    }
    if (general) {
      settings.general = mergeSection(settings.general, general);
      settings.markModified('general');
    }
    settings.lastUpdatedBy = req.user?._id || settings.lastUpdatedBy;
  }

  await settings.save();

  settingsService.clearCache(department);

  res.json(formatResponse(true, 'Department settings updated successfully', settings.toObject()));
});

export const deleteDepartmentSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const department = paramValue(req.params.department);

  if (!department) {
    res.status(400).json(formatResponse(false, 'Department parameter is required'));
    return;
  }

  const deleted = await Settings.findOneAndDelete({ scope: 'department', department });

  if (!deleted) {
    res.status(404).json(formatResponse(false, 'Department settings not found'));
    return;
  }

  settingsService.clearCache(department);

  res.json(formatResponse(true, 'Department settings deleted successfully. Will use global settings.'));
});

export const getEffectiveSettings = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { department } = getValidatedQuery<GetEffectiveSettingsQuery>(req);

  const effectiveSettings = await Settings.getEffectiveSettings(department);

  // Employees only need the operational rules that drive check-in/check-out.
  // The full document carries notifications.hrEmails and the report config,
  // which must not leak to non-HR roles.
  if (req.user?.role === 'employee') {
    const { attendance, general } = effectiveSettings as {
      attendance?: unknown;
      general?: { locationSetting?: unknown; taskReportSetting?: unknown };
    };

    res.json(formatResponse(true, 'Effective settings retrieved successfully', {
      attendance,
      general: {
        locationSetting: general?.locationSetting,
        taskReportSetting: general?.taskReportSetting
      }
    }));
    return;
  }

  res.json(formatResponse(true, 'Effective settings retrieved successfully', effectiveSettings));
});

export const getDepartments = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const departments = await Department.find({ isActive: true })
    .select('name')
    .sort({ name: 1 })
    .lean();

  const departmentNames = departments.map(dept => dept.name);

  res.json(formatResponse(true, 'Departments retrieved successfully', { departments: departmentNames }));
});

export const getDepartmentStats = asyncHandler(async (req: IAuthRequest, res: Response) => {
  // Two queries total, not one-per-department. Employees are fetched once
  // and grouped in memory, which keeps this O(1) in round trips as the
  // number of departments grows.
  const [departments, employees] = await Promise.all([
    Department.find({ isActive: true }).sort({ name: 1 }).lean(),
    Employee.find(
      { isActive: true, department: { $exists: true, $ne: null } },
      { firstName: 1, lastName: 1, employeeId: 1, email: 1, joiningDate: 1, department: 1 }
    )
      .sort({ firstName: 1, lastName: 1 })
      .lean(),
  ]);

  const employeesByDepartment = new Map<string, typeof employees>();
  for (const employee of employees) {
    const key = employee.department;
    if (!key) continue;
    const bucket = employeesByDepartment.get(key);
    if (bucket) {
      bucket.push(employee);
    } else {
      employeesByDepartment.set(key, [employee]);
    }
  }

  const departmentStats = departments.map((dept) => {
    const deptEmployees = employeesByDepartment.get(dept.name) ?? [];
    return {
      _id: dept._id,
      name: dept.name,
      isActive: dept.isActive,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
      employeeCount: deptEmployees.length,
      employees: deptEmployees
    };
  });

  departmentStats.sort((a, b) => {
    if (b.employeeCount !== a.employeeCount) {
      return b.employeeCount - a.employeeCount;
    }
    return a.name.localeCompare(b.name);
  });

  res.json(formatResponse(true, 'Department statistics retrieved successfully', { departments: departmentStats }));
});

export const addDepartment = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { name } = req.body as CreateDepartmentInput;

  if (!name || !name.trim()) {
    res.status(400).json(formatResponse(false, 'Department name is required'));
    return;
  }

  const trimmedName = name.trim();

  // Match regardless of isActive: the unique index on name spans soft-deleted
  // rows, so a previously deleted department must be reactivated rather than
  // re-created (which would fail with a duplicate key error).
  const existingDepartment = await Department.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') }
  });

  if (existingDepartment?.isActive) {
    res.status(409).json(formatResponse(false, 'Department already exists', { existingName: existingDepartment.name }));
    return;
  }

  let department;
  if (existingDepartment) {
    existingDepartment.isActive = true;
    existingDepartment.name = trimmedName;
    department = await existingDepartment.save();
  } else {
    department = await Department.create({ name: trimmedName });
  }

  res.json(formatResponse(true, 'Department created successfully', {
    _id: department._id,
    name: department.name,
    isActive: department.isActive,
    createdAt: department.createdAt,
    employeeCount: 0
  }));
}, { onDuplicate: 'Department already exists' });

export const renameDepartment = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const oldName = paramValue(req.params.oldName);
  const { newName } = req.body as RenameDepartmentInput;

  if (!oldName || !newName || !newName.trim()) {
    res.status(400).json(formatResponse(false, 'Both old and new department names are required'));
    return;
  }

  const trimmedNewName = newName.trim();

  // Resolve the target first so the conflict check can compare by _id.
  // Comparing by name string mixed case-insensitive lookup with a
  // case-sensitive guard, which let same-name-different-case slip through.
  const department = await Department.findOne({ name: oldName, isActive: true });
  if (!department) {
    res.status(404).json(formatResponse(false, 'Department not found', { requestedName: oldName }));
    return;
  }

  // Spans soft-deleted rows for the same reason as addDepartment: the
  // unique index on name does not respect isActive.
  const conflictingDepartment = await Department.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(trimmedNewName)}$`, 'i') }
  });

  // A case-only rename of the department itself is allowed; a collision
  // with any *other* department is not.
  if (conflictingDepartment && !conflictingDepartment._id.equals(department._id)) {
    res.status(409).json(formatResponse(false, 'Department name already exists', { existingName: conflictingDepartment.name }));
    return;
  }

  const actualOldName = department.name;

  await Department.findByIdAndUpdate(department._id, { name: trimmedNewName });

  const employeeUpdateResult = await Employee.updateMany(
    { department: actualOldName, isActive: true },
    { $set: { department: trimmedNewName } }
  );

  const settingsUpdateResult = await Settings.updateMany(
    { scope: 'department', department: actualOldName },
    { $set: { department: trimmedNewName } }
  );

  // Both keys are now stale: the old one no longer exists, the new one
  // may hold a pre-rename miss.
  settingsService.clearCache(actualOldName);
  settingsService.clearCache(trimmedNewName);

  res.json(formatResponse(true, 'Department renamed successfully', {
    oldName: actualOldName,
    newName: trimmedNewName,
    employeesUpdated: employeeUpdateResult.modifiedCount,
    settingsUpdated: settingsUpdateResult.modifiedCount
  }));
});

export const deleteDepartment = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const name = paramValue(req.params.name);

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

  // Soft delete: every read path already filters on isActive, and this keeps
  // the row recoverable. A hard delete here was unrecoverable and
  // inconsistent with the rest of the model's lifecycle.
  await Department.findByIdAndUpdate(department._id, { isActive: false });

  const employeeUpdateResult = await Employee.updateMany(
    { department: name, isActive: true },
    { $unset: { department: 1 } }
  );

  const settingsDeleteResult = await Settings.deleteMany({
    scope: 'department',
    department: name
  });

  settingsService.clearCache(name);

  res.json(formatResponse(true, 'Department deleted successfully', {
    departmentName: name,
    employeesUpdated: employeeUpdateResult.modifiedCount,
    settingsDeleted: settingsDeleteResult.deletedCount,
    affectedEmployees: employeeCount
  }));
});

export const assignEmployeeToDepartment = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const departmentName = paramValue(req.params.departmentName);
  const { employeeId } = req.body as AssignEmployeeToDepartmentInput;

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
});

export const getAvailableEmployees = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const departmentName = paramValue(req.params.departmentName);

  const allEmployees = await Employee.find(
    { isActive: true },
    { employeeId: 1, firstName: 1, lastName: 1, email: 1, department: 1 }
  )
    .sort({ firstName: 1, lastName: 1 })
    .lean();

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
});

export const rescheduleDailyHrAttendanceReport = asyncHandler(async (req: IAuthRequest, res: Response) => {
  await SchedulerService.scheduleDailyHrAttendanceReport();

  res.json(formatResponse(true, 'Daily HR attendance report job rescheduled successfully'));
});

export const testDailyHrAttendanceReport = asyncHandler(async (req: IAuthRequest, res: Response) => {
  await SchedulerService.sendDailyHrAttendanceReport();

  res.json(formatResponse(true, 'Daily HR attendance report sent successfully. Check HR email inboxes.'));
});

export const runRegularizationCleanup = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { retentionMonths } = req.body as RunRegularizationCleanupInput;

  const deletedCount = await SchedulerService.triggerRegularizationCleanup(retentionMonths);

  res.json(
    formatResponse(true, `Deleted ${deletedCount} regularization request(s) older than ${retentionMonths} month(s)`, { deletedCount })
  );
});

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
  testDailyHrAttendanceReport,
  runRegularizationCleanup
};
