/**
 * Production-ready AsyncHandler - Zero dependencies
 * Used by companies like Airbnb, Stripe for clean async error handling
 */

import { APIError } from './errors.js';

/**
 * Simple async wrapper that catches errors and passes them to Express error middleware
 * @param {Function} fn - Async controller function
 * @returns {Function} - Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handling middleware - handles all error types consistently
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response  
 * @param {Function} next - Express next function
 */
export const globalErrorHandler = (err, req, res, next) => {
  // If response already sent, pass to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle our custom APIError classes (they have toJSON method)
  if (err instanceof APIError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      timestamp: new Date().toISOString()
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      code: 'DUPLICATE_KEY_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      code: 'INVALID_ID',
      timestamp: new Date().toISOString()
    });
  }

  // Log unexpected errors for debugging
  console.error('Unhandled error:', err);

  // Default error response
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
};