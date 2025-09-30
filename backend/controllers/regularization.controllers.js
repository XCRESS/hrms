import RegularizationRequest from "../models/Regularization.model.js";
import User from "../models/User.model.js";
import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import moment from "moment-timezone";
import { getISTNow } from "../utils/timezoneUtils.js";
import { invalidateAttendanceCache, invalidateDashboardCache } from "../utils/cacheInvalidation.js";
import { AttendanceBusinessService } from "../services/attendance/AttendanceBusinessService.js";
import NotificationService from "../services/notificationService.js";

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
    
    // Fix: Combine the regularization date with the requested times to avoid date mismatch
    let requestedCheckInIST = undefined;
    let requestedCheckOutIST = undefined;
    
    if (requestedCheckIn) {
      // If requestedCheckIn contains date info, use it directly, otherwise combine with regularization date
      let parsedCheckIn;
      if (requestedCheckIn.includes('T') || requestedCheckIn.includes(' ') || requestedCheckIn.length > 8) {
        parsedCheckIn = moment.tz(requestedCheckIn, "Asia/Kolkata");
      } else {
        // Combine regularization date with requested time
        parsedCheckIn = moment.tz(date + " " + requestedCheckIn, "Asia/Kolkata");
      }

      if (!parsedCheckIn.isValid()) {
        return res.status(400).json({
          message: `Invalid check-in time format: ${requestedCheckIn}`
        });
      }

      requestedCheckInIST = parsedCheckIn.toDate();
    }
    
    if (requestedCheckOut) {
      // If requestedCheckOut contains date info, use it directly, otherwise combine with regularization date
      let parsedCheckOut;
      if (requestedCheckOut.includes('T') || requestedCheckOut.includes(' ') || requestedCheckOut.length > 8) {
        parsedCheckOut = moment.tz(requestedCheckOut, "Asia/Kolkata");
      } else {
        // Combine regularization date with requested time
        parsedCheckOut = moment.tz(date + " " + requestedCheckOut, "Asia/Kolkata");
      }

      if (!parsedCheckOut.isValid()) {
        return res.status(400).json({
          message: `Invalid check-out time format: ${requestedCheckOut}`
        });
      }

      requestedCheckOutIST = parsedCheckOut.toDate();
    }
    
    // Validation: Ensure check-in and check-out times are on the regularization date
    const regularizationDateStr = moment.tz(date, "Asia/Kolkata").format("YYYY-MM-DD");
    
    if (requestedCheckInIST) {
      const checkInDateStr = moment.tz(requestedCheckInIST, "Asia/Kolkata").format("YYYY-MM-DD");
      if (checkInDateStr !== regularizationDateStr) {
        return res.status(400).json({ 
          message: `Check-in time must be on the regularization date (${regularizationDateStr}). Got: ${checkInDateStr}` 
        });
      }
    }
    
    if (requestedCheckOutIST) {
      const checkOutDateStr = moment.tz(requestedCheckOutIST, "Asia/Kolkata").format("YYYY-MM-DD");
      if (checkOutDateStr !== regularizationDateStr) {
        return res.status(400).json({ 
          message: `Check-out time must be on the regularization date (${regularizationDateStr}). Got: ${checkOutDateStr}` 
        });
      }
    }
    
    // Validation: Ensure check-in is before check-out if both are provided
    if (requestedCheckInIST && requestedCheckOutIST) {
      if (requestedCheckInIST >= requestedCheckOutIST) {
        return res.status(400).json({ 
          message: "Check-in time must be before check-out time" 
        });
      }
    }
    
    // Check for existing request for same date
    const existing = await RegularizationRequest.findOne({ employeeId: user.employeeId, date: dateIST, status: "pending" });
    if (existing) {
      // Update existing request instead of creating duplicate (validation already done above)
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
    
    // Get user information for notification
    const userInfo = await User.findById(user._id);
    
    // Trigger notification to HR
    NotificationService.notifyHR('regularization_request', {
      employee: userInfo ? userInfo.name : 'Unknown User',
      employeeId: user.employeeId,
      date: date,
      checkIn: requestedCheckIn || 'Not specified',
      checkOut: requestedCheckOut || 'Not specified',
      reason: reason
    }).catch(error => console.error('Failed to send regularization request notification:', error));
    
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
      
      // Use the stored times directly as they're already in UTC
      const checkInTime = reg.requestedCheckIn;
      const checkOutTime = reg.requestedCheckOut;

      // Validate that at least one time is provided
      if (!checkInTime && !checkOutTime) {
        console.error("No check-in or check-out time provided");
        return res.status(400).json({ message: "At least check-in or check-out time must be provided for regularization." });
      }

      // Validate time sequence if both are provided
      if (checkInTime && checkOutTime && checkInTime >= checkOutTime) {
        console.error("Check-in time must be before check-out time");
        return res.status(400).json({ message: "Check-in time must be before check-out time." });
      }

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

      // Context-aware validation: if no existing record, check-in is required
      if (!att && !checkInTime) {
        console.error("No existing attendance record and no check-in time provided");
        return res.status(400).json({
          message: "Check-in time is required when no existing attendance record exists for the date."
        });
      }

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
        const statusResult = await AttendanceBusinessService.calculateFinalStatus(att.checkIn, att.checkOut);
        
        att.status = statusResult.status;
        att.workHours = statusResult.workHours;
        
        await att.save();
        console.log("Final attendance status:", att.status, "Work hours:", att.workHours, "Flags:", statusResult.flags);
      } else if (att.checkIn && !att.checkOut) {
        // Only check-in time provided, use business service to determine status
        const statusResult = await AttendanceBusinessService.determineAttendanceStatus(att.checkIn, null);
        att.status = statusResult.status;
        
        await att.save();
        console.log("Attendance updated with check-in only, status:", att.status, "Flags:", statusResult.flags);
      }
      
      // Invalidate attendance cache for this employee and overall dashboard
      try {
        console.log("Invalidating cache for employee:", reg.employeeId);
        invalidateAttendanceCache(reg.employeeId);
        invalidateDashboardCache();
      } catch (cacheError) {
        console.error("Error invalidating cache (non-critical):", cacheError.message);
      }
    }
    
    // Notify employee about status update (non-critical operation)
    try {
      if (reg.employeeId) {
        NotificationService.notifyEmployee(reg.employeeId, 'regularization_status_update', {
          status: status,
          date: reg.date ? reg.date.toDateString() : 'Unknown date',
          checkIn: reg.requestedCheckIn ? reg.requestedCheckIn.toLocaleString() : 'Not specified',
          checkOut: reg.requestedCheckOut ? reg.requestedCheckOut.toLocaleString() : 'Not specified',
          reason: reg.reason || 'No reason provided',
          comment: reviewComment || 'No comment'
        }).catch(error => console.error('Failed to send regularization status notification:', error));
      }
    } catch (notificationError) {
      console.error("Error in notification service (non-critical):", notificationError.message);
    }
    
    res.json({ success: true, message: `Request ${status}`, reg });
  } catch (err) {
    console.error("Detailed error in reviewRegularization:", {
      error: err.message,
      stack: err.stack,
      requestId: req.params.id,
      status: req.body.status,
      reviewComment: req.body.reviewComment
    });
    res.status(500).json({ message: "Failed to review request", error: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
}; 