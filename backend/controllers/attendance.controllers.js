/**
 * Refactored Attendance Controllers
 * Simplified controllers using the new service layer architecture
 * Reduced from 1320+ lines to clean, maintainable code
 */

// Service Layer Imports
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
import { getISTNow, getISTDayBoundaries } from '../utils/timezoneUtils.js';
import TaskReport from '../models/TaskReport.model.js';
import GeofenceService from '../services/GeofenceService.js';
import WFHRequest from '../models/WFHRequest.model.js';

const { Business, Data, Cache, Report } = AttendanceServices;

const parseCoordinates = (latitude, longitude, { required = false } = {}) => {
  const hasLat = latitude !== undefined && latitude !== null && latitude !== "";
  const hasLng = longitude !== undefined && longitude !== null && longitude !== "";

  if (!hasLat && !hasLng) {
    if (required) {
      throw new BusinessLogicError("Location is required for this action", { locationRequired: true });
    }
    return null;
  }

  if (!hasLat || !hasLng) {
    throw new BusinessLogicError("Both latitude and longitude must be provided", { latitude, longitude });
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BusinessLogicError("Invalid location coordinates", { latitude, longitude });
  }

  return { latitude: lat, longitude: lng };
};

const buildLocationPayload = (coordinates, { accuracy, capturedAt } = {}) => {
  if (!coordinates) return null;

  const payload = {
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

const shouldEnforceGeofence = (geofenceSettings, operation) => {
  if (!geofenceSettings?.enabled) {
    return false;
  }
  return operation === "check-in"
    ? geofenceSettings.enforceCheckIn !== false
    : geofenceSettings.enforceCheckOut !== false;
};

const findTodayApprovedWFH = async (employeeObjId) => {
  const { startOfDay, endOfDay } = getISTDayBoundaries();
  return await WFHRequest.findOne({
    employee: employeeObjId,
    requestDate: { $gte: startOfDay.toDate(), $lte: endOfDay.toDate() },
    status: "approved"
  }).sort({ reviewedAt: -1 });
};

const buildGeofenceErrorDetails = (office, distance, geofenceSettings, operation) => ({
  geofence: {
    nearestOffice: office?.name || null,
    radius: office?.radius || geofenceSettings?.defaultRadius || 100,
    distance: typeof distance === "number" ? parseFloat(distance.toFixed(2)) : null,
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
}) => {
  if (!shouldEnforceGeofence(geofenceSettings, operation)) {
    return null;
  }

  if (attendanceGeofence?.status === "wfh") {
    return null;
  }

  if (!coordinates) {
    throw new BusinessLogicError("Location is required for geo-fenced attendance", {
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
      "No active office locations configured. Please ask HR to add an office location before using geo-fenced attendance.",
      { adminAction: "configure_office_location" }
    );
  }

  if (isValid) {
    return {
      enforced: true,
      status: "onsite",
      office: nearestOffice,
      distance
    };
  }

  if (geofenceSettings.allowWFHBypass) {
    const approvedWFH = await findTodayApprovedWFH(employeeObjId);
    if (approvedWFH) {
      return {
        enforced: true,
        status: "wfh",
        office: nearestOffice,
        distance,
        wfhRequest: approvedWFH
      };
    }
  }

  throw new BusinessLogicError(
    `You must be inside ${nearestOffice.name} geofence to ${operation.replace("-", " ")}`,
    buildGeofenceErrorDetails(nearestOffice, distance, geofenceSettings, operation)
  );
};

/**
 * Check in for the day
 */
export const checkIn = asyncErrorHandler(async (req, res) => {
  // Basic validation
  if (!req.user) {
    throw new BusinessLogicError(ERROR_MESSAGES.AUTH_REQUIRED, { auth: ERROR_MESSAGES.NO_VALID_USER });
  }

  const employeeObjId = await getEmployeeObjectId(req.user);
  if (!employeeObjId) {
    throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
  }

  // Get employee and validate eligibility
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

  // Check if already checked in today
  const existingRecord = await Data.findAttendanceByEmployeeAndDate(employeeObjId, now);
  if (existingRecord) {
    throw new BusinessLogicError(ERROR_MESSAGES.ALREADY_CHECKED_IN, {
      existingRecord: { id: existingRecord._id, checkIn: existingRecord.checkIn }
    });
  }

  // Get effective settings for location requirement
  const Settings = (await import('../models/Settings.model.js')).default;
  const effectiveSettings = await Settings.getEffectiveSettings(employee.department);
  const locationSetting = effectiveSettings.general?.locationSetting || 'na';
  const geofenceSettings = effectiveSettings.general?.geofence || {};

  const { latitude, longitude, accuracy, capturedAt } = req.body;
  const requireLocationForCheckIn =
    locationSetting === 'mandatory' ||
    shouldEnforceGeofence(geofenceSettings, 'check-in');

  const coordinates = parseCoordinates(latitude, longitude, {
    required: requireLocationForCheckIn
  });
  const locationPayload = buildLocationPayload(coordinates, {
    accuracy,
    capturedAt: capturedAt ? new Date(capturedAt) : now.toDate()
  });
  const geofenceMeta = await validateGeofenceForOperation({
    operation: 'check-in',
    geofenceSettings,
    coordinates,
    employeeObjId
  });

  // Determine status and create attendance record using employee's department
  const statusResult = await Business.determineAttendanceStatus(now, null, employee.department);

  const attendanceData = {
    employee: employeeObjId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date: now,
    checkIn: now,
    status: statusResult.status
  };

  if (locationPayload) {
    attendanceData.location = locationPayload;
  }

  if (geofenceMeta) {
    attendanceData.geofence = {
      enforced: geofenceMeta.enforced,
      status: geofenceMeta.status,
      office: geofenceMeta.office?._id,
      officeName: geofenceMeta.office?.name,
      distance: geofenceMeta.distance ? Math.round(geofenceMeta.distance) : null,
      radius: geofenceMeta.office?.radius,
      validatedAt: new Date(),
      wfhRequest: geofenceMeta.wfhRequest?._id || undefined
    };
  }

  const attendance = await Data.createAttendanceRecord(attendanceData);
  if (geofenceMeta?.wfhRequest?._id) {
    await WFHRequest.findByIdAndUpdate(
      geofenceMeta.wfhRequest._id,
      {
        consumedAt: new Date(),
        consumedAttendance: attendance._id
      },
      { new: false }
    );
  }

  res.status(HTTP_STATUS.CREATED).json(
    formatResponse(true, SUCCESS_MESSAGES.CHECKED_IN, { attendance })
  );
}, 'check-in');

/**
 * Check out for the day
 */
export const checkOut = asyncErrorHandler(async (req, res) => {
  if (!req.user) {
    throw new BusinessLogicError(ERROR_MESSAGES.AUTH_REQUIRED, { auth: ERROR_MESSAGES.NO_VALID_USER });
  }

  const { tasks, latitude, longitude, accuracy, capturedAt } = req.body;
  const employeeObjId = await getEmployeeObjectId(req.user);
  if (!employeeObjId) {
    throw new BusinessLogicError(ERROR_MESSAGES.NO_EMPLOYEE_PROFILE);
  }

  const now = getISTNow();

  // Get today's attendance record
  const attendance = await Data.findAttendanceByEmployeeAndDate(employeeObjId, now);

  // Validate check-out eligibility
  const eligibilityCheck = Business.validateCheckOutEligibility(attendance, tasks, now);
  if (!eligibilityCheck.isEligible) {
    throw new BusinessLogicError(eligibilityCheck.errors.join(', '), {
      eligibilityErrors: eligibilityCheck.errors,
      warnings: eligibilityCheck.warnings
    });
  }

  // Get employee for department settings
  const employee = await Data.getEmployeeById(employeeObjId);
  if (!employee) {
    throw new NotFoundError(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
  }

  // Get effective settings for task report requirement
  const Settings = (await import('../models/Settings.model.js')).default;
  const effectiveSettings = await Settings.getEffectiveSettings(employee.department);
  const taskReportSetting = effectiveSettings.general?.taskReportSetting || 'na';
  const locationSetting = effectiveSettings.general?.locationSetting || 'na';
  const geofenceSettings = effectiveSettings.general?.geofence || {};

  // Handle task report based on setting
  if (taskReportSetting === 'mandatory') {
    // Task report is required for checkout
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      throw new BusinessLogicError('Task report is required for check-out', { taskReportRequired: true });
    }
    const taskValidation = Business.validateTaskReport(tasks);
    await TaskReport.create({
      employee: employeeObjId,
      employeeId: employee.employeeId,
      date: attendance.date,
      tasks: taskValidation.validTasks
    });
  } else if (taskReportSetting === 'optional' && tasks && Array.isArray(tasks) && tasks.length > 0) {
    // Task report is optional but if provided, save it
    const taskValidation = Business.validateTaskReport(tasks);
    await TaskReport.create({
      employee: employeeObjId,
      employeeId: employee.employeeId,
      date: attendance.date,
      tasks: taskValidation.validTasks
    });
  }
  // For 'na' setting, we don't save task report at all

  const isWFHDay = attendance?.geofence?.status === 'wfh';
  const enforceCheckoutGeofence = !isWFHDay && shouldEnforceGeofence(geofenceSettings, 'check-out');
  const requireLocationForCheckout = locationSetting === 'mandatory' || enforceCheckoutGeofence;
  const checkoutCoordinates = parseCoordinates(latitude, longitude, { required: requireLocationForCheckout });
  const checkoutLocationPayload = buildLocationPayload(checkoutCoordinates, {
    accuracy,
    capturedAt: capturedAt ? new Date(capturedAt) : now.toDate()
  });

  if (enforceCheckoutGeofence) {
    await validateGeofenceForOperation({
      operation: 'check-out',
      geofenceSettings,
      coordinates: checkoutCoordinates,
      employeeObjId,
      attendanceGeofence: attendance?.geofence
    });
  }

  // Calculate final status and update attendance using employee's department
  const finalStatus = await Business.calculateFinalStatus(attendance.checkIn, now, employee.department);

  const checkoutUpdatePayload = {
    checkOut: now,
    status: finalStatus.status,
    workHours: finalStatus.workHours
  };

  if (checkoutLocationPayload) {
    checkoutUpdatePayload.checkoutLocation = checkoutLocationPayload;
  }

  const updatedAttendance = await Data.updateAttendanceRecord(attendance._id, checkoutUpdatePayload);

  if (!updatedAttendance) {
    throw new BusinessLogicError('Failed to update attendance record');
  }

  res.json(formatResponse(true, SUCCESS_MESSAGES.CHECKED_OUT, { attendance: updatedAttendance }));
}, 'check-out');

/**
 * Get attendance records with filtering and pagination
 */
export const getAttendance = asyncErrorHandler(async (req, res) => {
  const { employeeId, startDate, endDate, status, page, limit } = req.query;

  // For employees, restrict to their own records
  let targetEmployeeId = employeeId;
  if (!req.user.role || !['admin', 'hr'].includes(req.user.role)) {
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

  // Get attendance records using data service
  const result = await Data.getEmployeeAttendanceRecords(targetEmployeeId, {
    startDate,
    endDate,
    status,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10
  });

  res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, {
    records: result.records,
    pagination: result.pagination
  }));
}, 'fetch');

/**
 * Get missing checkouts for regularization reminders
 */
export const getMissingCheckouts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        formatResponse(false, ERROR_MESSAGES.AUTH_REQUIRED, null, { auth: ERROR_MESSAGES.NO_VALID_USER })
      );
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, ERROR_MESSAGES.NO_EMPLOYEE_PROFILE)
      );
    }

    const missingCheckouts = await Data.getMissingCheckoutRecords(employeeObjId);

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, {
      missingCheckouts,
      total: missingCheckouts.length
    }));
  } catch (err) {
    console.error('Get missing checkouts error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: err.message })
    );
  }
};

