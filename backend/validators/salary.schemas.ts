/**
 * Validation schemas for salary structures and salary slips.
 */

import { z } from 'zod';
import { employeeIdSchema } from './common.schemas.js';

/** Money amount: non-negative, bounded to catch typos/overflow. */
const amountSchema = z
  .number()
  .nonnegative('Amount cannot be negative')
  .max(100_000_000, 'Amount is unrealistically large');

export const earningsSchema = z.object({
  basic: amountSchema.refine((v) => v > 0, 'Basic salary is required'),
  hra: amountSchema.optional(),
  conveyance: amountSchema.optional(),
  medical: amountSchema.optional(),
  lta: amountSchema.optional(),
  specialAllowance: amountSchema.optional(),
  mobileAllowance: amountSchema.optional(),
});

export const monthSchema = z.coerce.number().int().min(1, 'Month must be 1-12').max(12, 'Month must be 1-12');
export const yearSchema = z.coerce.number().int().min(2000, 'Year is out of range').max(2100, 'Year is out of range');

export const createSalaryStructureSchema = z.object({
  employeeId: employeeIdSchema,
  earnings: earningsSchema,
});

export const createSalarySlipSchema = z.object({
  employeeId: employeeIdSchema,
  month: monthSchema,
  year: yearSchema,
  earnings: earningsSchema,
  deductions: z
    .object({
      customDeductions: z.array(z.unknown()).optional(),
    })
    .default({}),
  taxRegime: z.enum(['old', 'new']).default('new'),
  enableTaxDeduction: z.boolean().default(true),
});

/** Salary slips move between draft and finalized only. */
export const salarySlipStatusSchema = z.object({
  status: z.enum(['draft', 'finalized']),
});

export const bulkSalarySlipStatusSchema = z.object({
  salarySlips: z
    .array(
      z.object({
        employeeId: employeeIdSchema,
        month: monthSchema,
        year: yearSchema,
      })
    )
    .min(1, 'At least one salary slip must be provided'),
  status: z.enum(['draft', 'finalized']),
});

export type EarningsInput = z.infer<typeof earningsSchema>;
export type CreateSalaryStructureInput = z.infer<typeof createSalaryStructureSchema>;
export type CreateSalarySlipInput = z.infer<typeof createSalarySlipSchema>;
export type SalarySlipStatusInput = z.infer<typeof salarySlipStatusSchema>;
export type BulkSalarySlipStatusInput = z.infer<typeof bulkSalarySlipStatusSchema>;
