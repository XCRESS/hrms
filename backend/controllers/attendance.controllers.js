import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import TaskReport from "../models/TaskReport.model.js";
import Leave from "../models/Leave.model.js";
import Holiday from "../models/Holiday.model.js";
import cache, { TTL } from "../utils/cache.js";
import { invalidateAttendanceCache, invalidateDashboardCache } from "../utils/cacheInvalidation.js";
import {
  getISTNow,
  getISTDayBoundaries,
  getISTRangeBoundaries,
  getBusinessHours,
  getISTDateString,
  parseISTDateString,
  calculateWorkHours,
  determineAttendanceStatus,
  isSameDayIST
} from "../utils/istUtils.js";

/**
 * OPTIMIZED: Bulk fetch holidays for date range with caching to avoid N+1 queries
 * Now uses IST date boundaries for consistent holiday matching
 */
const getHolidaysInRange = async (startDate, endDate) => {
  const cacheKey = `holidays:${getISTDateString(startDate)}:${getISTDateString(endDate)}`;
  
  return await cache.getOrSet(cacheKey, async () => {
    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate }
    }).lean(); // Use .lean() for better performance
    
    // Create a Map for O(1) lookup by date key (IST dates)
    const holidayMap = new Map();
    holidays.forEach(holiday => {
      const dateKey = getISTDateString(holiday.date);
      holidayMap.set(dateKey, holiday);
    });
    
    return holidayMap;
  }, TTL.HOLIDAYS);
};

/**
 * Helper: Determine if a date is a working day (IST VERSION)
 * Working days: Monday to Friday + 1st, 3rd, 4th, 5th Saturday (excluding 2nd Saturday and holidays)
 * Non-working days: Sunday + 2nd Saturday of each month + holidays
 * 
 * @param {Date} date - The IST date to check
 * @param {Map} holidayMap - Pre-fetched holiday map for O(1) lookup
 */
const isWorkingDayForCompany = (date, holidayMap = null) => {
  const dayOfWeek = date.getDay();
  
  // Sunday is always a non-working day
  if (dayOfWeek === 0) {
    return false;
  }
  
  // Check if it's a holiday using pre-fetched map (O(1) lookup)
  if (holidayMap) {
    const dateKey = getISTDateString(date);
    if (holidayMap.has(dateKey)) {
      return false; // It's a holiday, so not a working day
    }
  }
  
  // Monday to Friday are working days (if not a holiday)
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return true;
  }
  
  // Saturday logic: exclude 2nd Saturday of the month
  if (dayOfWeek === 6) {
    const dateNum = date.getDate();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstSaturday = 7 - firstDayOfMonth.getDay() || 7; // Get first Saturday of month
    const secondSaturday = firstSaturday + 7; // Second Saturday is 7 days later
    
    // If this Saturday is the 2nd Saturday, it's a non-working day
    if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
      return false;
    }
    
    // All other Saturdays are working days (if not a holiday)
    return true;
  }
  
  return false;
};

/**
 * LEGACY: Keep async version for backward compatibility where holidayMap isn't available
 * Now uses IST date boundaries for consistent holiday checking
 */
const isWorkingDayForCompanyLegacy = async (date) => {
  const dayOfWeek = date.getDay();
  
  // Sunday is always a non-working day
  if (dayOfWeek === 0) {
    return false;
  }
  
  // Check if it's a holiday using IST boundaries
  const { startOfDay, endOfDay } = getISTDayBoundaries(date);
  
  const holiday = await Holiday.findOne({
    date: { $gte: startOfDay, $lte: endOfDay }
  });
  
  if (holiday) {
    return false; // It's a holiday, so not a working day
  }
  
  // Monday to Friday are working days (if not a holiday)
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return true;
  }
  
  // Saturday logic: exclude 2nd Saturday of the month
  if (dayOfWeek === 6) {
    const dateNum = date.getDate();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstSaturday = 7 - firstDayOfMonth.getDay() || 7; // Get first Saturday of month
    const secondSaturday = firstSaturday + 7; // Second Saturday is 7 days later
    
    // If this Saturday is the 2nd Saturday, it's a non-working day
    if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
      return false;
    }
    
    // All other Saturdays are working days (if not a holiday)
    return true;
  }
  
  return false;
};

// Standard response formatter for consistency
const formatResponse = (success, message, data = null, errors = null) => {
  return {
    success,
    message,
    ...(data && { data }),
    ...(errors && { errors })
  };
};

/**
 * Helper: Get employee ObjectId for current user
 */
const getEmployeeObjectId = async (user) => {
  if (user.employee) return user.employee; // Already ObjectId
  if (user.employeeId) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    return employee ? employee._id : null;
  }
  return null;
};

