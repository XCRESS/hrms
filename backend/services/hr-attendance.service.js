import Attendance from '../models/Attendance.model.js';
import Employee from '../models/Employee.model.js';
import Leave from '../models/Leave.model.js';
import Holiday from '../models/Holiday.model.js';
import TaskReport from '../models/TaskReport.model.js';
import { APIError } from '../utils/errors.js';
import { generateAttendanceReport } from '../utils/reportGenerator.js';
import cache, { TTL } from '../utils/cache.js';

/**
 * HR Attendance Service Layer
 * Business logic for all HR attendance operations
 * 
 * Features:
 * - Complex attendance calculations
 * - Performance-optimized database queries
 * - Advanced analytics and reporting
 * - Bulk operations with transaction support
 * - Data integrity and validation
 */

export class HRAttendanceService {
  constructor() {
    this.batchSize = 100; // For bulk operations
    this.maxDateRange = 365; // Maximum days in a single query
  }

  /**
   * Get comprehensive attendance overview for HR dashboard
   */
  async getAttendanceOverview({ date, userRole, requestedBy }) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Parallel execution for performance
    const [
      todayAttendance,
      allActiveEmployees,
      approvedLeaves,
      holidays,
      pendingRegularizations,
      weeklyTrends
    ] = await Promise.all([
      this._getTodayAttendanceRecords(startOfDay, endOfDay),
      this._getActiveEmployees(),
      this._getTodayApprovedLeaves(startOfDay, endOfDay),
      this._getTodayHolidays(startOfDay, endOfDay),
      this._getPendingRegularizations(),
      this._getWeeklyAttendanceTrends(targetDate)
    ]);

    // Calculate comprehensive statistics
    const stats = this._calculateOverviewStats({
      todayAttendance,
      allActiveEmployees,
      approvedLeaves,
      holidays,
      pendingRegularizations,
      targetDate
    });

    // Generate insights and alerts
    const insights = this._generateAttendanceInsights(stats, weeklyTrends);
    const alerts = this._generateHRAlerts(stats, pendingRegularizations);

    return {
      date: date,
      isWorkingDay: this._isWorkingDay(targetDate, holidays),
      statistics: stats,
      trends: weeklyTrends,
      insights,
      alerts,
      quickActions: this._getQuickActions(stats),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get filtered attendance records with advanced options
   */
  async getAttendanceRecords(options) {
    const {
      startDate,
      endDate,
      employeeIds,
      departments,
      status,
      includeAbsents,
      includeWeekends,
      includeHolidays,
      page,
      limit,
      sortBy,
      sortOrder,
      format
    } = options;

    // Validate date range
    this._validateDateRange(startDate, endDate);

    // Build optimized query
    const query = await this._buildAttendanceQuery({
      startDate,
      endDate,
      employeeIds,
      departments,
      status
    });

    // Execute paginated query with population
    const [records, total, metadata] = await Promise.all([
      this._executeAttendanceQuery(query, { page, limit, sortBy, sortOrder }),
      this._getAttendanceRecordCount(query),
      this._getQueryMetadata({ startDate, endDate, employeeIds, departments })
    ]);

    // Process records based on options
    let processedRecords = records;
    
    if (includeAbsents || includeWeekends || includeHolidays) {
      processedRecords = await this._enrichWithMissingDays(records, {
        startDate,
        endDate,
        employeeIds,
        includeAbsents,
        includeWeekends,
        includeHolidays
      });
    }

    // Format based on requested format
    if (format === 'summary') {
      processedRecords = this._formatSummaryView(processedRecords);
    }

    return {
      records: processedRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      metadata,
      statistics: this._calculateRecordStatistics(processedRecords)
    };
  }

  /**
   * Get detailed employee attendance analysis
   */
  async getEmployeeAttendanceDetails(options) {
    const {
      employeeId,
      startDate,
      endDate,
      includeAnalytics,
      includeRegularizations,
      includeTaskReports
    } = options;

    // Validate employee exists and is active
    const employee = await Employee.findOne({ 
      employeeId, 
      isActive: true 
    }).lean();

    if (!employee) {
      throw new APIError('Employee not found or inactive', 404, 'EMPLOYEE_NOT_FOUND');
    }

    // Parallel data fetching
    const [
      attendanceRecords,
      leaveRecords,
      regularizations,
      taskReports,
      holidaysInRange
    ] = await Promise.all([
      this._getEmployeeAttendanceRecords(employee._id, startDate, endDate),
      this._getEmployeeLeaveRecords(employeeId, startDate, endDate),
      includeRegularizations ? this._getEmployeeRegularizations(employeeId, startDate, endDate) : [],
      includeTaskReports ? this._getEmployeeTaskReports(employee._id, startDate, endDate) : [],
      this._getHolidaysInRange(startDate, endDate)
    ]);

    // Generate comprehensive analysis
    const analysis = includeAnalytics ? 
      await this._generateEmployeeAnalysis(employee, {
        attendanceRecords,
        leaveRecords,
        startDate,
        endDate,
        holidaysInRange
      }) : null;

    // Build attendance calendar
    const attendanceCalendar = this._buildAttendanceCalendar({
      employee,
      attendanceRecords,
      leaveRecords,
      holidaysInRange,
      startDate,
      endDate
    });

    return {
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        joiningDate: employee.joiningDate
      },
      dateRange: { startDate, endDate },
      calendar: attendanceCalendar,
      records: attendanceRecords,
      leaves: leaveRecords,
      regularizations: includeRegularizations ? regularizations : undefined,
      taskReports: includeTaskReports ? taskReports : undefined,
      analysis,
      summary: this._generateEmployeeSummary(attendanceCalendar, analysis)
    };
  }

