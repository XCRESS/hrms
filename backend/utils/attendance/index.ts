/**
 * Attendance Utilities Barrel Export
 * Centralized export for all attendance utility functions
 */

// Constants
export {
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
  LOG_LEVELS,
  default as AttendanceConstants
} from './attendanceConstants.js';

export type { AttendanceStatus } from './attendanceConstants.js';

// Helper Functions
export {
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
  safeParseInt,
  createErrorResponse,
  createSuccessResponse,
  default as AttendanceHelpers
} from './attendanceHelpers.js';

// Computed Flags
export {
  computeAttendanceFlags,
  computeDayFlags,
  computeComprehensiveFlags,
  addComputedFlagsToRecord,
  batchComputeFlags,
  default as AttendanceComputedFlags
} from './attendanceComputedFlags.js';

// Validation Functions
export {
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
  createValidationErrorResponse,
  default as AttendanceValidation
} from './attendanceValidation.js';

// Error Handling
export {
  ERROR_TYPES,
  AttendanceError,
  BusinessLogicError,
  AuthorizationError,
  NotFoundError,
  handleAttendanceError,
  asyncErrorHandler,
  handleServiceError,
  validateRequiredFields,
  default as AttendanceErrorHandler
} from './attendanceErrorHandler.js';
