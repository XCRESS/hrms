/**
 * Validation schemas for employee request flows:
 * leave, work-from-home, regularization and expenses.
 */

import { z } from 'zod';
import {
  objectIdSchema,
  shortTextSchema,
  dateStringSchema,
  reviewDecisionSchema,
  capturedAtSchema,
  latitudeSchema,
  longitudeSchema,
} from './common.schemas.js';

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------

export const createLeaveSchema = z
  .object({
    leaveMode: z.enum(['single', 'multi']).nullish(),
    leaveType: z.string().trim().min(1, 'Leave type is required'),
    startDate: dateStringSchema.nullish(),
    endDate: dateStringSchema.nullish(),
    // Retained for backward compatibility with older clients
    date: dateStringSchema.nullish(),
    reason: shortTextSchema.min(1, 'Reason is required'),
  })
  .refine(
    (data) => Boolean(data.date || data.startDate),
    { message: 'Either date or startDate is required', path: ['startDate'] }
  );

// Controller only ever accepts approved/rejected, so the schema mirrors that.
export const updateLeaveStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

// ---------------------------------------------------------------------------
// Work from home
// ---------------------------------------------------------------------------

export const createWFHRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Please provide a detailed reason (at least 10 characters)')
    .max(500),
  latitude: latitudeSchema.nullish(),
  longitude: longitudeSchema.nullish(),
  /**
   * Constrained to ~now, not merely parseable: the controller derives
   * `requestDate` from this value, so an unbounded timestamp would let an
   * employee file a WFH request against any day - sidestepping the
   * one-active-request-per-date rule and backdating attendance.
   */
  capturedAt: capturedAtSchema,
});

export const reviewWFHRequestSchema = reviewDecisionSchema;

// ---------------------------------------------------------------------------
// Regularization
// ---------------------------------------------------------------------------

export const createRegularizationSchema = z.object({
  date: dateStringSchema,
  requestedCheckIn: z.string().trim().nullish(),
  requestedCheckOut: z.string().trim().nullish(),
  reason: shortTextSchema.min(1, 'Reason is required'),
});

export const reviewRegularizationSchema = reviewDecisionSchema;

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

const expenseAmountSchema = z
  .number()
  .positive('Amount must be greater than zero')
  .max(10_000_000, 'Amount is unrealistically large');

export const createExpenseSchema = z.object({
  date: dateStringSchema,
  item: z.string().trim().min(1, 'Item is required').max(200),
  amount: expenseAmountSchema,
});

export const updateExpenseSchema = z
  .object({
    date: dateStringSchema.nullish(),
    item: z.string().trim().min(1).max(200).nullish(),
    amount: expenseAmountSchema.nullish(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value != null),
    { message: 'At least one field must be provided' }
  );

export const reviewExpenseSchema = reviewDecisionSchema;

export const bulkExpenseStatusSchema = reviewDecisionSchema.extend({
  ids: z.array(objectIdSchema).min(1, 'At least one expense must be selected'),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
export type CreateWFHRequestInput = z.infer<typeof createWFHRequestSchema>;
export type ReviewWFHRequestInput = z.infer<typeof reviewWFHRequestSchema>;
export type CreateRegularizationInput = z.infer<typeof createRegularizationSchema>;
export type ReviewRegularizationInput = z.infer<typeof reviewRegularizationSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ReviewExpenseInput = z.infer<typeof reviewExpenseSchema>;
export type BulkExpenseStatusInput = z.infer<typeof bulkExpenseStatusSchema>;
