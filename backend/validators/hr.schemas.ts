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
  nullishPartial,
  nullableDefault,
} from './common.schemas.js';

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  content: longTextSchema.min(1, 'Content is required'),
  targetAudience: z.string().trim().max(100).nullish(),
  status: z.string().trim().max(50).nullish(),
});

export const updateAnnouncementSchema = nullishPartial(announcementSchema);

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------

// `title` and `name` are both accepted; the controller falls back between them.
export const holidaySchema = z
  .object({
    title: z.string().trim().max(200).nullish(),
    name: z.string().trim().max(200).nullish(),
    date: dateStringSchema,
    isOptional: z.boolean().nullish(),
    type: z.string().trim().max(50).nullish(),
    description: shortTextSchema.nullish(),
  })
  .refine(
    (data) => Boolean(data.title || data.name),
    { message: 'Either title or name is required', path: ['title'] }
  );

export const updateHolidaySchema = z.object({
  title: z.string().trim().max(200).nullish(),
  name: z.string().trim().max(200).nullish(),
  date: dateStringSchema.nullish(),
  isOptional: z.boolean().nullish(),
  type: z.string().trim().max(50).nullish(),
  description: shortTextSchema.nullish(),
});

// ---------------------------------------------------------------------------
// Help desk
// ---------------------------------------------------------------------------

export const submitInquirySchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(300),
  description: longTextSchema.min(1, 'Description is required'),
  category: z.string().trim().max(100).nullish(),
  priority: z.string().trim().max(50).nullish(),
});

// Mirrors HelpStatus in models/Help.model.ts
export const updateInquirySchema = z
  .object({
    status: z.enum(['pending', 'in-progress', 'resolved']).nullish(),
    response: longTextSchema.nullish(),
  })
  .refine(
    (data) => data.status != null || data.response != null,
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
  remarks: shortTextSchema.nullish(),
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const uploadDocumentSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee ID is required'),
  documentType: nullableDefault(z.string().trim().max(100), 'document'),
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
