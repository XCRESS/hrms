/**
 * Production-ready AsyncHandler
 * Type-safe async error handling for Express routes
 */

import type { Request, Response, NextFunction } from 'express';
import type { IAuthRequest, AsyncRequestHandler } from '../types/index.js';
import { APIError } from './errors.js';
import logger from './logger.js';

/**
 * Async wrapper that catches errors and passes them to Express error middleware
 * @param fn - Async controller function
 * @returns Express middleware function
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: IAuthRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * MongoDB validation error interface
 */
interface MongoValidationError extends Error {
  name: 'ValidationError';
  errors: Record<
    string,
    {
      path: string;
      message: string;
    }
  >;
}

/**
 * MongoDB duplicate key error interface
 */
interface MongoDuplicateKeyError extends Error {
  code: 11000;
  keyPattern: Record<string, number>;
}

/**
 * Type guard for MongoDB validation errors
 */
function isMongoValidationError(error: unknown): error is MongoValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'ValidationError' &&
    'errors' in error
  );
}

/**
 * Type guard for MongoDB duplicate key errors
 */
function isMongoDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as MongoDuplicateKeyError).code === 11000
  );
}

/**
 * Type guard for Mongoose CastError
 */
function isCastError(error: unknown): error is Error & { name: 'CastError' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as Error).name === 'CastError'
  );
}

/**
 * Type guard for JWT errors
 */
function isJWTError(
  error: unknown
): error is Error & { name: 'JsonWebTokenError' | 'TokenExpiredError' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    ((error as Error).name === 'JsonWebTokenError' ||
      (error as Error).name === 'TokenExpiredError')
  );
}

/**
 * Global error handling middleware - handles all error types consistently
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void | Response {
  // If response already sent, pass to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle our custom APIError classes (they have toJSON method)
  if (err instanceof APIError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle MongoDB validation errors
  if (isMongoValidationError(err)) {
    const validationErrors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle MongoDB duplicate key errors
  if (isMongoDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field ?? 'Field'} already exists`,
      code: 'DUPLICATE_KEY_ERROR',
      timestamp: new Date().toISOString(),
    });
  }

  // Handle JWT errors
  if (isJWTError(err)) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';

    return res.status(401).json({
      success: false,
      message,
      code,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (isCastError(err)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      code: 'INVALID_ID',
      timestamp: new Date().toISOString(),
    });
  }

  // Log unexpected errors for debugging
  const error = err instanceof Error ? err : new Error('Unknown error');
  logger.error({ err: error }, 'Unhandled error');

  // Default error response
  const errorMessage =
    err instanceof Error && process.env.NODE_ENV === 'development'
      ? err.message
      : 'Internal server error';

  return res.status(500).json({
    success: false,
    message: errorMessage,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
}
