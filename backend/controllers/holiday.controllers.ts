import type { HolidayInput, UpdateHolidayInput } from '../validators/hr.schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Request, Response } from 'express';
import Holiday from '../models/Holiday.model.js';
import NotificationService from '../services/notificationService.js';
import { parseISTDateString, toIST } from '../utils/timezone.js';
import type { IHoliday } from '../types/index.js';

// ============================================================================
// HELPER FUNCTIONS - Extracted to avoid code duplication
// ============================================================================

/**
 * Transform a holiday document to match frontend expectations
 * Maps model fields (name, type) to frontend fields (title, isOptional)
 */
/** Only the fields this mapper reads, so it accepts lean POJOs and documents alike. */
type HolidayResponseFields = Pick<
  IHoliday,
  '_id' | 'name' | 'date' | 'description' | 'type' | 'isActive' | 'createdAt' | 'updatedAt'
>;

const transformHolidayForResponse = (holiday: HolidayResponseFields) => ({
  _id: holiday._id,
  title: holiday.name,
  date: holiday.date,
  description: holiday.description,
  isOptional: holiday.type === 'optional',
  type: holiday.type,
  isActive: holiday.isActive,
  createdAt: holiday.createdAt,
  updatedAt: holiday.updatedAt,
});

/**
 * Parse and validate a date string, returning UTC midnight for consistent storage
 * MongoDB stores dates in UTC, so we use UTC midnight to ensure
 * toISOString().split('T')[0] returns the correct date everywhere
 * @throws Error with user-friendly message if date is invalid
 */
const parseHolidayDate = (dateString: string): Date => {
  const parsedDate = parseISTDateString(dateString);
  const year = parsedDate.year;
  const month = parsedDate.month;
  const day = parsedDate.day;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

/**
 * Determine holiday type from request body
 * Supports both 'type' (preferred) and 'isOptional' (backward compatibility)
 */
const determineHolidayType = (type?: string, isOptional?: boolean): string => {
  if (type) return type;
  return isOptional ? 'optional' : 'public';
};

const announceHoliday = (title: string, date: Date): void => {
  if (toIST(date) < toIST(new Date()).startOf('day')) return;
  void NotificationService.notifyAudience('all', 'holiday_added', {
    title,
    date: toIST(date).toFormat('cccc, d LLLL'),
  });
};

/**
 * Extract holiday name from request body
 * Supports both 'name' (preferred) and 'title' (backward compatibility)
 */
const getHolidayName = (name?: string, title?: string): string | undefined => {
  return name || title;
};

// ============================================================================
// CONTROLLERS
// ============================================================================

export const createHoliday = asyncHandler(async (req: Request, res: Response) => {
  const { title, name, date, isOptional, type, description } = req.body as HolidayInput;
  const holidayName = getHolidayName(name ?? undefined, title ?? undefined);

  if (!holidayName || !date) {
    res.status(400).json({ success: false, message: 'Name/Title and date are required for a holiday.' });
    return;
  }

  // Parse and validate date
  let holidayDate: Date;
  try {
    holidayDate = parseHolidayDate(date);
  } catch (dateError) {
    const error = dateError instanceof Error ? dateError : new Error('Unknown date parsing error');
    res.status(400).json({
      success: false,
      message: 'Invalid date format. Please use YYYY-MM-DD format.',
      error: error.message,
    });
    return;
  }

  const holiday = await Holiday.create({
    name: holidayName,
    date: holidayDate,
    type: determineHolidayType(type ?? undefined, isOptional ?? undefined),
    description: description ?? undefined
  });

  announceHoliday(holidayName, holidayDate);

  res.status(201).json({
    success: true,
    message: 'Holiday created successfully',
    holiday: transformHolidayForResponse(holiday)
  });
}, { onDuplicate: 'A holiday with this date already exists.' });

export const getHolidays = asyncHandler(async (req: Request, res: Response) => {
  const holidays = await Holiday.find().sort({ date: 1 }).lean();
  const transformedHolidays = holidays.map(transformHolidayForResponse);
  res.status(200).json({ success: true, holidays: transformedHolidays });
});

export const updateHoliday = asyncHandler(async (req: Request, res: Response) => {
  const holidayId = req.params.id;
  const { title, name, date, isOptional, type, description } = req.body as UpdateHolidayInput;

  if (Object.keys(req.body).length === 0) {
    res.status(400).json({ success: false, message: 'No update data provided.' });
    return;
  }

  const holidayToUpdate = await Holiday.findById(holidayId);
  if (!holidayToUpdate) {
    res.status(404).json({ success: false, message: 'Holiday not found' });
    return;
  }

  // Parse date if provided
  let newDateObj: Date | undefined;
  if (date) {
    try {
      newDateObj = parseHolidayDate(date);
    } catch (dateError) {
      const error = dateError instanceof Error ? dateError : new Error('Unknown date parsing error');
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
        error: error.message,
      });
      return;
    }

    // Check for duplicate date
    if (holidayToUpdate.date.getTime() !== newDateObj.getTime()) {
      const existingHoliday = await Holiday.findOne({ date: newDateObj, _id: { $ne: holidayId } });
      if (existingHoliday) {
        res.status(409).json({ success: false, message: 'Another holiday with this date already exists.' });
        return;
      }
    }
  }

  // Build update payload
  const holidayName = getHolidayName(name ?? undefined, title ?? undefined);
  const updatePayload: { name?: string; date?: Date; type?: string; description?: string } = {};

  if (holidayName !== undefined) updatePayload.name = holidayName;
  if (newDateObj !== undefined) updatePayload.date = newDateObj;
  if (type != null || isOptional != null) {
    updatePayload.type = determineHolidayType(type ?? undefined, isOptional ?? undefined);
  }
  if (description != null) updatePayload.description = description;

  if (Object.keys(updatePayload).length === 0) {
    res.status(400).json({ success: false, message: 'No valid fields to update were provided.' });
    return;
  }

  const updatedHoliday = await Holiday.findByIdAndUpdate(holidayId, updatePayload, { new: true, runValidators: true });

  if (!updatedHoliday) {
    res.status(404).json({ success: false, message: 'Holiday not found after update' });
    return;
  }

  if (date !== undefined) {
    announceHoliday(updatedHoliday.name, updatedHoliday.date);
  }

  res.status(200).json({
    success: true,
    message: 'Holiday updated successfully',
    holiday: transformHolidayForResponse(updatedHoliday)
  });
}, { onDuplicate: 'A holiday with this date already exists.' });

export const deleteHoliday = asyncHandler(async (req: Request, res: Response) => {
  const holidayId = req.params.id;
  const holiday = await Holiday.findByIdAndDelete(holidayId);

  if (!holiday) {
    res.status(404).json({ success: false, message: 'Holiday not found' });
    return;
  }

  res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
});
