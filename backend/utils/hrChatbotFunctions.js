/**
 * HR Chatbot Function Utilities
 * Provides OpenAI function definitions and implementations for HR-related queries
 * These functions are read-only and safe for employee use
 */

import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import Leave from '../models/Leave.model.js';
import SalarySlip from '../models/SalarySlip.model.js';
import TaskReport from '../models/TaskReport.model.js';
import Holiday from '../models/Holiday.model.js';
import moment from 'moment-timezone';

// Get current date/time in IST
const getCurrentIST = () => {
  return moment.tz('Asia/Kolkata');
};

/**
 * Function Definitions for OpenAI GPT-5
 * These are the function schemas that OpenAI will use to understand available functions
 * Using strict mode for reliable function calls
 */
export const HR_FUNCTIONS = [
  {
    type: "function",
    name: "get_employee_attendance_summary",
    description: "Get attendance summary for employees within a date range. Shows present, absent, late, and half-day statistics with employee breakdown.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: ["string", "null"],
          description: "Start date in YYYY-MM-DD format. If not provided, uses current month start."
        },
        endDate: {
          type: ["string", "null"],
          description: "End date in YYYY-MM-DD format. If not provided, uses current date."
        },
        employeeId: {
          type: ["string", "null"],
          description: "Optional specific employee ID to filter results"
        }
      },
      required: ["startDate", "endDate", "employeeId"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_detailed_attendance_with_times",
    description: "Get detailed attendance records with check-in and check-out times for employees within a date range. Shows actual timestamps for each employee.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: ["string", "null"],
          description: "Start date in YYYY-MM-DD format. If not provided, uses current date."
        },
        endDate: {
          type: ["string", "null"],
          description: "End date in YYYY-MM-DD format. If not provided, uses current date."
        },
        employeeId: {
          type: ["string", "null"],
          description: "Optional specific employee ID to filter results"
        }
      },
      required: ["startDate", "endDate", "employeeId"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_employee_count_by_tenure",
    description: "Get count of employees who have completed a specific tenure (e.g., 6 months, 1 year) from their joining date.",
    parameters: {
      type: "object",
      properties: {
        months: {
          type: "integer",
          description: "Number of months of tenure to check (e.g., 6 for 6 months, 12 for 1 year)"
        }
      },
      required: ["months"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_leave_statistics",
    description: "Get leave statistics including pending, approved, and rejected leaves within a date range with employee details.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: ["string", "null"],
          description: "Start date in YYYY-MM-DD format"
        },
        endDate: {
          type: ["string", "null"],
          description: "End date in YYYY-MM-DD format"
        },
        status: {
          type: ["string", "null"],
          enum: ["pending", "approved", "rejected", null],
          description: "Optional filter by leave status"
        }
      },
      required: ["startDate", "endDate", "status"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_employees_by_department",
    description: "Get list of employees grouped by department with basic information including names, positions, and joining dates.",
    parameters: {
      type: "object",
      properties: {
        department: {
          type: ["string", "null"],
          description: "Optional specific department name to filter"
        },
        includeInactive: {
          type: "boolean",
          description: "Whether to include inactive employees. Defaults to false."
        }
      },
      required: ["department", "includeInactive"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_salary_slip_statistics",
    description: "Get salary slip statistics for a specific month/year including published and draft counts with employee breakdown.",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: ["integer", "null"],
          minimum: 1,
          maximum: 12,
          description: "Month (1-12). If not provided, uses current month."
        },
        year: {
          type: ["integer", "null"],
          description: "Year (YYYY). If not provided, uses current year."
        }
      },
      required: ["month", "year"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_current_datetime",
    description: "Get the current date and time in IST timezone with formatted output.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function", 
    name: "get_upcoming_holidays",
    description: "Get list of upcoming holidays from current date with details.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Maximum number of holidays to return. Defaults to 5.",
          minimum: 1,
          maximum: 20
        }
      },
      required: ["limit"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_task_report_summary",
    description: "Get task report submission statistics for employees within a date range with submission details.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: ["string", "null"],
          description: "Start date in YYYY-MM-DD format"
        },
        endDate: {
          type: ["string", "null"],
          description: "End date in YYYY-MM-DD format"
        },
        employeeId: {
          type: ["string", "null"],
          description: "Optional specific employee ID to filter"
        }
      },
      required: ["startDate", "endDate", "employeeId"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "get_employee_basic_info",
    description: "Get basic information about employees (name, ID, department, position, joining date). Safe, non-sensitive data only.",
    parameters: {
      type: "object",
      properties: {
        employeeId: {
          type: ["string", "null"],
          description: "Optional specific employee ID to get info for"
        },
        department: {
          type: ["string", "null"],
          description: "Optional department to filter by"
        },
        limit: {
          type: "integer",
          description: "Maximum number of employees to return. Defaults to 10.",
          minimum: 1,
          maximum: 50
        }
      },
      required: ["employeeId", "department", "limit"],
      additionalProperties: false
    },
    strict: true
  }
];

