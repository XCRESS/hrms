/**
 * JWT Utility Functions
 * Type-safe JWT token generation and verification
 */

import jwt from 'jsonwebtoken';
import type { IJWTPayload } from '../types/index.js';
import { AuthenticationError } from './errors.js';
import logger from './logger.js';

/**
 * Ensure JWT_SECRET is configured
 * @throws Error if JWT_SECRET is not set
 */
function ensureJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Generate JWT token with payload
 * @param payload - JWT payload data
 * @param expiresIn - Token expiration time (default: "7d")
 * @returns Signed JWT token
 * @throws Error if token generation fails
 */
export function generateToken(
  payload: Omit<IJWTPayload, 'iat' | 'exp'>,
  expiresIn: string | number = '7d'
): string {
  try {
    const secret = ensureJWTSecret();
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  } catch (error) {
    logger.error({ err: error }, 'Token generation error');
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify JWT token and return payload
 * @param token - JWT token string
 * @returns Decoded JWT payload
 * @throws AuthenticationError if verification fails
 */
export function verifyToken(token: string): IJWTPayload {
  try {
    const secret = ensureJWTSecret();
    const decoded = jwt.verify(token, secret);

    // Ensure decoded token matches our IJWTPayload interface
    if (typeof decoded === 'string') {
      throw new AuthenticationError('Invalid token format');
    }

    return decoded as IJWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else {
      logger.error({ err: error }, 'Token verification error');
      throw new AuthenticationError('Failed to verify token');
    }
  }
}

/**
 * Decode JWT token without verification (useful for debugging)
 * @param token - JWT token string
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): IJWTPayload | null {
  try {
    const decoded = jwt.decode(token);
    if (typeof decoded === 'string' || decoded === null) {
      return null;
    }
    return decoded as IJWTPayload;
  } catch (error) {
    logger.error({ err: error }, 'Token decode error');
    return null;
  }
}

/**
 * Refresh JWT token (generate new token with same payload but updated expiration)
 * @param token - Existing JWT token
 * @param expiresIn - New expiration time (default: "7d")
 * @returns New JWT token
 * @throws AuthenticationError if token is invalid
 */
export function refreshToken(token: string, expiresIn: string = '7d'): string {
  try {
    const payload = verifyToken(token);

    // Remove jwt-specific fields before re-signing
    const { iat, exp, ...cleanPayload } = payload;

    return generateToken(cleanPayload, expiresIn);
  } catch (error) {
    throw new AuthenticationError('Failed to refresh token');
  }
}

/**
 * Check if token is expired without throwing
 * @param token - JWT token string
 * @returns True if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}

/**
 * Generate token from User document
 * @param user - User document from database
 * @param expiresIn - Token expiration time (default: "7d")
 * @returns Signed JWT token with user data
 */
export function generateTokenFromUser(
  user: {
    _id: { toString(): string };
    name: string;
    email: string;
    role: string;
    employee?: { toString(): string } | null;
    employeeId?: string;
  },
  expiresIn: string = '7d'
): string {
  const payload: Omit<IJWTPayload, 'iat' | 'exp'> = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as any,
    employee: user.employee?.toString(),
    employeeId: user.employeeId,
  };

  return generateToken(payload, expiresIn);
}

/**
 * Regenerate token with updated user data
 * Used when user profile is updated (name, email, role, etc.)
 * @param userId - User ID to fetch fresh data for
 * @returns New JWT token with fresh user data
 */
export async function regenerateTokenForUser(userId: string): Promise<string> {
  const User = (await import('../models/User.model.js')).default;
  
  const user = await User.findById(userId)
    .select('_id name email role employee employeeId')
    .lean();

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  return generateTokenFromUser(user);
}
