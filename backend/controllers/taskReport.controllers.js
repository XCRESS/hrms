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