/**
 * Function Implementations
 * These are the actual functions that will be called when OpenAI determines they should be executed
 */
export const HR_FUNCTION_IMPLEMENTATIONS = {
  
  async get_employee_attendance_summary({ startDate, endDate, employeeId }) {
    try {
      const now = getCurrentIST();
      const start = startDate ? moment(startDate).startOf('day').toDate() : now.clone().startOf('month').toDate();
      const end = endDate ? moment(endDate).endOf('day').toDate() : now.toDate();

      let filter = {
        date: { $gte: start, $lte: end }
      };

      if (employeeId) {
        const employee = await Employee.findOne({ employeeId });
        if (employee) {
          filter.employee = employee._id;
        }
      }

      const [attendanceRecords, totalEmployees] = await Promise.all([
        Attendance.find(filter).populate('employee', 'firstName lastName employeeId department'),
        Employee.countDocuments({ isActive: true })
      ]);

      // Group by status
      const statusCounts = {
        present: 0,
        late: 0,
        absent: 0,
        'half-day': 0
      };

      const employeeStats = new Map();

      attendanceRecords.forEach(record => {
        if (record.status in statusCounts) {
          statusCounts[record.status]++;
        }

        if (record.employee) {
          const empId = record.employee.employeeId;
          if (!employeeStats.has(empId)) {
            employeeStats.set(empId, {
              name: `${record.employee.firstName} ${record.employee.lastName}`,
              department: record.employee.department,
              present: 0,
              late: 0,
              absent: 0,
              'half-day': 0
            });
          }
          if (record.status in employeeStats.get(empId)) {
            employeeStats.get(empId)[record.status]++;
          }
        }
      });

      return {
        success: true,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        overallStatistics: statusCounts,
        totalEmployees,
        totalRecords: attendanceRecords.length,
        employeeBreakdown: Array.from(employeeStats.entries()).map(([empId, stats]) => ({
          employeeId: empId,
          ...stats
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching attendance summary: ${error.message}`
      };
    }
  },

  async get_detailed_attendance_with_times({ startDate, endDate, employeeId }) {
    try {
      const now = getCurrentIST();
      const start = startDate ? moment(startDate).startOf('day').toDate() : now.startOf('day').toDate();
      const end = endDate ? moment(endDate).endOf('day').toDate() : now.endOf('day').toDate();

      let filter = {
        date: { $gte: start, $lte: end }
      };

      if (employeeId) {
        const employee = await Employee.findOne({ employeeId });
        if (employee) {
          filter.employee = employee._id;
        }
      }

      const attendanceRecords = await Attendance.find(filter)
        .populate('employee', 'firstName lastName employeeId department')
        .sort({ date: -1, checkIn: 1 });

      const detailedRecords = attendanceRecords.map(record => {
        const istCheckIn = record.checkIn ? moment(record.checkIn).tz('Asia/Kolkata') : null;
        const istCheckOut = record.checkOut ? moment(record.checkOut).tz('Asia/Kolkata') : null;
        const istDate = moment(record.date).tz('Asia/Kolkata');

        return {
          employeeId: record.employee?.employeeId || 'Unknown',
          employeeName: record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : record.employeeName,
          department: record.employee?.department || 'Unknown',
          date: istDate.format('YYYY-MM-DD'),
          dayOfWeek: istDate.format('dddd'),
          status: record.status,
          checkInTime: istCheckIn ? istCheckIn.format('HH:mm:ss') : null,
          checkOutTime: istCheckOut ? istCheckOut.format('HH:mm:ss') : null,
          workHours: record.workHours || 0,
          comments: record.comments || null,
          reason: record.reason || null
        };
      });

      // Group by date for better organization
      const groupedByDate = {};
      detailedRecords.forEach(record => {
        if (!groupedByDate[record.date]) {
          groupedByDate[record.date] = [];
        }
        groupedByDate[record.date].push(record);
      });

      return {
        success: true,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        totalRecords: attendanceRecords.length,
        recordsByDate: groupedByDate,
        detailedRecords: detailedRecords
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching detailed attendance with times: ${error.message}`
      };
    }
  },

  async get_employee_count_by_tenure({ months }) {
    try {
      const now = getCurrentIST();
      const cutoffDate = now.clone().subtract(months, 'months').toDate();

      const employees = await Employee.find({ 
        isActive: true,
        joiningDate: { $lte: cutoffDate }
      }).select('firstName lastName employeeId department joiningDate');

      const employeesWithTenure = employees.map(emp => ({
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        joiningDate: emp.joiningDate.toISOString().split('T')[0],
        tenureMonths: now.diff(moment(emp.joiningDate), 'months')
      }));

      return {
        success: true,
        requestedTenureMonths: months,
        cutoffDate: cutoffDate.toISOString().split('T')[0],
        count: employees.length,
        employees: employeesWithTenure
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching employee tenure data: ${error.message}`
      };
    }
  },

  async get_leave_statistics({ startDate, endDate, status }) {
    try {
      let filter = {};

      if (startDate || endDate) {
        filter.leaveDate = {};
        if (startDate) filter.leaveDate.$gte = new Date(startDate);
        if (endDate) filter.leaveDate.$lte = new Date(endDate);
      }

      if (status) {
        filter.status = status;
      }

      const [leaves, statusBreakdown] = await Promise.all([
        Leave.find(filter).sort({ leaveDate: -1 }).limit(100),
        Leave.aggregate([
          { $match: filter },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      ]);

      // Get employee details for leaves
      const employeeIds = [...new Set(leaves.map(leave => leave.employeeId))];
      const employees = await Employee.find({ 
        employeeId: { $in: employeeIds } 
      }).select('employeeId firstName lastName department');

      const employeeMap = new Map();
      employees.forEach(emp => {
        employeeMap.set(emp.employeeId, {
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department
        });
      });

      const statusCounts = {};
      statusBreakdown.forEach(item => {
        statusCounts[item._id] = item.count;
      });

      // Group by leave type
      const typeBreakdown = {};
      leaves.forEach(leave => {
        if (!typeBreakdown[leave.leaveType]) {
          typeBreakdown[leave.leaveType] = 0;
        }
        typeBreakdown[leave.leaveType]++;
      });

      return {
        success: true,
        totalLeaves: leaves.length,
        statusBreakdown: statusCounts,
        typeBreakdown,
        recentLeaves: leaves.slice(0, 10).map(leave => {
          const empInfo = employeeMap.get(leave.employeeId) || { name: 'Unknown', department: 'Unknown' };
          return {
            employeeId: leave.employeeId,
            employeeName: empInfo.name,
            department: empInfo.department,
            leaveType: leave.leaveType,
            leaveDate: leave.leaveDate.toISOString().split('T')[0],
            status: leave.status,
            reason: leave.leaveReason
          };
        })
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching leave statistics: ${error.message}`
      };
    }
  },

  async get_employees_by_department({ department, includeInactive = false }) {
    try {
      let filter = {};
      
      if (!includeInactive) {
        filter.isActive = true;
      }
      
      if (department) {
        filter.department = new RegExp(department, 'i');
      }

      const employees = await Employee.find(filter)
        .select('firstName lastName employeeId department position joiningDate isActive')
        .sort({ department: 1, firstName: 1 });

      // Group by department
      const departmentGroups = {};
      employees.forEach(emp => {
        const dept = emp.department || 'Not Assigned';
        if (!departmentGroups[dept]) {
          departmentGroups[dept] = [];
        }
        departmentGroups[dept].push({
          employeeId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          position: emp.position,
          joiningDate: emp.joiningDate.toISOString().split('T')[0],
          isActive: emp.isActive
        });
      });

      return {
        success: true,
        totalEmployees: employees.length,
        departmentBreakdown: Object.entries(departmentGroups).map(([dept, emps]) => ({
          department: dept,
          count: emps.length,
          employees: emps
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching employees by department: ${error.message}`
      };
    }
  },

  async get_salary_slip_statistics({ month, year }) {
    try {
      const now = getCurrentIST();
      const targetMonth = month || (now.month() + 1); // moment months are 0-indexed
      const targetYear = year || now.year();

      const [slips, statusBreakdown] = await Promise.all([
        SalarySlip.find({ month: targetMonth, year: targetYear })
          .populate('employee', 'firstName lastName employeeId department'),
        SalarySlip.aggregate([
          { $match: { month: targetMonth, year: targetYear } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      ]);

      const statusCounts = {};
      statusBreakdown.forEach(item => {
        statusCounts[item._id] = item.count;
      });

      return {
        success: true,
        month: targetMonth,
        year: targetYear,
        totalSlips: slips.length,
        statusBreakdown: statusCounts,
        slipDetails: slips.map(slip => ({
          employeeId: slip.employee?.employeeId,
          employeeName: slip.employee ? `${slip.employee.firstName} ${slip.employee.lastName}` : 'Unknown',
          department: slip.employee?.department,
          status: slip.status,
          grossSalary: slip.grossSalary,
          netSalary: slip.netSalary
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching salary slip statistics: ${error.message}`
      };
    }
  },

  async get_current_datetime() {
    const now = getCurrentIST();
    return {
      success: true,
      currentDateTime: now.format('YYYY-MM-DD HH:mm:ss'),
      timezone: 'Asia/Kolkata (IST)',
      date: now.format('YYYY-MM-DD'),
      time: now.format('HH:mm:ss'),
      dayOfWeek: now.format('dddd'),
      monthYear: now.format('MMMM YYYY')
    };
  },

  async get_upcoming_holidays({ limit = 5 }) {
    try {
      const now = getCurrentIST().toDate();

      const holidays = await Holiday.find({
        date: { $gte: now }
      })
      .sort({ date: 1 })
      .limit(limit);

      return {
        success: true,
        upcomingHolidays: holidays.map(holiday => ({
          name: holiday.name,
          date: holiday.date.toISOString().split('T')[0],
          type: holiday.type,
          description: holiday.description
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching upcoming holidays: ${error.message}`
      };
    }
  },

  async get_task_report_summary({ startDate, endDate, employeeId }) {
    try {
      let filter = {};

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      if (employeeId) {
        filter.employeeId = employeeId;
      }

      const [reports, employeeStats] = await Promise.all([
        TaskReport.find(filter).populate('employee', 'firstName lastName employeeId department').limit(50),
        TaskReport.aggregate([
          { $match: filter },
          { $group: { 
            _id: '$employeeId', 
            reportCount: { $sum: 1 },
            lastSubmission: { $max: '$date' }
          }}
        ])
      ]);

      return {
        success: true,
        totalReports: reports.length,
        dateRange: {
          start: startDate || 'Not specified',
          end: endDate || 'Not specified'
        },
        employeeStats: employeeStats.map(stat => ({
          employeeId: stat._id,
          reportCount: stat.reportCount,
          lastSubmission: stat.lastSubmission.toISOString().split('T')[0]
        })),
        recentReports: reports.slice(0, 5).map(report => ({
          employeeId: report.employeeId,
          employeeName: report.employee ? `${report.employee.firstName} ${report.employee.lastName}` : 'Unknown',
          date: report.date.toISOString().split('T')[0],
          taskCount: report.tasks.length
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching task report summary: ${error.message}`
      };
    }
  },

  async get_employee_basic_info({ employeeId, department, limit = 10 }) {
    try {
      let filter = { isActive: true };

      if (employeeId) {
        filter.employeeId = employeeId;
      }

      if (department) {
        filter.department = new RegExp(department, 'i');
      }

      const employees = await Employee.find(filter)
        .select('firstName lastName employeeId department position joiningDate')
        .limit(limit)
        .sort({ firstName: 1 });

      return {
        success: true,
        count: employees.length,
        employees: employees.map(emp => ({
          employeeId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department || 'Not Assigned',
          position: emp.position || 'Not Specified',
          joiningDate: emp.joiningDate.toISOString().split('T')[0],
          tenureMonths: getCurrentIST().diff(moment(emp.joiningDate), 'months')
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Error fetching employee basic info: ${error.message}`
      };
    }
  }
};

/**
 * Execute a function call from OpenAI
 */
export const executeHRFunction = async (functionName, parameters) => {
  if (!(functionName in HR_FUNCTION_IMPLEMENTATIONS)) {
    return {
      success: false,
      error: `Function '${functionName}' not found`
    };
  }

  try {
    console.log(`Executing HR function: ${functionName}`, parameters);
    return await HR_FUNCTION_IMPLEMENTATIONS[functionName](parameters || {});
  } catch (error) {
    console.error(`Error executing function '${functionName}':`, error);
    return {
      success: false,
      error: `Error executing function '${functionName}': ${error.message}`
    };
  }
};