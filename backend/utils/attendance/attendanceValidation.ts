/**
 * Attendance Validation and Authorization Utilities
 * Validation logic and authorization helpers for attendance operations
 */

import Employee from '../../models/Employee.model.js';
import {
  ATTENDANCE_STATUS,
  VALID_STATUS_TRANSITIONS,
  BUSINESS_RULES,
  ERROR_MESSAGES,
  VALIDATION_PATTERNS,
  LOCATION_CONSTRAINTS,
  HTTP_STATUS,
  type AttendanceStatus
} from './attendanceConstants.js';
import { formatResponse } from './attendanceHelpers.js';
import type { Response } from 'express';
import type { IAuthRequest, IEmployee } from '../../types/index.js';
import type { Types } from 'mongoose';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface PaginationValidationResult extends ValidationResult {
  page: number;
  limit: number;
}

interface TaskReportValidationResult extends ValidationResult {
  validTasks?: string[];
}

interface AuthorizationResult {
  authorized: boolean;
  employeeObjectId?: Types.ObjectId;
  error?: { success: false; message: string };
  statusCode?: number;
}

// ============================================================================
// AUTHORIZATION UTILITIES
// ============================================================================

/**
 * Get employee ObjectId for current user
 */
export const getEmployeeObjectId = async (
  user: IAuthRequest['user'] | undefined
): Promise<Types.ObjectId | null> => {
  if (!user) return null;

  if (user.employee) return user.employee as Types.ObjectId;

  if (user.employeeId) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    return employee ? employee._id : null;
  }

  return null;
};

/**
 * Validate admin/HR access
 */
export const validateAdminAccess = (req: IAuthRequest, res: Response): boolean => {
  if (!req.user?.role || !['admin', 'hr'].includes(req.user.role)) {
    res.status(HTTP_STATUS.FORBIDDEN).json(
      formatResponse(false, ERROR_MESSAGES.ACCESS_DENIED)
    );
    return false;
  }
  return true;
};

/**
 * Validate employee access (employees can only access their own data)
 */
export const validateEmployeeAccess = async (
  req: IAuthRequest,
  employeeId: string
): Promise<AuthorizationResult> => {
  // Admin/HR can access any employee data
  if (['admin', 'hr'].includes(req.user?.role || '')) {
    return { authorized: true };
  }

  // Regular employees can only access their own data
  const userEmployeeObjId = await getEmployeeObjectId(req.user);
  const requestedEmployee = await Employee.findOne({ employeeId });

  if (!userEmployeeObjId || !requestedEmployee ||
    userEmployeeObjId.toString() !== requestedEmployee._id.toString()) {
    return {
      authorized: false,
      error: formatResponse(false, ERROR_MESSAGES.EMPLOYEE_ACCESS_ONLY) as { success: false; message: string },
      statusCode: HTTP_STATUS.FORBIDDEN
    };
  }

  return { authorized: true, employeeObjectId: userEmployeeObjId };
};

// ============================================================================
// STATUS VALIDATION
// ============================================================================

/**
 * Validate attendance status
 */
export const validateAttendanceStatus = (status: string): boolean => {
  return Object.values(ATTENDANCE_STATUS).includes(status as AttendanceStatus);
};

/**
 * Validate status transition
 */
export const validateStatusTransition = (
  currentStatus: string | null | undefined,
  newStatus: string | null | undefined
): boolean => {
  if (!currentStatus || !newStatus) return false;

  const transitions = VALID_STATUS_TRANSITIONS as Record<string, string[]>;
  const validTransitions = transitions[currentStatus];
  return validTransitions ? validTransitions.includes(newStatus) : false;
};

// ============================================================================
// FORMAT VALIDATION
// ============================================================================

/**
 * Validate employee ID format
 */
