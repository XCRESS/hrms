import type { Request, Response } from 'express';
import Holiday from '../models/Holiday.model.js';
import notificationService from '../utils/notificationService.js';
import { getISTDayBoundaries, parseISTDateString } from '../utils/timezone.js';
import logger from '../utils/logger.js';

export const createHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, date, isOptional, description } = req.body;
    if (!title || !date) {
      res.status(400).json({ success: false, message: 'Title and date are required for a holiday.' });
      return;
    }

    // Validate date format and parse
    let holidayDate: Date;
    try {
      const parsedDate = parseISTDateString(date);
      const { startOfDay } = getISTDayBoundaries(parsedDate);
      holidayDate = new Date(startOfDay.valueOf());
    } catch (dateError) {
      const error = dateError instanceof Error ? dateError : new Error('Unknown date parsing error');
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
        error: error.message,
      });
      return;
    }

    const holiday = await Holiday.create({ title, date: holidayDate, isOptional, description });

    // Send notification for new holiday
    try {
      await notificationService.sendHolidayNotification({
        _id: holiday._id.toString(),
        title,
        description: description || '',
        date: holidayDate,
      });
    } catch (notificationError) {
      const error = notificationError instanceof Error ? notificationError : new Error('Unknown notification error');
      logger.error({ err: error }, 'Failed to send holiday notification');
      // Don't fail the main operation if notification fails
    }

    res.status(201).json({ success: true, message: 'Holiday created successfully', holiday });
  } catch (err) {
    const error = err as { code?: number; message: string };
    if (error.code === 11000) {
      // Duplicate key error (for date)
      res.status(409).json({ success: false, message: 'A holiday with this date already exists.', error: error.message });
      return;
    }
    logger.error({ err }, 'Holiday creation error');
    res.status(500).json({ success: false, message: 'Holiday creation failed. Please check server logs.', error: error.message });
  }
};

export const getHolidays = async (req: Request, res: Response): Promise<void> => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 }); // Sort by date ascending
    res.status(200).json({ success: true, holidays });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err }, 'Fetch holidays error');
    res.status(500).json({ success: false, message: 'Failed to fetch holidays. Please check server logs.', error: error.message });
  }
};

// @desc    Update a holiday
// @route   PUT /api/holidays/:id
// @access  Private (Admin/HR)
export const updateHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const holidayId = req.params.id;
    const { title, date, isOptional, description } = req.body;

    // Basic check: at least one field to update should be present if body is not empty
    if (Object.keys(req.body).length === 0) {
      res.status(400).json({ success: false, message: 'No update data provided.' });
      return;
    }

    const holidayToUpdate = await Holiday.findById(holidayId);
    if (!holidayToUpdate) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    let newDateObj: Date | undefined;
    if (date) {
      try {
        const parsedDate = parseISTDateString(date);
        const { startOfDay } = getISTDayBoundaries(parsedDate);
        newDateObj = new Date(startOfDay.valueOf());
      } catch (dateError) {
        const error = dateError instanceof Error ? dateError : new Error('Unknown date parsing error');
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Please use YYYY-MM-DD format.',
          error: error.message,
        });
        return;
      }
      // Check for duplicate date only if the date is actually changing to a new value
      if (newDateObj && holidayToUpdate.date.getTime() !== newDateObj.getTime()) {
        const existingHoliday = await Holiday.findOne({ date: newDateObj, _id: { $ne: holidayId } });
        if (existingHoliday) {
          res.status(409).json({ success: false, message: 'Another holiday with this date already exists.' });
          return;
        }
      }
    }

    // Prepare update payload, only including fields that are actually sent
    const updatePayload: {
      title?: string;
      date?: Date;
      isOptional?: boolean;
      description?: string;
    } = {};
    if (title !== undefined) updatePayload.title = title;
    if (date !== undefined && newDateObj !== undefined) updatePayload.date = newDateObj; // Use the processed date
    if (isOptional !== undefined) updatePayload.isOptional = isOptional;
    if (description !== undefined) updatePayload.description = description;

    if (Object.keys(updatePayload).length === 0) {
      res.status(400).json({ success: false, message: 'No valid fields to update were provided.' });
      return;
    }

    const updatedHoliday = await Holiday.findByIdAndUpdate(holidayId, updatePayload, { new: true, runValidators: true });

    if (!updatedHoliday) {
      res.status(404).json({ success: false, message: 'Holiday not found after update' });
      return;
    }

    // Send notification for updated holiday (only if significant change like title or date)
    if (title !== undefined || date !== undefined) {
      try {
        await notificationService.sendHolidayNotification({
          _id: updatedHoliday._id.toString(),
          title: updatePayload.title || title,
          description: updatePayload.description || description || '',
          date: updatePayload.date || updatedHoliday.date,
        });
      } catch (notificationError) {
        const error = notificationError instanceof Error ? notificationError : new Error('Unknown notification error');
        logger.error({ err: error }, 'Failed to send holiday update notification');
        // Don't fail the main operation if notification fails
      }
    }

    res.status(200).json({ success: true, message: 'Holiday updated successfully', holiday: updatedHoliday });
  } catch (err) {
    const error = err as { code?: number; message: string };
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'A holiday with this date already exists (during update).', error: error.message });
      return;
    }
    logger.error({ err }, 'Update holiday error');
    res.status(500).json({ success: false, message: 'Failed to update holiday. Please check server logs.', error: error.message });
  }
};

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Private (Admin/HR)
export const deleteHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const holidayId = req.params.id;
    const holiday = await Holiday.findByIdAndDelete(holidayId);

    if (!holiday) {
      res.status(404).json({ success: false, message: 'Holiday not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger.error({ err }, 'Delete holiday error');
    res.status(500).json({ success: false, message: 'Failed to delete holiday. Please check server logs.', error: error.message });
  }
};