/**
 * Check in for the day
 */
export const checkIn = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, "Authentication required", null, { auth: "No valid user found" }));
    }
    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
    }

    // Extract location data from request body
    const { latitude, longitude } = req.body;

    // Get current IST time and today's boundaries
    const now = getISTNow();
    const { startOfDay, endOfDay } = getISTDayBoundaries(now);

    let attendance = await Attendance.findOne({
      employee: employeeObjId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (attendance) {
      return res.status(400).json(formatResponse(false, "Already checked in for today"));
    }
    
    // Create new attendance record with IST timestamps
    const employeeDoc = await Employee.findById(employeeObjId);
    
    const attendanceData = {
      employee: employeeObjId,
      employeeName: employeeDoc ? `${employeeDoc.firstName} ${employeeDoc.lastName}` : "",
      date: now, // Current IST timestamp
      checkIn: now, // Current IST timestamp
      status: determineAttendanceStatus(now) // Auto-determine status based on check-in time
    };

    // Add location data if provided
    if (latitude && longitude) {
      attendanceData.location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };
    }

    attendance = await Attendance.create(attendanceData);
    
    // Invalidate relevant caches after check-in
    invalidateAttendanceCache();
    invalidateDashboardCache();
    
    res.status(201).json(formatResponse(true, "Checked in successfully", { attendance }));
  } catch (err) {
    let errorMessage = "Check-in failed";
    let errorDetails = { server: err.message };
    if (err.name === 'ValidationError') {
      errorMessage = "Invalid data for check-in";
      errorDetails = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json(formatResponse(false, errorMessage, null, errorDetails));
    }
    res.status(500).json(formatResponse(false, errorMessage, null, errorDetails));
  }
};

/**
 * Check out for the day
 */
export const checkOut = async (req, res) => {
  try {
    const { tasks } = req.body;

    if (!req.user) {
      return res.status(401).json(formatResponse(false, "Authentication required", null, { auth: "No valid user found" }));
    }

    // Task report validation
    if (!tasks || !Array.isArray(tasks) || tasks.filter(t => typeof t === 'string' && t.trim() !== '').length === 0) {
      return res.status(400).json(formatResponse(false, "A task report with at least one task is required to check out."));
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
    }

    // Use IST to define the current day, consistent with check-in
    const now = getISTNow();
    const { startOfDay, endOfDay } = getISTDayBoundaries(now);

    const attendance = await Attendance.findOne({
      employee: employeeObjId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!attendance) {
      return res.status(400).json(formatResponse(false, "No check-in record found for today"));
    }
    if (attendance.checkOut) {
      return res.status(400).json(formatResponse(false, "Already checked out for today"));
    }

    // 1. Get employee details for employeeId
    const employee = await Employee.findById(employeeObjId);
    if (!employee) {
      return res.status(400).json(formatResponse(false, "Employee profile not found"));
    }

    // 2. Create and save the task report
    await TaskReport.create({
      employee: employeeObjId,
      employeeId: employee.employeeId,
      date: attendance.date, // Use the date from the attendance record
      tasks: tasks.filter(t => typeof t === 'string' && t.trim() !== ''), // Sanitize tasks
    });

    // 3. Update attendance with checkout time (IST)
    attendance.checkOut = now;
    
    // Recalculate status based on actual work hours
    const finalStatus = determineAttendanceStatus(attendance.checkIn, now);
    attendance.status = finalStatus;
    
    await attendance.save();

    // Invalidate relevant caches after check-out
    invalidateAttendanceCache();
    invalidateDashboardCache();

    res.json(formatResponse(true, "Checked out successfully with task report.", { attendance }));

  } catch (err) {
    console.error("Error in checkOut:", err);
    console.error("Request body:", req.body);
    console.error("User data:", { 
      userId: req.user?._id, 
      employeeId: req.user?.employeeId, 
      employee: req.user?.employee 
    });
    
    let errorMessage = "Check-out failed";
    let errorDetails = { server: err.message };

    // Handle potential duplicate task report for the same day
    if (err.code === 11000 && err.message.includes('TaskReport')) {
      errorMessage = "A task report has already been submitted for today.";
      return res.status(409).json(formatResponse(false, errorMessage, null, { duplicate: "Task report for this date already exists." }));
    }

    if (err.name === 'ValidationError') {
      errorMessage = "Invalid data for check-out or task report";
      errorDetails = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      console.error("Validation errors:", errorDetails);
      return res.status(400).json(formatResponse(false, errorMessage, null, errorDetails));
    }

    res.status(500).json(formatResponse(false, errorMessage, null, errorDetails));
  }
};

/**
 * Get attendance records with optional filtering
 */
export const getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status } = req.query;
    const filter = {};
    // If employeeId is provided, filter by that employee
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
      else return res.status(404).json(formatResponse(false, "Employee not found"));
    }
    // For employees, restrict to their own records
    if (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
      const employeeObjId = await getEmployeeObjectId(req.user);
      if (!employeeObjId) {
        return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
      }
      filter.employee = employeeObjId;
    }
    // Date range filter using IST boundaries
    if (startDate) {
      const { startOfDay } = getISTDayBoundaries(parseISTDateString(startDate));
      filter.date = { ...filter.date, $gte: startOfDay };
    }
    if (endDate) {
      const { endOfDay } = getISTDayBoundaries(parseISTDateString(endDate));
      filter.date = { ...filter.date, $lte: endOfDay };
    }
    // Status filter
    if (status) filter.status = status;
    // Query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName employeeId department'),
      Attendance.countDocuments(filter)
    ]);
    const totalPages = Math.ceil(total / limit);
    res.json(
      formatResponse(true, "Attendance records retrieved successfully", {
        records,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      })
    );
  } catch (err) {
    res.status(500).json(
      formatResponse(false, "Failed to retrieve attendance records", null, {
        server: err.message
      })
    );
  }
};

