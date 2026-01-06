/**
 * HR Chatbot Function Utilities
 * Provides OpenAI function definitions and implementations for HR-related queries
 * These functions are read-only and safe for employee use
 */

import type { Document, Types } from 'mongoose';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import Leave from '../models/Leave.model.js';
import SalarySlip from '../models/SalarySlip.model.js';
import TaskReport from '../models/TaskReport.model.js';
import Holiday from '../models/Holiday.model.js';
import PasswordResetRequest from '../models/PasswordResetRequest.model.js';
import Help from '../models/Help.model.js';
import Regularization from '../models/Regularization.model.js';
import { getISTNow, toIST, getISTDateString, getISTDayBoundaries, addDaysIST } from './timezone.js';
import { DateTime } from 'luxon';
import logger from './logger.js';

// Types for function parameters
interface IDateRangeParams {
  startDate: string | null;
  endDate: string | null;
  employeeId?: string | null;
}

interface ITenureParams {
  months: number;
}

interface ILeaveStatsParams {
  startDate: string | null;
  endDate: string | null;
  status: 'pending' | 'approved' | 'rejected' | null;
}

interface IDepartmentParams {
  department: string | null;
  includeInactive: boolean;
}

interface ISalarySlipParams {
  month: number | null;
  year: number | null;
}

interface IHolidayParams {
  limit: number;
}

interface IEmployeeInfoParams {
  employeeId: string | null;
  department: string | null;
  limit: number;
}

interface IPendingRequestsParams {
  requestType: 'leave' | 'help' | 'regularization' | 'password_reset' | null;
  limit: number;
}

