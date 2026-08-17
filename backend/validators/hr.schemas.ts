/**
 * Validation schemas for announcements, holidays, help desk and the
 * admin-mediated password reset flow.
 */

import { z } from 'zod';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  shortTextSchema,
  longTextSchema,
  dateStringSchema,
} from './common.schemas.js';

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  content: longTextSchema.min(1, 'Content is required'),
  targetAudience: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
});

export const updateAnnouncementSchema = announcementSchema.partial();

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

// `title` and `name` are both accepted; the controller falls back between them.
export const holidaySchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    name: z.string().trim().max(200).optional(),
    date: dateStringSchema,
    isOptional: z.boolean().optional(),
    type: z.string().trim().max(50).optional(),
    description: shortTextSchema.optional(),
  })
  .refine(
    (data) => Boolean(data.title || data.name),
    { message: 'Either title or name is required', path: ['title'] }
  );

export const updateHolidaySchema = z.object({
  title: z.string().trim().max(200).optional(),
  name: z.string().trim().max(200).optional(),
  date: dateStringSchema.optional(),
  isOptional: z.boolean().optional(),
  type: z.string().trim().max(50).optional(),
  description: shortTextSchema.optional(),
});

// ---------------------------------------------------------------------------
// Help desk
// ---------------------------------------------------------------------------

export const submitInquirySchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(300),
  description: longTextSchema.min(1, 'Description is required'),
  category: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
});

// Mirrors HelpStatus in models/Help.model.ts
export const updateInquirySchema = z
  .object({
    status: z.enum(['pending', 'in-progress', 'resolved']).optional(),
    response: longTextSchema.optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.response !== undefined,
    { message: 'Either status or response is required' }
  );

// ---------------------------------------------------------------------------
// Password reset requests (admin-approved flow)
// ---------------------------------------------------------------------------

export const createPasswordResetRequestSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  newPassword: passwordSchema,
});

export const rejectPasswordResetSchema = z.object({
  remarks: shortTextSchema.optional(),
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const uploadDocumentSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee ID is required'),
  documentType: z.string().trim().max(100).default('document'),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type HolidayInput = z.infer<typeof holidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type SubmitInquiryInput = z.infer<typeof submitInquirySchema>;
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;
export type CreatePasswordResetRequestInput = z.infer<typeof createPasswordResetRequestSchema>;
export type RejectPasswordResetInput = z.infer<typeof rejectPasswordResetSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
