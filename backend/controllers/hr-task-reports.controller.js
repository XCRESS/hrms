import TaskReport from '../models/TaskReport.model.js';
import Employee from '../models/Employee.model.js';
import { formatResponse } from '../utils/response.js';

/**
 * HR Task Reports Controller
 * Simple API for task report data - matches existing TaskReport structure
 */

class HRTaskReportsController {
  
  /**
   * Main HR Task Reports API Handler
   * GET/POST/PUT /api/hr/task-reports
   */
  async handleTaskReportsRequest(req, res, next) {
    try {
      const { method } = req;
      const operation = req.query.operation || 'overview';

      // Route to appropriate handler based on operation and method
      switch (`${method}:${operation}`) {
        case 'GET:overview':
          return await this.getTaskReportsOverview(req, res);
        
        case 'GET:reports':
          return await this.getTaskReports(req, res);
        
        case 'GET:employee':
          return await this.getEmployeeTaskReports(req, res);
        
        default:
          return res.status(400).json(formatResponse(false, `Unsupported operation: ${method}:${operation}`));
      }

    } catch (error) {
      console.error('HR Task Reports API Error:', error);
      return res.status(500).json(formatResponse(false, 'Internal server error'));
    }
  }

  /**
   * GET /api/hr/task-reports?operation=overview
   * Real-time task reports dashboard for HR
   */
  async getTaskReportsOverview(req, res) {
    try {
      const { 
        period = 'month'
      } = req.query;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate, endDate = now;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }
      
      // Get task reports overview
      const totalEmployees = await Employee.countDocuments({ isActive: true });
      
      const taskReports = await TaskReport.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('employee', 'firstName lastName employeeId department');
      
      const employeesWithTasks = new Set(taskReports.map(report => report.employee?._id?.toString())).size;
      const taskReportingRate = totalEmployees > 0 ? ((employeesWithTasks / totalEmployees) * 100).toFixed(1) : 0;
      
      // Calculate total tasks reported
      const totalTasks = taskReports.reduce((sum, report) => sum + (report.tasks?.length || 0), 0);
      const avgTasksPerReport = taskReports.length > 0 ? (totalTasks / taskReports.length).toFixed(1) : 0;

      const overview = {
        statistics: {
          totalEmployees,
          employeesWithTasks,
          taskReportingRate: parseFloat(taskReportingRate),
          totalReports: taskReports.length,
          totalTasks,
          avgTasksPerReport: parseFloat(avgTasksPerReport)
        },
        period: period
      };

      return res.status(200).json(formatResponse(true, 'Task reports overview retrieved successfully', {
        overview,
        metadata: {
          period,
          generatedAt: new Date().toISOString(),
          requestedBy: req.user?.role || 'unknown'
        }
      }));
      
    } catch (error) {
      console.error('Get task reports overview error:', error);
      return res.status(500).json(formatResponse(false, 'Failed to retrieve task reports overview', null, { error: error.message }));
    }
  }

  /**
   * GET /api/hr/task-reports?operation=reports
   * Get task reports with filtering - matches existing getTaskReports API
   */
  async getTaskReports(req, res) {
    try {
      const { employeeId, startDate, endDate, page = 1, limit = 50 } = req.query;
      const filter = {};

      // Filter by employee if employeeId is provided
      if (employeeId) {
        const employee = await Employee.findOne({ employeeId });
        if (employee) {
          filter.employee = employee._id;
        } else {
          return res.json(formatResponse(true, "No reports found for this employee ID.", { reports: [] }));
        }
      }

      // Filter by date range
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

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [reports, total] = await Promise.all([
        TaskReport.find(filter)
          .sort({ date: -1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('employee', 'firstName lastName employeeId department'),
        TaskReport.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      return res.status(200).json(formatResponse(true, 'Task reports retrieved successfully', {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      }));
      
    } catch (error) {
      console.error('Get task reports error:', error);
      return res.status(500).json(formatResponse(false, 'Failed to retrieve task reports', null, { error: error.message }));
    }
  }

  /**
   * GET /api/hr/task-reports?operation=employee&employeeId=EMP001
   * Individual employee task reports - simple analysis based on actual data
   */
  async getEmployeeTaskReports(req, res) {
    try {
      const { employeeId, startDate, endDate } = req.query;

      if (!employeeId) {
        return res.status(400).json(formatResponse(false, 'Employee ID is required'));
      }

      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json(formatResponse(false, 'Employee not found'));
      }

      const filter = { employee: employee._id };
      
      // Filter by date range if provided
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

      const taskReports = await TaskReport.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .populate('employee', 'firstName lastName employeeId department');

      const totalReports = taskReports.length;
      const totalTasks = taskReports.reduce((sum, report) => sum + (report.tasks?.length || 0), 0);
      const avgTasksPerReport = totalReports > 0 ? (totalTasks / totalReports).toFixed(1) : 0;
      
      const analysis = {
        totalReports,
        totalTasks,
        avgTasksPerReport: parseFloat(avgTasksPerReport)
      };

      return res.status(200).json(formatResponse(true, 'Employee task reports retrieved successfully', {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position
        },
        analysis,
        reports: taskReports.map(report => ({
          date: report.date.toISOString().split('T')[0],
          tasks: report.tasks || [],
          taskCount: (report.tasks || []).length
        })),
        metadata: {
          employeeId,
          dateRange: { startDate, endDate },
          generatedAt: new Date().toISOString()
        }
      }));
      
    } catch (error) {
      console.error('Get employee task reports error:', error);
      return res.status(500).json(formatResponse(false, 'Failed to retrieve employee task reports', null, { error: error.message }));
    }
  }
}

export default new HRTaskReportsController();