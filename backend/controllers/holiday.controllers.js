import Holiday from "../models/Holiday.model.js";
import notificationService from "../utils/notificationService.js";
import { getISTDayBoundaries, parseISTDateString } from "../utils/istUtils.js";

export const createHoliday = async (req, res) => {
  try {
    const { title, date, isOptional, description } = req.body;
    if (!title || !date) {
      return res.status(400).json({ success: false, message: "Title and date are required for a holiday." });
    }
    
    // Validate date format and parse
    let holidayDate;
    try {
      const parsedDate = parseISTDateString(date);
      const { startOfDay } = getISTDayBoundaries(parsedDate);
      holidayDate = startOfDay;
    } catch (dateError) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid date format. Please use YYYY-MM-DD format.", 
        error: dateError.message 
      });
    }

    const holiday = await Holiday.create({ title, date: holidayDate, isOptional, description });
    
    // Send notification for new holiday
    try {
      await notificationService.sendHolidayNotification(holiday);
    } catch (notificationError) {
      console.error('Failed to send holiday notification:', notificationError);
      // Don't fail the main operation if notification fails
    }
    
    res.status(201).json({ success: true, message: "Holiday created successfully", holiday });
  } catch (err) {
    if (err.code === 11000) { // Duplicate key error (for date)
        return res.status(409).json({ success: false, message: "A holiday with this date already exists.", error: err.message });
    }
    console.error("Holiday creation error:", err);
    res.status(500).json({ success: false, message: "Holiday creation failed. Please check server logs.", error: err.message });
  }
};

export const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 }); // Sort by date ascending
    res.status(200).json({ success: true, holidays });
  } catch (err) {
    console.error("Fetch holidays error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch holidays. Please check server logs.", error: err.message });
  }
};

// @desc    Update a holiday
// @route   PUT /api/holidays/:id
// @access  Private (Admin/HR)
export const updateHoliday = async (req, res) => {
  try {
    const holidayId = req.params.id;
    const { title, date, isOptional, description } = req.body;

    // Basic check: at least one field to update should be present if body is not empty
    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ success: false, message: "No update data provided." });
    }
    
    const holidayToUpdate = await Holiday.findById(holidayId);
    if (!holidayToUpdate) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    let newDateObj;
    if (date) {
        try {
            const parsedDate = parseISTDateString(date);
            const { startOfDay } = getISTDayBoundaries(parsedDate);
            newDateObj = startOfDay;
        } catch (dateError) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid date format. Please use YYYY-MM-DD format.", 
                error: dateError.message 
            });
        }
        // Check for duplicate date only if the date is actually changing to a new value
        if (holidayToUpdate.date.getTime() !== newDateObj.getTime()) {
            const existingHoliday = await Holiday.findOne({ date: newDateObj, _id: { $ne: holidayId } });
            if (existingHoliday) {
                return res.status(409).json({ success: false, message: "Another holiday with this date already exists." });
            }
        }
    }

    // Prepare update payload, only including fields that are actually sent
    const updatePayload = {};
    if (title !== undefined) updatePayload.title = title;
    if (date !== undefined) updatePayload.date = newDateObj; // Use the processed date
    if (isOptional !== undefined) updatePayload.isOptional = isOptional;
    if (description !== undefined) updatePayload.description = description;

    if (Object.keys(updatePayload).length === 0) {
        return res.status(400).json({ success: false, message: "No valid fields to update were provided." });
    }

    const updatedHoliday = await Holiday.findByIdAndUpdate(
        holidayId,
        updatePayload, 
        { new: true, runValidators: true }
    );
    
    // Send notification for updated holiday (only if significant change like title or date)
    if (title !== undefined || date !== undefined) {
      try {
        await notificationService.sendHolidayNotification(updatedHoliday);
      } catch (notificationError) {
        console.error('Failed to send holiday update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
    
    res.status(200).json({ success: true, message: "Holiday updated successfully", holiday: updatedHoliday });
  } catch (err) {
    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "A holiday with this date already exists (during update).", error: err.message });
    }
    console.error("Update holiday error:", err);
    res.status(500).json({ success: false, message: "Failed to update holiday. Please check server logs.", error: err.message });
  }
};

// @desc    Delete a holiday
// @route   DELETE /api/holidays/:id
// @access  Private (Admin/HR)
export const deleteHoliday = async (req, res) => {
  try {
    const holidayId = req.params.id;
    const holiday = await Holiday.findByIdAndDelete(holidayId);

    if (!holiday) {
      return res.status(404).json({ success: false, message: "Holiday not found" });
    }

    res.status(200).json({ success: true, message: "Holiday deleted successfully" });
  } catch (err) {
    console.error("Delete holiday error:", err);
    res.status(500).json({ success: false, message: "Failed to delete holiday. Please check server logs.", error: err.message });
  }
};