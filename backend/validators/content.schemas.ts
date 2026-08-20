/**
 * Validation schemas for chat, office locations, policies and task reports.
 */

import { z } from 'zod';
import { longTextSchema, shortTextSchema, dateStringSchema, nullishPartial, nullableDefault, latitudeSchema, longitudeSchema } from './common.schemas.js';
import {
  MIN_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
} from '../models/OfficeLocation.model.js';

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
  conversation_id: z.string().trim().nullish(),
});

export const clearConversationSchema = z.object({
  clear_all: z.boolean().nullish(),
});

// ---------------------------------------------------------------------------
// Office locations
// ---------------------------------------------------------------------------

export const createOfficeLocationSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  address: shortTextSchema.nullish(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  // Bounds match the OfficeLocation model. They previously did not, so a radius
  // the schema accepted could still fail Mongoose validation as a 500.
  radius: z.coerce
    .number()
    .min(MIN_GEOFENCE_RADIUS_METERS)
    .max(MAX_GEOFENCE_RADIUS_METERS)
    .nullish(),
  isActive: nullableDefault(z.boolean(), true),
});

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export const createPolicySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  content: longTextSchema.min(1, 'Content is required'),
  category: z.string().trim().max(100).nullish(),
  priority: z.string().trim().max(50).nullish(),
  effectiveDate: dateStringSchema.nullish(),
  expiryDate: dateStringSchema.nullish(),
  tags: z.array(z.string().trim().max(50)).max(50).nullish(),
  acknowledgmentRequired: z.boolean().nullish(),
  targetAudience: z.string().trim().max(100).nullish(),
  attachments: z.array(z.unknown()).nullish(),
});

// ---------------------------------------------------------------------------
// Task reports
// ---------------------------------------------------------------------------

export const submitTaskReportSchema = z.object({
  // Controller filters to non-empty strings; keep the input shape permissive
  // enough that its own "at least one valid task" message still applies.
  tasks: z.array(z.unknown()).min(1, 'Tasks array is required and cannot be empty'),
  date: dateStringSchema.nullish(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ClearConversationInput = z.infer<typeof clearConversationSchema>;
export type CreateOfficeLocationInput = z.infer<typeof createOfficeLocationSchema>;
export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type SubmitTaskReportInput = z.infer<typeof submitTaskReportSchema>;

/** Policy updates: partial of create; controller merges what's present. */
export const updatePolicySchema = nullishPartial(createPolicySchema);

/** Office location updates; `coordinates` accepted as an alternative to lat/lng. */
export const updateOfficeLocationSchema = nullishPartial(createOfficeLocationSchema).extend({
  coordinates: z
    .object({
      latitude: latitudeSchema,
      longitude: longitudeSchema,
    })
    .nullish(),
});

// ---------------------------------------------------------------------------
// Push notifications
// ---------------------------------------------------------------------------

export const testNotificationSchema = z.object({
  type: z.string().trim().max(50).nullish(),
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

// Endpoint identifies the single device to drop. Omitted means "this user's
// devices", which is what a sign-out style unsubscribe wants.
export const pushUnsubscribeSchema = z.object({
  endpoint: z.url('Invalid subscription endpoint').nullish(),
});

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type UpdateOfficeLocationInput = z.infer<typeof updateOfficeLocationSchema>;
export type TestNotificationInput = z.infer<typeof testNotificationSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type PushUnsubscribeInput = z.infer<typeof pushUnsubscribeSchema>;
