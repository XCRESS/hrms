/**
 * Validation schemas for attendance endpoints.
 *
 * Coordinates are validated and coerced here, not in the controller. Whether
 * location is REQUIRED still depends on runtime settings (geofence enforcement
 * and `locationSetting`), so that rule stays in the controller - but the shape,
 * range and numeric coercion belong in the schema.
 */

import { z } from 'zod';
import {
  accuracySchema,
  capturedAtSchema,
  dateStringSchema,
  latitudeSchema,
  longitudeSchema,
} from './common.schemas.js';

const locationFields = {
  latitude: latitudeSchema.nullish(),
  longitude: longitudeSchema.nullish(),
  accuracy: accuracySchema.nullish(),
  capturedAt: capturedAtSchema.nullish(),
};

export const checkInSchema = z.object({
  ...locationFields,
});

export const checkOutSchema = z.object({
  tasks: z.array(z.unknown()).nullish(),
  ...locationFields,
});

/**
 * Attendance record edit.
 *
 * checkIn/checkOut are `.nullish()`, not `.optional()`: the edit form sends an
 * explicit `null` to CLEAR a time, and the controller relies on that
 * distinction (`if (checkIn !== undefined)` means "field was provided";
 * `null` then means "set it to empty"). Using `.optional()` here rejects null
 * outright, and coercing null to undefined would silently drop the clear.
 */
export const updateAttendanceRecordSchema = z.object({
  status: z.string().trim().nullish(),
  checkIn: z.string().nullish(),
  checkOut: z.string().nullish(),
  employeeId: z.string().trim().nullish(),
  date: dateStringSchema.nullish(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type UpdateAttendanceRecordInput = z.infer<typeof updateAttendanceRecordSchema>;