/**
 * Get attendance records with missing checkouts for previous days
 * Used to remind employees to submit regularization requests
 */
export const getMissingCheckouts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, "Authentication required", null, { auth: "No valid user found" }));
    }

    console.log("🔍 getMissingCheckouts called for user:", req.user._id, "employeeId:", req.user.employeeId);

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      console.log("❌ No employee ObjectId found for user");
      return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
    }

    console.log("✅ Employee ObjectId found:", employeeObjId);

    // Get current IST date and set boundaries
    const now = getISTNow();
    const { startOfDay: today } = getISTDayBoundaries(now);
    
    // Look back 7 days for missing checkouts (configurable)
    const lookbackDays = 7;
    const lookbackDate = new Date(today);
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    console.log("📅 Date range:", { startDate, today, lookbackDays });

    // Find attendance records where checkIn exists but checkOut is null/missing
    // and the date is before today (using IST boundaries)
    const missingCheckouts = await Attendance.find({
      employee: employeeObjId,
      date: { 
        $gte: lookbackDate, 
        $lt: today 
      },
      checkIn: { $exists: true },
      $or: [
        { checkOut: null },
        { checkOut: { $exists: false } }
      ]
    }).sort({ date: -1 });

    console.log("🔎 Raw attendance query results:", missingCheckouts.length, "records found");
    console.log("📋 Missing checkouts details:", missingCheckouts.map(rec => ({
      _id: rec._id,
      date: rec.date,
      checkIn: rec.checkIn,
      checkOut: rec.checkOut,
      employee: rec.employee
    })));

    // Also check if there are pending or approved regularization requests for these dates
    // to avoid showing reminders for dates already being processed or resolved
    const RegularizationRequest = (await import("../models/Regularization.model.js")).default;
    
    // Check for any regularization requests for the dates with missing checkouts
    const attendanceDates = missingCheckouts.map(att => att.date);
    console.log("📅 Checking regularizations for dates:", attendanceDates.map(d => d.toISOString().split('T')[0]));
    
    // Create IST date ranges for each attendance date
    const dateRanges = attendanceDates.map(date => {
      const { startOfDay, endOfDay } = getISTDayBoundaries(date);
      return { startOfDay, endOfDay };
    });
    
    const existingRegularizations = await RegularizationRequest.find({
      employeeId: req.user.employeeId,
      status: { $in: ["pending", "approved"] }, // Include both pending and approved
      $or: dateRanges.map(range => ({
        date: { $gte: range.startOfDay, $lte: range.endOfDay }
      }))
    });

    console.log("📝 Existing regularizations found:", existingRegularizations.length);
    if (existingRegularizations.length > 0) {
      console.log("📝 Regularization details:", existingRegularizations.map(reg => ({
        date: reg.date.toISOString().split('T')[0],
        status: reg.status,
        reason: reg.reason
      })));
    }

    // Create a more precise date comparison using IST date strings
    const reminderNeeded = missingCheckouts.filter(attendance => {
      const attendanceDate = new Date(attendance.date);
      const attendanceDateKey = getISTDateString(attendanceDate);
      
      // Check if any regularization exists for this attendance date
      const hasRegularization = existingRegularizations.some(reg => {
        const regDate = new Date(reg.date);
        const regDateKey = getISTDateString(regDate);
        
        // Compare IST date strings for exact match
        const dateMatch = attendanceDateKey === regDateKey;
        
        if (dateMatch) {
          console.log(`📋 Date ${attendanceDateKey}: matched regularization ${reg._id} (${reg.status})`);
        }
        
        return dateMatch;
      });
      
      console.log(`📋 Date ${attendanceDateKey}: hasRegularization=${hasRegularization}`);
      return !hasRegularization;
    });

    console.log("🎯 Final reminder needed:", reminderNeeded.length, "records");
    if (reminderNeeded.length > 0) {
      console.log("🎯 Reminder dates:", reminderNeeded.map(att => 
        getISTDateString(att.date)
      ));
    }

    res.json(formatResponse(true, "Missing checkouts retrieved successfully", { 
      missingCheckouts: reminderNeeded,
      total: reminderNeeded.length
    }));

  } catch (err) {
    console.error("Error fetching missing checkouts:", err);
    res.status(500).json(formatResponse(false, "Failed to fetch missing checkouts", null, { server: err.message }));
  }
};

