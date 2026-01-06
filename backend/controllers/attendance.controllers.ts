/**
 * Refactored Attendance Controllers
 * Simplified controllers using the new service layer architecture
 * Reduced from 1320+ lines to clean, maintainable code
 */

import type { Response } from 'express';
import { AttendanceServices } from '../services/attendance/index.js';
import {
  formatResponse,
  validateAdminAccess,
  validateEmployeeAccess,
  getEmployeeObjectId,
  createErrorResponse,
  createSuccessResponse
} from '../utils/attendance/index.js';
import {
  ATTENDANCE_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS
} from '../utils/attendance/attendanceConstants.js';
import {
  handleAttendanceError,
  asyncErrorHandler,
  BusinessLogicError,
  NotFoundError,
  validateRequiredFields
} from '../utils/attendance/attendanceErrorHandler.js';
import { getISTNow, getISTDayBoundaries, toIST } from '../utils/timezone.js';
import TaskReport from '../models/TaskReport.model.js';
import GeofenceService from '../services/GeofenceService.js';
import WFHRequest from '../models/WFHRequest.model.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

const { Business, Data, Cache, Report } = AttendanceServices;

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationPayload {
  latitude: number;
  longitude: number;
  capturedAt: Date;
  accuracy?: number;
}

interface GeofenceSettings {
  enabled?: boolean;
  enforceCheckIn?: boolean;
  enforceCheckOut?: boolean;
  defaultRadius?: number;
  allowWFHBypass?: boolean;
}

interface EffectiveSettings {
  general?: {
    locationSetting?: string;
    geofence?: GeofenceSettings;
    taskReportSetting?: string;
  };
}

const parseCoordinates = (latitude: unknown, longitude: unknown, { required = false } = {}): Coordinates | null => {
  const hasLat = latitude !== undefined && latitude !== null && latitude !== '';
  const hasLng = longitude !== undefined && longitude !== null && longitude !== '';

  if (!hasLat && !hasLng) {
    if (required) {
      throw new BusinessLogicError('Location is required for this action', { locationRequired: true });
    }
    return null;
  }

  if (!hasLat || !hasLng) {
    throw new BusinessLogicError('Both latitude and longitude must be provided', { latitude, longitude });
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BusinessLogicError('Invalid location coordinates', { latitude, longitude });
  }

  return { latitude: lat, longitude: lng };
};

const buildLocationPayload = (coordinates: Coordinates | null, { accuracy, capturedAt }: { accuracy?: unknown; capturedAt?: Date } = {}): LocationPayload | null => {
  if (!coordinates) return null;

  const payload: LocationPayload = {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    capturedAt: capturedAt instanceof Date && !Number.isNaN(capturedAt.getTime())
      ? capturedAt
      : new Date()
  };

  const parsedAccuracy = accuracy !== undefined ? Number(accuracy) : undefined;
  if (parsedAccuracy !== undefined && !Number.isNaN(parsedAccuracy) && parsedAccuracy >= 0) {
    payload.accuracy = parsedAccuracy;
  }

  return payload;
};

const shouldEnforceGeofence = (geofenceSettings: GeofenceSettings | undefined, operation: string): boolean => {
  if (!geofenceSettings || geofenceSettings.enabled !== true) {
    return false;
  }

  const enforcementKey = operation === 'check-in' ? 'enforceCheckIn' : 'enforceCheckOut';
  return geofenceSettings[enforcementKey as 'enforceCheckIn' | 'enforceCheckOut'] === true;
};

const findTodayApprovedWFH = async (employeeObjId: unknown) => {
  const { startOfDay, endOfDay } = getISTDayBoundaries();
  return await WFHRequest.findOne({
    employee: employeeObjId,
    requestDate: { $gte: startOfDay.toJSDate(), $lte: endOfDay.toJSDate() },
    status: 'approved'
  }).sort({ reviewedAt: -1 });
};

const buildGeofenceErrorDetails = (office: { name?: string; radius?: number } | null, distance: number | null, geofenceSettings: GeofenceSettings | undefined, operation: string) => ({
  geofence: {
    nearestOffice: office?.name || null,
    radius: office?.radius || geofenceSettings?.defaultRadius || 100,
    distance: typeof distance === 'number' ? parseFloat(distance.toFixed(2)) : null,
    canRequestWFH: !!geofenceSettings?.allowWFHBypass,
    operation
  }
});

