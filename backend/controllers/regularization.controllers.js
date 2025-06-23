import RegularizationRequest from "../models/Regularization.model.js";
import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import moment from "moment-timezone";

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
    // Parse as IST and store as UTC
    const dateIST = moment.tz(date, "Asia/Kolkata").startOf("day").toDate();
    const requestedCheckInIST = requestedCheckIn ? moment.tz(requestedCheckIn, "Asia/Kolkata").toDate() : undefined;
    const requestedCheckOutIST = requestedCheckOut ? moment.tz(requestedCheckOut, "Asia/Kolkata").toDate() : undefined;
    const reg = await RegularizationRequest.create({
      employeeId: user.employeeId,
      user: user._id,
      date: dateIST,
      requestedCheckIn: requestedCheckInIST,
      requestedCheckOut: requestedCheckOutIST,
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
    
    // Enhanced validation
    if (!id) {
      return res.status(400).json({ message: "Request ID is required" });
    }
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: `Invalid status: ${status}. Must be 'approved' or 'rejected'` });
    }
    
    const reg = await RegularizationRequest.findById(id);
    if (!reg) return res.status(404).json({ message: "Request not found" });
    if (reg.status !== "pending") {
      return res.status(400).json({ message: "Request already reviewed" });
    }
    
    reg.status = status;
    reg.reviewedBy = req.user._id;
    reg.reviewComment = reviewComment || "";
    reg.updatedAt = new Date();
    await reg.save();
    // If approved, update attendance
    if (status === "approved") {
      const employeeDoc = await Employee.findOne({ employeeId: reg.employeeId });
      if (!employeeDoc) {
        return res.status(404).json({ message: "Employee not found for regularization." });
      }
      if (!reg.requestedCheckIn) {
        return res.status(400).json({ message: "Requested check-in time is required for attendance regularization." });
      }
      // Parse as IST and store as UTC
      const checkInIST = reg.requestedCheckIn ? moment.tz(reg.requestedCheckIn, "Asia/Kolkata").toDate() : undefined;
      const checkOutIST = reg.requestedCheckOut ? moment.tz(reg.requestedCheckOut, "Asia/Kolkata").toDate() : undefined;
      let att = await Attendance.findOne({ employee: employeeDoc._id, date: reg.date });
      if (!att) {
        att = await Attendance.create({
          employee: employeeDoc._id,
          employeeName: employeeDoc.firstName + " " + employeeDoc.lastName,
          date: reg.date,
          checkIn: checkInIST,
          checkOut: checkOutIST,
          status: "present",
          reason: "Regularized by HR"
        });
      } else {
        if (checkInIST) att.checkIn = checkInIST;
        if (checkOutIST) att.checkOut = checkOutIST;
        att.status = "present";
        att.reason = "Regularized by HR";
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