/**
 * Get employee's own attendance records with enhanced formatting and pagination
 * Specifically designed for the employee attendance page
 */
export const getMyAttendance = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, "Authentication required", null, { auth: "No valid user found" }));
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
    }

    // Get employee details to access joining date
    const employee = await Employee.findById(employeeObjId);
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const filter = { employee: employeeObjId };

    // Ensure attendance records are not shown before joining date (IST)
    const { startOfDay: joiningDate } = getISTDayBoundaries(employee.joiningDate);

    // Date range filtering with joining date constraint
    if (startDate) {
      const { startOfDay } = getISTDayBoundaries(parseISTDateString(startDate));
      // Use the later of startDate or joining date
      filter.date = { ...filter.date, $gte: startOfDay >= joiningDate ? startOfDay : joiningDate };
    } else {
      // If no startDate provided, default to joining date
      filter.date = { ...filter.date, $gte: joiningDate };
    }
    
    if (endDate) {
      const { endOfDay } = getISTDayBoundaries(parseISTDateString(endDate));
      filter.date = { ...filter.date, $lte: endOfDay };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('employee', 'firstName lastName employeeId'),
      Attendance.countDocuments(filter)
    ]);

    // Calculate work hours and enhance records using IST utilities
    const enhancedRecords = records.map(record => {
      const workHours = calculateWorkHours(record.checkIn, record.checkOut);

      return {
        _id: record._id,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        status: record.status,
        workHours: workHours,
        comments: record.comments,
        reason: record.reason,
        employeeName: record.employeeName
      };
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json(formatResponse(true, "Employee attendance records retrieved successfully", {
      records: enhancedRecords,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }));

  } catch (err) {
    console.error("Error fetching employee attendance:", err);
    res.status(500).json(formatResponse(false, "Failed to retrieve attendance records", null, { server: err.message }));
  }
};

/**
 * Get today's attendance for all employees (including absent ones)
 * This function shows all active employees and their status for today
 */
export const getTodayAttendanceWithAbsents = async (req, res) => {
  try {
    // Only allow admin/hr to access this endpoint
    if (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
      return res.status(403).json(formatResponse(false, "Access denied. Admin/HR role required."));
    }

    // Get today's date boundaries in IST
    const now = getISTNow();
    const { startOfDay: startOfTodayIST, endOfDay: endOfTodayIST } = getISTDayBoundaries(now);

    // 🚀 Get all active employees with caching
    const allEmployees = await cache.getOrSet('employees:active:basic', async () => {
      return await Employee.find({ isActive: true })
        .select('_id firstName lastName employeeId department position')
        .sort({ firstName: 1, lastName: 1 })
        .lean(); // Use .lean() for better performance
    }, TTL.EMPLOYEES);

    // Get today's attendance records using IST boundaries
    const todayAttendance = await Attendance.find({
      date: { $gte: startOfTodayIST, $lte: endOfTodayIST }
    }).populate('employee', 'firstName lastName employeeId department');

    // Create a map of employee attendance for quick lookup
    const attendanceMap = new Map();
    todayAttendance.forEach(record => {
      if (record.employee && record.employee._id) {
        attendanceMap.set(record.employee._id.toString(), record);
      }
    });

    // Build the complete attendance list with all employees
    const completeAttendanceList = allEmployees.map(employee => {
      const attendanceRecord = attendanceMap.get(employee._id.toString());
      
      if (attendanceRecord) {
        // Employee has checked in
        let workHours = null;
        if (attendanceRecord.checkIn && attendanceRecord.checkOut) {
          workHours = calculateWorkHours(attendanceRecord.checkIn, attendanceRecord.checkOut);
        }

        return {
          _id: attendanceRecord._id,
          employee: {
            _id: employee._id,
            employeeId: employee.employeeId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            department: employee.department
          },
          employeeName: `${employee.firstName} ${employee.lastName}`,
          date: attendanceRecord.date,
          checkIn: attendanceRecord.checkIn,
          checkOut: attendanceRecord.checkOut,
          status: attendanceRecord.status,
          workHours: workHours,
          comments: attendanceRecord.comments,
          reason: attendanceRecord.reason
        };
      } else {
        // Employee has not checked in - mark as absent
        return {
          _id: null, // No attendance record exists
          employee: {
            _id: employee._id,
            employeeId: employee.employeeId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            department: employee.department
          },
          employeeName: `${employee.firstName} ${employee.lastName}`,
          date: startOfTodayIST,
          checkIn: null,
          checkOut: null,
          status: 'absent',
          workHours: null,
          comments: null,
          reason: 'No check-in recorded'
        };
      }
    });

    res.json(formatResponse(true, "Today's attendance with absents retrieved successfully", {
      records: completeAttendanceList,
      total: completeAttendanceList.length,
      present: completeAttendanceList.filter(r => r.status === 'present').length,
      absent: completeAttendanceList.filter(r => r.status === 'absent').length,
      date: getISTDateString(startOfTodayIST)
    }));

  } catch (err) {
    console.error("Error fetching today's attendance with absents:", err);
    res.status(500).json(formatResponse(false, "Failed to fetch today's attendance", null, { server: err.message }));
  }
};

