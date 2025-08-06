import TaskReport from '../models/TaskReport.model.js';
import Employee from '../models/Employee.model.js';
import { formatResponse } from '../utils/response.js';

/**
 * Simplified HR Task Reports Controller
 * Working with existing HRMS infrastructure
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
      const totalEmployees = await Employee.countDocuments({ status: 'active' });
      
      const taskReports = await TaskReport.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('employeeId', 'firstName lastName employeeId department');
      
      const employeesWithTasks = new Set(taskReports.map(report => report.employeeId?._id?.toString())).size;
      const taskReportingRate = totalEmployees > 0 ? ((employeesWithTasks / totalEmployees) * 100).toFixed(1) : 0;
      
      // Calculate average scores
      const avgProductivityScore = taskReports.length > 0 
        ? (taskReports.reduce((sum, report) => sum + (report.productivityScore || 0), 0) / taskReports.length).toFixed(1)
        : 0;
      
      const avgQualityScore = taskReports.length > 0
        ? (taskReports.reduce((sum, report) => sum + (report.qualityScore || 0), 0) / taskReports.length).toFixed(1)
        : 0;
      
      // Get top performers
      const employeeScores = {};
      taskReports.forEach(report => {
        const empId = report.employeeId?._id?.toString();
        if (empId && report.employeeId) {
          if (!employeeScores[empId]) {
            employeeScores[empId] = {
              name: `${report.employeeId.firstName} ${report.employeeId.lastName}`,
              department: report.employeeId.department,
              scores: [],
              totalReports: 0
            };
          }
          employeeScores[empId].scores.push(report.qualityScore || 0);
          employeeScores[empId].totalReports++;
        }
      });
      
      const topPerformers = Object.values(employeeScores)
        .map(emp => ({
          ...emp,
          avgQualityScore: emp.scores.length > 0 
            ? (emp.scores.reduce((a, b) => a + b, 0) / emp.scores.length).toFixed(1)
            : 0
        }))
        .sort((a, b) => parseFloat(b.avgQualityScore) - parseFloat(a.avgQualityScore))
        .slice(0, 5);

      const overview = {
        statistics: {
          totalEmployees,
          employeesWithTasks,
          taskReportingRate: parseFloat(taskReportingRate),
          avgProductivityScore: parseFloat(avgProductivityScore),
          avgQualityScore: parseFloat(avgQualityScore),
          totalReports: taskReports.length,
          completionRate: taskReports.length > 0 ? 100 : 0 // Simplified
        },
        topPerformers: topPerformers.slice(0, 3),
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
   * Comprehensive task reports with filtering
   */
  async getTaskReports(req, res) {
    try {
      const {
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json(formatResponse(false, 'Start date and end date are required'));
      }

      const query = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const totalRecords = await TaskReport.countDocuments(query);
      
      const reports = await TaskReport.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const formattedReports = reports.map(report => ({
        date: report.date.toISOString().split('T')[0],
        employeeName: report.employeeId ? `${report.employeeId.firstName} ${report.employeeId.lastName}` : 'Unknown',
        employeeId: report.employeeId?.employeeId || 'N/A',
        department: report.employeeId?.department || 'N/A',
        tasks: report.tasks || [],
        taskCount: (report.tasks || []).length,
        productivityScore: report.productivityScore || 0,
        qualityScore: report.qualityScore || 0,
        category: report.category || 'general'
      }));

      return res.status(200).json(formatResponse(true, 'Task reports retrieved successfully', {
        reports: formattedReports,
        pagination: {
          total: totalRecords,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalRecords / parseInt(limit))
        },
        metadata: {
          query: { startDate, endDate },
          performance: {
            totalRecords,
            processingTime: `${Date.now() - (req.startTime || Date.now())}ms`
          }
        }
      }));
      
    } catch (error) {
      console.error('Get task reports error:', error);
      return res.status(500).json(formatResponse(false, 'Failed to retrieve task reports', null, { error: error.message }));
    }
  }

  /**
   * GET /api/hr/task-reports?operation=employee&employeeId=EMP001
   * Individual employee task reports analysis
   */
  async getEmployeeTaskReports(req, res) {
    try {
      const {
        employeeId,
        startDate,
        endDate
      } = req.query;

      if (!employeeId || !startDate || !endDate) {
        return res.status(400).json(formatResponse(false, 'Employee ID, start date, and end date are required'));
      }

      const employee = await Employee.findOne({ employeeId });
      if (!employee) {
        return res.status(404).json(formatResponse(false, 'Employee not found'));
      }

      const taskReports = await TaskReport.find({
        employeeId: employee._id,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).sort({ date: -1 });

      const totalReports = taskReports.length;
      const avgProductivityScore = totalReports > 0 
        ? (taskReports.reduce((sum, report) => sum + (report.productivityScore || 0), 0) / totalReports).toFixed(1)
        : 0;
      const avgQualityScore = totalReports > 0
        ? (taskReports.reduce((sum, report) => sum + (report.qualityScore || 0), 0) / totalReports).toFixed(1)
        : 0;
      
      // Get task categories
      const taskCategories = {};
      taskReports.forEach(report => {
        const category = report.category || 'general';
        taskCategories[category] = (taskCategories[category] || 0) + 1;
      });
      
      const analysis = {
        productivityScore: parseFloat(avgProductivityScore),
        qualityScore: parseFloat(avgQualityScore),
        totalReports,
        taskCategories
      };

      // Generate simple recommendations
      const recommendations = [];
      if (parseFloat(avgProductivityScore) < 70) {
        recommendations.push('Focus on improving productivity scores');
      }
      if (parseFloat(avgQualityScore) < 70) {
        recommendations.push('Work on enhancing task quality');
      }
      if (totalReports === 0) {
        recommendations.push('Start submitting regular task reports');
      }

      return res.status(200).json(formatResponse(true, 'Employee task reports retrieved successfully', {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position
        },
        analysis,
        records: taskReports.map(report => ({
          date: report.date.toISOString().split('T')[0],
          tasks: report.tasks || [],
          taskCount: (report.tasks || []).length,
          productivityScore: report.productivityScore || 0,
          qualityScore: report.qualityScore || 0,
          category: report.category || 'general'
        })),
        recommendations,
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