/**
 * Get employee's own attendance records with enhanced formatting
 */
export const getMyAttendance = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        formatResponse(false, ERROR_MESSAGES.AUTH_REQUIRED, null, { auth: ERROR_MESSAGES.NO_VALID_USER })
      );
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, ERROR_MESSAGES.NO_EMPLOYEE_PROFILE)
      );
    }

    const employee = await Data.getEmployeeById(employeeObjId);
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const result = await Data.getEmployeeAttendanceRecords(employeeObjId, {
      startDate: startDate || employee.joiningDate.toISOString().split('T')[0],
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, {
      records: result.records,
      pagination: result.pagination
    }));
  } catch (err) {
    console.error('Get my attendance error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: err.message })
    );
  }
};

/**
 * Get today's attendance for all employees (Admin/HR only)
 */
export const getTodayAttendanceWithAbsents = async (req, res) => {
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
    console.error('Get today attendance error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: err.message })
    );
  }
};

/**
 * Get admin attendance data for a date range
 */
export const getAdminAttendanceRange = async (req, res) => {
  try {
    if (!validateAdminAccess(req, res)) return;

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, 'Start date and end date are required')
      );
    }

    // Use report service for comprehensive attendance range data
    const report = await Report.generateCustomReport({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      includeCharts: true
    });

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, report));
  } catch (err) {
    console.error('Get admin attendance range error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: err.message })
    );
  }
};

