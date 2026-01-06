/**
 * Attendance System Constants and Configuration
 * Centralized place for all attendance-related constants
 */

// Attendance Status Enum (Core statuses only)
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',    // Includes late arrivals
  ABSENT: 'absent',      // Includes leave
  HALF_DAY: 'half-day'
} as const;

export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];

// Additional flags for detailed tracking
export const ATTENDANCE_FLAGS = {
  IS_LATE: 'is_late',           // Flag for late arrivals (still Present)
  IS_LEAVE: 'is_leave',         // Flag for approved leave (still Absent)
  IS_HOLIDAY: 'is_holiday',     // Flag for holidays
  IS_WEEKEND: 'is_weekend'      // Flag for weekends
} as const;

// Valid status transitions for updates
export const VALID_STATUS_TRANSITIONS = {
  [ATTENDANCE_STATUS.ABSENT]: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY],
  [ATTENDANCE_STATUS.PRESENT]: [ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.HALF_DAY],
  [ATTENDANCE_STATUS.HALF_DAY]: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT]
};

// Business Rules Configuration
export const BUSINESS_RULES = {
  // Time thresholds (in decimal hours - 9.75 = 9:45 AM)
  LATE_THRESHOLD: 9.92, // 9:55 AM in decimal (9 + 55/60)
  WORK_START_TIME: 9.0, // 9:00 AM
  WORK_END_TIME: 18.0,   // 6:00 PM
  HALF_DAY_END_TIME: 13.0, // 1:00 PM
  LATE_ARRIVAL_TIME: 10.25, // 10:15 AM
  
  // Work hours thresholds
  MINIMUM_WORK_HOURS: 4,
  FULL_DAY_HOURS: 8,
  HALF_DAY_HOURS: 4,
  
  // Working days configuration
  WORKING_DAYS: [1, 2, 3, 4, 5, 6], // Monday to Saturday (0=Sunday, 6=Saturday)
  NON_WORKING_DAYS: [0], // Sunday
  SECOND_SATURDAY_OFF: true, // 2nd Saturday is off
  
  // Regularization settings
  REGULARIZATION_LOOKBACK_DAYS: 7,
  MAX_REGULARIZATION_DAYS: 30
};

// Cache Configuration
export const CACHE_CONFIG = {
  TTL: {
    EMPLOYEES: 300,    // 5 minutes
    HOLIDAYS: 3600,    // 1 hour
    ATTENDANCE: 180,   // 3 minutes
    REPORTS: 600       // 10 minutes
  },
  KEYS: {
    EMPLOYEES_ACTIVE: 'employees:active:basic',
    HOLIDAYS_RANGE: 'holidays',
    ATTENDANCE_TODAY: 'attendance:today',
    ATTENDANCE_RANGE: 'attendance:range'
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication & Authorization
  AUTH_REQUIRED: "Authentication required",
  NO_VALID_USER: "No valid user found",
  ACCESS_DENIED: "Access denied. Admin/HR role required.",
  EMPLOYEE_ACCESS_ONLY: "Access denied. You can only view your own attendance.",
  
  // Employee Related
  NO_EMPLOYEE_PROFILE: "No linked employee profile found for user",
  EMPLOYEE_NOT_FOUND: "Employee not found",
  EMPLOYEE_INACTIVE: "Employee is not active",
  
  // Check-in/Check-out
  ALREADY_CHECKED_IN: "Already checked in for today",
  ALREADY_CHECKED_OUT: "Already checked out for today",
  NO_CHECKIN_RECORD: "No check-in record found for today",
  CHECKOUT_FAILED: "Check-out failed",
  CHECKIN_FAILED: "Check-in failed",
  
  // Task Reports
  TASK_REPORT_REQUIRED: "A task report with at least one task is required to check out.",
  TASK_REPORT_EXISTS: "A task report has already been submitted for today.",
  
  // Data Validation
  INVALID_STATUS: "Invalid status. Must be one of: present, absent, half-day",
  INVALID_DATE_RANGE: "Invalid date range provided",
  REQUIRED_FIELDS_MISSING: "Required fields are missing",
  INVALID_EMPLOYEE_ID: "Invalid employee ID provided",
  
  // General
  SERVER_ERROR: "Internal server error",
  FAILED_TO_FETCH: "Failed to retrieve data",
  FAILED_TO_UPDATE: "Failed to update record",
  RECORD_NOT_FOUND: "Record not found",
  DUPLICATE_RECORD: "Record already exists"
};

// Success Messages
export const SUCCESS_MESSAGES = {
  CHECKED_IN: "Checked in successfully",
  CHECKED_OUT: "Checked out successfully with task report.",
  RECORD_UPDATED: "Attendance record updated successfully",
  RECORDS_RETRIEVED: "Records retrieved successfully",
  DATA_PROCESSED: "Data processed successfully"
};

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100
};

// Date Formats
export const DATE_FORMATS = {
  API_DATE: 'YYYY-MM-DD',
  DISPLAY_DATE: 'DD/MM/YYYY',
  DATETIME_ISO: 'YYYY-MM-DDTHH:mm:ssZ',
  TIME_DISPLAY: 'HH:mm A'
};

// Location Validation
export const LOCATION_CONSTRAINTS = {
  LATITUDE_MIN: -90,
  LATITUDE_MAX: 90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX: 180
};

// Regular Expressions for Validation
export const VALIDATION_PATTERNS = {
  EMPLOYEE_ID: /^[A-Z]{2,3}\d{3,6}$/, // e.g., EMP001, TEC123456
  TIME_FORMAT: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/
};

// HTTP Status Codes for consistency
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// Logging Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

export default {
  ATTENDANCE_STATUS,
  ATTENDANCE_FLAGS,
  VALID_STATUS_TRANSITIONS,
  BUSINESS_RULES,
  CACHE_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION_DEFAULTS,
  DATE_FORMATS,
  LOCATION_CONSTRAINTS,
  VALIDATION_PATTERNS,
  HTTP_STATUS,
  LOG_LEVELS
};