import Employee from "../models/Employee.model.js";

/**
 * Get Employee ObjectId from user object
 * Handles both direct employee reference and employeeId lookup
 * @param {Object} user - User object from authentication
 * @returns {Promise<ObjectId|null>} Employee ObjectId or null
 */
export const getEmployeeObjectId = async (user) => {
  if (user.employee) {
    return user.employee;
  }
  
  if (user.employeeId) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    return employee ? employee._id : null;
  }
  
  return null;
};

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} { isValid: boolean, missingFields: Array }
 */
export const validateRequiredFields = (body, requiredFields) => {
  const missingFields = requiredFields.filter(field => !body[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Create pagination object for database queries
 * @param {Object} query - Request query parameters
 * @param {number} defaultLimit - Default limit per page
 * @returns {Object} { skip, limit, page }
 */
export const createPagination = (query, defaultLimit = 10) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || defaultLimit;
  const skip = (page - 1) * limit;
  
  return { skip, limit, page };
};

/**
 * Calculate date range for queries
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object} { start: Date, end: Date }
 */
export const createDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();
  
  // Set time to start and end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Check if user has permission to access employee data
 * @param {Object} user - Authenticated user
 * @param {string} targetEmployeeId - Employee ID to access
 * @returns {boolean} Has permission
 */
export const hasEmployeeAccess = (user, targetEmployeeId) => {
  // Admin and HR can access all employee data
  if (user.role === 'admin' || user.role === 'hr') {
    return true;
  }
  
  // Employees can only access their own data
  return user.employeeId === targetEmployeeId;
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} Hex token
 */
export const generateSecureToken = (length = 32) => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};