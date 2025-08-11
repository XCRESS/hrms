import RegularizationRequest from "../models/Regularization.model.js";
import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import moment from "moment-timezone";
import { getISTNow, getISTDayBoundaries, calculateWorkHours } from "../utils/istUtils.js";
import { invalidateAttendanceCache, invalidateDashboardCache } from "../utils/cacheInvalidation.js";
import { AttendanceBusinessService } from "../services/attendance/AttendanceBusinessService.js";

// Employee: Submit a regularization request
export const requestRegularization = async (req, res) => {
  try {
    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;
    const user = req.user;
    if (!user || !user.employeeId) {
      return res.status(400).json({ message: "You must be linked to an employee profile to request regularization." });
    }
    
    // Parse as IST and store as UTC
    const dateIST = moment.tz(date, "Asia/Kolkata").startOf("day").toDate();
    const requestedCheckInIST = requestedCheckIn ? moment.tz(requestedCheckIn, "Asia/Kolkata").toDate() : undefined;
    const requestedCheckOutIST = requestedCheckOut ? moment.tz(requestedCheckOut, "Asia/Kolkata").toDate() : undefined;
    
    // Check for existing request for same date
    const existing = await RegularizationRequest.findOne({ employeeId: user.employeeId, date: dateIST, status: "pending" });
    if (existing) {
      // Update existing request instead of creating duplicate
      existing.requestedCheckIn = requestedCheckInIST;
      existing.requestedCheckOut = requestedCheckOutIST;
      existing.reason = reason;
      existing.updatedAt = getISTNow();
      await existing.save();
      return res.status(200).json({ success: true, message: "Regularization request updated.", reg: existing });
    }
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
    reg.updatedAt = getISTNow();
    await reg.save();
    // If approved, update attendance
    if (status === "approved") {
      console.log("Processing regularization approval for:", { id, employeeId: reg.employeeId, date: reg.date });
      
      const employeeDoc = await Employee.findOne({ employeeId: reg.employeeId });
      if (!employeeDoc) {
        console.error("Employee not found for regularization:", reg.employeeId);
        return res.status(404).json({ message: "Employee not found for regularization." });
      }
      
      if (!reg.requestedCheckIn) {
        console.error("No requested check-in time found");
        return res.status(400).json({ message: "Requested check-in time is required for attendance regularization." });
      }
      
      // Use the stored times directly as they're already in UTC
      const checkInTime = reg.requestedCheckIn;
      const checkOutTime = reg.requestedCheckOut;
      
      console.log("Regularization times:", { 
        checkIn: checkInTime, 
        checkOut: checkOutTime,
        date: reg.date 
      });
      
      // Find or create attendance record
      // Use IST-aware date matching to avoid timezone issues
      const regDate = new Date(reg.date);
      
      // Create IST day boundaries using local date methods (not UTC)
      const startOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(regDate.getFullYear(), regDate.getMonth(), regDate.getDate(), 23, 59, 59, 999);
      
      let att = await Attendance.findOne({ 
        employee: employeeDoc._id, 
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });
      
      console.log("Date matching:", { 
        regularizationDate: reg.date,
        startOfDay: startOfDay,
        endOfDay: endOfDay,
        foundAttendance: !!att,
        attendanceDate: att?.date 
      });
      
      console.log("Existing attendance record:", !!att);
      
      if (!att) {
        // Create new attendance record
        const attendanceData = {
          employee: employeeDoc._id,
          employeeName: `${employeeDoc.firstName} ${employeeDoc.lastName}`,
          date: startOfDay, // Use IST start of day
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: "present", // Will be recalculated below
          comments: "Regularized by HR/Admin",
          reason: "Regularized by HR/Admin"
        };
        
        console.log("Creating new attendance record:", attendanceData);
        att = await Attendance.create(attendanceData);
        console.log("Created attendance record:", att._id);
      } else {
        // Update existing attendance record
        console.log("Updating existing attendance record:", att._id);
        
        if (checkInTime) {
          att.checkIn = checkInTime;
          console.log("Updated check-in to:", checkInTime);
        }
        
        if (checkOutTime) {
          att.checkOut = checkOutTime;
          console.log("Updated check-out to:", checkOutTime);
        }
        
        // Set reason for regularization
        att.reason = "Regularized by HR/Admin";
        att.comments = "Regularized by HR/Admin";
        
        // Ensure employeeName is set
        if (!att.employeeName) {
          att.employeeName = `${employeeDoc.firstName} ${employeeDoc.lastName}`;
        }
        
        await att.save();
        console.log("Updated attendance record saved");
      }
      
      // Calculate work hours and determine final status using business service
      if (att.checkIn && att.checkOut) {
        const statusResult = AttendanceBusinessService.calculateFinalStatus(att.checkIn, att.checkOut);
        
        att.status = statusResult.status;
        att.workHours = statusResult.workHours;
        
        await att.save();
        console.log("Final attendance status:", att.status, "Work hours:", att.workHours, "Flags:", statusResult.flags);
      } else if (att.checkIn && !att.checkOut) {
        // Only check-in time provided, use business service to determine status
        const statusResult = AttendanceBusinessService.determineAttendanceStatus(att.checkIn, null);
        att.status = statusResult.status;
        
        await att.save();
        console.log("Attendance updated with check-in only, status:", att.status, "Flags:", statusResult.flags);
      }
      
      // Invalidate attendance cache for this employee and overall dashboard
      console.log("Invalidating cache for employee:", reg.employeeId);
      invalidateAttendanceCache(reg.employeeId);
      invalidateDashboardCache();
    }
    res.json({ success: true, message: `Request ${status}`, reg });
  } catch (err) {
    res.status(500).json({ message: "Failed to review request", error: err.message, stack: err.stack });
  }
}; 