/**
 * Get admin attendance data for a date range - optimized for AdminAttendanceTable
 * This shows all employees and their attendance for multiple dates
 */
export const getAdminAttendanceRange = async (req, res) => {
  try {
    // Only allow admin/hr to access this endpoint
    if (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
      return res.status(403).json(formatResponse(false, "Access denied. Admin/HR role required."));
    }

    const { startDate, endDate } = req.query;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json(formatResponse(false, "Start date and end date are required"));
    }

    // Parse date range using IST boundaries
    const startDateObj = parseISTDateString(startDate);
    const endDateObj = parseISTDateString(endDate);
    
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDateObj);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDateObj);

    // 🚀 Get all active employees with reasonable caching
    const allEmployees = await cache.getOrSet('employees:active:basic', async () => {
      return await Employee.find({ isActive: true })
        .select('_id firstName lastName employeeId department position')
        .sort({ firstName: 1, lastName: 1 })
        .lean(); // Use .lean() for better performance
    }, TTL.EMPLOYEES);

    // Get all attendance records for the date range using IST boundaries
    const attendanceRecords = await Attendance.find({
      date: { $gte: startBoundary, $lte: endBoundary }
    }).populate('employee', 'firstName lastName employeeId department');

    // Get approved leaves for the date range using IST boundaries
    const approvedLeaves = await Leave.find({
      status: 'approved',
      leaveDate: { $gte: startBoundary, $lte: endBoundary }
    });

    // Create maps for quick lookup
    const attendanceMap = new Map();
    const leaveMap = new Map();

    // Group attendance by employee and date using IST formatting
    attendanceRecords.forEach(record => {
      if (record.employee && record.employee._id) {
        const empId = record.employee._id.toString();
        const dateKey = getISTDateString(record.date);
        
        if (!attendanceMap.has(empId)) {
          attendanceMap.set(empId, new Map());
        }
        attendanceMap.get(empId).set(dateKey, record);
        
      }
    });

    // Group leaves by employee and date using IST formatting
    approvedLeaves.forEach(leave => {
      const empId = leave.employeeId;
      const dateKey = getISTDateString(leave.leaveDate);
      
      if (!leaveMap.has(empId)) {
        leaveMap.set(empId, new Set());
      }
      leaveMap.get(empId).add(dateKey);
    });

    // Get all holidays in the date range using IST boundaries
    const holidays = await Holiday.find({
      date: { $gte: startBoundary, $lte: endBoundary }
    });
    
    // Create a map of holidays by date for quick lookup using IST formatting
    const holidayMap = new Map();
    holidays.forEach(holiday => {
      const dateKey = getISTDateString(holiday.date);
      holidayMap.set(dateKey, holiday);
    });

    // Helper function to check if date is working day (using IST date key)
    const isWorkingDay = (date) => {
      const dateKey = getISTDateString(date);
      return isWorkingDayForCompany(date, holidayMap);
    };

    // Generate all calendar days in the range (including weekends)
    const allDays = [];
    const currentDate = new Date(startDateObj);
    
    while (currentDate <= endDateObj) {
      allDays.push({
        date: new Date(currentDate),
        isWorkingDay: isWorkingDay(currentDate)
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Build the complete attendance data
    const employeeAttendanceData = allEmployees.map(employee => {
      const empId = employee._id.toString();
      const employeeAttendance = attendanceMap.get(empId) || new Map();
      const employeeLeaves = leaveMap.get(employee.employeeId) || new Set();
      
      const weekData = {};
      
      allDays.forEach(dayObj => {
        const day = dayObj.date;
        const dateKey = getISTDateString(day);
        const attendanceRecord = employeeAttendance.get(dateKey);
        
        if (attendanceRecord) {
          // Has attendance record
          weekData[dateKey] = {
            _id: attendanceRecord._id,
            checkIn: attendanceRecord.checkIn,
            checkOut: attendanceRecord.checkOut,
            status: attendanceRecord.status || 'present',
            isWorkingDay: dayObj.isWorkingDay
          };
          
        } else if (employeeLeaves.has(dateKey)) {
          // On approved leave
          weekData[dateKey] = {
            checkIn: null,
            checkOut: null,
            status: 'leave',
            isWorkingDay: dayObj.isWorkingDay
          };
        } else {
          // Check if it's a holiday
          const isHoliday = holidayMap.has(dateKey);
          let status;
          if (isHoliday) {
            status = 'holiday';
          } else if (!dayObj.isWorkingDay) {
            status = 'weekend';
          } else {
            status = 'absent';
          }
          
          weekData[dateKey] = {
            checkIn: null,
            checkOut: null,
            status: status,
            isWorkingDay: dayObj.isWorkingDay && !isHoliday,
            holidayTitle: isHoliday ? holidayMap.get(dateKey).title : undefined
          };
          
        }
      });

      return {
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department
        },
        employeeName: `${employee.firstName} ${employee.lastName}`,
        weekData: weekData
      };
    });

    // Calculate summary stats for today if it's in the range (using IST)
    const todayForStats = getISTNow();
    const todayStatsKey = getISTDateString(todayForStats);
    let todayStats = { total: 0, present: 0, absent: 0, leave: 0, weekend: 0, holiday: 0 };
    
    if (allDays.some(dayObj => getISTDateString(dayObj.date) === todayStatsKey)) {
      employeeAttendanceData.forEach(record => {
        const todayData = record.weekData[todayStatsKey];
        if (todayData) {
          todayStats.total++;
          if (todayData.status === 'present' || todayData.checkIn) {
            todayStats.present++;
          } else if (todayData.status === 'leave') {
            todayStats.leave++;
          } else if (todayData.status === 'weekend') {
            todayStats.weekend++;
          } else if (todayData.status === 'holiday') {
            todayStats.holiday++;
          } else {
            todayStats.absent++;
          }
        }
      });
    }

    res.json(formatResponse(true, "Admin attendance range retrieved successfully", {
      records: employeeAttendanceData,
      allDays: allDays.map(dayObj => ({
        date: getISTDateString(dayObj.date),
        isWorkingDay: dayObj.isWorkingDay
      })),
      // Keep workingDays for backward compatibility
      workingDays: allDays.map(dayObj => getISTDateString(dayObj.date)),
      stats: todayStats,
      dateRange: {
        startDate: getISTDateString(startDateObj),
        endDate: getISTDateString(endDateObj)
      }
    }));

  } catch (err) {
    console.error("Error fetching admin attendance range:", err);
    res.status(500).json(formatResponse(false, "Failed to fetch admin attendance range", null, { server: err.message }));
  }
};

