/**
 * Type declarations for attendance/index.js utilities
 * These are stub declarations to allow TypeScript compilation
 * Full migration to TypeScript is planned for future
 */

import type { Response } from 'express';
import type { IAuthRequest } from '../../types/index.js';

export function formatResponse(
  success: boolean,
  message: string,
  data?: unknown,
  details?: unknown
): {
  success: boolean;
  message: string;
  data?: unknown;
  details?: unknown;
};

export function validateAdminAccess(req: IAuthRequest, res: Response): boolean;

export function validateEmployeeAccess(
  req: IAuthRequest,
  employeeId: unknown
): Promise<{
  authorized: boolean;
  statusCode?: number;
  error?: unknown;
}>;

export function getEmployeeObjectId(user: unknown): Promise<unknown>;

export function createErrorResponse(
  message: string,
  details?: unknown
): { success: false; message: string; details?: unknown };

export function createSuccessResponse(
  message: string,
  data?: unknown
): { success: true; message: string; data?: unknown };
