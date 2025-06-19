import TaskReport from "../models/TaskReport.model.js";
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
 * Get employee's own task reports
 */
export const getMyTaskReports = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(formatResponse(false, "Authentication required", null, { auth: "No valid user found" }));
    }

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
    }

    const { startDate, endDate } = req.query;
    const filter = { employee: employeeObjId };

    // Filter by date range
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      filter.date = { ...filter.date, $gte: startOfDay };
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999); // End of day in UTC
      filter.date = { ...filter.date, $lte: endOfDay };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      TaskReport.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName employeeId department'),
      TaskReport.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json(
      formatResponse(true, "My task reports retrieved successfully.", {
        reports,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      })
    );

  } catch (err) {
    console.error("Error fetching my task reports:", err);
    res.status(500).json(
      formatResponse(false, "Failed to retrieve my task reports.", null, {
        server: err.message
      })
    );
  }
};

/**
 * Get task reports with optional filtering (for HR/Admin)
 */
export const getTaskReports = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const filter = {};

    // Filter by employee if employeeId is provided
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) {
        filter.employee = employee._id;
      } else {
        // If an invalid employeeId is given, no reports will be found
        return res.json(formatResponse(true, "No reports found for this employee ID.", { records: [] }));
      }
    }

    // Filter by date range
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      filter.date = { ...filter.date, $gte: startOfDay };
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999); // End of day in UTC
      filter.date = { ...filter.date, $lte: endOfDay };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      TaskReport.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName employeeId department'),
      TaskReport.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json(
      formatResponse(true, "Task reports retrieved successfully.", {
        reports,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      })
    );

  } catch (err) {
    console.error("Error fetching task reports:", err);
    res.status(500).json(
      formatResponse(false, "Failed to retrieve task reports.", null, {
        server: err.message
      })
    );
  }
}; 