/**
 * Password Hashing Utility - Argon2
 * Secure password hashing using Argon2 (winner of Password Hashing Competition)
 *
 * Benefits over bcrypt:
 * - Resistant to GPU/ASIC attacks
 * - Configurable memory cost (prevents parallel attacks)
 * - Faster in Node.js (native implementation)
 * - Recommended by OWASP for password storage
 */

import argon2 from 'argon2';
import logger from './logger.js';

/**
 * Argon2 configuration options
 * Based on OWASP recommendations
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id, // Hybrid: resistant to both side-channel and GPU attacks
  memoryCost: 19456, // 19 MB (recommended for server-side)
  timeCost: 2, // Number of iterations
  parallelism: 1, // Number of parallel threads
  hashLength: 32, // Length of the hash in bytes
} as const;

/**
 * Hash a password using Argon2
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password
 * @throws Error if password is empty or hashing fails
 *
 * @example
 * ```ts
 * const hashedPassword = await hashPassword('user_password123');
 * // Returns: $argon2id$v=19$m=19456,t=2,p=1$...
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  // Validation
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  if (password.length > 128) {
    throw new Error('Password cannot exceed 128 characters');
  }

  try {
    const hash = await argon2.hash(password, ARGON2_OPTIONS);
    return hash;
  } catch (error) {
    logger.error({ err: error }, 'Password hashing failed');
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a password against a hash
 *
 * @param hash - Previously hashed password (from database)
 * @param password - Plain text password to verify
 * @returns Promise resolving to true if password matches, false otherwise
 *
 * @example
 * ```ts
 * const isValid = await verifyPassword(storedHash, userInputPassword);
 * if (isValid) {
 *   // Password is correct
 * }
 * ```
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  // Validation
  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  if (!password || typeof password !== 'string') {
    return false; // Don't throw error for security reasons
  }

  try {
    const isValid = await argon2.verify(hash, password);
    return isValid;
  } catch (error) {
    logger.error({ err: error }, 'Password verification failed');
    return false; // Return false instead of throwing for security
  }
}

/**
 * Check if a hash needs to be rehashed (updated to newer security parameters)
 *
 * @param hash - Password hash to check
 * @returns Promise resolving to true if rehash is needed
 *
 * @example
 * ```ts
 * if (await needsRehash(user.password)) {
 *   user.password = await hashPassword(plainPassword);
 *   await user.save();
 * }
 * ```
 */
export async function needsRehash(hash: string): Promise<boolean> {
  if (!hash || typeof hash !== 'string') {
    return true;
  }

  try {
    const needsUpdate = await argon2.needsRehash(hash, ARGON2_OPTIONS);
    return needsUpdate;
  } catch (error) {
    logger.error({ err: error }, 'Hash check failed');
    return true; // Assume rehash is needed on error
  }
}

/**
 * Generate a random password
 * Useful for temporary passwords or password resets
 *
 * @param length - Password length (default: 12)
 * @returns Random password string
 *
 * @example
 * ```ts
 * const tempPassword = generateRandomPassword(16);
 * // Returns: 'aB3!xY9@zK2#mN5&'
 * ```
 */
export function generateRandomPassword(length: number = 12): string {
  if (length < 8) {
    throw new Error('Password length must be at least 8 characters');
  }

  if (length > 128) {
    throw new Error('Password length cannot exceed 128 characters');
  }

  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @returns Object with validation result and optional error message
 *
 * @example
 * ```ts
 * const validation = validatePasswordStrength('weak');
 * if (!validation.isValid) {
 *   console.log(validation.message); // "Password must be at least 6 characters"
 * }
 * ```
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message?: string;
  score: number; // 0-4 (weak to strong)
} {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required', score: 0 };
  }

  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters', score: 0 };
  }

  if (password.length > 128) {
    return { isValid: false, message: 'Password cannot exceed 128 characters', score: 0 };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexity checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++; // Mixed case
  if (/\d/.test(password)) score++; // Contains numbers
  if (/[^a-zA-Z0-9]/.test(password)) score++; // Contains special characters

  // Common password check (basic)
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, message: 'Password is too common', score: 0 };
  }

  // Score mapping
  const scoreMap: Record<number, { isValid: boolean; message?: string }> = {
    0: { isValid: false, message: 'Password is too weak' },
    1: { isValid: false, message: 'Password is too weak' },
    2: { isValid: true, message: 'Password strength: Fair' },
    3: { isValid: true, message: 'Password strength: Good' },
    4: { isValid: true, message: 'Password strength: Strong' },
    5: { isValid: true, message: 'Password strength: Very Strong' },
  };

  const mappedScore = Math.min(score, 5);
  const result = scoreMap[mappedScore];

  return {
    isValid: result?.isValid ?? false,
    message: result?.message,
    score: Math.min(score, 4),
  };
}

/**
 * Default export for backward compatibility
 */
export default {
  hashPassword,
  verifyPassword,
  needsRehash,
  generateRandomPassword,
  validatePasswordStrength,
};
