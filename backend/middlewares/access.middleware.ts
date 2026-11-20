import type { NextFunction, Response } from 'express';
import type { IAuthRequest } from '../types/index.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import { PERMISSIONS, resolveScope, type Permission } from '../services/access/index.js';

/**
 * Runs after `authMiddleware()`. Rejects users whose scope is empty and puts
 * the scope on `req.accessScope`; the handler must filter by it.
 */
export function requirePermission(permission: Permission) {
  return async (req: IAuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) throw new AuthenticationError();

    const scope = await resolveScope(req.user, permission);
    if (scope.kind === 'some' && scope.ids.length === 0) {
      throw new AuthorizationError(`Access Forbidden: you don't have "${PERMISSIONS[permission].label}" access`);
    }

    req.accessScope = scope;
    next();
  };
}
