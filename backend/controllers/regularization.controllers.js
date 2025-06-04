import RegularizationRequest from "../models/Regularization.model.js";
import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";

// Employee: Submit a regularization request
export const requestRegularization = async (req, res) => {
  try {
    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;
    const user = req.user;
    if (!user || !user.employeeId) {
      return res.status(400).json({ message: "You must be linked to an employee profile to request regularization." });
    }
    // Prevent duplicate requests for same date
    const existing = await RegularizationRequest.findOne({ employeeId: user.employeeId, date: new Date(date), status: "pending" });
    if (existing) {
      return res.status(400).json({ message: "A regularization request for this date is already pending." });
    }
    const reg = await RegularizationRequest.create({
      employeeId: user.employeeId,
      user: user._id,
      date: new Date(date),
      requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn) : undefined,
      requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : undefined,
      reason
    });
    res.status(201).json({ success: true, message: "Regularization request submitted.", reg });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit regularization request", error: err.message });
  }
};

// Employee: Get own regularization requests
export const getMyRegularizations = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.employeeId) {
      return res.status(400).json({ message: "You must be linked to an employee profile." });
    }
    const regs = await RegularizationRequest.find({ employeeId: user.employeeId }).sort({ createdAt: -1 });
    res.json({ success: true, regs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch regularization requests", error: err.message });
  }
};

// HR/Admin: Get all regularization requests
export const getAllRegularizations = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "hr" && req.user.role !== "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const regs = await RegularizationRequest.find().populate("user", "name email").sort({ createdAt: -1 });
    res.json({ success: true, regs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all regularization requests", error: err.message });
  }
};

// HR/Admin: Approve or reject a regularization request
export const reviewRegularization = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "hr" && req.user.role !== "admin")) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const { id } = req.params;
    const { status, reviewComment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const reg = await RegularizationRequest.findById(id);
    if (!reg) return res.status(404).json({ message: "Request not found" });
    if (reg.status !== "pending") {
      return res.status(400).json({ message: "Request already reviewed" });
    }
    reg.status = status;
    reg.reviewedBy = req.user._id;
    reg.reviewComment = reviewComment;
    reg.updatedAt = new Date();
    await reg.save();
    // If approved, update attendance
    if (status === "approved") {
      // Find the Employee document by employeeId (string)
      const employeeDoc = await Employee.findOne({ employeeId: reg.employeeId });
      if (!employeeDoc) {
        return res.status(404).json({ message: "Employee not found for regularization." });
      }
      // Defensive: check required fields
      if (!reg.requestedCheckIn) {
        return res.status(400).json({ message: "Requested check-in time is required for attendance regularization." });
      }
      let att = await Attendance.findOne({ employee: employeeDoc._id, date: reg.date });
      if (!att) {
        att = await Attendance.create({
          employee: employeeDoc._id,
          employeeName: employeeDoc.firstName + " " + employeeDoc.lastName,
          date: reg.date,
          checkIn: reg.requestedCheckIn,
          checkOut: reg.requestedCheckOut,
          status: "present",
          reason: "Regularized by HR"
        });
      } else {
        if (reg.requestedCheckIn) att.checkIn = reg.requestedCheckIn;
        if (reg.requestedCheckOut) att.checkOut = reg.requestedCheckOut;
        att.status = "present";
        att.reason = "Regularized by HR";
        // Defensive: ensure employeeName is set
        if (!att.employeeName) {
          att.employeeName = employeeDoc.firstName + " " + employeeDoc.lastName;
        }
        await att.save();
      }
    }
    res.json({ success: true, message: `Request ${status}`, reg });
  } catch (err) {
    res.status(500).json({ message: "Failed to review request", error: err.message, stack: err.stack });
  }
}; 