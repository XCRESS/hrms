/**
 * Attendance Report Service
 * Handles reporting, analytics, and statistics generation for attendance data
 */

import {
  calculateAttendanceStats,
  generateDateRange
} from '../../utils/attendance/attendanceHelpers.js';
import { getISTDateString } from '../../utils/timezone.js';
import AttendanceDataService from './AttendanceDataService.js';
import AttendanceBusinessService from './AttendanceBusinessService.js';
import Attendance from '../../models/Attendance.model.js';
import Leave from '../../models/Leave.model.js';
import { getISTDayBoundaries } from '../../utils/timezone.js';
import type { HolidayMap } from '../workCalendar.js';

/**
 * Custom report filters interface
 */
interface CustomReportFilters {
  startDate: Date;
  endDate: Date;
  employeeIds?: string[];
  departments?: string[];
  status?: string;
  includeCharts?: boolean;
}

/**
 * AttendanceReportService
 * Specialized service for generating reports and analytics
 */
export class AttendanceReportService {

  /**
   * Generate individual employee attendance report
   * @param employeeId - Employee ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Employee attendance report
   */
  static async generateEmployeeReport(employeeId: string, startDate: Date, endDate: Date): Promise<any> {
    const employee = await AttendanceDataService.getEmployee(employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    const [report] = await this.generateEmployeeReports([employee], startDate, endDate);
    return report;
  }

  /**
   * Reports for many employees from three queries total (attendance, leaves,
   * holidays), instead of four per employee.
   */
  static async generateEmployeeReports(employees: any[], startDate: Date, endDate: Date): Promise<any[]> {
    if (employees.length === 0) return [];

    const { startOfDay } = getISTDayBoundaries(startDate);
    const { endOfDay } = getISTDayBoundaries(endDate);
    const employeeObjIds = employees.map((e) => e._id);

    const [attendanceRecords, approvedLeaves, holidayMap] = await Promise.all([
      Attendance.find({
        employee: { $in: employeeObjIds },
        date: { $gte: startOfDay.toJSDate(), $lte: endOfDay.toJSDate() }
      }).lean(),
      Leave.find({
        employee: { $in: employeeObjIds },
        status: 'approved',
        startDate: { $lte: endOfDay.toJSDate() },
        endDate: { $gte: startOfDay.toJSDate() }
      }).lean(),
      AttendanceDataService.getHolidaysInRange(startDate, endDate)
    ]);

    const recordsByEmployee = new Map<string, Map<string, any>>();
    for (const record of attendanceRecords) {
      const key = record.employee.toString();
      if (!recordsByEmployee.has(key)) recordsByEmployee.set(key, new Map());
      recordsByEmployee.get(key)!.set(getISTDateString(record.date), record);
    }

    const leavesByEmployee = new Map<string, any[]>();
    for (const leave of approvedLeaves) {
      const key = leave.employee.toString();
      leavesByEmployee.set(key, [...(leavesByEmployee.get(key) ?? []), leave]);
    }

    return Promise.all(
      employees.map((employee) => {
        const key = employee._id.toString();
        return this.buildEmployeeReport(
          employee,
          recordsByEmployee.get(key) ?? new Map(),
          leavesByEmployee.get(key) ?? [],
          holidayMap,
          startDate,
          endDate
        );
      })
    );
  }

  private static async buildEmployeeReport(
    employee: any,
    recordsByDay: Map<string, any>,
    approvedLeaves: any[],
    holidayMap: HolidayMap,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const allDays = generateDateRange(startDate, endDate);
    const processedRecords = [];

    for (const dayObj of allDays) {
      const date = dayObj.date;
      const dateKey = getISTDateString(date);
      const attendanceRecord = recordsByDay.get(dateKey);

      // Find approved leave for this date (supports multi-day leaves)
      const approvedLeave = approvedLeaves.find(leave => {
        const leaveStart = getISTDateString(leave.startDate);
        const leaveEnd = getISTDateString(leave.endDate);
        return dateKey >= leaveStart && dateKey <= leaveEnd;
      });

      // Process the day using business service
      const processedRecord = await AttendanceBusinessService.processAttendanceForDay(
        date, employee, attendanceRecord, approvedLeave, holidayMap
      );

      processedRecords.push(processedRecord);
    }

    // Calculate statistics
    const statistics = calculateAttendanceStats(processedRecords as any);
    const attendancePercentage = AttendanceBusinessService.calculateAttendancePercentage(processedRecords);

    return {
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department,
        position: employee.position,
        joiningDate: employee.joiningDate
      },
      period: {
        startDate: getISTDateString(startDate),
        endDate: getISTDateString(endDate),
        totalDays: allDays.length
      },
      statistics,
      attendancePercentage,
      records: processedRecords,
      summary: {
        totalWorkingDays: processedRecords.filter(r =>
          !r.flags?.isWeekend && !r.flags?.isHoliday
        ).length,
        presentDays: statistics.present,
        absentDays: statistics.absent,
        halfDays: statistics.halfDay,
        lateDays: statistics.late,
        leaveDays: statistics.leave,
        totalWorkHours: statistics.totalWorkHours,
        averageWorkHours: statistics.averageWorkHours
      }
    };
  }