export const validateEmployeeIdFormat = (employeeId: unknown): boolean => {
  if (!employeeId || typeof employeeId !== 'string') return false;
  return VALIDATION_PATTERNS.EMPLOYEE_ID.test(employeeId);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDateFormat = (dateString: unknown): boolean => {
  if (!dateString || typeof dateString !== 'string') return false;
  return VALIDATION_PATTERNS.DATE_FORMAT.test(dateString);
};

/**
 * Validate time format (HH:MM)
 */
export const validateTimeFormat = (timeString: unknown): boolean => {
  if (!timeString || typeof timeString !== 'string') return false;
  return VALIDATION_PATTERNS.TIME_FORMAT.test(timeString);
};

/**
 * Validate location coordinates
 */
export const validateLocation = (
  latitude: number | string | undefined | null,
  longitude: number | string | undefined | null
): ValidationResult => {
  const errors: string[] = [];

  if (latitude !== undefined && latitude !== null) {
    const lat = parseFloat(latitude.toString());
    if (isNaN(lat) || lat < LOCATION_CONSTRAINTS.LATITUDE_MIN || lat > LOCATION_CONSTRAINTS.LATITUDE_MAX) {
      errors.push(`Latitude must be between ${LOCATION_CONSTRAINTS.LATITUDE_MIN} and ${LOCATION_CONSTRAINTS.LATITUDE_MAX}`);
    }
  }

  if (longitude !== undefined && longitude !== null) {
    const lng = parseFloat(longitude.toString());
    if (isNaN(lng) || lng < LOCATION_CONSTRAINTS.LONGITUDE_MIN || lng > LOCATION_CONSTRAINTS.LONGITUDE_MAX) {
      errors.push(`Longitude must be between ${LOCATION_CONSTRAINTS.LONGITUDE_MIN} and ${LOCATION_CONSTRAINTS.LONGITUDE_MAX}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// RANGE VALIDATION
// ============================================================================

/**
 * Validate date range
 */
export const validateDateRange = (
  startDate: string | undefined | null,
  endDate: string | undefined | null
): ValidationResult => {
  const errors: string[] = [];

  if (!startDate || !endDate) {
    errors.push('Both start date and end date are required');
    return { isValid: false, errors };
  }

  if (!validateDateFormat(startDate)) {
    errors.push('Start date must be in YYYY-MM-DD format');
  }

  if (!validateDateFormat(endDate)) {
    errors.push('End date must be in YYYY-MM-DD format');
  }

  if (errors.length === 0) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      errors.push('Start date cannot be after end date');
    }

    // Check if date range is not too large (prevent performance issues)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      errors.push('Date range cannot exceed 365 days');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate pagination parameters
 */
export const validatePaginationParams = (
  page: string | number | undefined,
  limit: string | number | undefined
): PaginationValidationResult => {
  const errors: string[] = [];
  let validatedPage = 1;
  let validatedLimit = 10;

  // Validate page
  if (page !== undefined) {
    const parsedPage = parseInt(page.toString(), 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      errors.push('Page must be a positive integer');
    } else {
      validatedPage = parsedPage;
    }
  }

  // Validate limit
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit.toString(), 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('Limit must be a positive integer');
    } else if (parsedLimit > 100) {
      errors.push('Limit cannot exceed 100 records per page');
    } else {
      validatedLimit = parsedLimit;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    page: validatedPage,
    limit: validatedLimit
  };
};

// ============================================================================
// TASK REPORT VALIDATION
// ============================================================================

/**
 * Validate task report data
 */
export const validateTaskReport = (tasks: unknown): TaskReportValidationResult => {
  const errors: string[] = [];

  if (!tasks || !Array.isArray(tasks)) {
    errors.push('Tasks must be provided as an array');
    return { isValid: false, errors };
  }

  const validTasks = tasks.filter(task =>
    typeof task === 'string' && task.trim() !== ''
  );

  if (validTasks.length === 0) {
    errors.push('At least one valid task is required');
  }

  if (validTasks.length > 20) {
    errors.push('Cannot exceed 20 tasks per report');
  }

  // Validate individual task length
  const longTasks = validTasks.filter(task => task.length > 500);
  if (longTasks.length > 0) {
    errors.push('Individual tasks cannot exceed 500 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    validTasks
  };
};

// ============================================================================
// CHECK-IN/OUT VALIDATION
// ============================================================================

/**
 * Validate check-in/check-out timing
 */
export const validateCheckInOut = (
  checkIn: Date | string | null | undefined,
  checkOut: Date | string | null | undefined = null
): ValidationResult => {
  const errors: string[] = [];

  if (!checkIn) {
    errors.push('Check-in time is required');
    return { isValid: false, errors };
  }

  const checkInTime = new Date(checkIn);
  if (isNaN(checkInTime.getTime())) {
    errors.push('Invalid check-in time format');
    return { isValid: false, errors };
  }

  // Validate check-out if provided
  if (checkOut) {
    const checkOutTime = new Date(checkOut);

    if (isNaN(checkOutTime.getTime())) {
      errors.push('Invalid check-out time format');
    } else if (checkOutTime <= checkInTime) {
      errors.push('Check-out time must be after check-in time');
    } else {
      // Check for reasonable work hours (not more than 24 hours)
      const hoursDiff = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        errors.push('Work session cannot exceed 24 hours');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// EMPLOYEE VALIDATION
// ============================================================================

/**
 * Validate employee active status and joining date
 */
export const validateEmployeeEligibility = (
  employee: IEmployee | null | undefined,
  operationDate: Date = new Date()
): ValidationResult => {
  const errors: string[] = [];

  if (!employee) {
    errors.push(ERROR_MESSAGES.EMPLOYEE_NOT_FOUND);
    return { isValid: false, errors };
  }

  if (!employee.isActive) {
    errors.push(ERROR_MESSAGES.EMPLOYEE_INACTIVE);
  }

  // Check if operation date is before joining date
  if (employee.joiningDate && operationDate < employee.joiningDate) {
    errors.push('Operation date cannot be before employee joining date');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// UPDATE VALIDATION
// ============================================================================

/**
 * Validate attendance record update data
 */
export const validateAttendanceUpdate = (
  updateData: {
    status?: string;
    checkIn?: Date | string;
    checkOut?: Date | string;
  },
  currentStatus: string | null | undefined
): ValidationResult => {
  const errors: string[] = [];
  const { status, checkIn, checkOut } = updateData;

  // Validate status if provided
  if (status) {
    if (!validateAttendanceStatus(status)) {
      errors.push('Invalid attendance status');
    } else if (currentStatus && !validateStatusTransition(currentStatus, status)) {
      errors.push(`Cannot change status from ${currentStatus} to ${status}`);
    }
  }

  // Validate check-in/check-out if provided
  if (checkIn !== undefined || checkOut !== undefined) {
    const checkInOut = validateCheckInOut(
      checkIn !== undefined ? checkIn : new Date(),
      checkOut !== undefined ? checkOut : null
    );

    if (!checkInOut.isValid) {
      errors.push(...checkInOut.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create validation error response
 */
export const createValidationErrorResponse = (
  errors: string[],
  statusCode: number = HTTP_STATUS.BAD_REQUEST
): {
  response: { success: false; message: string; errors: { validation: string[] } };
  statusCode: number;
} => {
  return {
    response: formatResponse(false, 'Validation failed', null, { validation: errors }) as {
      success: false;
      message: string;
      errors: { validation: string[] };
    },
    statusCode
  };
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  getEmployeeObjectId,
  validateAdminAccess,
  validateEmployeeAccess,
  validateAttendanceStatus,
  validateStatusTransition,
  validateEmployeeIdFormat,
  validateDateFormat,
  validateTimeFormat,
  validateLocation,
  validateDateRange,
  validatePaginationParams,
  validateTaskReport,
  validateCheckInOut,
  validateEmployeeEligibility,
  validateAttendanceUpdate,
  createValidationErrorResponse
};