const validateGeofenceForOperation = async ({
  operation,
  geofenceSettings,
  coordinates,
  employeeObjId,
  attendanceGeofence
}: {
  operation: string;
  geofenceSettings: GeofenceSettings | undefined;
  coordinates: Coordinates | null;
  employeeObjId: unknown;
  attendanceGeofence?: { status?: string };
}): Promise<{ enforced: boolean; status: string; office: unknown; distance: number | null; wfhRequest?: unknown } | null> => {
  if (!shouldEnforceGeofence(geofenceSettings, operation)) {
    return null;
  }

  if (attendanceGeofence?.status === 'wfh') {
    return null;
  }

  if (!coordinates) {
    throw new BusinessLogicError('Location is required for geo-fenced attendance', {
      locationRequired: true,
      operation
    });
  }

  const { isValid, nearestOffice, distance } = await GeofenceService.isWithinGeofence(
    coordinates.latitude,
    coordinates.longitude
  );

  if (!nearestOffice) {
    throw new BusinessLogicError(
      'No active office locations configured. Please ask HR to add an office location before using geo-fenced attendance.',
      { adminAction: 'configure_office_location' }
    );
  }

  if (isValid) {
    return {
      enforced: true,
      status: 'onsite',
      office: nearestOffice,
      distance
    };
  }

  if (geofenceSettings?.allowWFHBypass) {
    const approvedWFH = await findTodayApprovedWFH(employeeObjId);
    if (approvedWFH) {
      return {
        enforced: true,
        status: 'wfh',
        office: nearestOffice,
        distance,
        wfhRequest: approvedWFH
      };
    }
  }

  throw new BusinessLogicError(
    `You must be inside ${(nearestOffice as { name: string }).name} geofence to ${operation.replace('-', ' ')}`,
    buildGeofenceErrorDetails(nearestOffice as { name?: string; radius?: number }, distance, geofenceSettings, operation)
  );
};

