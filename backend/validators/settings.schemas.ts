/**
 * Validation schemas for settings and department management.
 *
 * Settings sections stay as open records: the controllers merge them into the
 * Settings document, where the Mongoose schema is the source of truth for the
 * per-field shape. Validating the envelope still blocks non-object payloads.
 */

import { z } from 'zod';
import { employeeIdSchema, nameSchema } from './common.schemas.js';

const settingsSection = z.record(z.string(), z.unknown());

export const updateGlobalSettingsSchema = z
  .object({
    attendance: settingsSection.nullish(),
    notifications: settingsSection.nullish(),
    general: settingsSection.nullish(),
  })
  .refine(
    (data) => Boolean(data.attendance || data.notifications || data.general),
    { message: 'At least one settings section is required' }
  );

export const updateDepartmentSettingsSchema = z
  .object({
    attendance: settingsSection.nullish(),
    general: settingsSection.nullish(),
  })
  .refine(
    (data) => Boolean(data.attendance || data.general),
    { message: 'At least one settings section is required' }
  );

export const createDepartmentSchema = z.object({
  name: nameSchema,
});

export const renameDepartmentSchema = z.object({
  newName: nameSchema,
});

export const assignEmployeeToDepartmentSchema = z.object({
  employeeId: employeeIdSchema,
});

export type UpdateGlobalSettingsInput = z.infer<typeof updateGlobalSettingsSchema>;
export type UpdateDepartmentSettingsInput = z.infer<typeof updateDepartmentSettingsSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type RenameDepartmentInput = z.infer<typeof renameDepartmentSchema>;
export type AssignEmployeeToDepartmentInput = z.infer<typeof assignEmployeeToDepartmentSchema>;