// Response types
interface IFunctionResponse {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

// Get current date/time in IST
const getCurrentIST = (): DateTime => {
  return getISTNow();
};

/**
 * Function Definitions for OpenAI GPT-5
 * These are the function schemas that OpenAI will use to understand available functions
 * Using strict mode for reliable function calls
 */
export const HR_FUNCTIONS = [
  {
    type: 'function',
    name: 'get_employee_attendance_summary',
    description:
      'Get attendance summary for employees within a date range. Shows present, absent, late, and half-day statistics with employee breakdown.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: ['string', 'null'],
          description: 'Start date in YYYY-MM-DD format. If not provided, uses current month start.',
        },
        endDate: {
          type: ['string', 'null'],
          description: 'End date in YYYY-MM-DD format. If not provided, uses current date.',
        },
        employeeId: {
          type: ['string', 'null'],
          description: 'Optional specific employee ID to filter results',
        },
      },
      required: ['startDate', 'endDate', 'employeeId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_detailed_attendance_with_times',
    description:
      'Get detailed attendance records with check-in and check-out times for employees within a date range. Shows actual timestamps for each employee.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: ['string', 'null'],
          description: 'Start date in YYYY-MM-DD format. If not provided, uses current date.',
        },
        endDate: {
          type: ['string', 'null'],
          description: 'End date in YYYY-MM-DD format. If not provided, uses current date.',
        },
        employeeId: {
          type: ['string', 'null'],
          description: 'Optional specific employee ID to filter results',
        },
      },
      required: ['startDate', 'endDate', 'employeeId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_employee_count_by_tenure',
    description:
      'Get count of employees who have completed a specific tenure (e.g., 6 months, 1 year) from their joining date.',
    parameters: {
      type: 'object',
      properties: {
        months: {
          type: 'integer',
          description: 'Number of months of tenure to check (e.g., 6 for 6 months, 12 for 1 year)',
        },
      },
      required: ['months'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_leave_statistics',
    description:
      'Get leave statistics including pending, approved, and rejected leaves within a date range with employee details.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: ['string', 'null'],
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: ['string', 'null'],
          description: 'End date in YYYY-MM-DD format',
        },
        status: {
          type: ['string', 'null'],
          enum: ['pending', 'approved', 'rejected', null],
          description: 'Optional filter by leave status',
        },
      },
      required: ['startDate', 'endDate', 'status'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_employees_by_department',
    description:
      'Get list of employees grouped by department with basic information including names, positions, and joining dates.',
    parameters: {
      type: 'object',
      properties: {
        department: {
          type: ['string', 'null'],
          description: 'Optional specific department name to filter',
        },
        includeInactive: {
          type: 'boolean',
          description: 'Whether to include inactive employees. Defaults to false.',
        },
      },
      required: ['department', 'includeInactive'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_salary_slip_statistics',
    description:
      'Get salary slip statistics for a specific month/year including published and draft counts with employee breakdown.',
    parameters: {
      type: 'object',
      properties: {
        month: {
          type: ['integer', 'null'],
          minimum: 1,
          maximum: 12,
          description: 'Month (1-12). If not provided, uses current month.',
        },
        year: {
          type: ['integer', 'null'],
          description: 'Year (YYYY). If not provided, uses current year.',
        },
      },
      required: ['month', 'year'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_current_datetime',
    description: 'Get the current date and time in IST timezone with formatted output.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_upcoming_holidays',
    description: 'Get list of upcoming holidays from current date with details.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Maximum number of holidays to return. Defaults to 5.',
          minimum: 1,
          maximum: 20,
        },
      },
      required: ['limit'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_task_report_summary',
    description:
      'Get detailed task reports with actual tasks submitted by employees within a date range. Returns both statistics and complete task details for each report. Use this to analyze employee productivity, task completion patterns, and provide intelligent summaries of work accomplishments.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: ['string', 'null'],
          description: 'Start date in YYYY-MM-DD format',
        },
        endDate: {
          type: ['string', 'null'],
          description: 'End date in YYYY-MM-DD format',
        },
        employeeId: {
          type: ['string', 'null'],
          description: 'Optional specific employee ID to filter',
        },
      },
      required: ['startDate', 'endDate', 'employeeId'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_employee_basic_info',
    description:
      'Get basic information about employees (name, ID, department, position, joining date). Safe, non-sensitive data only.',
    parameters: {
      type: 'object',
      properties: {
        employeeId: {
          type: ['string', 'null'],
          description: 'Optional specific employee ID to get info for',
        },
        department: {
          type: ['string', 'null'],
          description: 'Optional department to filter by',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of employees to return. Defaults to 10.',
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['employeeId', 'department', 'limit'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'get_all_pending_requests',
    description:
      'Get all pending requests from employees including leave requests, help inquiries, attendance regularizations, and password reset requests. Provides comprehensive view of items awaiting approval.',
    parameters: {
      type: 'object',
      properties: {
        requestType: {
          type: ['string', 'null'],
          enum: ['leave', 'help', 'regularization', 'password_reset', null],
          description: 'Optional filter by request type. If null, returns all types.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of requests to return per type. Defaults to 20.',
          minimum: 1,
          maximum: 100,
        },
      },
      required: ['requestType', 'limit'],
      additionalProperties: false,
    },
    strict: true,
  },
] as const;

/**
 * Function Implementations
 * These are the actual functions that will be called when OpenAI determines they should be executed
 */
export const HR_FUNCTION_IMPLEMENTATIONS = {
  async get_employee_attendance_summary({
    startDate,
    endDate,
    employeeId,
  }: IDateRangeParams): Promise<IFunctionResponse> {
    try {
      const now = getCurrentIST();
      const start = startDate ? toIST(startDate).startOf('day').toJSDate() : now.startOf('month').toJSDate();
      const end = endDate ? toIST(endDate).endOf('day').toJSDate() : now.toJSDate();

      const filter: Record<string, unknown> = {
        date: { $gte: start, $lte: end },
      };

      if (employeeId) {
        const employee = await Employee.findOne({ employeeId });
        if (employee) {
          filter.employee = employee._id;
        }
      }

      const [attendanceRecords, totalEmployees] = await Promise.all([
        Attendance.find(filter).populate('employee', 'firstName lastName employeeId department'),
        Employee.countDocuments({ isActive: true }),
      ]);

      // Group by status
      const statusCounts: Record<string, number> = {
        present: 0,
        late: 0,
        absent: 0,
        'half-day': 0,
      };

      const employeeStats = new Map<
        string,
        {
          name: string;
          department: string;
          present: number;
          late: number;
          absent: number;
          'half-day': number;
        }
      >();

      attendanceRecords.forEach((record) => {
        const status = record.status || 'absent';
        if (status in statusCounts) {
          statusCounts[status]!++;
        }

        if (record.employee) {
          const employee = record.employee as unknown as { employeeId: string; firstName: string; lastName: string; department: string };
          const empId = employee.employeeId;
          if (!employeeStats.has(empId)) {
            employeeStats.set(empId, {
              name: `${employee.firstName} ${employee.lastName}`,
              department: employee.department,
              present: 0,
              late: 0,
              absent: 0,
              'half-day': 0,
            });
          }
          const stats = employeeStats.get(empId)!;
          if (status in stats) {
            (stats[status as keyof typeof stats] as number)++;
          }
        }
      });

      return {
        success: true,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        overallStatistics: statusCounts,
        totalEmployees,
        totalRecords: attendanceRecords.length,
        employeeBreakdown: Array.from(employeeStats.entries()).map(([empId, stats]) => ({
          employeeId: empId,
          ...stats,
        })),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching attendance summary: ${err.message}`,
      };
    }
  },

  async get_detailed_attendance_with_times({
    startDate,
    endDate,
    employeeId,
  }: IDateRangeParams): Promise<IFunctionResponse> {
    try {
      const now = getCurrentIST();
      const start = startDate ? toIST(startDate).startOf('day').toJSDate() : now.startOf('day').toJSDate();
      const end = endDate ? toIST(endDate).endOf('day').toJSDate() : now.endOf('day').toJSDate();

      const filter: Record<string, unknown> = {
        date: { $gte: start, $lte: end },
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

      const detailedRecords = attendanceRecords.map((record) => {
        const istCheckIn = record.checkIn ? toIST(record.checkIn) : null;
        const istCheckOut = record.checkOut ? toIST(record.checkOut) : null;
        const istDate = record.date ? toIST(record.date) : getISTNow();
        const employee = record.employee as unknown as { employeeId: string; firstName: string; lastName: string; department: string } | undefined;

        return {
          employeeId: employee?.employeeId || 'Unknown',
          employeeName: employee
            ? `${employee.firstName} ${employee.lastName}`
            : record.employeeName,
          department: employee?.department || 'Unknown',
          date: istDate.toFormat('yyyy-MM-dd'),
          dayOfWeek: istDate.toFormat('EEEE'),
          status: record.status || 'absent',
          checkInTime: istCheckIn ? istCheckIn.toFormat('HH:mm:ss') : null,
          checkOutTime: istCheckOut ? istCheckOut.toFormat('HH:mm:ss') : null,
          workHours: record.workHours || 0,
          comments: record.comments || null,
          reason: record.reason || null,
        };
      });

      // Group by date for better organization
      const groupedByDate: Record<string, typeof detailedRecords> = {};
      detailedRecords.forEach((record) => {
        const dateKey = record.date;
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey]!.push(record);
      });

      return {
        success: true,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        },
        totalRecords: attendanceRecords.length,
        recordsByDate: groupedByDate,
        detailedRecords: detailedRecords,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching detailed attendance with times: ${err.message}`,
      };
    }
  },

  async get_employee_count_by_tenure({ months }: ITenureParams): Promise<IFunctionResponse> {
    try {
      const now = getCurrentIST();
      const cutoffDate = now.minus({ months }).toJSDate();

      const employees = await Employee.find({
        isActive: true,
        joiningDate: { $lte: cutoffDate },
      }).select('firstName lastName employeeId department joiningDate');

      const employeesWithTenure = employees.map((emp) => ({
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        joiningDate: emp.joiningDate.toISOString().split('T')[0],
        tenureMonths: now.diff(toIST(emp.joiningDate), 'months').months,
      }));

      return {
        success: true,
        requestedTenureMonths: months,
        cutoffDate: cutoffDate.toISOString().split('T')[0],
        count: employees.length,
        employees: employeesWithTenure,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching employee tenure data: ${err.message}`,
      };
    }
  },

  async get_leave_statistics({ startDate, endDate, status }: ILeaveStatsParams): Promise<IFunctionResponse> {
    try {
      const filter: Record<string, unknown> = {};

      if (startDate || endDate) {
        filter.startDate = {};
        if (startDate) (filter.startDate as Record<string, unknown>).$gte = new Date(startDate);
        if (endDate) (filter.startDate as Record<string, unknown>).$lte = new Date(endDate);
      }

      if (status) {
        filter.status = status;
      }

      const [leaves, statusBreakdown] = await Promise.all([
        Leave.find(filter).populate('employee', 'firstName lastName employeeId department').sort({ startDate: -1 }).limit(100),
        Leave.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      ]);

      const statusCounts: Record<string, number> = {};
      statusBreakdown.forEach((item: { _id: string; count: number }) => {
        statusCounts[item._id] = item.count;
      });

      // Group by leave type
      const typeBreakdown: Record<string, number> = {};
      leaves.forEach((leave) => {
        const leaveType = leave.leaveType;
        if (!typeBreakdown[leaveType]) {
          typeBreakdown[leaveType] = 0;
        }
        typeBreakdown[leaveType]!++;
      });

      return {
        success: true,
        totalLeaves: leaves.length,
        statusBreakdown: statusCounts,
        typeBreakdown,
        recentLeaves: leaves.slice(0, 10).map((leave) => {
          const employee = leave.employee as unknown as { employeeId: string; firstName: string; lastName: string; department: string } | undefined;
          return {
            employeeId: employee?.employeeId || 'Unknown',
            employeeName: employee ? `${employee.firstName} ${employee.lastName}` : leave.employeeName,
            department: employee?.department || 'Unknown',
            leaveType: leave.leaveType,
            startDate: leave.startDate.toISOString().split('T')[0],
            endDate: leave.endDate.toISOString().split('T')[0],
            status: leave.status,
            reason: leave.reason,
            numberOfDays: leave.numberOfDays,
          };
        }),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching leave statistics: ${err.message}`,
      };
    }
  },

  async get_employees_by_department({
    department,
    includeInactive = false,
  }: IDepartmentParams): Promise<IFunctionResponse> {
    try {
      const filter: Record<string, unknown> = {};

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
      const departmentGroups: Record<
        string,
        Array<{
          employeeId: string;
          name: string;
          position: string;
          joiningDate: string;
          isActive: boolean;
        }>
      > = {};

      employees.forEach((emp) => {
        const dept = emp.department || 'Not Assigned';
        const empData = {
          employeeId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          position: (emp.position || 'Not Specified') as string,
          joiningDate: (emp.joiningDate?.toISOString().split('T')[0]) || 'N/A',
          isActive: emp.isActive,
        };
        if (!departmentGroups[dept]) {
          departmentGroups[dept] = [];
        }
        departmentGroups[dept]!.push(empData);
      });

      return {
        success: true,
        totalEmployees: employees.length,
        departmentBreakdown: Object.entries(departmentGroups).map(([dept, emps]) => ({
          department: dept,
          count: emps.length,
          employees: emps,
        })),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching employees by department: ${err.message}`,
      };
    }
  },

  async get_salary_slip_statistics({ month, year }: ISalarySlipParams): Promise<IFunctionResponse> {
    try {
      const now = getCurrentIST();
      const targetMonth = month || now.month + 1; // moment months are 0-indexed
      const targetYear = year || now.year;

      const [slips, statusBreakdown] = await Promise.all([
        SalarySlip.find({ month: targetMonth, year: targetYear }).populate(
          'employee',
          'firstName lastName employeeId department'
        ),
        SalarySlip.aggregate([
          { $match: { month: targetMonth, year: targetYear } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

      const statusCounts: Record<string, number> = {};
      statusBreakdown.forEach((item: { _id: string; count: number }) => {
        statusCounts[item._id] = item.count;
      });

      return {
        success: true,
        month: targetMonth,
        year: targetYear,
        totalSlips: slips.length,
        statusBreakdown: statusCounts,
        slipDetails: slips.map((slip) => {
          const employee = slip.employee as unknown as { employeeId: string; firstName: string; lastName: string; department: string } | undefined;
          return {
            employeeId: employee?.employeeId,
            employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
            department: employee?.department,
            status: slip.status,
            grossSalary: slip.grossSalary,
            netSalary: slip.netSalary,
          };
        }),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching salary slip statistics: ${err.message}`,
      };
    }
  },

  async get_current_datetime(): Promise<IFunctionResponse> {
    const now = getCurrentIST();
    return {
      success: true,
      currentDateTime: now.toFormat('YYYY-MM-DD HH:mm:ss'),
      timezone: 'Asia/Kolkata (IST)',
      date: now.toFormat('YYYY-MM-DD'),
      time: now.toFormat('HH:mm:ss'),
      dayOfWeek: now.toFormat('dddd'),
      monthYear: now.toFormat('MMMM YYYY'),
    };
  },

  async get_upcoming_holidays({ limit = 5 }: IHolidayParams): Promise<IFunctionResponse> {
    try {
      const now = getCurrentIST().toJSDate();

      const holidays = await Holiday.find({
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(limit);

      return {
        success: true,
        upcomingHolidays: holidays.map((holiday) => ({
          name: holiday.name,
          date: holiday.date.toISOString().split('T')[0],
          type: holiday.type,
          description: holiday.description,
        })),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching upcoming holidays: ${err.message}`,
      };
    }
  },

  async get_task_report_summary({ startDate, endDate, employeeId }: IDateRangeParams): Promise<IFunctionResponse> {
    try {
      const filter: Record<string, unknown> = {};

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) (filter.date as Record<string, unknown>).$gte = new Date(startDate);
        if (endDate) (filter.date as Record<string, unknown>).$lte = new Date(endDate);
      }

      if (employeeId) {
        filter.employeeId = employeeId;
      }

      const [reports, employeeStats] = await Promise.all([
        TaskReport.find(filter).populate('employee', 'firstName lastName employeeId department').sort({ date: -1 }).limit(100), // Increased limit to get more comprehensive data
        TaskReport.aggregate([
          { $match: filter },
          {
            $group: {
              _id: '$employeeId',
              reportCount: { $sum: 1 },
              lastSubmission: { $max: '$date' },
              totalTasks: { $sum: { $size: '$tasks' } },
            },
          },
        ]),
      ]);

      // Get employee details for stats
      const employeeIds = employeeStats.map((stat: { _id: string }) => stat._id);
      const employees = await Employee.find({
        employeeId: { $in: employeeIds },
      }).select('employeeId firstName lastName department');

      const employeeMap = new Map<string, { name: string; department: string }>();
      employees.forEach((emp) => {
        employeeMap.set(emp.employeeId, {
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
        });
      });

      return {
        success: true,
        totalReports: reports.length,
        dateRange: {
          start: startDate || 'Not specified',
          end: endDate || 'Not specified',
        },
        employeeStats: employeeStats.map(
          (stat: { _id: string; reportCount: number; totalTasks: number; lastSubmission: Date }) => {
            const empInfo = employeeMap.get(stat._id) || { name: 'Unknown', department: 'Unknown' };
            return {
              employeeId: stat._id,
              employeeName: empInfo.name,
              department: empInfo.department,
              reportCount: stat.reportCount,
              totalTasks: stat.totalTasks,
              lastSubmission: stat.lastSubmission.toISOString().split('T')[0],
            };
          }
        ),
        detailedReports: reports.map((report) => {
          const employee = report.employee as unknown as { firstName: string; lastName: string; department: string } | undefined;
          return {
            employeeId: report.employeeId,
            employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown',
            department: employee?.department || 'Unknown',
            date: report.date.toISOString().split('T')[0],
            taskCount: report.tasks.length,
            tasks: report.tasks, // Include actual task details
            submittedAt: report.createdAt.toISOString(),
          };
        }),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching task report summary: ${err.message}`,
      };
    }
  },

  async get_employee_basic_info({
    employeeId,
    department,
    limit = 10,
  }: IEmployeeInfoParams): Promise<IFunctionResponse> {
    try {
      const filter: Record<string, unknown> = { isActive: true };

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
        employees: employees.map((emp) => ({
          employeeId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department || 'Not Assigned',
          position: emp.position || 'Not Specified',
          joiningDate: emp.joiningDate.toISOString().split('T')[0],
          tenureMonths: getCurrentIST().diff(toIST(emp.joiningDate), 'months').months,
        })),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching employee basic info: ${err.message}`,
      };
    }
  },

  async get_all_pending_requests({ requestType, limit = 20 }: IPendingRequestsParams): Promise<IFunctionResponse> {
    try {
      const allRequests: Array<{
        _id: string;
        type: string;
        title: string;
        description: string;
        employeeId: string;
        employeeName: string;
        department: string;
        requestDate: Date;
        targetDate: Date;
        status: string;
        details: Record<string, unknown>;
      }> = [];

      // Fetch leave requests if not filtered or specifically requested
      if (!requestType || requestType === 'leave') {
        try {
          const leaves = await Leave.find({ status: 'pending' })
            .populate('employee', 'firstName lastName employeeId department')
            .limit(limit)
            .sort({ createdAt: -1 });

          allRequests.push(
            ...leaves.map((leave) => {
              const employee = leave.employee as unknown as { employeeId: string; firstName: string; lastName: string; department: string } | undefined;
              return {
                _id: leave._id.toString(),
                type: 'leave',
                title: `${leave.leaveType} Leave Request`,
                description: leave.reason || 'No reason provided',
                employeeId: employee?.employeeId || 'Unknown',
                employeeName: employee ? `${employee.firstName} ${employee.lastName}` : leave.employeeName,
                department: employee?.department || 'Unknown',
                requestDate: leave.createdAt,
                targetDate: leave.startDate,
                status: leave.status,
                details: {
                  leaveType: leave.leaveType,
                  startDate: leave.startDate,
                  endDate: leave.endDate,
                  numberOfDays: leave.numberOfDays,
                },
              };
            })
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          // Silent fail - just log the error
          logger.error({ err: error }, 'Error fetching leave requests');
        }
      }

      // Fetch help inquiries if not filtered or specifically requested
      if (!requestType || requestType === 'help') {
        try {
          const helpRequests = await Help.find({ status: 'pending' })
            .populate('userId', 'name email')
            .limit(limit)
            .sort({ createdAt: -1 });

          allRequests.push(
            ...helpRequests.map((help) => {
              const user = help.userId as unknown as { name: string } | undefined;
              return {
                _id: help._id?.toString() || 'Unknown',
                type: 'help',
                title: help.subject || 'Help Request',
                description: help.description || 'No description provided',
                employeeId: 'Unknown',
                employeeName: user?.name || 'Unknown User',
                department: 'Unknown',
                requestDate: help.createdAt,
                targetDate: help.createdAt,
                status: help.status,
                details: {
                  category: help.category,
                  priority: help.priority,
                  response: help.response,
                },
              };
            })
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          logger.error({ err: error }, 'Error fetching help requests');
        }
      }

      // Fetch attendance regularizations if not filtered or specifically requested
      if (!requestType || requestType === 'regularization') {
        try {
          const regularizations = await Regularization.find({ status: 'pending' })
            .populate('user', 'name email')
            .limit(limit)
            .sort({ createdAt: -1 });

          allRequests.push(
            ...regularizations.map((reg) => {
              const user = reg.user as unknown as { name: string } | undefined;
              return {
                _id: reg._id?.toString() || 'Unknown',
                type: 'regularization',
                title: 'Attendance Regularization',
                description: reg.reason || 'Missing checkout regularization request',
                employeeId: reg.employeeId || 'Unknown',
                employeeName: user?.name || 'Unknown User',
                department: 'Unknown',
                requestDate: reg.createdAt,
                targetDate: reg.date,
                status: reg.status,
                details: {
                  date: reg.date,
                  requestedCheckIn: reg.requestedCheckIn,
                  requestedCheckOut: reg.requestedCheckOut,
                  reason: reg.reason,
                },
              };
            })
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          logger.error({ err: error }, 'Error fetching regularization requests');
        }
      }

      // Fetch password reset requests if not filtered or specifically requested
      if (!requestType || requestType === 'password_reset') {
        try {
          const passwordResets = await PasswordResetRequest.find({ status: 'pending' })
            .populate('userId', 'name email')
            .limit(limit)
            .sort({ createdAt: -1 });

          allRequests.push(
            ...passwordResets.map((reset) => {
              const user = reset.userId as unknown as { name: string } | undefined;
              return {
                _id: reset._id?.toString() || 'Unknown',
                type: 'password_reset',
                title: 'Password Reset Request',
                description: `Password reset request for ${reset.email}`,
                employeeId: 'Unknown',
                employeeName: reset.name || user?.name || 'Unknown User',
                department: 'Unknown',
                requestDate: reset.createdAt,
                targetDate: reset.createdAt,
                status: reset.status,
                details: {
                  email: reset.email,
                  remarks: reset.remarks,
                  processedAt: reset.processedAt,
                },
              };
            })
          );
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Unknown error');
          logger.error({ err: error }, 'Error fetching password reset requests');
        }
      }

      // Sort all requests by request date (most recent first)
      allRequests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

      // Group by type for summary
      const summary = {
        leave: allRequests.filter((r) => r.type === 'leave').length,
        help: allRequests.filter((r) => r.type === 'help').length,
        regularization: allRequests.filter((r) => r.type === 'regularization').length,
        password_reset: allRequests.filter((r) => r.type === 'password_reset').length,
      };

      return {
        success: true,
        totalPendingRequests: allRequests.length,
        summary,
        requestType: requestType || 'all',
        requests: allRequests.slice(0, limit * 2), // Allow more results when showing all types
        recentRequests: allRequests.slice(0, 10).map((req) => ({
          type: req.type,
          title: req.title,
          employeeName: req.employeeName,
          department: req.department,
          requestDate: req.requestDate.toISOString().split('T')[0],
          description: req.description.length > 100 ? req.description.substring(0, 100) + '...' : req.description,
        })),
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return {
        success: false,
        error: `Error fetching pending requests: ${err.message}`,
      };
    }
  },
};

/**
 * Execute a function call from OpenAI
 */
export const executeHRFunction = async (
  functionName: string,
  parameters: Record<string, unknown>
): Promise<IFunctionResponse> => {
  if (!(functionName in HR_FUNCTION_IMPLEMENTATIONS)) {
    return {
      success: false,
      error: `Function '${functionName}' not found`,
    };
  }

  try {
    // Type assertion since we've verified the function exists
    const func = HR_FUNCTION_IMPLEMENTATIONS[functionName as keyof typeof HR_FUNCTION_IMPLEMENTATIONS] as (
      params: Record<string, unknown>
    ) => Promise<IFunctionResponse>;

    return await func(parameters || {});
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    return {
      success: false,
      error: `Error executing function '${functionName}': ${err.message}`,
    };
  }
};