  /**
   * Generate team/department attendance report
   * @param department - Department name
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Team attendance report
   */
  /**
   * Generate company-wide attendance dashboard data
   * @param date - Target date (optional, defaults to today)
   * @returns Dashboard data
   */
  static async generateDashboardData(date: Date = new Date()): Promise<any> {
    // Get all active employees
    const allEmployees = await AttendanceDataService.getActiveEmployees();

    // Get today's attendance records
    const todayAttendance = await AttendanceDataService.getTodayAttendanceRecords(date);

    // Get holidays and leaves for today
    const holidayMap = await AttendanceDataService.getHolidaysInRange(date, date);
    const todayLeaves = await AttendanceDataService.getApprovedLeavesInRange(date, date);

    // Process attendance for all employees
    const processedRecords = await Promise.all(
      allEmployees.map(async (employee) => {
        // Find attendance record for this employee
        const attendanceRecord = todayAttendance.find(record =>
          record.employee._id.toString() === employee._id.toString()
        );

        // Find approved leave for this employee (using ObjectId)
        const approvedLeave = todayLeaves.find(leave => {
          const leaveEmpId = leave.employee?._id?.toString() || leave.employee?.toString();
          return leaveEmpId === employee._id?.toString();
        });

        // Process using business service
        return await AttendanceBusinessService.processAttendanceForDay(
          date, employee, attendanceRecord, approvedLeave, holidayMap
        );
      })
    );

    // Calculate statistics
    const statistics = calculateAttendanceStats(processedRecords as any);

    // Determine day type
    const dayType = await AttendanceBusinessService.determineDayType(date, holidayMap);

    return {
      date: getISTDateString(date),
      dayType: dayType.type,
      isWorkingDay: dayType.isWorkingDay,
      totalEmployees: allEmployees.length,
      statistics,
      records: processedRecords,
      departments: await this.getDepartmentWiseStats(processedRecords),
      recentTrends: await this.getRecentAttendanceTrends(date)
    };
  }

  /**
   * Generate attendance trends report
   * @param startDate - Start date
   * @param endDate - End date
   * @param groupBy - Group by period ('day', 'week', 'month')
   * @returns Trends report
   */
  static async generateTrendsReport(startDate: Date, endDate: Date, groupBy: string = 'day'): Promise<any> {
    const trends = await AttendanceDataService.getAttendanceTrends(startDate, endDate, groupBy);

    // Process and enhance trends data
    const processedTrends = trends.map(trend => ({
      period: trend._id,
      totalRecords: trend.totalRecords,
      present: trend.presentCount,
      absent: trend.absentCount,
      halfDay: trend.halfDayCount,
      attendanceRate: parseFloat(
        ((trend.presentCount + trend.halfDayCount) / trend.totalRecords * 100).toFixed(1)
      )
    }));

    return {
      period: {
        startDate: getISTDateString(startDate),
        endDate: getISTDateString(endDate),
        groupBy
      },
      trends: processedTrends,
      summary: {
        totalPeriods: processedTrends.length,
        averageAttendanceRate: processedTrends.length > 0 ?
          parseFloat((processedTrends.reduce((sum, t) => sum + t.attendanceRate, 0) / processedTrends.length).toFixed(1)) : 0,
        bestPeriod: processedTrends.reduce((best, current) =>
          current.attendanceRate > (best?.attendanceRate || 0) ? current : best, null as any
        ),
        worstPeriod: processedTrends.reduce((worst, current) =>
          current.attendanceRate < (worst?.attendanceRate || 100) ? current : worst, null as any
        )
      }
    };
  }

