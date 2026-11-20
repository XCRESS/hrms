import { z } from 'zod';
import { emailSchema, objectIdSchema } from './common.schemas.js';

export interface LetterMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface LetterNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: LetterNode[];
  marks?: LetterMark[];
  text?: string;
}

export type LetterDoc = LetterNode;

export const FIELD_TYPES = ['text', 'longText', 'date', 'money', 'number'] as const;
export const FIELD_FORMATS = ['long', 'ordinal', 'dotted', 'inr', 'words', 'upper'] as const;
export const FIELD_KEY = /^[a-z]+\.[A-Za-z0-9_]+$/;

const NODE_TYPES = [
  'doc', 'paragraph', 'heading', 'text', 'hardBreak', 'bulletList', 'orderedList', 'listItem',
  'table', 'tableRow', 'tableHeader', 'tableCell', 'pageBreak', 'field', 'horizontalRule',
] as const;

const COLOR = /^([a-z]{3,20}|#[0-9a-f]{6}|rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\))$/i;
const SAFE_HREF = /^(https?:\/\/|mailto:)/i;
const FONT_SIZE = /^\d{1,3}(\.\d{1,4})?(pt|px)$/;
const LINE_HEIGHT = /^\d(\.\d{1,2})?$/;

const opt = <T extends z.ZodType>(schema: T) => schema.nullable().optional();

// Tiptap writes every declared attr (often as null); unknown keys are stripped, unknown types rejected.
const nodeAttrsSchema = z.object({
  textAlign: opt(z.enum(['left', 'center', 'right', 'justify'])),
  level: opt(z.number().int().min(1).max(3)),
  start: opt(z.number().int().min(0).max(1000)),
  type: opt(z.string().max(10)),
  colspan: opt(z.number().int().min(1).max(50)),
  rowspan: opt(z.number().int().min(1).max(50)),
  colwidth: opt(z.array(z.number().int().min(0).max(2000)).max(50)),
  key: opt(z.string().regex(FIELD_KEY, 'Invalid field key')),
  format: opt(z.enum(FIELD_FORMATS)),
  indent: opt(z.number().int().min(0).max(8)),
});

const plainMark = (type: string) => z.object({ type: z.literal(type), attrs: z.record(z.string(), z.unknown()).optional() });

const markSchema = z.discriminatedUnion('type', [
  plainMark('bold'),
  plainMark('italic'),
  plainMark('underline'),
  plainMark('strike'),
  plainMark('superscript'),
  plainMark('subscript'),
  z.object({ type: z.literal('link'), attrs: z.object({ href: z.string().max(2000).regex(SAFE_HREF, 'Links must be http(s) or mailto') }) }),
  z.object({
    type: z.literal('textStyle'),
    attrs: z
      .object({
        color: opt(z.string().regex(COLOR, 'Invalid colour')),
        backgroundColor: opt(z.string().regex(COLOR, 'Invalid highlight colour')),
        fontSize: opt(z.string().regex(FONT_SIZE, 'Invalid text size')),
        lineHeight: opt(z.string().regex(LINE_HEIGHT, 'Invalid line spacing')),
      })
      .optional(),
  }),
]);

export const letterNodeSchema: z.ZodType<LetterNode> = z
  .object({
    type: z.enum(NODE_TYPES),
    attrs: nodeAttrsSchema.optional(),
    text: z.string().max(20_000).optional(),
    marks: z.array(markSchema).max(10).optional(),
    get content() {
      return z.array(letterNodeSchema).max(5000).optional();
    },
  })
  .superRefine((node, ctx) => {
    if (node.type === 'field' && !node.attrs?.key) ctx.addIssue({ code: 'custom', message: 'Field node without a key' });
    if (node.type === 'text' && !node.text) ctx.addIssue({ code: 'custom', message: 'Empty text node' });
  });

export const letterDocSchema = letterNodeSchema.refine((node) => node.type === 'doc', 'Document root must be a doc node');

export const askFieldSchema = z.object({
  key: z.string().regex(/^[a-z][A-Za-z0-9_]*$/, 'Key must start with a letter and use letters, digits or _').max(40),
  label: z.string().trim().min(1).max(80),
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  default: z.string().max(500).optional(),
});

export type AskFieldInput = z.infer<typeof askFieldSchema>;

const marginMm = z.number().min(0).max(80);

export const letterheadDataSchema = z.object({
  marginsMm: z.object({ top: marginMm, right: marginMm, bottom: marginMm, left: marginMm }),
  signatory: z.object({ name: z.string().trim().min(1).max(100), designation: z.string().trim().min(1).max(100) }),
  referencePrefix: z.string().trim().regex(/^[A-Z0-9/-]{1,20}$/, 'Use capitals, digits, / or - (max 20)'),
});

const jsonString = z.string().max(10_000).transform((value, ctx) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    ctx.addIssue({ code: 'custom', message: 'data must be JSON' });
    return z.NEVER;
  }
});

export const letterheadBodySchema = z.object({ data: jsonString.pipe(letterheadDataSchema) });

export type LetterheadBody = z.infer<typeof letterheadBodySchema>;

const askFieldsSchema = z
  .array(askFieldSchema)
  .max(30)
  .refine((fields) => new Set(fields.map((f) => f.key)).size === fields.length, 'Ask field keys must be unique');

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  kind: z.enum(['employee', 'manual']),
  company: objectIdSchema,
  body: letterDocSchema,
  askFields: askFieldsSchema.default([]),
  email: z.object({ subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(5000) }),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.omit({ kind: true }).partial();
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const previewTemplateSchema = createTemplateSchema.pick({ kind: true, company: true, body: true, askFields: true });
export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;

export const templateListQuerySchema = z.object({ all: z.enum(['0', '1']).optional() });
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;

const valuesSchema = z
  .record(z.string().regex(FIELD_KEY), z.string().max(2000))
  .refine((values) => Object.keys(values).length <= 100, 'Too many values');

const recipientSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: emailSchema,
  address: z.string().trim().max(500).optional(),
});

export const createLetterSchema = z.object({
  template: objectIdSchema,
  employee: objectIdSchema.optional(),
  recipient: recipientSchema.optional(),
  values: valuesSchema.default({}),
});
export type CreateLetterInput = z.infer<typeof createLetterSchema>;

export const updateLetterSchema = z.object({
  values: valuesSchema.optional(),
  body: letterDocSchema.nullable().optional(),
});
export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;

export const voidLetterSchema = z.object({ reason: z.string().trim().min(3).max(300) });
export type VoidLetterInput = z.infer<typeof voidLetterSchema>;

export const sendLetterSchema = z.object({ to: emailSchema.optional() });
export type SendLetterInput = z.infer<typeof sendLetterSchema>;

export const letterListQuerySchema = z.object({
  status: z.enum(['draft', 'issued', 'sent', 'void']).optional(),
  kind: z.enum(['employee', 'manual']).optional(),
  employee: objectIdSchema.optional(),
  template: objectIdSchema.optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type LetterListQuery = z.infer<typeof letterListQuerySchema>;

export const importDocxSchema = z.object({ employee: objectIdSchema.optional() });
export type ImportDocxInput = z.infer<typeof importDocxSchema>;

export const companyParamsSchema = z.object({ companyId: objectIdSchema });
export type CompanyParams = z.infer<typeof companyParamsSchema>;

export const letterIdParamsSchema = z.object({ id: objectIdSchema });
export type LetterIdParams = z.infer<typeof letterIdParamsSchema>;
