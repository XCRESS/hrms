import Attendance from "../models/Attendance.model.js";

export const checkIn = async (req, res) => {
  try {
    const { name } = req.body;
    const today = new Date().setHours(0, 0, 0, 0);
    let attendance = await Attendance.findOne({ name, date: today });
    if (attendance)
      return res.status(400).json({ message: "Already checked in" });
    attendance = await Attendance.create({
      name,
      date: today,
      checkIn: new Date(),
      status: "present"
    });
    res.status(201).json({ message: "Checked in", attendance });
  } catch (err) {
    res.status(500).json({ message: "Check-in failed", error: err.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const { name } = req.body;
    const today = new Date().setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ name, date: today });
    if (!attendance)
      return res.status(400).json({ message: "No check-in record found" });
    attendance.checkOut = new Date();
    await attendance.save();
    res.json({ message: "Checked out", attendance });
  } catch (err) {
    res.status(500).json({ message: "Check-out failed", error: err.message });
  }
};