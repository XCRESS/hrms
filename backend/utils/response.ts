/**
 * Standard API Response Utilities
 * Type-safe response formatting for consistent API responses
 */

import type { ISuccessResponse, IErrorResponse } from '../types/index.js';

/**
 * Type guard for validation errors
 */
function isValidationErrors(
  errors: unknown
): errors is Array<{ field: string; message: string }> {
  return (
    Array.isArray(errors) &&
    errors.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        'field' in e &&
        'message' in e &&
        typeof e.field === 'string' &&
        typeof e.message === 'string'
    )
  );
}

/**
 * Format successful API response
 * @param message - Human-readable success message
 * @param data - Optional data payload
 * @param metadata - Optional pagination/metadata
 * @returns Standardized success response
 */
export function formatSuccessResponse<T = unknown>(
  message: string,
  data?: T,
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  }
): ISuccessResponse<T> {
  return {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(metadata && { metadata }),
  };
}

/**
 * Format error API response
 * @param message - Human-readable error message
 * @param error - Optional error string
 * @param errors - Optional validation errors array
 * @param stack - Optional stack trace (only in development)
 * @returns Standardized error response
 */
export function formatErrorResponse(
  message: string,
  error?: string,
  errors?: Array<{ field: string; message: string }>,
  stack?: string
): IErrorResponse {
  return {
    success: false,
    message,
    ...(error && { error }),
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && stack && { stack }),
  };
}

/**
 * Legacy format response (backward compatibility)
 * @deprecated Use formatSuccessResponse or formatErrorResponse instead
 */
export function formatResponse<T = unknown>(
  success: boolean,
  message: string,
  data: T | null = null,
  errors: unknown = null
): ISuccessResponse<T> | IErrorResponse {
  if (success) {
    return formatSuccessResponse(message, data ?? undefined);
  }
  return formatErrorResponse(
    message,
    undefined,
    isValidationErrors(errors) ? errors : undefined
  );
}

/**
 * Validate request body against required fields
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @returns Error response object or null if valid
 */
export function validateRequest(
  body: Record<string, unknown>,
  requiredFields: string[]
): { status: number; response: IErrorResponse } | null {
  const missingFields = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === '' || body[field] === null
  );

  if (missingFields.length > 0) {
    return {
      status: 400,
      response: formatErrorResponse(
        'Missing required fields',
        undefined,
        missingFields.map((field) => ({
          field,
          message: `${field} is required`,
        }))
      ),
    };
  }

  return null;
}

/**
 * Send error response
 * Helper function for Express response objects
 * @param res - Express response object
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @param errors - Optional validation errors
 */
export function errorResponse(
  res: any,
  message: string,
  statusCode: number = 500,
  errors?: Array<{ field: string; message: string }>
): void {
  res.status(statusCode).json(formatErrorResponse(message, undefined, errors));
}

/**
 * Send success response
 * Helper function for Express response objects
 * @param res - Express response object
 * @param message - Success message
 * @param data - Optional data payload
 * @param statusCode - HTTP status code
 */
export function successResponse<T = unknown>(
  res: any,
  message: string,
  data?: T,
  statusCode: number = 200
): void {
  res.status(statusCode).json(formatSuccessResponse(message, data));
}
