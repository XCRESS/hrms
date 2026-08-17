/**
 * Validation schemas for chat, office locations, policies and task reports.
 */

import { z } from 'zod';
import { longTextSchema, shortTextSchema, dateStringSchema } from './common.schemas.js';

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const chatMessageSchema = z.object({
  // 4000 mirrors the limit the controller already enforced by hand.
  message: z
    .string()
    .trim()
    .min(1, 'Message is required and cannot be empty')
    .max(4000, 'Message is too long. Please keep messages under 4000 characters.'),
  conversation_id: z.string().trim().optional(),
});

export const clearConversationSchema = z.object({
  clear_all: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Office locations
// ---------------------------------------------------------------------------

export const createOfficeLocationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  address: shortTextSchema.optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().positive().max(100_000).optional(),
  isActive: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export const createPolicySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  content: longTextSchema.min(1, 'Content is required'),
  category: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  effectiveDate: dateStringSchema.optional(),
  expiryDate: dateStringSchema.optional(),
  tags: z.array(z.string().trim().max(50)).max(50).optional(),
  acknowledgmentRequired: z.boolean().optional(),
  targetAudience: z.string().trim().max(100).optional(),
  attachments: z.array(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Task reports
// ---------------------------------------------------------------------------

export const submitTaskReportSchema = z.object({
  // Controller filters to non-empty strings; keep the input shape permissive
  // enough that its own "at least one valid task" message still applies.
  tasks: z.array(z.unknown()).min(1, 'Tasks array is required and cannot be empty'),
  date: dateStringSchema.optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ClearConversationInput = z.infer<typeof clearConversationSchema>;
export type CreateOfficeLocationInput = z.infer<typeof createOfficeLocationSchema>;
export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type SubmitTaskReportInput = z.infer<typeof submitTaskReportSchema>;

/** Policy updates: partial of create; controller merges what's present. */
export const updatePolicySchema = createPolicySchema.partial();

/** Office location updates; `coordinates` accepted as an alternative to lat/lng. */
export const updateOfficeLocationSchema = createOfficeLocationSchema.partial().extend({
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------

export const testNotificationSchema = z.object({
  type: z.string().trim().max(50).optional(),
});

export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.url('Invalid subscription endpoint'),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type UpdateOfficeLocationInput = z.infer<typeof updateOfficeLocationSchema>;
export type TestNotificationInput = z.infer<typeof testNotificationSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
