/**
 * Utility Helper Functions
 * Type-safe helper utilities for common operations
 */

import crypto from 'crypto';
import type { Types } from 'mongoose';
import type { IJWTPayload, IPaginationQuery } from '../types/index.js';
import Employee from '../models/Employee.model.js';

/**
 * Get Employee ObjectId from user object
 * Handles both direct employee reference and employeeId lookup
 * @param user - Authenticated user from JWT
 * @returns Employee ObjectId or null
 */
export async function getEmployeeObjectId(
  user: IJWTPayload
): Promise<Types.ObjectId | null> {
  if (user.employee) {
    // If employee is already an ObjectId, return it
    return user.employee as Types.ObjectId;
  }

  if (user.employeeId) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    return employee ? employee._id : null;
  }

  return null;
}

/**
 * Validate required fields in request body
 * @param body - Request body object
 * @param requiredFields - Array of required field names
 * @returns Validation result with missing fields
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter((field) => !body[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Create pagination object for database queries
 * @param query - Request query parameters
 * @param defaultLimit - Default items per page (default: 10)
 * @returns Pagination config with skip, limit, page
 */
export function createPagination(
  query: IPaginationQuery,
  defaultLimit: number = 10
): { skip: number; limit: number; page: number } {
  const page = parseInt(query.page ?? '1', 10) || 1;
  const limit = parseInt(query.limit ?? String(defaultLimit), 10) || defaultLimit;
  const skip = (page - 1) * limit;

  return { skip, limit, page };
}

/**
 * Calculate date range for queries
 * @param startDate - Start date string (optional)
 * @param endDate - End date string (optional)
 * @returns Date range with start and end
 */
export function createDateRange(
  startDate?: string,
  endDate?: string
): { start: Date; end: Date } {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();

  // Set time to start and end of day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Check if user has permission to access employee data
 * @param user - Authenticated user
 * @param targetEmployeeId - Employee ID to access
 * @returns Has permission (true/false)
 */
export function hasEmployeeAccess(user: IJWTPayload, targetEmployeeId: string): boolean {
  // Admin and HR can access all employee data
  if (user.role === 'admin' || user.role === 'hr') {
    return true;
  }

  // Employees can only access their own data
  return user.employeeId === targetEmployeeId;
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - User input (string or any type)
 * @returns Sanitized string (or original if not string)
 */
export function sanitizeInput<T>(input: T): T | string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Generate a cryptographically secure random token
 * @param length - Token length in bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random alphanumeric string
 * @param length - String length (default: 8)
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    const byte = randomBytes[i];
    if (byte !== undefined) {
      result += chars[byte % chars.length];
    }
  }

  return result;
}

/**
 * Calculate total pages for pagination
 * @param totalItems - Total number of items
 * @param limit - Items per page
 * @returns Total number of pages
 */
export function calculateTotalPages(totalItems: number, limit: number): number {
  return Math.ceil(totalItems / limit);
}

/**
 * Check if a value is a valid MongoDB ObjectId
 * @param id - Value to check
 * @returns Is valid ObjectId
 */
export function isValidObjectId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * Parse boolean from query string
 * @param value - Query string value
 * @returns Boolean value
 */
export function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Deep clone an object (simple implementation)
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @returns Promise with function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
