import { z } from 'zod';
import { objectIdSchema, dateStringSchema, emailSchema, longTextSchema } from './common.schemas.js';

export const threadIdParamsSchema = z.object({ id: objectIdSchema });

export const updateThreadSchema = z
  .object({
    title: z.string().trim().min(1).max(200).nullish(),
    archived: z.boolean().nullish(),
  })
  .refine((data) => data.title != null || data.archived != null, { message: 'Nothing to update' });

export const receiptSchema = z.object({
  at: dateStringSchema,
  summary: z.string().trim().min(1).max(500),
  link: z.string().trim().max(200).nullish(),
  committedFields: z.record(z.string(), z.unknown()),
});

export const saveReceiptSchema = z.object({
  messageId: z.string().min(1).max(100),
  toolCallId: z.string().min(1).max(200),
  receipt: receiptSchema,
});

export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;
export type ReceiptInput = z.infer<typeof receiptSchema>;
export type SaveReceiptInput = z.infer<typeof saveReceiptSchema>;

export const chatRequestSchema = z
  .object({
    threadId: objectIdSchema,
    trigger: z.enum(['submit-message', 'regenerate-message']),
    parentId: z.string().min(1).max(100).nullable(),
    message: z
      .object({
        id: z.string().min(1).max(100),
        role: z.literal('user'),
        parts: z.array(z.unknown()).min(1).max(20),
        metadata: z.unknown().optional(),
      })
      .nullish(),
  })
  .refine((body) => body.trigger === 'regenerate-message' || body.message != null, {
    message: 'A message is required',
    path: ['message'],
  });

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

export const sendAssistantEmailSchema = z.object({
  to: z.array(emailSchema).min(1, 'Add at least one recipient').max(20),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: longTextSchema.min(1, 'Body is required'),
  table: z
    .object({
      columns: z.array(z.object({ key: z.string().max(50), label: z.string().max(100) })).min(1).max(12),
      rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(500),
    })
    .nullish(),
});

export type SendAssistantEmailInput = z.infer<typeof sendAssistantEmailSchema>;

export const exportTableSchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(1000).nullish(),
  columns: z
    .array(z.object({ label: z.string().max(100), kind: z.enum(['text', 'number', 'currency', 'date', 'time', 'hours', 'status']).nullish() }))
    .min(1)
    .max(40),
  rows: z.array(z.array(z.union([z.string().max(2000), z.number(), z.null()])).max(40)).max(5000),
});

export type ExportTableInput = z.infer<typeof exportTableSchema>;
