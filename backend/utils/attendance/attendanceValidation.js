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
  HTTP_STATUS
} from './attendanceConstants.js';
import { formatResponse } from './attendanceHelpers.js';

/**
 * Get employee ObjectId for current user
 * @param {Object} user - User object from request
 * @returns {Promise<string|null>} Employee ObjectId or null
 */
export const getEmployeeObjectId = async (user) => {
  if (!user) return null;
  
  if (user.employee) return user.employee; // Already ObjectId
  
  if (user.employeeId) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    return employee ? employee._id : null;
  }
  
  return null;
};

/**
 * Validate admin/HR access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} True if access is valid, false otherwise (response sent)
 */
export const validateAdminAccess = (req, res) => {
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
 * @param {Object} req - Express request object
 * @param {string} employeeId - Employee ID being accessed
 * @returns {Promise<Object>} Authorization result
 */
export const validateEmployeeAccess = async (req, employeeId) => {
  // Admin/HR can access any employee data
  if (['admin', 'hr'].includes(req.user?.role)) {
    return { authorized: true };
  }

  // Regular employees can only access their own data
  const userEmployeeObjId = await getEmployeeObjectId(req.user);
  const requestedEmployee = await Employee.findOne({ employeeId });
  
  if (!userEmployeeObjId || !requestedEmployee || 
      userEmployeeObjId.toString() !== requestedEmployee._id.toString()) {
    return { 
      authorized: false, 
      error: formatResponse(false, ERROR_MESSAGES.EMPLOYEE_ACCESS_ONLY),
      statusCode: HTTP_STATUS.FORBIDDEN
    };
  }
  
  return { authorized: true, employeeObjectId: userEmployeeObjId };
};

/**
 * Validate attendance status
 * @param {string} status - Status to validate
 * @returns {boolean} True if status is valid
 */
export const validateAttendanceStatus = (status) => {
  return Object.values(ATTENDANCE_STATUS).includes(status);
};

/**
 * Validate status transition
 * @param {string} currentStatus - Current attendance status
 * @param {string} newStatus - New attendance status
 * @returns {boolean} True if transition is valid
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
  if (!currentStatus || !newStatus) return false;
  
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return validTransitions ? validTransitions.includes(newStatus) : false;
};

/**
 * Validate employee ID format
 * @param {string} employeeId - Employee ID to validate
 * @returns {boolean} True if format is valid
 */
export const validateEmployeeIdFormat = (employeeId) => {
  if (!employeeId || typeof employeeId !== 'string') return false;
  return VALIDATION_PATTERNS.EMPLOYEE_ID.test(employeeId);
};

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if format is valid
 */
export const validateDateFormat = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  return VALIDATION_PATTERNS.DATE_FORMAT.test(dateString);
};

/**
 * Validate time format (HH:MM)
 * @param {string} timeString - Time string to validate
 * @returns {boolean} True if format is valid
 */
export const validateTimeFormat = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return false;
  return VALIDATION_PATTERNS.TIME_FORMAT.test(timeString);
};

/**
 * Validate location coordinates
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {Object} Validation result
 */
export const validateLocation = (latitude, longitude) => {
  const errors = [];
  
  if (latitude !== undefined && latitude !== null) {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < LOCATION_CONSTRAINTS.LATITUDE_MIN || lat > LOCATION_CONSTRAINTS.LATITUDE_MAX) {
      errors.push(`Latitude must be between ${LOCATION_CONSTRAINTS.LATITUDE_MIN} and ${LOCATION_CONSTRAINTS.LATITUDE_MAX}`);
    }
  }
  
  if (longitude !== undefined && longitude !== null) {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < LOCATION_CONSTRAINTS.LONGITUDE_MIN || lng > LOCATION_CONSTRAINTS.LONGITUDE_MAX) {
      errors.push(`Longitude must be between ${LOCATION_CONSTRAINTS.LONGITUDE_MIN} and ${LOCATION_CONSTRAINTS.LONGITUDE_MAX}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate date range
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} Validation result
 */
export const validateDateRange = (startDate, endDate) => {
  const errors = [];
  
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
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
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
 * @param {string|number} page - Page number
 * @param {string|number} limit - Records per page
 * @returns {Object} Validation result with parsed values
 */
export const validatePaginationParams = (page, limit) => {
  const errors = [];
  let validatedPage = 1;
  let validatedLimit = 10;
  
  // Validate page
  if (page !== undefined) {
    const parsedPage = parseInt(page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      errors.push('Page must be a positive integer');
    } else {
      validatedPage = parsedPage;
    }
  }
  
  // Validate limit
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
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

/**
 * Validate task report data
 * @param {Array} tasks - Array of task strings
 * @returns {Object} Validation result
 */
export const validateTaskReport = (tasks) => {
  const errors = [];
  
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

/**
 * Validate check-in/check-out timing
 * @param {Date} checkIn - Check-in time
 * @param {Date} checkOut - Check-out time (optional)
 * @returns {Object} Validation result
 */
export const validateCheckInOut = (checkIn, checkOut = null) => {
  const errors = [];
  
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
      const hoursDiff = (checkOutTime - checkInTime) / (1000 * 60 * 60);
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

/**
 * Validate employee active status and joining date
 * @param {Object} employee - Employee document
 * @param {Date} operationDate - Date of operation (optional, defaults to today)
 * @returns {Object} Validation result
 */
export const validateEmployeeEligibility = (employee, operationDate = new Date()) => {
  const errors = [];
  
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

/**
 * Validate attendance record update data
 * @param {Object} updateData - Data to update
 * @param {string} currentStatus - Current attendance status
 * @returns {Object} Validation result
 */
export const validateAttendanceUpdate = (updateData, currentStatus) => {
  const errors = [];
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

/**
 * Create validation error response
 * @param {Array} errors - Array of error messages
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
export const createValidationErrorResponse = (errors, statusCode = HTTP_STATUS.BAD_REQUEST) => {
  return {
    response: formatResponse(false, 'Validation failed', null, { validation: errors }),
    statusCode
  };
};

// Export all functions as default
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