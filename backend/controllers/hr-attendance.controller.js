import Attendance from '../models/Attendance.model.js';
import Employee from '../models/Employee.model.js';
import { formatResponse } from '../utils/response.js';

/**
 * HR Attendance Controller
 * Standalone read-only API for attendance data retrieval
 * Supports: employee names, date ranges, attendance statistics
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
      const { date } = req.query;
      
      // Default to today if no date specified
      let targetDate = date ? new Date(date) : new Date();
      
      // Set date boundaries for the target date
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      // Get all active employees (fix: use isActive instead of status)
      const totalEmployees = await Employee.countDocuments({ isActive: true });
      
      // Get attendance records for the target date (fix: use employee instead of employeeId)
      const attendanceRecords = await Attendance.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).populate('employee', 'firstName lastName employeeId department');
      
      // Calculate statistics (include half-day)
      const presentCount = attendanceRecords.filter(att => 
        ['present', 'late', 'half-day'].includes(att.status)
      ).length;
      
      const lateCount = attendanceRecords.filter(att => att.status === 'late').length;
      const halfDayCount = attendanceRecords.filter(att => att.status === 'half-day').length;
      const absentCount = totalEmployees - presentCount;
      
      const attendanceRate = totalEmployees > 0 ? ((presentCount / totalEmployees) * 100).toFixed(1) : 0;
      const punctualityRate = presentCount > 0 ? (((presentCount - lateCount) / presentCount) * 100).toFixed(1) : 0;

      const overview = {
        statistics: {
          totalEmployees,
          presentToday: presentCount,
          absentToday: absentCount,
          lateToday: lateCount,
          halfDayToday: halfDayCount,
          attendanceRate: parseFloat(attendanceRate),
          punctualityRate: parseFloat(punctualityRate)
        },
        insights: [
          parseFloat(attendanceRate) > 90 ? "Excellent attendance today!" : "Attendance could be improved",
          lateCount > presentCount * 0.1 ? "High number of late arrivals today" : "Good punctuality today",
          halfDayCount > 0 ? `${halfDayCount} employees marked as half-day` : "No half-day records today"
        ]
      };

      return res.status(200).json(formatResponse(true, 'Attendance overview retrieved successfully', {
        overview,
        metadata: {
          generatedAt: new Date().toISOString(),
          requestedBy: req.user?.role || 'unknown',
          date: targetDate.toISOString().split('T')[0]
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
        employeeId,
        employeeName,
        page = 1,
        limit = 50
      } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json(formatResponse(false, 'Start date and end date are required'));
      }

      // Build query with date range
      const query = {
        date: {
          $gte: new Date(startDate + 'T00:00:00.000Z'),
          $lte: new Date(endDate + 'T23:59:59.999Z')
        }
      };

      // Filter by specific employee if provided
      if (employeeId) {
        const employee = await Employee.findOne({ employeeId, isActive: true });
        if (employee) {
          query.employee = employee._id;
        } else {
          return res.status(404).json(formatResponse(false, 'Employee not found'));
        }
      }

      // Filter by employee name if provided (supports partial matching)
      if (employeeName && !employeeId) {
        const employees = await Employee.find({
          isActive: true,
          $or: [
            { firstName: { $regex: employeeName, $options: 'i' } },
            { lastName: { $regex: employeeName, $options: 'i' } },
            { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: employeeName, options: 'i' } } }
          ]
        }).select('_id');
        
        if (employees.length > 0) {
          query.employee = { $in: employees.map(emp => emp._id) };
        } else {
          return res.status(404).json(formatResponse(false, 'No employees found with that name'));
        }
      }

      const totalRecords = await Attendance.countDocuments(query);
      
      const records = await Attendance.find(query)
        .populate('employee', 'firstName lastName employeeId department')
        .sort({ date: -1, 'employee.firstName': 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const formattedRecords = records.map(record => ({
        date: record.date.toISOString().split('T')[0],
        employeeName: record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Unknown',
        employeeId: record.employee?.employeeId || 'N/A',
        department: record.employee?.department || 'N/A',
        status: record.status,
        checkIn: record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : null,
        checkOut: record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : null,
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
        employeeName,
        startDate,
        endDate
      } = req.query;

      if ((!employeeId && !employeeName) || !startDate || !endDate) {
        return res.status(400).json(formatResponse(false, 'Employee ID or name, start date, and end date are required'));
      }

      // Find employee by ID or name
      let employee;
      if (employeeId) {
        employee = await Employee.findOne({ employeeId, isActive: true });
      } else if (employeeName) {
        employee = await Employee.findOne({
          isActive: true,
          $or: [
            { $expr: { $regexMatch: { input: { $concat: ['$firstName', ' ', '$lastName'] }, regex: employeeName, options: 'i' } } },
            { firstName: { $regex: employeeName, $options: 'i' } },
            { lastName: { $regex: employeeName, $options: 'i' } }
          ]
        });
      }

      if (!employee) {
        return res.status(404).json(formatResponse(false, 'Employee not found'));
      }

      const attendance = await Attendance.find({
        employee: employee._id,  // Fix: use employee instead of employeeId
        date: {
          $gte: new Date(startDate + 'T00:00:00.000Z'),
          $lte: new Date(endDate + 'T23:59:59.999Z')
        }
      }).sort({ date: -1 });

      const totalDays = attendance.length;
      const presentDays = attendance.filter(att => ['present', 'late', 'half-day'].includes(att.status)).length;
      const lateDays = attendance.filter(att => att.status === 'late').length;
      const halfDays = attendance.filter(att => att.status === 'half-day').length;
      
      const analysis = {
        attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0,
        punctualityScore: presentDays > 0 ? (((presentDays - lateDays) / presentDays) * 100).toFixed(1) : 0,
        totalDays,
        presentDays,
        absentDays: totalDays - presentDays,
        lateDays,
        halfDays
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