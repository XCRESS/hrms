/**
 * Authentication Middleware - TypeScript
 * JWT-based authentication with role-based access control
 */

import type { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import type { IAuthRequest, UserRole, IJWTPayload } from '../types/index.js';
import { verifyToken } from '../utils/jwt.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import { RequestContext } from '../utils/requestContext.js';
import User from '../models/User.model.js';
import Employee from '../models/Employee.model.js';
import logger from '../utils/logger.js';

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

      // 3. Extract user data from JWT (no DB query!)
      const userId = decoded.userId || decoded.id || (decoded as Record<string, unknown>)._id;
      if (!userId) {
        throw new AuthenticationError('Invalid token payload: missing user ID');
      }

      // Validate user is still active (minimal DB query - only checks isActive field)
      const userStatus = await User.findById(userId).select('isActive').lean();
      if (!userStatus || !userStatus.isActive) {
        throw new AuthenticationError('Access Denied: User not found or inactive');
      }

      // 4. Use JWT data directly (much faster than full document fetch!)
      req.user = {
        _id: new mongoose.Types.ObjectId(userId),
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        employee: decoded.employee ? new mongoose.Types.ObjectId(decoded.employee) : undefined,
        employeeId: decoded.employeeId,
      };

      // 4a. Create request context for convenient access
      req.context = new RequestContext(req.user);

      // 5. Role-based access control
      if (allowedRoles.length > 0) {
        if (!allowedRoles.includes(req.user.role)) {
          throw new AuthorizationError(
            `Access Forbidden: This endpoint requires one of the following roles: ${allowedRoles.join(', ')}`
          );
        }
      }

      // 6. Additional check for employee role
      if (req.user.role === 'employee') {
        if (req.user.employeeId) {
          // Verify employee profile is active
          const employee = await Employee.findOne({
            employeeId: req.user.employeeId,
            isActive: true,
          });

          if (!employee) {
            throw new AuthorizationError(
              'Access Forbidden: Employee account is deactivated. Please contact HR.'
            );
          }
        } else {
          // Warning: Employee user without employeeId
          req.missingEmployeeId = true;
          logger.warn(`⚠️  User ${req.user._id} has role 'employee' but no employeeId assigned`);
        }
      }

      // 7. Success - proceed to next middleware
      next();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error({ err: error }, '🔒 Auth middleware error');

      // Handle our custom errors
      if (err instanceof AuthenticationError || err instanceof AuthorizationError) {
        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
          code: err.code,
          timestamp: err.timestamp,
        });
      }

      // Handle unexpected errors
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
