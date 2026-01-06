/**
 * Attendance Error Handler Utility
 * Centralized error handling and categorization for attendance operations
 */

import { formatResponse } from './attendanceHelpers.js';
import { ERROR_MESSAGES, HTTP_STATUS } from './attendanceConstants.js';
import type { Response, Request, NextFunction } from 'express';
import logger from '../logger.js';

// ============================================================================
// ERROR TYPE CONSTANTS
// ============================================================================

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
} as const;

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class AttendanceError extends Error {
  statusCode: number;
  details: unknown;

  constructor(
    message: string,
    type: string = 'AttendanceError',
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details: unknown = null
  ) {
    super(message);
    this.name = type;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BusinessLogicError extends AttendanceError {
  constructor(message: string, details: unknown = null) {
    super(message, ERROR_TYPES.BUSINESS_LOGIC, HTTP_STATUS.BAD_REQUEST, details);
  }
}

export class AuthorizationError extends AttendanceError {
  constructor(message: string, details: unknown = null) {
    super(message, ERROR_TYPES.AUTHORIZATION, HTTP_STATUS.FORBIDDEN, details);
  }
}

export class NotFoundError extends AttendanceError {
  constructor(message: string, details: unknown = null) {
    super(message, ERROR_TYPES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, details);
  }
}

// ============================================================================
// TYPE DEFINITIONS FOR ERROR OBJECTS
// ============================================================================

interface ValidationError extends Error {
  errors: Record<string, { message: string }>;
}

interface CastError extends Error {
  path: string;
  value: unknown;
}

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

// ============================================================================
// ERROR HANDLERS
// ============================================================================

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (err: ValidationError, res: Response): Response => {
  const errors = err.errors || {};
  const validationErrors = Object.keys(errors).reduce((acc, key) => {
    const errorObj = errors[key];
    if (errorObj) {
      acc[key] = errorObj.message;
    }
    return acc;
  }, {} as Record<string, string>);

  return res.status(HTTP_STATUS.BAD_REQUEST).json(
    formatResponse(false, 'Invalid data provided', null, {
      validation: validationErrors
    })
  );
};

/**
 * Handle Mongoose cast errors (invalid ObjectIds, etc.)
 */
const handleCastError = (err: CastError, res: Response): Response => {
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
const handleMongoError = (err: Error, res: Response): Response => {
  logger.error({ err }, 'MongoDB Error');

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
const handleDuplicateKeyError = (err: MongoError, res: Response): Response => {
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
 * Get operation-specific error messages
 */
const getGenericErrorMessage = (operation: string): string => {
  const errorMap: Record<string, string> = {
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
 * Handle generic errors
 */
const handleGenericError = (err: Error, operation: string, res: Response): Response => {
  const errorMessage = getGenericErrorMessage(operation);

  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
    formatResponse(false, errorMessage, null, {
      server: err.message,
      type: 'ServerError'
    })
  );
};

/**
 * Enhanced error handler for attendance controllers
 */
export const handleAttendanceError = (
  err: Error | AttendanceError | ValidationError | CastError | MongoError,
  operation: string = 'operation',
  res: Response
): Response => {
  logger.error({
    err,
    operation,
    message: err.message,
    name: err.name
  }, `Attendance ${operation} error`);

  // Handle custom attendance errors
  if (err instanceof AttendanceError) {
    return res.status(err.statusCode).json(
      formatResponse(false, err.message, null, err.details)
    );
  }

  // Handle specific MongoDB/Mongoose errors
  switch (err.name) {
    case ERROR_TYPES.VALIDATION:
      return handleValidationError(err as ValidationError, res);

    case ERROR_TYPES.CAST:
      return handleCastError(err as CastError, res);

    case ERROR_TYPES.MONGO:
    case ERROR_TYPES.MONGO_SERVER:
      return handleMongoError(err, res);

    default:
      // Check for duplicate key error
      if ('code' in err && (err as MongoError).code === 11000) {
        return handleDuplicateKeyError(err as MongoError, res);
      }

      // Generic server error
      return handleGenericError(err, operation, res);
  }
};

// ============================================================================
// ASYNC WRAPPERS
// ============================================================================

/**
 * Async error wrapper for controller functions
 */
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  operation: string
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next))
      .catch(err => handleAttendanceError(err, operation, res));
  };
};

/**
 * Service layer error handler
 * Converts service errors to appropriate HTTP errors
 */
export const handleServiceError = (err: Error | AttendanceError, context: string = 'service'): never => {
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
 */
export const validateRequiredFields = (
  data: Record<string, unknown> | null | undefined,
  requiredFields: string[]
): void => {
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

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

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
