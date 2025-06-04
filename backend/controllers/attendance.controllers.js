import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";

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
    if (!req.user) {
      return res.status(401).json(formatResponse(false, "Authentication required", null, { auth: "No valid user found" }));
    }
    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
    }
    const today = new Date().setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({
      employee: employeeObjId,
      date: { $gte: new Date(today), $lt: new Date(today + 24 * 60 * 60 * 1000) }
    });
    if (!attendance) {
      return res.status(400).json(formatResponse(false, "No check-in record found for today"));
    }
    if (attendance.checkOut) {
      return res.status(400).json(formatResponse(false, "Already checked out for today"));
    }
    attendance.checkOut = new Date();
    await attendance.save();
    res.json(formatResponse(true, "Checked out successfully", { attendance }));
  } catch (err) {
    let errorMessage = "Check-out failed";
    let errorDetails = { server: err.message };
    if (err.name === 'ValidationError') {
      errorMessage = "Invalid data for check-out";
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