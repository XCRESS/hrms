/**
 * Common Zod Validation Schemas
 * Reusable schemas for common data types
 */

import { z } from 'zod';

// MongoDB ObjectId validation
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// Email validation
export const emailSchema = z.string().email('Invalid email format').toLowerCase();

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
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Employee ID validation
export const employeeIdSchema = z.string().min(1, 'Employee ID is required').toUpperCase();

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
  buffer: z.instanceof(Buffer).optional(),
  path: z.string().optional(),
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
