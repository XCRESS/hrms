/**
 * Zod Validation Middleware
 * Generic middleware for validating request data using Zod schemas
 */

import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';
import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * Validate request body using Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn(
          { errors, body: req.body },
          'Validation failed for request body'
        );

        errorResponse(res, 'Validation failed', 400, errors);
        return;
      }

      logger.error({ err: error }, 'Unexpected error in validation middleware');
      errorResponse(res, 'Internal server error', 500);
    }
  };
}

/**
 * Validate request query parameters using Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn(
          { errors, query: req.query },
          'Validation failed for query parameters'
        );

        errorResponse(res, 'Validation failed', 400, errors);
        return;
      }

      logger.error({ err: error }, 'Unexpected error in validation middleware');
      errorResponse(res, 'Internal server error', 500);
    }
  };
}

/**
 * Validate request params using Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn(
          { errors, params: req.params },
          'Validation failed for route parameters'
        );

        errorResponse(res, 'Validation failed', 400, errors);
        return;
      }

      logger.error({ err: error }, 'Unexpected error in validation middleware');
      errorResponse(res, 'Internal server error', 500);
    }
  };
}

/**
 * Validate all request parts (body, query, params) using Zod schemas
 */
export function validate<T extends {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}>(schemas: T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }

      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn(
          { errors },
          'Validation failed'
        );

        errorResponse(res, 'Validation failed', 400, errors);
        return;
      }

      logger.error({ err: error }, 'Unexpected error in validation middleware');
      errorResponse(res, 'Internal server error', 500);
    }
  };
}

export default {
  validateBody,
  validateQuery,
  validateParams,
  validate,
};
