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
  // First check if user has direct employee ObjectId reference
  if (user.employee) return user.employee;
  
  // If user has employeeId string, find the employee document
  if (user.employeeId) {
    const employee = await Employee.findOne({ employeeId: user.employeeId });
    return employee ? employee._id : null;
  }
  
  // Last resort: try to find employee by email match
  if (user.email) {
    const employee = await Employee.findOne({ email: user.email });
    return employee ? employee._id : null;
  }
  
  return null;
};

/**
 * Submit a standalone task report
 */
export const submitTaskReport = async (req, res) => {
  try {
    if (!req.user) {
      console.error("submitTaskReport: No user found in request");
      return res.status(401).json(formatResponse(false, "Authentication required", null, { auth: "No valid user found" }));
    }

    console.log("submitTaskReport: User found", { userId: req.user._id, email: req.user.email, role: req.user.role });

    const employeeObjId = await getEmployeeObjectId(req.user);
    if (!employeeObjId) {
      console.error("submitTaskReport: No employee ObjectId found for user", { 
        userId: req.user._id, 
        employeeId: req.user.employeeId,
        employee: req.user.employee 
      });
      return res.status(400).json(formatResponse(false, "No linked employee profile found for user"));
    }

    console.log("submitTaskReport: Employee ObjectId found", { employeeObjId });

    const { tasks, date } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      console.error("submitTaskReport: Invalid tasks data", { tasks });
      return res.status(400).json(formatResponse(false, "Tasks array is required and cannot be empty"));
    }

    // Filter out empty tasks and validate
    const validTasks = tasks.filter(task => task && typeof task === 'string' && task.trim() !== '');
    if (validTasks.length === 0) {
      console.error("submitTaskReport: No valid tasks after filtering", { tasks, validTasks });
      return res.status(400).json(formatResponse(false, "At least one non-empty task is required"));
    }

    const reportDate = date ? new Date(date) : new Date();
    
    // Check if a task report already exists for this date
    const existingReport = await TaskReport.findOne({
      employee: employeeObjId,
      date: {
        $gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate()),
        $lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 1)
      }
    });

    if (existingReport) {
      // Update existing report
      existingReport.tasks = validTasks;
      existingReport.updatedAt = new Date();
      
      // Ensure employeeId is set if missing
      if (!existingReport.employeeId) {
        const employee = await Employee.findById(employeeObjId);
        if (employee) {
          existingReport.employeeId = employee.employeeId;
        }
      }
      
      await existingReport.save();

      return res.json(formatResponse(true, "Task report updated successfully", { taskReport: existingReport }));
    } else {
      // Get employee details for employeeId
      const employee = await Employee.findById(employeeObjId);
      if (!employee) {
        console.error("submitTaskReport: Employee not found", { employeeObjId });
        return res.status(400).json(formatResponse(false, "Employee profile not found"));
      }

      // Create new report
      const taskReport = new TaskReport({
        employee: employeeObjId,
        employeeId: employee.employeeId,
        tasks: validTasks,
        date: reportDate
      });

      console.log("submitTaskReport: Attempting to save task report", { 
        employee: employeeObjId, 
        employeeId: employee.employeeId, 
        tasks: validTasks, 
        date: reportDate 
      });

      await taskReport.save();
      
      const populatedReport = await TaskReport.findById(taskReport._id)
        .populate('employee', 'firstName lastName employeeId department');

      console.log("submitTaskReport: Task report saved successfully", { taskReportId: taskReport._id });
      return res.status(201).json(formatResponse(true, "Task report submitted successfully", { taskReport: populatedReport }));
    }

  } catch (err) {
    console.error("Error submitting task report:", err);
    console.error("Request body:", req.body);
    console.error("User data:", { 
      userId: req.user?._id, 
      employeeId: req.user?.employeeId, 
      employee: req.user?.employee 
    });
    
    // Handle validation errors specifically
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors).reduce((acc, key) => {
        acc[key] = err.errors[key].message;
        return acc;
      }, {});
      console.error("Validation errors:", validationErrors);
      return res.status(400).json(
        formatResponse(false, "Validation failed", null, validationErrors)
      );
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      console.error("Duplicate key error:", err.keyValue);
      return res.status(409).json(
        formatResponse(false, "A task report already exists for this date", null, {
          duplicate: "Task report for this date already exists"
        })
      );
    }
    
    res.status(500).json(
      formatResponse(false, "Failed to submit task report.", null, {
        server: err.message
      })
    );
  }
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