export const checkIn = asyncErrorHandler(async (req: IAuthRequest, res: Response) => {
  if (!req.user) {
    throw new BusinessLogicError(ERROR_MESSAGES.AUTH_REQUIRED, { auth: ERROR_MESSAGES.NO_VALID_USER });
  }

  const employeeObjId = await getEmployeeObjectId(req.user);
  if (!employeeObjId) {
    throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
  }

  const employee = await Data.getEmployeeById(employeeObjId);
  if (!employee) {
    throw new NotFoundError(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
  }

  const eligibilityCheck = Business.validateCheckInEligibility(employee);
  if (!eligibilityCheck.isEligible) {
    throw new BusinessLogicError(eligibilityCheck.errors.join(', '), {
      eligibilityErrors: eligibilityCheck.errors,
      warnings: eligibilityCheck.warnings
    });
  }

  const now = getISTNow();

  const existingRecord = await Data.findAttendanceByEmployeeAndDate(employeeObjId, now.toJSDate());
  if (existingRecord) {
    throw new BusinessLogicError(ERROR_MESSAGES.ALREADY_CHECKED_IN, {
      existingRecord: { id: existingRecord._id, checkIn: existingRecord.checkIn }
    });
  }

  const Settings = (await import('../models/Settings.model.js')).default;
  const effectiveSettings = (await Settings.getEffectiveSettings(employee.department)) as EffectiveSettings;
  const locationSetting = effectiveSettings.general?.locationSetting || 'na';
  const geofenceSettings = effectiveSettings.general?.geofence;

  const { latitude, longitude, accuracy, capturedAt } = req.body as {
    latitude?: unknown;
    longitude?: unknown;
    accuracy?: unknown;
    capturedAt?: string;
  };

  const requireLocationForCheckIn =
    locationSetting === 'mandatory' ||
    shouldEnforceGeofence(geofenceSettings, 'check-in');

  const coordinates = parseCoordinates(latitude, longitude, {
    required: requireLocationForCheckIn
  });

  const locationPayload = buildLocationPayload(coordinates, {
    accuracy,
    capturedAt: capturedAt ? new Date(capturedAt) : now.toJSDate()
  });

  const geofenceMeta = await validateGeofenceForOperation({
    operation: 'check-in',
    geofenceSettings,
    coordinates,
    employeeObjId
  });

  const statusResult = await Business.determineAttendanceStatus(now.toJSDate(), null, employee.department);

  // Store date as start-of-day in the configured timezone (currently IST)
  // When stored in MongoDB: Jan 5 00:00 IST = Jan 4 18:30 UTC (this is correct!)
  // This ensures queries for a specific business day work consistently
  const { startOfDay } = getISTDayBoundaries(now);
  const date = startOfDay.toJSDate();

  const attendanceData: Record<string, unknown> = {
    employee: employeeObjId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date,
    checkIn: now.toJSDate(),
    status: statusResult.status
  };

  if (locationPayload) {
    attendanceData.location = locationPayload;
  }

  if (geofenceMeta) {
    attendanceData.geofence = {
      enforced: geofenceMeta.enforced,
      status: geofenceMeta.status,
      office: (geofenceMeta.office as { _id: unknown })?._id,
      officeName: (geofenceMeta.office as { name: string })?.name,
      distance: geofenceMeta.distance ? Math.round(geofenceMeta.distance) : null,
      radius: (geofenceMeta.office as { radius: number })?.radius,
      validatedAt: new Date(),
      wfhRequest: (geofenceMeta.wfhRequest as { _id: unknown })?._id || undefined
    };
  }

  const attendance = await Data.createAttendanceRecord(attendanceData);

  // Update WFH request if it was consumed during check-in
  if (geofenceMeta?.wfhRequest) {
    const wfhRequestId = (geofenceMeta.wfhRequest as { _id: unknown })?._id;
    if (wfhRequestId) {
      await WFHRequest.findByIdAndUpdate(
        wfhRequestId,
        {
          consumedAt: new Date(),
          consumedAttendance: (attendance as { _id: unknown })._id
        },
        { new: false }
      );
    }
  }

  res.status(HTTP_STATUS.CREATED).json(
    formatResponse(true, SUCCESS_MESSAGES.CHECKED_IN, { attendance })
  );
}, 'check-in');

export const checkOut = asyncErrorHandler(async (req: IAuthRequest, res: Response) => {
  if (!req.user) {
    throw new BusinessLogicError(ERROR_MESSAGES.AUTH_REQUIRED, { auth: ERROR_MESSAGES.NO_VALID_USER });
  }

  const { tasks, latitude, longitude, accuracy, capturedAt } = req.body as {
    tasks?: unknown[];
    latitude?: unknown;
    longitude?: unknown;
    accuracy?: unknown;
    capturedAt?: string;
  };

  const employeeObjId = await getEmployeeObjectId(req.user);
  if (!employeeObjId) {
    throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
  }

  const now = getISTNow();

  const attendance = await Data.findAttendanceByEmployeeAndDate(employeeObjId, now.toJSDate());

  const eligibilityCheck = Business.validateCheckOutEligibility(attendance, tasks ? (tasks as string[]) : [], now);
  if (!eligibilityCheck.isEligible) {
    throw new BusinessLogicError(eligibilityCheck.errors.join(', '), {
      eligibilityErrors: eligibilityCheck.errors,
      warnings: eligibilityCheck.warnings
    });
  }

  const employee = await Data.getEmployeeById(employeeObjId);
  if (!employee) {
    throw new NotFoundError(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
  }

  const Settings = (await import('../models/Settings.model.js')).default;
  const effectiveSettings = (await Settings.getEffectiveSettings(employee.department)) as EffectiveSettings;
  const taskReportSetting = effectiveSettings.general?.taskReportSetting || 'na';
  const locationSetting = effectiveSettings.general?.locationSetting || 'na';
  const geofenceSettings = effectiveSettings.general?.geofence;

  const { startOfDay } = getISTDayBoundaries((attendance as { date: Date }).date);
  const normalizedDate = startOfDay.toJSDate();

  if (taskReportSetting === 'mandatory') {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      throw new BusinessLogicError('Task report is required for check-out', { taskReportRequired: true });
    }
    const taskValidation = Business.validateTaskReport(tasks as string[]);

    await TaskReport.findOneAndUpdate(
      { employee: employeeObjId, date: normalizedDate },
      {
        employee: employeeObjId,
        employeeId: employee.employeeId,
        date: normalizedDate,
        tasks: taskValidation.validTasks
      },
      { upsert: true, new: true }
    );
  } else if (taskReportSetting === 'optional' && tasks && Array.isArray(tasks) && tasks.length > 0) {
    const taskValidation = Business.validateTaskReport(tasks as string[]);

    await TaskReport.findOneAndUpdate(
      { employee: employeeObjId, date: normalizedDate },
      {
        employee: employeeObjId,
        employeeId: employee.employeeId,
        date: normalizedDate,
        tasks: taskValidation.validTasks
      },
      { upsert: true, new: true }
    );
  }

  const isWFHDay = (attendance as { geofence?: { status?: string } })?.geofence?.status === 'wfh';
  const enforceCheckoutGeofence = !isWFHDay && shouldEnforceGeofence(geofenceSettings, 'check-out');
  const requireLocationForCheckout = locationSetting === 'mandatory' || enforceCheckoutGeofence;
  const checkoutCoordinates = parseCoordinates(latitude, longitude, { required: requireLocationForCheckout });
  const checkoutLocationPayload = buildLocationPayload(checkoutCoordinates, {
    accuracy,
    capturedAt: capturedAt ? new Date(capturedAt) : now.toJSDate()
  });

  if (enforceCheckoutGeofence) {
    await validateGeofenceForOperation({
      operation: 'check-out',
      geofenceSettings,
      coordinates: checkoutCoordinates,
      employeeObjId,
      attendanceGeofence: (attendance as { geofence?: { status?: string } })?.geofence
    });
  }

  const finalStatus = await Business.calculateFinalStatus((attendance as { checkIn: Date }).checkIn, now.toJSDate(), employee.department);

  const checkoutUpdatePayload: Record<string, unknown> = {
    checkOut: now.toJSDate(),
    status: finalStatus.status,
    workHours: finalStatus.workHours
  };

  if (checkoutLocationPayload) {
    checkoutUpdatePayload.checkoutLocation = checkoutLocationPayload;
  }

  const updatedAttendance = await Data.updateAttendanceRecord((attendance as { _id: unknown })._id as string, checkoutUpdatePayload);

  if (!updatedAttendance) {
    throw new BusinessLogicError('Failed to update attendance record');
  }

  res.json(formatResponse(true, SUCCESS_MESSAGES.CHECKED_OUT, { attendance: updatedAttendance }));
}, 'check-out');

export const getAttendance = asyncErrorHandler(async (req: IAuthRequest, res: Response) => {
  const { employeeId, startDate, endDate, status, page, limit } = req.query;

  let targetEmployeeId = employeeId;
  if (!req.user?.role || !['admin', 'hr'].includes(req.user.role)) {
    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
    }
    const employee = await Data.getEmployeeById(employeeObjId);
    if (!employee) {
      throw new NotFoundError(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
    }
    targetEmployeeId = employee.employeeId;
  }

  const result = await Data.getEmployeeAttendanceRecords(targetEmployeeId as string, {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    status: status as string | undefined,
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 10
  });

  res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, {
    records: result.records,
    pagination: result.pagination
  }));
}, 'fetch');

