/**
 * Attendance Helper Functions
 * Pure utility functions for data transformation and common operations
 */

import { 
  ATTENDANCE_STATUS, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  HTTP_STATUS 
} from './attendanceConstants.js';
import { getISTDateString, calculateWorkHours } from '../timezoneUtils.js';
import { computeComprehensiveFlags } from './attendanceComputedFlags.js';

/**
 * Standard response formatter for consistency across all endpoints
 * @param {boolean} success - Operation success status
 * @param {string} message - Response message
 * @param {Object} data - Response data (optional)
 * @param {Object} errors - Error details (optional)
 * @returns {Object} Formatted response object
 */
export const formatResponse = (success, message, data = null, errors = null) => {
  return {
    success,
    message,
    ...(data && { data }),
    ...(errors && { errors })
  };
};

/**
 * Build standard employee object for responses
 * @param {Object} employee - Employee document
 * @returns {Object} Standardized employee object
 */
export const buildEmployeeObject = (employee) => {
  if (!employee) return null;
  
  return {
    _id: employee._id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    department: employee.department,
    position: employee.position
  };
};

/**
 * Build standard attendance record for responses with computed flags
 * @param {Object} record - Attendance record
 * @param {Object} employee - Employee document
 * @param {number} workHours - Calculated work hours (optional)
 * @param {Object} additionalFields - Additional fields to merge (optional)
 * @returns {Object} Standardized attendance record with computed flags
 */
export const buildAttendanceRecord = (record, employee, workHours = null, additionalFields = {}) => {
  if (!employee) return null;
  
  const baseRecord = {
    _id: record?._id || null,
    employee: buildEmployeeObject(employee),
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date: record?.date || null,
    checkIn: record?.checkIn || null,
    checkOut: record?.checkOut || null,
    status: record?.status || ATTENDANCE_STATUS.ABSENT,
    workHours: workHours !== null ? workHours : (record?.workHours || null),
    comments: record?.comments || null,
    reason: record?.reason || null
  };
  
  // Compute flags if we have enough context
  if (record?.date && additionalFields.contextData) {
    const flags = computeComprehensiveFlags({
      attendanceRecord: record,
      date: record.date,
      holidayMap: additionalFields.contextData.holidayMap,
      approvedLeave: additionalFields.contextData.approvedLeave,
      dayTypeChecker: additionalFields.contextData.dayTypeChecker
    });
    baseRecord.flags = flags;
  } else {
    baseRecord.flags = {};
  }
  
  // Merge any additional fields (excluding contextData to avoid leaking internal data)
  const { contextData, ...cleanAdditionalFields } = additionalFields;
  return { ...baseRecord, ...cleanAdditionalFields };
};

/**
 * Build attendance record for specific status types with computed flags
 * @param {Date} date - Date for the record
 * @param {Object} employee - Employee document
 * @param {string} status - Attendance status (present, absent, half-day)
 * @param {Object} additionalData - Additional data (holiday, leave, etc.)
 * @returns {Object} Status-specific attendance record with computed flags
 */
export const buildStatusSpecificRecord = (date, employee, status, additionalData = {}) => {
  if (!employee) return null;
  
  const baseRecord = {
    _id: null,
    employee: buildEmployeeObject(employee),
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date: date,
    checkIn: null,
    checkOut: null,
    status: status,
    workHours: null,
    comments: null,
    reason: null
  };
  
  // Handle different types of absences
  if (additionalData.isLeave) {
    baseRecord.status = ATTENDANCE_STATUS.ABSENT;
    if (additionalData.leaveType) {
      baseRecord.comments = `Leave: ${additionalData.leaveType}`;
    }
    if (additionalData.leaveReason) {
      baseRecord.reason = additionalData.leaveReason;
    }
  } else if (additionalData.isHoliday) {
    baseRecord.status = ATTENDANCE_STATUS.ABSENT;
    baseRecord.reason = null;
    if (additionalData.holidayTitle) {
      baseRecord.holidayTitle = additionalData.holidayTitle;
    }
  } else if (additionalData.isWeekend) {
    baseRecord.status = ATTENDANCE_STATUS.ABSENT;
    baseRecord.reason = additionalData.reason || 'Weekend';
  } else if (baseRecord.status === ATTENDANCE_STATUS.ABSENT && !baseRecord.reason) {
    baseRecord.reason = 'No check-in recorded';
  }
  
  // Compute flags dynamically
  const flags = computeComprehensiveFlags({
    attendanceRecord: null, // No attendance record for status-specific records
    date: date,
    holidayMap: additionalData.holidayMap,
    approvedLeave: additionalData.isLeave ? { 
      leaveType: additionalData.leaveType,
      leaveReason: additionalData.leaveReason 
    } : null,
    dayTypeChecker: additionalData.dayTypeChecker
  });
  
  return { ...baseRecord, ...additionalData, flags };
};

