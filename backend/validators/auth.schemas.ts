/**
 * Auth Validation Schemas using Zod
 */

import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  roleSchema,
  nameSchema,
  employeeIdSchema,
  objectIdSchema,
  nullableDefault,
} from './common.schemas.js';

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Register schema
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: nullableDefault(roleSchema, 'employee'),
  employeeId: employeeIdSchema.nullish(),
});

// Link a user account to an employee profile
export const updateEmployeeIdSchema = z.object({
  userId: objectIdSchema,
  employeeId: employeeIdSchema,
});

// Unlink a user account from its employee profile
export const unlinkEmployeeSchema = z.object({
  userId: objectIdSchema,
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateEmployeeIdInput = z.infer<typeof updateEmployeeIdSchema>;
export type UnlinkEmployeeInput = z.infer<typeof unlinkEmployeeSchema>;

export default {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateEmployeeIdSchema,
  unlinkEmployeeSchema,
};