/**
 * Get employee attendance with absent days included for a date range
 * This shows all working days in the range, marking days without records as absent
 */
export const getEmployeeAttendanceWithAbsents = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    
    // Validate required parameters
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json(formatResponse(false, "Employee ID, start date, and end date are required"));
    }

    // Check authorization - employees can only view their own, admin/hr can view any
    if (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
      const userEmployeeObjId = await getEmployeeObjectId(req.user);
      const requestedEmployee = await Employee.findOne({ employeeId });
      
      if (!userEmployeeObjId || !requestedEmployee || 
          userEmployeeObjId.toString() !== requestedEmployee._id.toString()) {
        return res.status(403).json(formatResponse(false, "Access denied. You can only view your own attendance."));
      }
    }

    // Find the employee
    const employee = await Employee.findOne({ employeeId, isActive: true });
    if (!employee) {
      return res.status(404).json(formatResponse(false, "Employee not found"));
    }

    // Parse date range using IST boundaries
    const startDateObj = parseISTDateString(startDate);
    const endDateObj = parseISTDateString(endDate);
    
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDateObj);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDateObj);

    // Ensure we don't show attendance before joining date (IST)
    const { startOfDay: joiningDate } = getISTDayBoundaries(employee.joiningDate);
    
    // Adjust start date to be no earlier than joining date
    const effectiveStartDate = startBoundary >= joiningDate ? startBoundary : joiningDate;

    // Get all attendance records for the employee in this range using IST boundaries
    const attendanceRecords = await Attendance.find({
      employee: employee._id,
      date: { $gte: effectiveStartDate, $lte: endBoundary }
    }).sort({ date: -1 });

    // Get approved leaves for the employee in this range using IST boundaries
    const approvedLeaves = await Leave.find({
      employeeId: employee.employeeId,
      status: 'approved',
      leaveDate: { $gte: effectiveStartDate, $lte: endBoundary }
    });

    // Create a map for quick lookup using IST date keys
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const dateKey = getISTDateString(record.date);
      attendanceMap.set(dateKey, record);
    });

    // Create a map for approved leaves using IST date keys
    const leaveMap = new Map();
    approvedLeaves.forEach(leave => {
      const dateKey = getISTDateString(leave.leaveDate);
      leaveMap.set(dateKey, leave);
    });

    // 🚀 OPTIMIZED: Bulk fetch holidays for the entire date range (eliminates N+1 queries)
    const holidayMap = await getHolidaysInRange(effectiveStartDate, endBoundary);
    
    // Generate all days in the range (including weekends and holidays for proper display)
    const workingDays = [];
    const currentDate = new Date(effectiveStartDate);
    
    while (currentDate <= endBoundary) {
      const dateKey = getISTDateString(currentDate);
      
      // 🚀 Use optimized working day check with pre-fetched holiday map
      const isWorkingDay = isWorkingDayForCompany(currentDate, holidayMap);
      
      // Include all days - working days, weekends, and holidays
      const attendanceRecord = attendanceMap.get(dateKey);
      const approvedLeave = leaveMap.get(dateKey);
      
      // 🚀 O(1) holiday lookup using pre-fetched map
      const holiday = holidayMap.get(dateKey);
      
      if (holiday) {
        // It's a holiday
        workingDays.push({
          _id: attendanceRecord?._id || null,
          date: new Date(currentDate),
          checkIn: attendanceRecord?.checkIn || null,
          checkOut: attendanceRecord?.checkOut || null,
          status: 'holiday',
          workHours: null,
          comments: null,
          reason: null,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          holidayTitle: holiday.title || holiday.holidayName || 'Holiday'
        });
      } else if (!isWorkingDay) {
        // It's a weekend (Sunday or 2nd Saturday)
        workingDays.push({
          _id: attendanceRecord?._id || null,
          date: new Date(currentDate),
          checkIn: attendanceRecord?.checkIn || null,
          checkOut: attendanceRecord?.checkOut || null,
          status: 'weekend',
          workHours: null,
          comments: null,
          reason: null,
          employeeName: `${employee.firstName} ${employee.lastName}`
        });
      } else if (approvedLeave) {
        // Employee has an approved leave for this day
        workingDays.push({
          _id: attendanceRecord?._id || null,
          date: new Date(currentDate),
          checkIn: null,
          checkOut: null,
          status: 'leave',
          workHours: null,
          comments: `Leave: ${approvedLeave.leaveType}`,
          reason: approvedLeave.leaveReason || 'Approved leave',
          employeeName: `${employee.firstName} ${employee.lastName}`
        });
      } else if (attendanceRecord) {
        // Employee has a record for this day
        const workHours = calculateWorkHours(attendanceRecord.checkIn, attendanceRecord.checkOut);

        workingDays.push({
          _id: attendanceRecord._id,
          date: attendanceRecord.date,
          checkIn: attendanceRecord.checkIn,
          checkOut: attendanceRecord.checkOut,
          status: attendanceRecord.status,
          workHours: workHours,
          comments: attendanceRecord.comments,
          reason: attendanceRecord.reason,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          location: attendanceRecord.location // Include location data
        });
      } else {
        // Employee was absent this working day
        workingDays.push({
          _id: null,
          date: new Date(currentDate),
          checkIn: null,
          checkOut: null,
          status: 'absent',
          workHours: null,
          comments: null,
          reason: 'No check-in recorded',
          employeeName: `${employee.firstName} ${employee.lastName}`
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate statistics
    const totalWorkingDays = workingDays.length;
    const presentDays = workingDays.filter(day => day.status === 'present').length;
    const absentDays = workingDays.filter(day => day.status === 'absent').length;
    const attendancePercentage = totalWorkingDays > 0 ? ((presentDays / totalWorkingDays) * 100).toFixed(1) : 0;

    res.json(formatResponse(true, "Employee attendance with absents retrieved successfully", {
      records: workingDays,
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department,
        joiningDate: employee.joiningDate
      },
      statistics: {
        totalWorkingDays,
        presentDays,
        absentDays,
        attendancePercentage
      },
      dateRange: {
        requestedStartDate: startDate,
        requestedEndDate: endDate,
        effectiveStartDate: getISTDateString(effectiveStartDate),
        endDate: endDate,
        joiningDate: getISTDateString(joiningDate)
      }
    }));

  } catch (err) {
    console.error("Error fetching employee attendance with absents:", err);
    res.status(500).json(formatResponse(false, "Failed to fetch employee attendance", null, { server: err.message }));
  }
};

/**
 * Update attendance record (HR/Admin only)
 * Allows updating status, check-in, and check-out times
 */
export const updateAttendanceRecord = async (req, res) => {
  try {
    // Check authorization - only admin/hr can update attendance
    if (!req.user.role || (req.user.role !== 'admin' && req.user.role !== 'hr')) {
      return res.status(403).json(formatResponse(false, "Access denied. Only HR and Admin can update attendance records."));
    }

    const { recordId } = req.params;
    const { status, checkIn, checkOut } = req.body;

    // Validate status
    const validStatuses = ['present', 'absent', 'half-day', 'late'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json(formatResponse(false, "Invalid status. Must be one of: present, absent, half-day, late"));
    }

    // Handle creating new records or finding existing ones
    let attendanceRecord;
    
    if (recordId === 'new') {
      // Creating a new record for absent days
      const { employeeId, date } = req.body;
      if (!employeeId || !date) {
        return res.status(400).json(formatResponse(false, "Employee ID and date are required for creating new attendance record"));
      }

      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json(formatResponse(false, "Employee not found"));
      }

      // Create new attendance record with IST date
      const recordDate = parseISTDateString(date);
      const { startOfDay } = getISTDayBoundaries(recordDate);

      attendanceRecord = new Attendance({
        employee: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        date: startOfDay,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'present'
      });
    } else {
      // Find existing record
      attendanceRecord = await Attendance.findById(recordId);
      
      if (!attendanceRecord) {
        return res.status(404).json(formatResponse(false, "Attendance record not found"));
      }

      // Update existing record
      if (status) attendanceRecord.status = status;
      if (checkIn !== undefined) {
        attendanceRecord.checkIn = checkIn ? new Date(checkIn) : null;
      }
      if (checkOut !== undefined) {
        attendanceRecord.checkOut = checkOut ? new Date(checkOut) : null;
      }
    }

    // Auto-fill check-in and check-out based on status using IST business hours
    if (status) {
      const recordDate = new Date(attendanceRecord.date);
      const businessHours = getBusinessHours(recordDate);
      
      switch (status) {
        case 'present':
          // Only set defaults if not explicitly provided in request
          if (checkIn === undefined && !attendanceRecord.checkIn) {
            attendanceRecord.checkIn = businessHours.workStart;
          }
          if (checkOut === undefined && !attendanceRecord.checkOut) {
            attendanceRecord.checkOut = businessHours.workEnd;
          }
          break;
        case 'half-day':
          // Only set default check-in if not explicitly provided in request
          if (checkIn === undefined && !attendanceRecord.checkIn) {
            attendanceRecord.checkIn = businessHours.workStart;
          }
          // Set half-day checkout unless explicitly provided
          if (checkOut === undefined) {
            attendanceRecord.checkOut = businessHours.halfDayEnd;
          }
          break;
        case 'absent':
          attendanceRecord.checkIn = null;
          attendanceRecord.checkOut = null;
          attendanceRecord.workHours = 0;
          break;
        case 'late':
          // Set late check-in unless explicitly provided
          if (checkIn === undefined) {
            attendanceRecord.checkIn = businessHours.lateArrival;
          }
          // Only set default checkout if not explicitly provided in request
          if (checkOut === undefined && !attendanceRecord.checkOut) {
            attendanceRecord.checkOut = businessHours.workEnd;
          }
          break;
      }
    }

    await attendanceRecord.save();

    res.json(formatResponse(true, "Attendance record updated successfully", { attendance: attendanceRecord }));

  } catch (err) {
    console.error("Error updating attendance record:", err);
    console.error("Request body:", req.body);
    console.error("Record ID:", req.params.recordId);
    
    let errorMessage = "Failed to update attendance record";
    let errorDetails = { server: err.message };

    if (err.name === 'ValidationError') {
      errorMessage = "Invalid data for attendance update";
      errorDetails = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      console.error("Validation errors:", errorDetails);
      return res.status(400).json(formatResponse(false, errorMessage, null, errorDetails));
    }

    if (err.code === 11000) {
      errorMessage = "Attendance record already exists for this employee on this date";
      return res.status(409).json(formatResponse(false, errorMessage, null, { duplicate: "Attendance record already exists" }));
    }

    res.status(500).json(formatResponse(false, errorMessage, null, errorDetails));
  }
};

// Note: Default time functions have been replaced with IST utility functions
// Business hours are now handled by getBusinessHours() from istUtils.js