/**
 * Create attendance and leave lookup maps for efficient data processing
 * @param {Array} attendanceRecords - Array of attendance records
 * @param {Array} approvedLeaves - Array of approved leave records
 * @returns {Object} Object containing attendanceMap and leaveMap
 */
export const buildAttendanceMaps = (attendanceRecords, approvedLeaves) => {
  // Create attendance map grouped by employee and date
  const attendanceMap = new Map();
  attendanceRecords.forEach(record => {
    if (record.employee && record.employee._id) {
      const empId = record.employee._id.toString();
      const dateKey = getISTDateString(record.date);
      
      if (!attendanceMap.has(empId)) {
        attendanceMap.set(empId, new Map());
      }
      attendanceMap.get(empId).set(dateKey, record);
    }
  });

  // Create leave map grouped by employee and date
  const leaveMap = new Map();
  approvedLeaves.forEach(leave => {
    const empId = leave.employeeId;
    const dateKey = getISTDateString(leave.leaveDate);
    
    if (!leaveMap.has(empId)) {
      leaveMap.set(empId, new Set());
    }
    leaveMap.get(empId).add(dateKey);
  });

  return { attendanceMap, leaveMap };
};

/**
 * Create simple attendance lookup map (single level) for single employee operations
 * @param {Array} attendanceRecords - Array of attendance records
 * @returns {Map} Map with date keys and attendance records
 */
export const buildSimpleAttendanceMap = (attendanceRecords) => {
  const attendanceMap = new Map();
  attendanceRecords.forEach(record => {
    const dateKey = getISTDateString(record.date);
    attendanceMap.set(dateKey, record);
  });
  return attendanceMap;
};

/**
 * Create simple leave lookup map for single employee operations
 * @param {Array} approvedLeaves - Array of approved leave records
 * @returns {Map} Map with date keys and leave records
 */
export const buildSimpleLeaveMap = (approvedLeaves) => {
  const leaveMap = new Map();
  approvedLeaves.forEach(leave => {
    const dateKey = getISTDateString(leave.leaveDate);
    leaveMap.set(dateKey, leave);
  });
  return leaveMap;
};

/**
 * Generate date range array for processing multiple dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Map} holidayMap - Holiday map for working day determination (optional)
 * @param {Function} workingDayChecker - Function to check if date is working day
 * @returns {Array} Array of date objects with working day information
 */
export const generateDateRange = (startDate, endDate, holidayMap = null, workingDayChecker = null) => {
  const allDays = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateObj = {
      date: new Date(currentDate),
      isWorkingDay: workingDayChecker ? workingDayChecker(currentDate, holidayMap) : true
    };
    allDays.push(dateObj);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return allDays;
};

/**
 * Calculate attendance statistics from records with flag-aware counting
 * @param {Array} records - Array of attendance records
 * @returns {Object} Statistics object
 */
export const calculateAttendanceStats = (records) => {
  const stats = {
    total: records.length,
    present: 0,
    absent: 0,
    halfDay: 0,
    // Flag-based sub-counts for detailed analysis
    late: 0,        // Late arrivals (subset of present)
    leave: 0,       // Leave days (subset of absent)  
    weekend: 0,     // Weekend days (subset of absent)
    holiday: 0,     // Holiday days (subset of absent)
    totalWorkHours: 0,
    averageWorkHours: 0
  };

  records.forEach(record => {
    // Count primary status
    switch (record.status) {
      case ATTENDANCE_STATUS.PRESENT:
        stats.present++;
        break;
      case ATTENDANCE_STATUS.ABSENT:
        // Count as absent if it's a working day absence (including leave days)
        // Don't count weekends and holidays as absences in statistics
        if (!record.flags?.isWeekend && !record.flags?.isHoliday) {
          stats.absent++;
        }
        break;
      case ATTENDANCE_STATUS.HALF_DAY:
        stats.halfDay++;
        break;
    }

    // Count flags for detailed analysis
    if (record.flags) {
      if (record.flags.isLate) stats.late++;
      if (record.flags.isLeave) stats.leave++;
      if (record.flags.isWeekend) stats.weekend++;
      if (record.flags.isHoliday) stats.holiday++;
    }

    // Add work hours if present
    if (record.workHours) {
      stats.totalWorkHours += record.workHours;
    }
  });

  // Calculate average work hours (only for present and half-day records)
  const workingRecords = stats.present + stats.halfDay;
  stats.averageWorkHours = workingRecords > 0 ? 
    parseFloat((stats.totalWorkHours / workingRecords).toFixed(2)) : 0;

  return stats;
};

