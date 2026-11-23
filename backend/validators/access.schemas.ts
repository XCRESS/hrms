import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';
import { GRANTABLE_PERMISSIONS, PERMISSION_KEYS, type Permission } from '../services/access/permissions.js';

export const upsertAccessGrantSchema = z.object({
  userId: objectIdSchema,
  permission: z.enum(GRANTABLE_PERMISSIONS as [Permission, ...Permission[]]),
  /** Empty removes the grant. */
  employeeIds: z.array(objectIdSchema).max(2000),
});

export type UpsertAccessGrantInput = z.infer<typeof upsertAccessGrantSchema>;

export const teamQuerySchema = z.object({
  permission: z.enum(PERMISSION_KEYS as [Permission, ...Permission[]]),
});

export type TeamQuery = z.infer<typeof teamQuerySchema>;
