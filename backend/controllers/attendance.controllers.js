import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import TaskReport from "../models/TaskReport.model.js";

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

    // Determine start and end of the current day in UTC
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    let attendance = await Attendance.findOne({
      employee: employeeObjId,
      date: { $gte: startOfTodayUTC, $lte: endOfTodayUTC }
    });

    if (attendance) {
      return res.status(400).json(formatResponse(false, "Already checked in for today"));
    }
    
    // Create new attendance record
    // Ensure the 'date' field also aligns with this UTC day concept if necessary,
    // though storing the exact timestamp of check-in is common.
    // For this fix, we're primarily concerned with the query for existing records.
    // The `new Date()` for `date` and `checkIn` fields will store the exact current UTC timestamp.
    const employeeDoc = await Employee.findById(employeeObjId);
    attendance = await Attendance.create({
      employee: employeeObjId,
      employeeName: employeeDoc ? `${employeeDoc.firstName} ${employeeDoc.lastName}` : "",
      date: new Date(), // Exact timestamp of check-in
      checkIn: new Date(), // Exact timestamp of check-in
      status: "present"
    });
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

    // Use UTC to define the current day, consistent with check-in
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const attendance = await Attendance.findOne({
      employee: employeeObjId,
      date: { $gte: startOfTodayUTC, $lte: endOfTodayUTC }
    });

    if (!attendance) {
      return res.status(400).json(formatResponse(false, "No check-in record found for today"));
    }
    if (attendance.checkOut) {
      return res.status(400).json(formatResponse(false, "Already checked out for today"));
    }

    // 1. Create and save the task report
    await TaskReport.create({
      employee: employeeObjId,
      employeeId: req.user.employeeId,
      date: attendance.date, // Use the date from the attendance record
      tasks: tasks.filter(t => typeof t === 'string' && t.trim() !== ''), // Sanitize tasks
    });

    // 2. Update attendance with checkout time
    attendance.checkOut = new Date();
    await attendance.save();

    res.json(formatResponse(true, "Checked out successfully with task report.", { attendance }));

  } catch (err) {
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
    // Date range filter
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0); // Set to start of day UTC
      filter.date = { ...filter.date, $gte: startOfDay };
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999); // Set to end of day UTC
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

    // Get current date and set boundaries
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    
    // Look back 7 days for missing checkouts (configurable)
    const lookbackDays = 7;
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - lookbackDays);

    console.log("📅 Date range:", { startDate, today, lookbackDays });

    // Find attendance records where checkIn exists but checkOut is null/missing
    // and the date is before today
    const missingCheckouts = await Attendance.find({
      employee: employeeObjId,
      date: { 
        $gte: startDate, 
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

    // Also check if there are pending regularization requests for these dates
    // to avoid showing reminders for dates already being processed
    const RegularizationRequest = (await import("../models/Regularization.model.js")).default;
    const pendingRegularizations = await RegularizationRequest.find({
      employeeId: req.user.employeeId,
      status: "pending",
      date: { 
        $gte: startDate, 
        $lt: today 
      }
    });

    console.log("📝 Pending regularizations found:", pendingRegularizations.length);

    // Filter out dates that already have pending regularization requests
    const pendingDates = new Set(
      pendingRegularizations.map(reg => reg.date.toISOString().split('T')[0])
    );

    console.log("📅 Pending dates set:", Array.from(pendingDates));

    const reminderNeeded = missingCheckouts.filter(attendance => {
      const attendanceDate = new Date(attendance.date).toISOString().split('T')[0];
      return !pendingDates.has(attendanceDate);
    });

    console.log("🎯 Final reminder needed:", reminderNeeded.length, "records");

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

    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const filter = { employee: employeeObjId };

    // Date range filtering
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      filter.date = { ...filter.date, $gte: startOfDay };
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
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

    // Calculate work hours and enhance records
    const enhancedRecords = records.map(record => {
      let workHours = null;
      if (record.checkIn && record.checkOut) {
        const checkInTime = new Date(record.checkIn);
        const checkOutTime = new Date(record.checkOut);
        workHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)); // Convert to hours
      }

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

    // Get today's date boundaries in UTC
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Get all active employees
    const allEmployees = await Employee.find({ isActive: true })
      .select('_id firstName lastName employeeId department position')
      .sort({ firstName: 1, lastName: 1 });

    // Get today's attendance records
    const todayAttendance = await Attendance.find({
      date: { $gte: startOfTodayUTC, $lte: endOfTodayUTC }
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
          const checkInTime = new Date(attendanceRecord.checkIn);
          const checkOutTime = new Date(attendanceRecord.checkOut);
          workHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)); // Convert to hours
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
          date: startOfTodayUTC,
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
      date: startOfTodayUTC.toISOString().split('T')[0]
    }));

  } catch (err) {
    console.error("Error fetching today's attendance with absents:", err);
    res.status(500).json(formatResponse(false, "Failed to fetch today's attendance", null, { server: err.message }));
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

    // Parse date range
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    startDateObj.setUTCHours(0, 0, 0, 0);
    endDateObj.setUTCHours(23, 59, 59, 999);

    // Get all attendance records for the employee in this range
    const attendanceRecords = await Attendance.find({
      employee: employee._id,
      date: { $gte: startDateObj, $lte: endDateObj }
    }).sort({ date: -1 });

    // Create a map for quick lookup
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      attendanceMap.set(dateKey, record);
    });

    // Generate all working days in the range (excluding weekends)
    const workingDays = [];
    const currentDate = new Date(startDateObj);
    
    while (currentDate <= endDateObj) {
      const dayOfWeek = currentDate.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const attendanceRecord = attendanceMap.get(dateKey);
        
        if (attendanceRecord) {
          // Employee has a record for this day
          let workHours = null;
          if (attendanceRecord.checkIn && attendanceRecord.checkOut) {
            const checkInTime = new Date(attendanceRecord.checkIn);
            const checkOutTime = new Date(attendanceRecord.checkOut);
            workHours = ((checkOutTime - checkInTime) / (1000 * 60 * 60));
          }

          workingDays.push({
            _id: attendanceRecord._id,
            date: attendanceRecord.date,
            checkIn: attendanceRecord.checkIn,
            checkOut: attendanceRecord.checkOut,
            status: attendanceRecord.status,
            workHours: workHours,
            comments: attendanceRecord.comments,
            reason: attendanceRecord.reason,
            employeeName: `${employee.firstName} ${employee.lastName}`
          });
        } else {
          // Employee was absent this day
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
        department: employee.department
      },
      statistics: {
        totalWorkingDays,
        presentDays,
        absentDays,
        attendancePercentage
      },
      dateRange: {
        startDate: startDate,
        endDate: endDate
      }
    }));

  } catch (err) {
    console.error("Error fetching employee attendance with absents:", err);
    res.status(500).json(formatResponse(false, "Failed to fetch employee attendance", null, { server: err.message }));
  }
};