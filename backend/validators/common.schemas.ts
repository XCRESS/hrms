/**
 * Common Zod Validation Schemas
 * Reusable schemas for common data types
 */

import { z } from 'zod';

// MongoDB ObjectId validation
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// Email validation (Zod 4 top-level string format API)
export const emailSchema = z.email('Invalid email format').toLowerCase();

// Password validation
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password cannot exceed 128 characters');

// Phone number validation (10 digits)
export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits');

// Aadhaar number validation (12 digits)
export const aadhaarSchema = z
  .string()
  .regex(/^[0-9]{12}$/, 'Aadhaar number must be exactly 12 digits');

// PAN number validation (Indian format: ABCDE1234F)
export const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format')
  .length(10, 'PAN number must be exactly 10 characters');

// Date validation
export const dateSchema = z.coerce.date();

// Coordinates validation
export const latitudeSchema = z.coerce.number().min(-90).max(90);
export const longitudeSchema = z.coerce.number().min(-180).max(180);

/** GPS accuracy radius in meters, as reported by the Geolocation API. */
export const accuracySchema = z.coerce.number().min(0).max(1_000_000);

export const coordinatesSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

/**
 * How far a client-supplied capture timestamp may sit from server time.
 *
 * `capturedAt` decides which business day an attendance or WFH record lands on,
 * so an unbounded value lets a client backdate or postdate a record at will.
 * The window absorbs ordinary clock skew and the seconds between acquiring a
 * GPS fix and the request landing - nothing more.
 */
export const CAPTURED_AT_MAX_SKEW_MS = 5 * 60 * 1000;

/**
 * An ISO timestamp captured on the client, constrained to roughly "now".
 *
 * Rejects unparseable values and anything outside CAPTURED_AT_MAX_SKEW_MS in
 * either direction. Callers that treat the field as optional should append
 * `.nullish()`.
 */
export const capturedAtSchema = z
  .string()
  .min(1, 'Capture time is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid capture time')
  .refine((value) => {
    const skew = Math.abs(Date.parse(value) - Date.now());
    return skew <= CAPTURED_AT_MAX_SKEW_MS;
  }, 'Capture time is too far from the current time');

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().nullish(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Employee ID validation
export const employeeIdSchema = z.string().min(1, 'Employee ID is required').toUpperCase();

// Human name validation
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name cannot exceed 100 characters');

// Free-text field with a sane upper bound (reasons, comments, descriptions)
export const shortTextSchema = z.string().trim().max(500);
export const longTextSchema = z.string().trim().max(5000);

// Approve/reject decision shared by leave, WFH, regularization and expense flows
export const reviewDecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewComment: shortTextSchema.nullish(),
});

// ISO-ish date string accepted from clients (validated as parseable)
export const dateStringSchema = z
  .string()
  .min(1, 'Date is required')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

// Status validation
export const statusSchema = z.enum(['active', 'inactive', 'pending', 'approved', 'rejected']);

// Role validation
export const roleSchema = z.enum(['admin', 'hr', 'employee']);

// Department validation
export const departmentSchema = z.string().min(1, 'Department is required');

// Gender validation
export const genderSchema = z.enum(['male', 'female', 'other']);

// Marital status validation
export const maritalStatusSchema = z.enum(['single', 'married', 'divorced']);

// Employment type validation
export const employmentTypeSchema = z.enum(['full-time', 'part-time', 'contract', 'intern']);

// Payment mode validation
export const paymentModeSchema = z.enum(['bank-transfer', 'cash', 'cheque']);

// Office address validation (based on your system)
export const officeAddressSchema = z.string().min(1, 'Office address is required');

// Company name validation
export const companyNameSchema = z.string().min(1, 'Company name is required');

// Time string validation (HH:mm format)
export const timeStringSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (use HH:mm)');

// Boolean coercion (handles "true", "false", 1, 0)
export const booleanSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      return val.toLowerCase() === 'true';
    }
    return Boolean(val);
  },
  z.boolean()
);

// File upload validation
export const fileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  size: z.number(),
  buffer: z.instanceof(Buffer).nullish(),
  path: z.string().nullish(),
});

// Image MIME types
export const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Document MIME types
export const documentMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export default {
  objectIdSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  aadhaarSchema,
  panSchema,
  dateSchema,
  coordinatesSchema,
  paginationSchema,
  employeeIdSchema,
  statusSchema,
  roleSchema,
  departmentSchema,
  genderSchema,
  maritalStatusSchema,
  employmentTypeSchema,
  paymentModeSchema,
  officeAddressSchema,
  companyNameSchema,
  timeStringSchema,
  booleanSchema,
  fileSchema,
  imageMimeTypes,
  documentMimeTypes,
};

/**
 * Like `.partial()`, but every field also accepts an explicit `null`.
 *
 * Clients routinely send `null` for a cleared form field. Zod's `.optional()`
 * only permits `undefined`, so a plain `.partial()` would 400 on those bodies.
 */
export function nullishPartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  // Cast the built shape rather than indexing field-by-field: under
  // noUncheckedIndexedAccess, `schema.shape[key]` is `T[K] | undefined`.
  const entries = Object.entries(schema.shape) as [string, z.ZodTypeAny][];
  const shape = Object.fromEntries(
    entries.map(([key, field]) => [key, field.nullish()])
  ) as unknown as { [K in keyof T]: z.ZodOptional<z.ZodNullable<T[K]>> };
  return z.object(shape);
}

/**
 * A defaulted field that also tolerates an explicit `null`.
 *
 * `.default(x)` substitutes when the value is `undefined` but rejects `null`.
 * For a defaulted field, a client sending `null` means "unspecified", so we
 * fold null into undefined and let the default apply.
 */
export function nullableDefault<T extends z.ZodTypeAny>(schema: T, value: z.output<T>) {
  // `.nullish().transform()` rather than `z.preprocess(...)`: preprocess erases
  // the output type to `unknown`, which would push `any`-ish values into callers.
  return schema.nullish().transform((v) => v ?? value) as unknown as z.ZodType<z.output<T>>;
}