/**
 * Build pagination metadata
 * @param {number} total - Total records count
 * @param {number} page - Current page number
 * @param {number} limit - Records per page
 * @returns {Object} Pagination metadata
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Enhance attendance records with calculated work hours
 * @param {Array} records - Array of attendance records
 * @returns {Array} Enhanced records with work hours
 */
export const enhanceRecordsWithWorkHours = (records) => {
  return records.map(record => {
    const workHours = calculateWorkHours(record.checkIn, record.checkOut);
    return {
      ...record.toObject ? record.toObject() : record,
      workHours: workHours
    };
  });
};

/**
 * Filter records by date range
 * @param {Array} records - Array of records
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Array} Filtered records
 */
export const filterRecordsByDateRange = (records, startDate = null, endDate = null) => {
  return records.filter(record => {
    const recordDate = new Date(record.date);
    
    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;
    
    return true;
  });
};

/**
 * Group records by employee
 * @param {Array} records - Array of attendance records
 * @returns {Map} Map grouped by employee ID
 */
export const groupRecordsByEmployee = (records) => {
  const grouped = new Map();
  
  records.forEach(record => {
    const empId = record.employee?._id?.toString() || record.employee?.toString();
    if (empId) {
      if (!grouped.has(empId)) {
        grouped.set(empId, []);
      }
      grouped.get(empId).push(record);
    }
  });
  
  return grouped;
};

/**
 * Group records by date
 * @param {Array} records - Array of attendance records
 * @returns {Map} Map grouped by date key
 */
export const groupRecordsByDate = (records) => {
  const grouped = new Map();
  
  records.forEach(record => {
    const dateKey = getISTDateString(record.date);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey).push(record);
  });
  
  return grouped;
};

/**
 * Validate required fields in request data
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result { isValid, missingFields }
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => {
    return !data || data[field] === undefined || data[field] === null || data[field] === '';
  });
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Safely convert string to integer with default value
 * @param {string} value - String value to convert
 * @param {number} defaultValue - Default value if conversion fails
 * @param {number} min - Minimum allowed value (optional)
 * @param {number} max - Maximum allowed value (optional)
 * @returns {number} Converted integer value
 */
export const safeParseInt = (value, defaultValue = 1, min = null, max = null) => {
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) return defaultValue;
  
  if (min !== null && parsed < min) return min;
  if (max !== null && parsed > max) return max;
  
  return parsed;
};

/**
 * Create error response with standard format
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details (optional)
 * @returns {Object} Error response object
 */
export const createErrorResponse = (message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) => {
  return {
    response: formatResponse(false, message, null, details),
    statusCode
  };
};

/**
 * Create success response with standard format
 * @param {string} message - Success message
 * @param {Object} data - Response data (optional)
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Success response object
 */
export const createSuccessResponse = (message, data = null, statusCode = HTTP_STATUS.OK) => {
  return {
    response: formatResponse(true, message, data),
    statusCode
  };
};

// Default export with all functions
export default {
  formatResponse,
  buildEmployeeObject,
  buildAttendanceRecord,
  buildStatusSpecificRecord,
  buildAttendanceMaps,
  buildSimpleAttendanceMap,
  buildSimpleLeaveMap,
  generateDateRange,
  calculateAttendanceStats,
  buildPaginationMeta,
  enhanceRecordsWithWorkHours,
  filterRecordsByDateRange,
  groupRecordsByEmployee,
  groupRecordsByDate,
  validateRequiredFields,
  safeParseInt,
  createErrorResponse,
  createSuccessResponse
};