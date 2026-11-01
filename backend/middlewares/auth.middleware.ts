/**
 * Authentication Middleware - TypeScript
 * JWT-based authentication with role-based access control
 */

import type { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import type { IAuthRequest, UserRole, IJWTPayload } from '../types/index.js';
import { verifyToken, generateTokenFromUser } from '../utils/jwt.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import logger from '../utils/logger.js';

export const REFRESHED_TOKEN_HEADER = 'X-Refreshed-Token';

interface LinkedEmployee {
  _id: mongoose.Types.ObjectId;
  employeeId: string;
  isActive: boolean;
}

/**
 * The ObjectId is the link; employeeId is a renameable label read from the
 * Employee. The string fallback only serves users not yet backfilled
 * (scripts/backfillUserEmployeeRef.ts).
 */
const findLinkedEmployee = async (account: {
  employee?: unknown;
  employeeId?: string | null;
}): Promise<LinkedEmployee | null> => {
  const filter = account.employee
    ? { _id: account.employee }
    : account.employeeId
      ? { employeeId: account.employeeId }
      : null;
  if (!filter) return null;
  return Employee.findOne(filter).select('_id employeeId isActive').lean<LinkedEmployee>();
};

const tokenIsStale = (
  decoded: IJWTPayload,
  current: { role: string; name: string; email: string; employee?: mongoose.Types.ObjectId; employeeId?: string }
): boolean =>
  decoded.role !== current.role ||
  decoded.name !== current.name ||
  decoded.email !== current.email ||
  (decoded.employeeId ?? undefined) !== (current.employeeId ?? undefined) ||
  (decoded.employee ?? undefined) !== (current.employee?.toString() ?? undefined);

/**
 * Extended request interface with optional warning flag
 */
interface IAuthRequestExtended extends IAuthRequest {
  missingEmployeeId?: boolean;
}

/**
 * Authentication middleware factory
 * Creates middleware that verifies JWT and optionally checks roles
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export function authMiddleware(allowedRoles: UserRole[] = []) {
  return async (req: IAuthRequestExtended, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      // 1. Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Access Denied: No Token Provided',
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
          success: false,
          message: 'Access Denied: Invalid Authorization Format. Use "Bearer <token>"',
        });
      }

      const token = parts[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access Denied: Token Missing',
        });
      }

      // 2. Verify JWT token
      let decoded: IJWTPayload;
      try {
        decoded = verifyToken(token);
      } catch (error) {
        throw new AuthenticationError(
          error instanceof Error ? error.message : 'Invalid or expired token'
        );
      }

      // 3. Extract user ID from JWT
      const userId = decoded.userId || decoded.id || (decoded as Record<string, unknown>)._id;
      if (!userId) {
        throw new AuthenticationError('Invalid token payload: missing user ID');
      }

      const account = await User.findById(userId).select('isActive role name email employee employeeId').lean();
      if (!account || !account.isActive) {
        throw new AuthenticationError('Access Denied: User not found or inactive');
      }

      const linkedEmployee = await findLinkedEmployee(account);

      // 4. Identity comes from the DB, not the token, so role changes, renames and
      // unlinks apply without re-login.
      req.user = {
        _id: new mongoose.Types.ObjectId(userId),
        name: account.name,
        email: account.email,
        role: account.role,
        employee: linkedEmployee?._id,
        employeeId: linkedEmployee?.employeeId,
      };

      // 4a. The client reads role and employeeId from the token, so hand it a
      // current one whenever the stored claims have drifted. Set before the role
      // check so a demoted user's 403 still carries it.
      if (tokenIsStale(decoded, req.user)) {
        res.setHeader(REFRESHED_TOKEN_HEADER, generateTokenFromUser({ ...req.user, employee: req.user.employee ?? null }));
      }

      // 5. Role-based access control
      if (allowedRoles.length > 0) {
        if (!allowedRoles.includes(req.user.role)) {
          throw new AuthorizationError(
            `Access Forbidden: This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`
          );
        }
      }

      // 6. Employees must stay linked to an active profile
      if (req.user.role === 'employee') {
        if (!linkedEmployee) {
          throw new AuthorizationError(
            'Access Forbidden: Your account is not linked to an employee profile. Please contact HR.',
            'SESSION_REVOKED'
          );
        }
        if (!linkedEmployee.isActive) {
          throw new AuthorizationError(
            'Access Forbidden: Employee account is deactivated. Please contact HR.',
            'SESSION_REVOKED'
          );
        }
      }

      // 7. Success - proceed to next middleware
      next();
    } catch (err) {
      // Handle our custom errors
      if (err instanceof AuthenticationError || err instanceof AuthorizationError) {
        // Log as warning, not error, to avoid alerting on expected operational issues
        logger.warn(
          {
            err: { message: err.message, code: err.code },
            ip: req.ip,
            path: req.path
          },
          `🔒 Auth denied: ${err.message}`
        );

        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
          code: err.code,
          timestamp: err.timestamp,
        });
      }

      // Unexpected errors - log as error
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error({ err: error }, '🔒 Auth middleware critical error');

      return res.status(401).json({
        success: false,
        message: err instanceof Error ? err.message : 'Authentication failed',
        error: process.env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined,
      });
    }
  };
}

/**
 * Middleware: Require authentication (any authenticated user)
 */
export const requireAuth = authMiddleware([]);

/**
 * Middleware: Require admin role
 */
export const requireAdmin = authMiddleware(['admin']);

/**
 * Middleware: Require admin or HR role
 */
export const requireAdminOrHR = authMiddleware(['admin', 'hr']);

/**
 * Middleware: Require employee role
 */
export const requireEmployee = authMiddleware(['employee']);

/**
 * Middleware: Require specific role(s)
 * @param roles - Array of allowed roles
 */
export function requireRole(...roles: UserRole[]) {
  return authMiddleware(roles);
}

/**
 * Default export for backward compatibility
 */
export default authMiddleware;
