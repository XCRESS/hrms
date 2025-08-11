/**
 * Attendance Error Handler Utility
 * Centralized error handling and categorization for attendance operations
 */

import { formatResponse } from './attendanceHelpers.js';
import { ERROR_MESSAGES, HTTP_STATUS } from './attendanceConstants.js';

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  CAST: 'CastError', 
  MONGO: 'MongoError',
  MONGO_SERVER: 'MongoServerError',
  DUPLICATE_KEY: 'E11000',
  BUSINESS_LOGIC: 'BusinessLogicError',
  AUTHORIZATION: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  RATE_LIMIT: 'RateLimitError'
};

/**
 * Custom error classes
 */
export class AttendanceError extends Error {
  constructor(message, type = 'AttendanceError', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.name = type;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BusinessLogicError extends AttendanceError {
  constructor(message, details = null) {
    super(message, ERROR_TYPES.BUSINESS_LOGIC, HTTP_STATUS.BAD_REQUEST, details);
  }
}

export class AuthorizationError extends AttendanceError {
  constructor(message, details = null) {
    super(message, ERROR_TYPES.AUTHORIZATION, HTTP_STATUS.FORBIDDEN, details);
  }
}

export class NotFoundError extends AttendanceError {
  constructor(message, details = null) {
    super(message, ERROR_TYPES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, details);
  }
}

/**
 * Enhanced error handler for attendance controllers
 * @param {Error} err - Error object
 * @param {string} operation - Operation that failed (for context)
 * @param {Object} res - Express response object
 * @returns {Object} Error response
 */
export const handleAttendanceError = (err, operation = 'operation', res) => {
  console.error(`Attendance ${operation} error:`, {
    message: err.message,
    name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle custom attendance errors
  if (err instanceof AttendanceError) {
    return res.status(err.statusCode).json(
      formatResponse(false, err.message, null, err.details)
    );
  }

  // Handle specific MongoDB/Mongoose errors
  switch (err.name) {
    case ERROR_TYPES.VALIDATION:
      return handleValidationError(err, res);
    
    case ERROR_TYPES.CAST:
      return handleCastError(err, res);
    
    case ERROR_TYPES.MONGO:
    case ERROR_TYPES.MONGO_SERVER:
      return handleMongoError(err, res);
    
    default:
      // Check for duplicate key error
      if (err.code === 11000) {
        return handleDuplicateKeyError(err, res);
      }
      
      // Generic server error
      return handleGenericError(err, operation, res);
  }
};

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (err, res) => {
  const validationErrors = Object.keys(err.errors).reduce((acc, key) => {
    acc[key] = err.errors[key].message;
    return acc;
  }, {});

  return res.status(HTTP_STATUS.BAD_REQUEST).json(
    formatResponse(false, ERROR_MESSAGES.INVALID_DATA || 'Invalid data provided', null, {
      validation: validationErrors
    })
  );
};

/**
 * Handle Mongoose cast errors (invalid ObjectIds, etc.)
 */
const handleCastError = (err, res) => {
  let message = 'Invalid data format';
  
  if (err.path === '_id') {
    message = 'Invalid ID format';
  } else if (err.path === 'employee') {
    message = 'Invalid employee ID format';
  }

  return res.status(HTTP_STATUS.BAD_REQUEST).json(
    formatResponse(false, message, null, {
      field: err.path,
      value: err.value,
      type: 'CastError'
    })
  );
};

/**
 * Handle MongoDB errors
 */
const handleMongoError = (err, res) => {
  console.error('MongoDB Error:', err);
  
  // Don't expose internal MongoDB details to client
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
    formatResponse(false, 'Database operation failed', null, {
      type: 'DatabaseError'
    })
  );
};

/**
 * Handle duplicate key errors (unique constraint violations)
 */
const handleDuplicateKeyError = (err, res) => {
  let message = 'Duplicate record found';
  let field = 'unknown';

  // Extract field name from error
  if (err.keyValue) {
    const keys = Object.keys(err.keyValue);
    if (keys.includes('employee') && keys.includes('date')) {
      message = 'Attendance record already exists for this employee on this date';
      field = 'employee_date';
    } else if (keys.includes('employeeId') && keys.includes('date')) {
      message = 'Task report already exists for this employee on this date';
      field = 'task_report';
    }
  }

  return res.status(HTTP_STATUS.CONFLICT).json(
    formatResponse(false, message, null, {
      field,
      type: 'DuplicateError',
      value: err.keyValue
    })
  );
};

/**
 * Handle generic errors
 */
const handleGenericError = (err, operation, res) => {
  const errorMessage = getGenericErrorMessage(operation);
  
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
    formatResponse(false, errorMessage, null, {
      server: err.message,
      type: 'ServerError'
    })
  );
};

/**
 * Get operation-specific error messages
 */
const getGenericErrorMessage = (operation) => {
  const errorMap = {
    'check-in': ERROR_MESSAGES.CHECKIN_FAILED,
    'check-out': ERROR_MESSAGES.CHECKOUT_FAILED,
    'fetch': ERROR_MESSAGES.FAILED_TO_FETCH,
    'update': ERROR_MESSAGES.FAILED_TO_UPDATE,
    'create': 'Failed to create record',
    'delete': 'Failed to delete record'
  };

  return errorMap[operation] || 'Operation failed';
};

/**
 * Async error wrapper for controller functions
 * @param {Function} fn - Controller function
 * @param {string} operation - Operation name for error context
 * @returns {Function} Wrapped controller function
 */
export const asyncErrorHandler = (fn, operation) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(err => handleAttendanceError(err, operation, res));
  };
};

/**
 * Service layer error handler
 * Converts service errors to appropriate HTTP errors
 * @param {Error} err - Service layer error
 * @param {string} context - Context where error occurred
 * @throws {AttendanceError} Appropriate attendance error
 */
export const handleServiceError = (err, context = 'service') => {
  if (err instanceof AttendanceError) {
    throw err; // Re-throw attendance errors as-is
  }

  // Convert common service errors to attendance errors
  if (err.name === 'ValidationError') {
    throw new BusinessLogicError('Invalid data provided', {
      context,
      originalError: err.message
    });
  }

  if (err.message.includes('not found') || err.message.includes('Not found')) {
    throw new NotFoundError(err.message, { context });
  }

  if (err.message.includes('unauthorized') || err.message.includes('forbidden')) {
    throw new AuthorizationError(err.message, { context });
  }

  // Generic service error
  throw new AttendanceError(
    `Service error in ${context}: ${err.message}`,
    'ServiceError',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    { context, originalError: err.message }
  );
};

/**
 * Validation helper for request data
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Required field names
 * @throws {BusinessLogicError} If validation fails
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => 
    !data || data[field] === undefined || data[field] === null || data[field] === ''
  );

  if (missingFields.length > 0) {
    throw new BusinessLogicError(
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }
};

export default {
  ERROR_TYPES,
  AttendanceError,
  BusinessLogicError,
  AuthorizationError,
  NotFoundError,
  handleAttendanceError,
  asyncErrorHandler,
  handleServiceError,
  validateRequiredFields
};