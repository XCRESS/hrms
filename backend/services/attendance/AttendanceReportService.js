/**
 * Attendance Report Service
 * Handles reporting, analytics, and statistics generation for attendance data
 */

import { ATTENDANCE_STATUS, ATTENDANCE_FLAGS } from '../../utils/attendance/attendanceConstants.js';
import { 
  calculateAttendanceStats, 
  generateDateRange,
  groupRecordsByEmployee,
  groupRecordsByDate 
} from '../../utils/attendance/attendanceHelpers.js';
import { getISTDateString, calculateWorkHours } from '../../utils/timezoneUtils.js';
import AttendanceDataService from './AttendanceDataService.js';
import AttendanceBusinessService from './AttendanceBusinessService.js';
import AttendanceCacheService from './AttendanceCacheService.js';

/**
 * AttendanceReportService
 * Specialized service for generating reports and analytics
 */
export class AttendanceReportService {

  /**
   * Generate individual employee attendance report
   * @param {string} employeeId - Employee ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Employee attendance report
   */
  static async generateEmployeeReport(employeeId, startDate, endDate) {
    // Check cache first
    const period = `${getISTDateString(startDate)}_${getISTDateString(endDate)}`;
    const cachedStats = await AttendanceCacheService.getCachedEmployeeAttendanceStats(employeeId, period);
    
    if (cachedStats) {
      return cachedStats;
    }

    // Get employee data
    const employee = await AttendanceDataService.getEmployee(employeeId);
    if (!employee) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    // Get attendance records
    const attendanceRecords = await AttendanceDataService.getAttendanceRecordsInRange(
      startDate, endDate, { employeeId }
    );

    // Get approved leaves
    const approvedLeaves = await AttendanceDataService.getEmployeeApprovedLeaves(
      employeeId, startDate, endDate
    );

    // Get holidays
    const holidayMap = await AttendanceDataService.getHolidaysInRange(startDate, endDate);

    // Process all days in the range
    const allDays = generateDateRange(startDate, endDate);
    const processedRecords = [];

    for (const dayObj of allDays) {
      const date = dayObj.date;
      const dateKey = getISTDateString(date);
      
      // Find attendance record for this date
      const attendanceRecord = attendanceRecords.find(record => 
        getISTDateString(record.date) === dateKey
      );

      // Find approved leave for this date
      const approvedLeave = approvedLeaves.find(leave =>
        getISTDateString(leave.leaveDate) === dateKey
      );

      // Process the day using business service
      const processedRecord = await AttendanceBusinessService.processAttendanceForDay(
        date, employee, attendanceRecord, approvedLeave, holidayMap
      );

      processedRecords.push(processedRecord);
    }

    // Calculate statistics
    const statistics = calculateAttendanceStats(processedRecords);
    const attendancePercentage = AttendanceBusinessService.calculateAttendancePercentage(processedRecords);

    // Generate summary
    const report = {
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

    // Cache the report
    await AttendanceCacheService.cacheEmployeeAttendanceStats(employeeId, period, report);

    return report;
  }

  /**
   * Generate team/department attendance report
   * @param {string} department - Department name
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Team attendance report
   */
  static async generateDepartmentReport(department, startDate, endDate) {
    // Check cache first
    const period = `${getISTDateString(startDate)}_${getISTDateString(endDate)}`;
    const cachedReport = await AttendanceCacheService.getCachedDepartmentAttendanceSummary(department, period);
    
    if (cachedReport) {
      return cachedReport;
    }

    // Get all employees in the department
    const allEmployees = await AttendanceDataService.getActiveEmployees();
    const departmentEmployees = allEmployees.filter(emp => emp.department === department);

    if (departmentEmployees.length === 0) {
      throw new Error(`No active employees found in department: ${department}`);
    }

    const employeeIds = departmentEmployees.map(emp => emp._id);

    // Get comprehensive attendance data
    const summaryData = await AttendanceDataService.getMultiEmployeeAttendanceSummary(
      employeeIds, startDate, endDate
    );

    // Process each employee's attendance
    const employeeReports = await Promise.all(
      departmentEmployees.map(async (employee) => {
        try {
          return await this.generateEmployeeReport(employee.employeeId, startDate, endDate);
        } catch (error) {
          console.error(`Error generating report for employee ${employee.employeeId}:`, error);
          return null;
        }
      })
    );

    const validReports = employeeReports.filter(report => report !== null);

    // Aggregate department statistics
    const departmentStats = {
      totalEmployees: departmentEmployees.length,
      totalWorkingDays: 0,
      totalPresentDays: 0,
      totalAbsentDays: 0,
      totalHalfDays: 0,
      totalLateDays: 0,
      totalLeaveDays: 0,
      totalWorkHours: 0,
      averageAttendancePercentage: 0
    };

    validReports.forEach(report => {
      departmentStats.totalWorkingDays += report.summary.totalWorkingDays;
      departmentStats.totalPresentDays += report.summary.presentDays;
      departmentStats.totalAbsentDays += report.summary.absentDays;
      departmentStats.totalHalfDays += report.summary.halfDays;
      departmentStats.totalLateDays += report.summary.lateDays;
      departmentStats.totalLeaveDays += report.summary.leaveDays;
      departmentStats.totalWorkHours += report.summary.totalWorkHours;
    });

    // Calculate average attendance percentage
    if (validReports.length > 0) {
      const totalPercentage = validReports.reduce((sum, report) => 
        sum + report.attendancePercentage.percentage, 0
      );
      departmentStats.averageAttendancePercentage = parseFloat(
        (totalPercentage / validReports.length).toFixed(1)
      );
    }

    const departmentReport = {
      department,
      period: {
        startDate: getISTDateString(startDate),
        endDate: getISTDateString(endDate)
      },
      statistics: departmentStats,
      employees: validReports.map(report => ({
        employeeId: report.employee.employeeId,
        name: `${report.employee.firstName} ${report.employee.lastName}`,
        attendancePercentage: report.attendancePercentage.percentage,
        presentDays: report.summary.presentDays,
        absentDays: report.summary.absentDays,
        totalWorkHours: report.summary.totalWorkHours
      })),
      trends: await this.calculateDepartmentTrends(department, startDate, endDate)
    };

    // Cache the report
    await AttendanceCacheService.cacheDepartmentAttendanceSummary(department, period, departmentReport);

    return departmentReport;
  }

  /**
   * Generate company-wide attendance dashboard data
   * @param {Date} date - Target date (optional, defaults to today)
   * @returns {Promise<Object>} Dashboard data
   */
  static async generateDashboardData(date = new Date()) {
    // Check cache first
    const cachedSummary = await AttendanceCacheService.getCachedTodayAttendanceSummary(date);
    if (cachedSummary) {
      return cachedSummary;
    }

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

        // Find approved leave for this employee
        const approvedLeave = todayLeaves.find(leave =>
          leave.employeeId === employee.employeeId
        );

        // Process using business service
        return await AttendanceBusinessService.processAttendanceForDay(
          date, employee, attendanceRecord, approvedLeave, holidayMap
        );
      })
    );

    // Calculate statistics
    const statistics = calculateAttendanceStats(processedRecords);

    // Determine day type
    const dayType = AttendanceBusinessService.determineDayType(date, holidayMap);

    const dashboardData = {
      date: getISTDateString(date),
      dayType: dayType.type,
      isWorkingDay: dayType.isWorkingDay,
      totalEmployees: allEmployees.length,
      statistics,
      records: processedRecords,
      departments: await this.getDepartmentWiseStats(processedRecords),
      recentTrends: await this.getRecentAttendanceTrends(date)
    };

    // Cache the dashboard data
    await AttendanceCacheService.cacheTodayAttendanceSummary(dashboardData, date);

    return dashboardData;
  }

  /**
   * Generate attendance trends report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Group by period ('day', 'week', 'month')
   * @returns {Promise<Object>} Trends report
   */
  static async generateTrendsReport(startDate, endDate, groupBy = 'day') {
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
          current.attendanceRate > (best?.attendanceRate || 0) ? current : best, null
        ),
        worstPeriod: processedTrends.reduce((worst, current) => 
          current.attendanceRate < (worst?.attendanceRate || 100) ? current : worst, null
        )
      }
    };
  }

  /**
   * Generate missing checkouts report
   * @param {number} lookbackDays - Number of days to look back (default: 7)
   * @returns {Promise<Object>} Missing checkouts report
   */
  static async generateMissingCheckoutsReport(lookbackDays = 7) {
    const allEmployees = await AttendanceDataService.getActiveEmployees();
    
    const missingCheckoutData = await Promise.all(
      allEmployees.map(async (employee) => {
        const missingRecords = await AttendanceDataService.getMissingCheckoutRecords(
          employee._id, lookbackDays
        );

        return {
          employee: {
            _id: employee._id,
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            department: employee.department
          },
          missingCheckouts: missingRecords.map(record => ({
            date: getISTDateString(record.date),
            checkIn: record.checkIn,
            workHours: record.checkOut ? calculateWorkHours(record.checkIn, new Date()) : 0
          })),
          totalMissing: missingRecords.length
        };
      })
    );

    // Filter employees with missing checkouts
    const employeesWithMissing = missingCheckoutData.filter(emp => emp.totalMissing > 0);

    return {
      lookbackDays,
      totalEmployeesAffected: employeesWithMissing.length,
      totalMissingRecords: employeesWithMissing.reduce((sum, emp) => sum + emp.totalMissing, 0),
      employees: employeesWithMissing,
      departmentSummary: this.groupMissingCheckoutsByDepartment(employeesWithMissing)
    };
  }

  // Helper Methods

  /**
   * Calculate department-wise statistics from processed records
   * @param {Array} processedRecords - Processed attendance records
   * @returns {Array} Department-wise statistics
   */
  static getDepartmentWiseStats(processedRecords) {
    const departmentGroups = processedRecords.reduce((groups, record) => {
      const dept = record.employee.department || 'Unknown';
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(record);
      return groups;
    }, {});

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
   * @param {string} department - Department name
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Department trends
   */
  static async calculateDepartmentTrends(department, startDate, endDate) {
    // Get department-specific attendance statistics
    const departmentStats = await AttendanceDataService.getDepartmentAttendanceStats(startDate, endDate);
    const deptStat = departmentStats.find(stat => stat.department === department);

    if (!deptStat) {
      return [];
    }

    // Return basic trend data (could be expanded with more complex calculations)
    return [{
      period: `${getISTDateString(startDate)} to ${getISTDateString(endDate)}`,
      attendancePercentage: parseFloat(deptStat.attendancePercentage.toFixed(1)),
      totalWorkHours: deptStat.totalWorkHours,
      averageWorkHours: parseFloat((deptStat.totalWorkHours / deptStat.totalRecords).toFixed(2))
    }];
  }

  /**
   * Get recent attendance trends (last 7 days)
   * @param {Date} currentDate - Current date
   * @returns {Promise<Array>} Recent trends
   */
  static async getRecentAttendanceTrends(currentDate) {
    const endDate = new Date(currentDate);
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 6); // Last 7 days

    return await this.generateTrendsReport(startDate, endDate, 'day');
  }

  /**
   * Group missing checkouts by department
   * @param {Array} employeesWithMissing - Employees with missing checkouts
   * @returns {Array} Department-wise missing checkouts
   */
  static groupMissingCheckoutsByDepartment(employeesWithMissing) {
    const departmentGroups = employeesWithMissing.reduce((groups, emp) => {
      const dept = emp.employee.department || 'Unknown';
      if (!groups[dept]) {
        groups[dept] = {
          department: dept,
          employeeCount: 0,
          totalMissing: 0
        };
      }
      groups[dept].employeeCount++;
      groups[dept].totalMissing += emp.totalMissing;
      return groups;
    }, {});

    return Object.values(departmentGroups);
  }

  /**
   * Generate custom report based on filters
   * @param {Object} filters - Report filters
   * @returns {Promise<Object>} Custom report
   */
  static async generateCustomReport(filters) {
    const {
      startDate,
      endDate,
      employeeIds,
      departments,
      status,
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

    // Generate reports for filtered employees
    const employeeReports = await Promise.all(
      targetEmployees.map(employee => 
        this.generateEmployeeReport(employee.employeeId, startDate, endDate)
      )
    );

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