  /**
   * Generate missing checkouts report
   * @param lookbackDays - Number of days to look back (default: 7)
   * @returns Missing checkouts report
   */
  // Helper Methods

  /**
   * Calculate department-wise statistics from processed records
   * @param processedRecords - Processed attendance records
   * @returns Department-wise statistics
   */
  static getDepartmentWiseStats(processedRecords: any[]): any[] {
    const departmentGroups = processedRecords.reduce((groups, record) => {
      const dept = record.employee.department || 'Unknown';
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(record);
      return groups;
    }, {} as Record<string, any[]>);

    return Object.keys(departmentGroups).map(department => {
      const records = departmentGroups[department];
      const stats = calculateAttendanceStats(records);

      return {
        department,
        totalEmployees: records.length,
        statistics: stats,
        attendanceRate: records.length > 0 ?
          parseFloat(((stats.present + stats.halfDay) / records.length * 100).toFixed(1)) : 0
      };
    });
  }

  /**
   * Calculate department trends
   * @param department - Department name
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Department trends
   */
  /**
   * Get recent attendance trends (last 7 days)
   * @param currentDate - Current date
   * @returns Recent trends
   */
  static async getRecentAttendanceTrends(currentDate: Date): Promise<any> {
    const endDate = new Date(currentDate);
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 6); // Last 7 days

    return await this.generateTrendsReport(startDate, endDate, 'day');
  }

  /**
   * Group missing checkouts by department
   * @param employeesWithMissing - Employees with missing checkouts
   * @returns Department-wise missing checkouts
   */
  /**
   * Generate custom report based on filters
   * @param filters - Report filters
   * @returns Custom report
   */
  static async generateCustomReport(filters: CustomReportFilters): Promise<any> {
    const {
      startDate,
      endDate,
      employeeIds,
      departments,
      includeCharts = false
    } = filters;

    // Build employee filter
    let targetEmployees = await AttendanceDataService.getActiveEmployees();

    if (employeeIds && employeeIds.length > 0) {
      targetEmployees = targetEmployees.filter(emp => employeeIds.includes(emp.employeeId));
    }

    if (departments && departments.length > 0) {
      targetEmployees = targetEmployees.filter(emp => departments.includes(emp.department));
    }

    const employeeReports = await this.generateEmployeeReports(targetEmployees, startDate, endDate);

    // Aggregate data
    const aggregatedStats = employeeReports.reduce((acc, report) => {
      acc.totalWorkingDays += report.summary.totalWorkingDays;
      acc.totalPresentDays += report.summary.presentDays;
      acc.totalAbsentDays += report.summary.absentDays;
      acc.totalWorkHours += report.summary.totalWorkHours;
      return acc;
    }, {
      totalWorkingDays: 0,
      totalPresentDays: 0,
      totalAbsentDays: 0,
      totalWorkHours: 0
    });

    return {
      filters,
      period: {
        startDate: getISTDateString(startDate),
        endDate: getISTDateString(endDate)
      },
      employeeCount: targetEmployees.length,
      aggregatedStats,
      employeeReports: includeCharts ? employeeReports : employeeReports.map(report => ({
        employee: report.employee,
        summary: report.summary,
        attendancePercentage: report.attendancePercentage
      })),
      generatedAt: new Date().toISOString()
    };
  }
}

export default AttendanceReportService;
