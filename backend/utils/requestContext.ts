/**
 * Request Context - Centralized user context management
 * Provides convenient methods and caching for user-related operations
 */

import type { Types } from 'mongoose';
import type { IAuthUser } from '../types/index.js';
import Employee from '../models/Employee.model.js';

export class RequestContext {
  private _employeeObjectIdCache?: Types.ObjectId | null;

  constructor(private user: IAuthUser) {}

  /**
   * Get user's MongoDB ObjectId
   */
  get userId(): Types.ObjectId {
    return this.user._id;
  }

  /**
   * Get user's ID as string (for logging, external APIs, etc.)
   */
  get userIdString(): string {
    return this.user._id.toString();
  }

  /**
   * Get user's name
   */
  get userName(): string {
    return this.user.name;
  }

  /**
   * Get user's email
   */
  get userEmail(): string {
    return this.user.email;
  }

  /**
   * Get user's role
   */
  get userRole(): string {
    return this.user.role;
  }

  /**
   * Get user's employee ID (string identifier like "EMP001")
   */
  get employeeIdString(): string | undefined {
    return this.user.employeeId;
  }

  /**
   * Get Employee document ObjectId with caching
   * This prevents repeated DB lookups for the same employee
   */
  async getEmployeeObjectId(): Promise<Types.ObjectId | null> {
    // Return cached value if already fetched
    if (this._employeeObjectIdCache !== undefined) {
      return this._employeeObjectIdCache;
    }

    // If user has employee ObjectId reference, use it
    if (this.user.employee) {
      this._employeeObjectIdCache = this.user.employee;
      return this._employeeObjectIdCache;
    }

    // Otherwise, look up by employeeId string
    if (this.user.employeeId) {
      const employee = await Employee.findOne({ employeeId: this.user.employeeId }).select('_id').lean();
      this._employeeObjectIdCache = employee?._id || null;
      return this._employeeObjectIdCache;
    }

    // Fallback: look up by email
    if (this.user.email) {
      const employee = await Employee.findOne({ email: this.user.email }).select('_id').lean();
      this._employeeObjectIdCache = employee?._id || null;
      return this._employeeObjectIdCache;
    }

    this._employeeObjectIdCache = null;
    return null;
  }

  /**
   * Check if user has an employee profile
   */
  hasEmployeeProfile(): boolean {
    return !!(this.user.employee || this.user.employeeId);
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.user.role === 'admin';
  }

  /**
   * Check if user is HR
   */
  isHR(): boolean {
    return this.user.role === 'hr';
  }

  /**
   * Check if user is employee
   */
  isEmployee(): boolean {
    return this.user.role === 'employee';
  }

  /**
   * Check if user has one of the specified roles
   */
  hasRole(...roles: string[]): boolean {
    return roles.includes(this.user.role);
  }
}

/**
 * Extend Express Request to include context
 */
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}