export const getMissingCheckouts = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        formatResponse(false, ERROR_MESSAGES.AUTH_REQUIRED, null, { auth: ERROR_MESSAGES.NO_VALID_USER })
      );
      return;
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, ERROR_MESSAGES.NO_EMPLOYEE_PROFILE)
      );
      return;
    }

    const missingCheckouts = await Data.getMissingCheckoutRecords(employeeObjId);

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, {
      missingCheckouts,
      total: missingCheckouts.length
    }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Get missing checkouts error');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: error.message })
    );
  }
};

export const getMyAttendance = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        formatResponse(false, ERROR_MESSAGES.AUTH_REQUIRED, null, { auth: ERROR_MESSAGES.NO_VALID_USER })
      );
      return;
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, ERROR_MESSAGES.NO_EMPLOYEE_PROFILE)
      );
      return;
    }

    const employee = await Data.getEmployeeById(employeeObjId);
    const { startDate, endDate, page = '1', limit = '10' } = req.query;

    const result = await Data.getEmployeeAttendanceRecords(employeeObjId, {
      startDate: (startDate as string) || (employee as { joiningDate: Date }).joiningDate.toISOString().split('T')[0],
      endDate: endDate as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, {
      records: result.records,
      pagination: result.pagination
    }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Get my attendance error');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: error.message })
    );
  }
};

export const getTodayAttendanceWithAbsents = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!validateAdminAccess(req, res)) return;

    const dashboardData = await Report.generateDashboardData();

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, {
      records: dashboardData.records,
      statistics: dashboardData.statistics,
      total: dashboardData.totalEmployees,
      date: dashboardData.date
    }));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Get today attendance error');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: error.message })
    );
  }
};

