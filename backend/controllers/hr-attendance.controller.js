import Attendance from '../models/Attendance.model.js';
import Employee from '../models/Employee.model.js';
import { formatResponse } from '../utils/response.js';

/**
 * Simplified HR Attendance Controller
 * Working with existing HRMS infrastructure
 */

class HRAttendanceController {
  
  /**
   * Main HR Attendance API Handler
   * GET/POST/PUT /api/hr/attendance
   */
  async handleAttendanceRequest(req, res, next) {
    try {
      const { method } = req;
      const operation = req.query.operation || 'overview';

      // Route to appropriate handler based on operation and method
      switch (`${method}:${operation}`) {
        case 'GET:overview':
          return await this.getAttendanceOverview(req, res);
        
        case 'GET:records':
          return await this.getAttendanceRecords(req, res);
        
        case 'GET:employee':
          return await this.getEmployeeAttendance(req, res);
        
        default:
          return res.status(400).json(formatResponse(false, `Unsupported operation: ${method}:${operation}`));
      }

    } catch (error) {
      console.error('HR Attendance API Error:', error);
      return res.status(500).json(formatResponse(false, 'Internal server error'));
    }
  }

  /**
   * GET /api/hr/attendance?operation=overview
   * Real-time attendance dashboard for HR
   */
  async getAttendanceOverview(req, res) {
    try {
      const { date = new Date().toISOString().split('T')[0] } = req.query;
      
      // Get today's attendance overview
      const totalEmployees = await Employee.countDocuments({ status: 'active' });
      
      const todayAttendance = await Attendance.find({
        date: { $gte: new Date(date), $lt: new Date(Date.parse(date) + 86400000) }
      }).populate('employeeId', 'firstName lastName employeeId');
      
      const presentCount = todayAttendance.filter(att => ['present', 'late'].includes(att.status)).length;
      const lateCount = todayAttendance.filter(att => att.status === 'late').length;
      const absentCount = totalEmployees - presentCount;
      
      const overview = {
        statistics: {
          totalEmployees,
          presentToday: presentCount,
          absentToday: absentCount,
          lateToday: lateCount,
          attendanceRate: totalEmployees > 0 ? ((presentCount / totalEmployees) * 100).toFixed(1) : 0,
          punctualityRate: presentCount > 0 ? (((presentCount - lateCount) / presentCount) * 100).toFixed(1) : 0
        },
        insights: [
          presentCount > totalEmployees * 0.9 ? "Excellent attendance today!" : "Attendance could be improved",
          lateCount > presentCount * 0.1 ? "High number of late arrivals today" : "Good punctuality today"
        ]
      };

      return res.status(200).json(formatResponse(true, 'Attendance overview retrieved successfully', {
        overview,
        metadata: {
          generatedAt: new Date().toISOString(),
          requestedBy: req.user?.role || 'unknown',
          date
        }
      }));
      
    } catch (error) {
      console.error('Get attendance overview error:', error);
      return res.status(500).json(formatResponse(false, 'Failed to retrieve attendance overview', null, { error: error.message }));
    }
  }

  /**
   * GET /api/hr/attendance?operation=records
   * Comprehensive attendance records with filtering
   */
  async getAttendanceRecords(req, res) {
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

      const totalRecords = await Attendance.countDocuments(query);
      
      const records = await Attendance.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const formattedRecords = records.map(record => ({
        date: record.date.toISOString().split('T')[0],
        employeeName: record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : 'Unknown',
        employeeId: record.employeeId?.employeeId || 'N/A',
        department: record.employeeId?.department || 'N/A',
        status: record.status,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        workingHours: record.workingHours || 0
      }));

      return res.status(200).json(formatResponse(true, 'Attendance records retrieved successfully', {
        records: formattedRecords,
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
      console.error('Get attendance records error:', error);
      return res.status(500).json(formatResponse(false, 'Failed to retrieve attendance records', null, { error: error.message }));
    }
  }

  /**
   * GET /api/hr/attendance?operation=employee&employeeId=EMP001
   * Individual employee attendance analysis
   */
  async getEmployeeAttendance(req, res) {
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

      const attendance = await Attendance.find({
        employeeId: employee._id,
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).sort({ date: -1 });

      const totalDays = attendance.length;
      const presentDays = attendance.filter(att => ['present', 'late'].includes(att.status)).length;
      const lateDays = attendance.filter(att => att.status === 'late').length;
      
      const analysis = {
        attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0,
        punctualityScore: presentDays > 0 ? (((presentDays - lateDays) / presentDays) * 100).toFixed(1) : 0,
        totalDays,
        presentDays,
        absentDays: totalDays - presentDays,
        lateDays
      };

      return res.status(200).json(formatResponse(true, 'Employee attendance retrieved successfully', {
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          position: employee.position
        },
        analysis,
        records: attendance.map(att => ({
          date: att.date.toISOString().split('T')[0],
          status: att.status,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          workingHours: att.workingHours || 0
        })),
        metadata: {
          employeeId,
          dateRange: { startDate, endDate },
          generatedAt: new Date().toISOString()
        }
      }));
      
    } catch (error) {
      console.error('Get employee attendance error:', error);
      return res.status(500).json(formatResponse(false, 'Failed to retrieve employee attendance', null, { error: error.message }));
    }
  }
}

export default new HRAttendanceController();