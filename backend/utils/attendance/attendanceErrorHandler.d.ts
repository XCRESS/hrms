/**
 * Type declarations for attendanceErrorHandler.js utilities
 * These are stub declarations to allow TypeScript compilation
 * Full migration to TypeScript is planned for future
 */

import type { Request, Response, NextFunction } from 'express';
import type { IAuthRequest } from '../../types/index.js';

export class BusinessLogicError extends Error {
  statusCode: number;
  details?: unknown;
  constructor(message: string, details?: unknown);
}

export class NotFoundError extends Error {
  statusCode: number;
  details?: unknown;
  constructor(message: string, details?: unknown);
}

export function handleAttendanceError(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void;

export function asyncErrorHandler<T extends (req: IAuthRequest, res: Response) => Promise<void>>(
  fn: T,
  context?: string
): (req: IAuthRequest, res: Response, next: NextFunction) => Promise<void>;

export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): void;