  /**
   * Generate advanced attendance analytics
   */
  async getAttendanceAnalytics(options) {
    const {
      period,
      startDate,
      endDate,
      departments,
      metricTypes,
      groupBy
    } = options;

    const analytics = {};

    // Execute requested analytics
    for (const metricType of metricTypes) {
      switch (metricType) {
        case 'attendance_rate':
          analytics.attendanceRate = await this._calculateAttendanceRateAnalytics({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'punctuality':
          analytics.punctuality = await this._calculatePunctualityAnalytics({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'trends':
          analytics.trends = await this._calculateAttendanceTrends({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'patterns':
          analytics.patterns = await this._identifyAttendancePatterns({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'compliance':
          analytics.compliance = await this._calculateComplianceMetrics({
            period, startDate, endDate, departments, groupBy
          });
          break;
      }
    }

    return {
      period,
      dateRange: { startDate, endDate },
      groupBy,
      metrics: analytics,
      insights: this._generateAnalyticsInsights(analytics),
      recommendations: this._generateRecommendations(analytics),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Bulk update attendance records with transaction support
   */
  async bulkUpdateAttendance(updates, options) {
    const { auditEntry, requestedBy } = options;
    const results = { success: [], failed: [], summary: {} };

    // Process in batches for performance
    const batches = this._createBatches(updates, this.batchSize);
    
    for (const batch of batches) {
      try {
        const batchResults = await this._processBulkUpdateBatch(batch, {
          auditEntry,
          requestedBy
        });
        
        results.success.push(...batchResults.success);
        results.failed.push(...batchResults.failed);
      } catch (error) {
        // Log batch failure but continue with other batches
        console.error('Bulk update batch failed:', error);
        results.failed.push(...batch.map(update => ({
          ...update,
          error: error.message
        })));
      }
    }

    results.summary = {
      totalUpdates: updates.length,
      successful: results.success.length,
      failed: results.failed.length,
      successRate: ((results.success.length / updates.length) * 100).toFixed(2) + '%'
    };

    return results;
  }

  /**
   * Export attendance data in various formats
   */
  async exportAttendanceData(options) {
    const {
      format,
      startDate,
      endDate,
      employeeIds,
      departments,
      includeAnalytics,
      requestedBy
    } = options;

    // Get comprehensive data for export
    const exportData = await this._prepareExportData({
      startDate,
      endDate,
      employeeIds,
      departments,
      includeAnalytics
    });

    // Generate export based on format
    switch (format) {
      case 'csv':
        return this._generateCSVExport(exportData);
      case 'xlsx':
        return this._generateExcelExport(exportData);
      case 'json':
        return this._generateJSONExport(exportData);
      case 'pdf':
        return await this._generatePDFExport(exportData);
      default:
        throw new APIError(`Unsupported export format: ${format}`, 400, 'INVALID_FORMAT');
    }
  }

  // Private helper methods
  async _getTodayAttendanceRecords(startOfDay, endOfDay) {
    return await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('employee', 'firstName lastName employeeId department position')
    .lean();
  }

  async _getActiveEmployees() {
    return await cache.getOrSet('employees:active:hr', async () => {
      return await Employee.find({ isActive: true })
        .select('_id employeeId firstName lastName department position')
        .lean();
    }, TTL.EMPLOYEES);
  }

  async _getTodayApprovedLeaves(startOfDay, endOfDay) {
    return await Leave.find({
      status: 'approved',
      leaveDate: { $gte: startOfDay, $lte: endOfDay }
    }).lean();
  }

  async _getTodayHolidays(startOfDay, endOfDay) {
    return await Holiday.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();
  }

  async _getPendingRegularizations() {
    const RegularizationRequest = (await import('../models/Regularization.model.js')).default;
    return await RegularizationRequest.find({
      status: 'pending'
    }).lean();
  }

  async _getWeeklyAttendanceTrends(targetDate) {
    const weekStart = new Date(targetDate);
    weekStart.setDate(weekStart.getDate() - 7);
    
    return await Attendance.aggregate([
      {
        $match: {
          date: { $gte: weekStart, $lte: targetDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          totalPresent: {
            $sum: { $cond: [{ $ne: ['$checkIn', null] }, 1, 0] }
          },
          totalLate: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  _calculateOverviewStats({ todayAttendance, allActiveEmployees, approvedLeaves, holidays, targetDate }) {
    const totalEmployees = allActiveEmployees.length;
    const presentToday = todayAttendance.filter(att => att.checkIn).length;
    const lateToday = todayAttendance.filter(att => att.status === 'late').length;
    const onLeaveToday = approvedLeaves.length;
    const absentToday = totalEmployees - presentToday - onLeaveToday;
    const isHoliday = holidays.length > 0;

    return {
      totalEmployees,
      presentToday,
      absentToday,
      lateToday,
      onLeaveToday,
      attendanceRate: totalEmployees > 0 ? ((presentToday / totalEmployees) * 100).toFixed(1) : 0,
      punctualityRate: presentToday > 0 ? (((presentToday - lateToday) / presentToday) * 100).toFixed(1) : 100,
      isHoliday,
      isWorkingDay: this._isWorkingDay(targetDate, holidays)
    };
  }

  _isWorkingDay(date, holidays = []) {
    const dayOfWeek = date.getDay();
    
    // Sunday is always non-working
    if (dayOfWeek === 0) return false;
    
    // Check holidays
    if (holidays.length > 0) return false;
    
    // Check 2nd Saturday
    if (dayOfWeek === 6) {
      const dateNum = date.getDate();
      const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstSaturday = 7 - firstOfMonth.getDay();
      const secondSaturday = firstSaturday + 7;
      
      if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
        return false;
      }
    }
    
    return true;
  }

  _generateAttendanceInsights(stats, trends) {
    const insights = [];
    
    if (stats.attendanceRate < 80) {
      insights.push({
        type: 'warning',
        message: `Low attendance rate today: ${stats.attendanceRate}%`,
        priority: 'high'
      });
    }
    
    if (stats.lateToday > stats.totalEmployees * 0.2) {
      insights.push({
        type: 'alert',
        message: `High late arrivals: ${stats.lateToday} employees`,
        priority: 'medium'
      });
    }
    
    return insights;
  }

  _generateHRAlerts(stats, pendingRegularizations) {
    const alerts = [];
    
    if (pendingRegularizations.length > 10) {
      alerts.push({
        type: 'action_required',
        message: `${pendingRegularizations.length} regularization requests pending approval`,
        action: 'review_regularizations',
        priority: 'medium'
      });
    }
    
    return alerts;
  }

  _getQuickActions(stats) {
    return [
      {
        label: 'View Today\'s Attendance',
        action: 'view_today_attendance',
        count: stats.presentToday
      },
      {
        label: 'Review Late Arrivals',
        action: 'review_late_arrivals',
        count: stats.lateToday
      },
      {
        label: 'Check Absent Employees',
        action: 'check_absent_employees',
        count: stats.absentToday
      }
    ];
  }

  _validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 0) {
      throw new APIError('Start date must be before end date', 400, 'INVALID_DATE_RANGE');
    }
    
    if (diffDays > this.maxDateRange) {
      throw new APIError(`Date range too large. Maximum ${this.maxDateRange} days allowed`, 400, 'DATE_RANGE_TOO_LARGE');
    }
  }

  _createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}