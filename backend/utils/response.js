/**
 * Standard API response formatter
 * @param {boolean} success - Whether the request was successful
 * @param {string} message - Human-readable message about the result
 * @param {object|null} data - Optional data payload
 * @param {object|null} errors - Optional error details
 * @returns {object} Standardized response object
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
 * Error handler for async route controllers
 * @param {Function} fn - Async route controller function
 * @returns {Function} Express middleware with error handling
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`API Error: ${err.message}`, err);
    res.status(500).json(
      formatResponse(false, "Server error", null, {
        server: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      })
    );
  });
};

/**
 * Validate request body against required fields
 * @param {object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {object|null} Error response or null if valid
 */
export const validateRequest = (body, requiredFields) => {
  const missingFields = requiredFields.filter(field => !body[field]);
  
  if (missingFields.length > 0) {
    return {
      status: 400,
      response: formatResponse(false, "Missing required fields", null, {
        fields: missingFields
      })
    };
  }
  
  return null;
}; 