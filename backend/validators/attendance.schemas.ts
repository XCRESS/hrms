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

const coordinateInput = z.unknown().optional();

export const checkInSchema = z.object({
  latitude: coordinateInput,
  longitude: coordinateInput,
  accuracy: coordinateInput,
  capturedAt: z.string().optional(),
});

export const checkOutSchema = z.object({
  tasks: z.array(z.unknown()).optional(),
  latitude: coordinateInput,
  longitude: coordinateInput,
  accuracy: coordinateInput,
  capturedAt: z.string().optional(),
});

export const updateAttendanceRecordSchema = z.object({
  status: z.string().trim().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  employeeId: z.string().trim().optional(),
  date: dateStringSchema.optional(),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type UpdateAttendanceRecordInput = z.infer<typeof updateAttendanceRecordSchema>;
