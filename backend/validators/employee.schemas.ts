/**
 * Validation schemas for employee records.
 *
 * Optional identity fields (Aadhaar/PAN/phone) accept an empty string as well
 * as a valid value, because the existing create form submits blank strings for
 * fields the user left untouched.
 */

import { z } from 'zod';
import {
  emailSchema,
  employeeIdSchema,
  nameSchema,
  shortTextSchema,
  dateStringSchema,
  nullishPartial,
} from './common.schemas.js';

/** Allow "" (field left blank) alongside a valid value. */
const optionalOrBlank = <T extends z.ZodType<string>>(schema: T) =>
  z.union([schema, z.literal('')]).nullish();

const phoneOrBlank = optionalOrBlank(
  z.string().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits')
);

export const createEmployeeSchema = z.object({
  employeeId: employeeIdSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,

  gender: z.string().trim().max(20).nullish(),
  dateOfBirth: optionalOrBlank(dateStringSchema),
  maritalStatus: z.string().trim().max(20).nullish(),
  phone: phoneOrBlank,
  address: shortTextSchema.nullish(),

  aadhaarNumber: optionalOrBlank(
    z.string().regex(/^[0-9]{12}$/, 'Aadhaar number must be exactly 12 digits')
  ),
  panNumber: optionalOrBlank(
    z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number format')
  ),

  fatherName: z.string().trim().max(100).nullish(),
  motherName: z.string().trim().max(100).nullish(),
  fatherPhone: phoneOrBlank,
  motherPhone: phoneOrBlank,

  officeAddress: z.string().trim().max(200).nullish(),
  companyName: z.string().trim().max(100).nullish(),
  department: z.string().trim().max(100).nullish(),
  position: z.string().trim().max(100).nullish(),

  paymentMode: z.string().trim().max(50).nullish(),
  bankName: z.string().trim().max(100).nullish(),
  bankAccountNumber: optionalOrBlank(
    z.string().regex(/^[0-9]{9,18}$/, 'Bank account number must be 9-18 digits')
  ),
  bankIFSCCode: optionalOrBlank(
    z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format')
  ),

  employmentType: z.string().trim().max(50).nullish(),
  reportingSupervisor: z.string().trim().max(100).nullish(),
  joiningDate: optionalOrBlank(dateStringSchema),
  emergencyContactName: z.string().trim().max(100).nullish(),
  emergencyContactNumber: phoneOrBlank,
});

/**
 * Updates are a partial of create. The controller merges whatever is present,
 * so unknown keys are stripped rather than rejected.
 */
export const updateEmployeeSchema = nullishPartial(createEmployeeSchema);

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
