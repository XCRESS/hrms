import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import AssistantAuditLog from '../models/AssistantAuditLog.model.js';
import logger from '../utils/logger.js';
import type { IAuthRequest } from '../types/index.js';

export const ASSISTANT_THREAD_HEADER = 'x-assistant-thread';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** Records successful writes made from an HR Buddy block. Route auth runs later, so the user is read on finish. */
export function assistantAudit(req: Request, res: Response, next: NextFunction): void {
  const thread = req.header(ASSISTANT_THREAD_HEADER);
  if (!thread || !Types.ObjectId.isValid(thread) || READ_METHODS.has(req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    const user = (req as IAuthRequest).user;
    if (!user || res.statusCode >= 400) return;
    const endpoint = req.originalUrl.split('?')[0] ?? req.originalUrl;
    const bodyIds = (req.body as { ids?: unknown } | undefined)?.ids;
    const targetIds = [
      ...endpoint.split('/').filter((segment) => OBJECT_ID.test(segment)),
      ...(Array.isArray(bodyIds) ? bodyIds.filter((id): id is string => typeof id === 'string').slice(0, 500) : []),
    ];
    AssistantAuditLog.create({ user: user._id, thread, method: req.method, endpoint, status: res.statusCode, targetIds }).catch((err: unknown) =>
      logger.error({ err, endpoint }, 'Failed to record HR Buddy audit entry')
    );
  });
  next();
}
