/**
 * Validation schemas for attendance endpoints.
 *
 * Coordinates stay deliberately permissive (`unknown`): the controllers hand
 * them to `parseCoordinates`, which owns coercion, the required/optional rule
 * and the user-facing error messages. Validating them here would duplicate
 * (and could contradict) that logic.
 */

import { z } from 'zod';
import { dateStringSchema } from './common.schemas.js';

const coordinateInput = z.unknown().nullish();

export const checkInSchema = z.object({
  latitude: coordinateInput,
  longitude: coordinateInput,
  accuracy: coordinateInput,
  capturedAt: z.string().nullish(),
});

export const checkOutSchema = z.object({
  tasks: z.array(z.unknown()).nullish(),
  latitude: coordinateInput,
  longitude: coordinateInput,
  accuracy: coordinateInput,
  capturedAt: z.string().nullish(),
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