/**
 * Get employee attendance with absent days included
 */
export const getEmployeeAttendanceWithAbsents = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId || !startDate || !endDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        formatResponse(false, 'Employee ID, start date, and end date are required')
      );
    }

    // Check authorization
    const authResult = await validateEmployeeAccess(req, employeeId);
    if (!authResult.authorized) {
      return res.status(authResult.statusCode || HTTP_STATUS.FORBIDDEN).json(authResult.error);
    }

    // Generate comprehensive employee report
    const report = await Report.generateEmployeeReport(employeeId, new Date(startDate), new Date(endDate));

    res.json(formatResponse(true, SUCCESS_MESSAGES.RECORDS_RETRIEVED, report));
  } catch (err) {
    console.error('Get employee attendance with absents error:', err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      formatResponse(false, ERROR_MESSAGES.FAILED_TO_FETCH, null, { server: err.message })
    );
  }
};

/**
 * Update attendance record (HR/Admin only)
 */
export const updateAttendanceRecord = asyncErrorHandler(async (req, res) => {
  if (!validateAdminAccess(req, res)) return;

  const { recordId } = req.params;
  const { status, checkIn, checkOut, employeeId, date } = req.body;

  let updatedRecord;

  if (recordId === 'new') {
    // Create new attendance record or update existing if found
    if (!employeeId || !date) {
      throw new BusinessLogicError('Employee ID and date are required for creating new attendance record');
    }

    const employee = await Data.getEmployee(employeeId);
    if (!employee) {
      throw new NotFoundError(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
    }

    const recordDate = new Date(date);

    // Check if record already exists for this employee and date
    const existingRecord = await Data.findAttendanceRecord(employee._id, recordDate);

    if (existingRecord) {
      // Update existing record instead of creating new one
      const updateData = {};
      if (status) {
        updateData.status = status;
        // If setting status to absent, clear checkIn and checkOut
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

      updatedRecord = await Data.updateAttendanceRecord(existingRecord._id, updateData);
    } else {
      // Create new record using employee's department for business hours
      const businessHours = await Business.getBusinessHours(recordDate, employee.department);

      const attendanceData = {
        employee: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date: recordDate,
        checkIn: checkIn ? new Date(checkIn) : businessHours.workStart,
        checkOut: checkOut ? new Date(checkOut) : businessHours.workEnd,
        status: status || ATTENDANCE_STATUS.PRESENT
      };

      updatedRecord = await Data.createAttendanceRecord(attendanceData);
    }
  } else {
    // Update existing record
    const updateData = {};
    if (status) {
      updateData.status = status;
      // If setting status to absent, clear checkIn and checkOut
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

    updatedRecord = await Data.updateAttendanceRecord(recordId, updateData);

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