export const getAdminAttendanceRange = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    if (!validateAdminAccess(req, res)) return;

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, 'Start date and end date are required')
      );
      return;
    }

    const report = await Report.generateCustomReport({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      includeCharts: true
    });

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, report));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Get admin attendance range error');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: error.message })
    );
  }
};

export const getEmployeeAttendanceWithAbsents = async (req: IAuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId || !startDate || !endDate) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, 'Employee ID, start date, and end date are required')
      );
      return;
    }

    const authResult = await validateEmployeeAccess(req, employeeId as string);
    if (!authResult.authorized) {
      res.status(authResult.statusCode || HTTP_STATUS.FORBIDDEN).json(authResult.error);
      return;
    }

    const report = await Report.generateEmployeeReport(employeeId as string, new Date(startDate as string), new Date(endDate as string));

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, report));
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err: error }, 'Get employee attendance with absents error');
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: error.message })
    );
  }
};

export const updateAttendanceRecord = asyncErrorHandler(async (req: IAuthRequest, res: Response) => {
  if (!validateAdminAccess(req, res)) return;

  const { recordId } = req.params;
  const { status, checkIn, checkOut, employeeId, date } = req.body as {
    status?: string;
    checkIn?: string;
    checkOut?: string;
    employeeId?: string;
    date?: string;
  };

  let updatedRecord;

  if (recordId === 'new') {
    if (!employeeId || !date) {
      throw new BusinessLogicError('Employee ID and date are required for creating new attendance record');
    }

    const employee = await Data.getEmployee(employeeId);
    if (!employee) {
      throw new NotFoundError(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
    }

    const recordDate = new Date(date);

    const existingRecord = await Data.findAttendanceRecord((employee as { _id: unknown })._id as string, recordDate);

    if (existingRecord) {
      const updateData: Record<string, unknown> = {};
      if (status) {
        updateData.status = status;
        if (status === 'absent') {
          updateData.checkIn = null;
          updateData.checkOut = null;
          updateData.workHours = 0;
        }
      }
      if (checkIn !== undefined && status !== 'absent') {
        updateData.checkIn = checkIn ? new Date(checkIn) : null;
      }
      if (checkOut !== undefined && status !== 'absent') {
        updateData.checkOut = checkOut ? new Date(checkOut) : null;
      }

      updatedRecord = await Data.updateAttendanceRecord((existingRecord as { _id: unknown })._id as string, updateData);
    } else {
      const businessHours = await Business.getBusinessHours(recordDate, (employee as { department: string }).department);

      const attendanceData: Record<string, unknown> = {
        employee: (employee as { _id: unknown })._id,
        employeeName: `${(employee as { firstName: string }).firstName} ${(employee as { lastName: string }).lastName}`,
        date: recordDate,
        checkIn: checkIn ? new Date(checkIn) : (businessHours as { workStart: Date }).workStart,
        checkOut: checkOut ? new Date(checkOut) : (businessHours as { workEnd: Date }).workEnd,
        status: status || ATTENDANCE_STATUS.PRESENT
      };

      updatedRecord = await Data.createAttendanceRecord(attendanceData);
    }
  } else {
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === 'absent') {
        updateData.checkIn = null;
        updateData.checkOut = null;
        updateData.workHours = 0;
      }
    }
    if (checkIn !== undefined && status !== 'absent') {
      updateData.checkIn = checkIn ? new Date(checkIn) : null;
    }
    if (checkOut !== undefined && status !== 'absent') {
      updateData.checkOut = checkOut ? new Date(checkOut) : null;
    }

    updatedRecord = await Data.updateAttendanceRecord(recordId as string, updateData);

    if (!updatedRecord) {
      throw new NotFoundError(ERROR_MESSAGES.RECORD_NOT_FOUND);
    }
  }

  res.json(formatResponse(true, SUCCESS_MESSAGES.RECORD_UPDATED, { attendance: updatedRecord }));
}, 'update-attendance');

export default {
  checkIn,
  checkOut,
  getAttendance,
  getMissingCheckouts,
  getMyAttendance,
  getTodayAttendanceWithAbsents,
  getAdminAttendanceRange,
  getEmployeeAttendanceWithAbsents,
  updateAttendanceRecord
};
