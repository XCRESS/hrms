import { z } from 'zod';
import { objectIdSchema } from './common.schemas.js';
import { GRANTABLE_PERMISSIONS, type Permission } from '../services/access/permissions.js';

export const upsertAccessGrantSchema = z.object({
  userId: objectIdSchema,
  permission: z.enum(GRANTABLE_PERMISSIONS as [Permission, ...Permission[]]),
  /** Empty removes the grant. */
  employeeIds: z.array(objectIdSchema).max(2000),
});

export type UpsertAccessGrantInput = z.infer<typeof upsertAccessGrantSchema>;
