import Holiday from "../models/Holiday.model.js";

export const createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);
    res.status(201).json({ message: "Holiday created", holiday });
  } catch (err) {
    res.status(500).json({ message: "Holiday creation failed", error: err.message });
  }
};

export const getHolidays = async (req, res) => {
  try {
    const holidays = await Holiday.find();
    res.json({ holidays });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch holidays", error: err.message });
  }
};