/**
 * Zod Validation Middleware
 * Generic middleware for validating request data using Zod schemas.
 *
 * Express 5 note: `req.query` is a getter-only property and cannot be
 * reassigned (doing so throws at runtime). Validated query/params are
 * therefore exposed on `req.validatedQuery` / `req.validatedParams`
 * rather than mutating the originals. `req.body` remains writable.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

export interface ValidationIssue {
  field: string;
  message: string;
}

/** Flatten a ZodError into a list of { field, message }. */
function toIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Shared failure handling so every validator reports errors identically.
 */
function handleFailure(
  error: unknown,
  res: Response,
  context: Record<string, unknown>,
  message: string
): void {
  if (error instanceof z.ZodError) {
    const errors = toIssues(error);

    logger.warn({ errors, ...context }, message);

    errorResponse(res, 'Validation failed', 400, errors);
    return;
  }

  logger.error({ err: error }, 'Unexpected error in validation middleware');
  errorResponse(res, 'Internal server error', 500);
}

/**
 * Validate request body using a Zod schema.
 * On success `req.body` is replaced with the parsed (and coerced) value.
 */
export function validateBody<T>(schema: z.ZodType<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      handleFailure(error, res, { body: req.body }, 'Validation failed for request body');
    }
  };
}

/**
 * Validate request query parameters using a Zod schema.
 * On success the parsed value is available as `req.validatedQuery`.
 */
export function validateQuery<T>(schema: z.ZodType<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.validatedQuery = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      handleFailure(error, res, { query: req.query }, 'Validation failed for query parameters');
    }
  };
}

/**
 * Validate route params using a Zod schema.
 * On success the parsed value is available as `req.validatedParams`.
 */
export function validateParams<T>(schema: z.ZodType<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.validatedParams = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      handleFailure(error, res, { params: req.params }, 'Validation failed for route parameters');
    }
  };
}

export interface RequestSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Validate any combination of body, query and params in a single middleware.
 */
export function validate(schemas: RequestSchemas) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      if (schemas.query) {
        req.validatedQuery = await schemas.query.parseAsync(req.query);
      }

      if (schemas.params) {
        req.validatedParams = await schemas.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      handleFailure(error, res, {}, 'Validation failed');
    }
  };
}

/**
 * Read a validated query object with its inferred type.
 * Use together with `validateQuery(schema)` on the same route.
 */
export function getValidatedQuery<T>(req: Request): T {
  return req.validatedQuery as T;
}

/**
 * Read validated route params with their inferred type.
 * Use together with `validateParams(schema)` on the same route.
 */
export function getValidatedParams<T>(req: Request): T {
  return req.validatedParams as T;
}

export default {
  validateBody,
  validateQuery,
  validateParams,
  validate,
  getValidatedQuery,
  getValidatedParams,
};
