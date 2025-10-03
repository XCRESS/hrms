/**
 * Security Utilities - Input Sanitization and XSS Prevention
 *
 * These utilities help prevent XSS (Cross-Site Scripting) attacks by sanitizing
 * user input before rendering it in the DOM.
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * Removes dangerous HTML tags and attributes
 *
 * @param {string} input - The HTML string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeHTML = (input) => {
  if (typeof input !== 'string') return '';

  // Create a temporary div element
  const temp = document.createElement('div');
  temp.textContent = input;
  return temp.innerHTML;
};

/**
 * Sanitize user text input - escapes HTML special characters
 *
 * @param {string} input - Text input to sanitize
 * @returns {string} - Sanitized text
 */
export const sanitizeText = (input) => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize URL to prevent javascript: and data: URI attacks
 *
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL or '#' if dangerous
 */
export const sanitizeURL = (url) => {
  if (typeof url !== 'string') return '#';

  const trimmedURL = url.trim().toLowerCase();

  // Block dangerous protocols
  if (trimmedURL.startsWith('javascript:') ||
      trimmedURL.startsWith('data:') ||
      trimmedURL.startsWith('vbscript:')) {
    return '#';
  }

  return url;
};

/**
 * Sanitize filename to prevent directory traversal attacks
 *
 * @param {string} filename - Filename to sanitize
 * @returns {string} - Sanitized filename
 */
export const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return '';

  return filename
    .replace(/\.\./g, '')  // Remove parent directory references
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // Replace special chars with underscore
};

/**
 * Sanitize object by sanitizing all string properties
 *
 * @param {Object} obj - Object to sanitize
 * @param {Array<string>} excludeKeys - Keys to exclude from sanitization
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj, excludeKeys = []) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, excludeKeys);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Mask sensitive data for display
 *
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of characters to show at the end
 * @returns {string} - Masked value
 */
export const maskSensitiveData = (value, visibleChars = 4) => {
  if (typeof value !== 'string' || value.length === 0) return '';

  if (value.length <= visibleChars) return value;

  const masked = 'X'.repeat(value.length - visibleChars);
  const visible = value.slice(-visibleChars);

  return `${masked}${visible}`;
};

/**
 * Mask Aadhaar number (show only last 4 digits)
 * Format: XXXX XXXX 1234
 *
 * @param {string} aadhaar - Aadhaar number
 * @returns {string} - Masked Aadhaar
 */
export const maskAadhaar = (aadhaar) => {
  if (typeof aadhaar !== 'string') return '';

  const cleaned = aadhaar.replace(/\s/g, '');

  if (cleaned.length !== 12) return aadhaar; // Invalid format, return as-is

  const lastFour = cleaned.slice(-4);
  return `XXXX XXXX ${lastFour}`;
};

/**
 * Mask bank account number (show only last 4 digits)
 *
 * @param {string} accountNumber - Bank account number
 * @returns {string} - Masked account number
 */
export const maskBankAccount = (accountNumber) => {
  if (typeof accountNumber !== 'string') return '';

  if (accountNumber.length <= 4) return accountNumber;

  return `XXXXXXXX${accountNumber.slice(-4)}`;
};

/**
 * Mask PAN number (show only last 4 characters)
 * Format: XXXXX1234
 *
 * @param {string} pan - PAN number
 * @returns {string} - Masked PAN
 */
export const maskPAN = (pan) => {
  if (typeof pan !== 'string') return '';

  if (pan.length !== 10) return pan; // Invalid format

  return `XXXXX${pan.slice(-4)}`;
};

/**
 * Validate and sanitize email
 *
 * @param {string} email - Email to validate
 * @returns {string} - Sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();

  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Sanitize phone number (remove non-numeric characters)
 *
 * @param {string} phone - Phone number
 * @returns {string} - Sanitized phone number
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';

  return phone.replace(/[^0-9+]/g, '');
};

/**
 * Check if string contains potential XSS patterns
 *
 * @param {string} input - String to check
 * @returns {boolean} - True if potentially dangerous
 */
export const containsXSS = (input) => {
  if (typeof input !== 'string') return false;

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Safe text printer - sanitizes text before display
 * Use this function to safely render user-provided text
 *
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text safe for display
 *
 * Example:
 * const displayName = safePrint(employee.firstName);
 */
export const safePrint = (text) => {
  if (typeof text !== 'string') return '';
  return sanitizeText(text);
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeFilename,
  sanitizeObject,
  maskSensitiveData,
  maskAadhaar,
  maskBankAccount,
  maskPAN,
  sanitizeEmail,
  sanitizePhone,
  containsXSS,
  safePrint
};
