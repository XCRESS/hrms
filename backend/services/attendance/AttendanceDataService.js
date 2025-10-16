/**
 * Attendance Data Service
 * Handles all data access operations, complex queries, and database interactions
 */

import Attendance from '../../models/Attendance.model.js';
import Employee from '../../models/Employee.model.js';
import Leave from '../../models/Leave.model.js';
import Holiday from '../../models/Holiday.model.js';
import TaskReport from '../../models/TaskReport.model.js';
import RegularizationRequest from '../../models/Regularization.model.js';
import { 
  getISTDayBoundaries, 
  getISTRangeBoundaries,
  parseISTDateString,
  getISTDateString 
} from '../../utils/timezoneUtils.js';
import { 
  buildPaginationMeta, 
  buildSimpleAttendanceMap, 
  buildSimpleLeaveMap 
} from '../../utils/attendance/attendanceHelpers.js';
import { PAGINATION_DEFAULTS } from '../../utils/attendance/attendanceConstants.js';
import AttendanceCacheService from './AttendanceCacheService.js';

/**
 * AttendanceDataService
 * Repository layer for all attendance-related data operations
 */
export class AttendanceDataService {

  // Employee Data Operations

  /**
   * Get active employees with caching
   * @returns {Promise<Array>} Array of active employee documents
   */
  static async getActiveEmployees() {
    return await AttendanceCacheService.getCachedActiveEmployees();
  }

  /**
   * Get employee by ID with caching
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object|null>} Employee document or null
   */
  static async getEmployee(employeeId) {
    return await AttendanceCacheService.getCachedEmployee(employeeId);
  }

  /**
   * Get employee by ObjectId with caching
   * @param {string} employeeObjectId - Employee ObjectId
   * @returns {Promise<Object|null>} Employee document or null
   */
  static async getEmployeeById(employeeObjectId) {
    return await AttendanceCacheService.getCachedEmployeeById(employeeObjectId);
  }

  // Attendance Data Operations

  /**
   * Find attendance record for a specific employee and date
   * @param {string} employeeObjectId - Employee ObjectId
   * @param {Date} date - Target date
   * @returns {Promise<Object|null>} Attendance record or null
   */
  static async findAttendanceRecord(employeeObjectId, date) {
    const { startOfDay, endOfDay } = getISTDayBoundaries(date);
    
    return await Attendance.findOne({
      employee: employeeObjectId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).lean();
  }

  /**
   * Create new attendance record
   * @param {Object} attendanceData - Attendance data
   * @returns {Promise<Object>} Created attendance record
   */
  static async createAttendanceRecord(attendanceData) {
    // For absent status, ensure checkIn and checkOut are null
    if (attendanceData.status === 'absent') {
      attendanceData.checkIn = null;
      attendanceData.checkOut = null;
      attendanceData.workHours = 0;
    }
    
    const attendance = await Attendance.create(attendanceData);
    
    // Invalidate relevant caches
    await AttendanceCacheService.invalidateAllAttendanceCaches();
    
    return attendance;
  }

  /**
   * Update attendance record
   * @param {string} recordId - Attendance record ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated attendance record
   */
  static async updateAttendanceRecord(recordId, updateData) {
    // For absent status, we need to handle validation manually since 
    // mongoose required function can't see the new status during update
    if (updateData.status === 'absent') {
      // For absent status, clear checkIn and checkOut regardless of what was sent
      updateData.checkIn = null;
      updateData.checkOut = null;
      updateData.workHours = 0;
      
      // Update without running validators to avoid the checkIn required issue
      const attendance = await Attendance.findByIdAndUpdate(
        recordId, 
        updateData, 
        { new: true, runValidators: false }
      );
      
      // Invalidate relevant caches
      if (attendance) {
        await AttendanceCacheService.invalidateAllAttendanceCaches();
      }
      
      return attendance;
    } else {
      // For non-absent status, run normal validation
      const attendance = await Attendance.findByIdAndUpdate(
        recordId, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      // Invalidate relevant caches
      if (attendance) {
        await AttendanceCacheService.invalidateAllAttendanceCaches();
      }
      
      return attendance;
    }
  }

  /**
   * Find attendance record by employee and date
   * @param {string} employeeObjectId - Employee ObjectId
   * @param {Date} date - Target date
   * @returns {Promise<Object|null>} Attendance record or null
   */
  static async findAttendanceByEmployeeAndDate(employeeObjectId, date) {
    const { startOfDay, endOfDay } = getISTDayBoundaries(date);
    
    return await Attendance.findOne({
      employee: employeeObjectId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
  }

  /**
   * Get attendance records for employee with pagination
   * @param {string} employeeObjectId - Employee ObjectId
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated attendance records
   */
  static async getEmployeeAttendanceRecords(employeeObjectId, options = {}) {
    const {
      startDate,
      endDate,
      status,
      page = PAGINATION_DEFAULTS.PAGE,
      limit = PAGINATION_DEFAULTS.LIMIT
    } = options;

    const filter = { employee: employeeObjectId };

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const { startOfDay } = getISTDayBoundaries(parseISTDateString(startDate));
        filter.date.$gte = startOfDay;
      }
      if (endDate) {
        const { endOfDay } = getISTDayBoundaries(parseISTDateString(endDate));
        filter.date.$lte = endOfDay;
      }
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Execute queries
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName employeeId department'),
      Attendance.countDocuments(filter)
    ]);

    return {
      records,
      pagination: buildPaginationMeta(total, page, limit)
    };
  }

  /**
   * Get attendance records for date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Attendance records
   */
  static async getAttendanceRecordsInRange(startDate, endDate, options = {}) {
    const { employeeId, status, includeEmployee = true } = options;
    
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);
    
    const filter = {
      date: { $gte: startBoundary, $lte: endBoundary }
    };

    // Add employee filter if specified
    if (employeeId) {
      const employee = await this.getEmployee(employeeId);
      if (employee) {
        filter.employee = employee._id;
      } else {
        return [];
      }
    }

    // Add status filter if specified
    if (status) {
      filter.status = status;
    }

    let query = Attendance.find(filter).sort({ date: -1 });
    
    // Populate employee data if requested
    if (includeEmployee) {
      query = query.populate('employee', 'firstName lastName employeeId department');
    }

    return await query.exec();
  }

  /**
   * Get today's attendance for all employees
   * @param {Date} date - Target date (optional, defaults to today)
   * @returns {Promise<Array>} Today's attendance records
   */
  static async getTodayAttendanceRecords(date = new Date()) {
    const { startOfDay, endOfDay } = getISTDayBoundaries(date);

    return await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('employee', 'firstName lastName employeeId department');
  }

  /**
   * Get missing checkout records
   * Excludes dates that have pending regularization requests to avoid showing reminders
   * when employee has already submitted a regularization request
   * @param {string} employeeObjectId - Employee ObjectId
   * @param {number} lookbackDays - Number of days to look back (default: 7)
   * @returns {Promise<Array>} Records with missing checkouts (excluding dates with pending regularizations)
   */
  static async getMissingCheckoutRecords(employeeObjectId, lookbackDays = 7) {
    const now = new Date();
    const { startOfDay: today } = getISTDayBoundaries(now);

    const lookbackDate = new Date(today);
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    // Step 1: Get all attendance records with missing checkouts
    const missingCheckouts = await Attendance.find({
      employee: employeeObjectId,
      date: {
        $gte: lookbackDate,
        $lt: today
      },
      checkIn: { $exists: true },
      $or: [
        { checkOut: null },
        { checkOut: { $exists: false } }
      ]
    }).sort({ date: -1 });

    // Step 2: If no missing checkouts, return early
    if (missingCheckouts.length === 0) {
      return [];
    }

    // Step 3: Get employee's employeeId for regularization lookup
    const employee = await Employee.findById(employeeObjectId, 'employeeId');
    if (!employee) {
      return missingCheckouts; // Return all if employee not found (shouldn't happen)
    }

    // Step 4: Get all pending regularization requests for this employee in the date range
    const pendingRegularizations = await RegularizationRequest.find({
      employeeId: employee.employeeId,
      status: 'pending',
      date: {
        $gte: lookbackDate,
        $lt: today
      }
    }).lean();

    // Step 5: Create a Set of dates with pending regularizations for O(1) lookup
    const pendingRegDates = new Set(
      pendingRegularizations.map(reg => {
        // Normalize date to start of day for comparison
        const d = new Date(reg.date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
    );

    // Step 6: Filter out missing checkouts that have pending regularizations
    const filteredMissingCheckouts = missingCheckouts.filter(attendance => {
      const attDate = new Date(attendance.date);
      const attDateNormalized = new Date(attDate.getFullYear(), attDate.getMonth(), attDate.getDate()).getTime();

      // Keep attendance record only if it doesn't have a pending regularization
      return !pendingRegDates.has(attDateNormalized);
    });

    return filteredMissingCheckouts;
  }

  // Leave Data Operations

  /**
   * Get approved leaves for date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} employeeId - Employee ID (optional)
   * @returns {Promise<Array>} Approved leave records
   */
  static async getApprovedLeavesInRange(startDate, endDate, employeeId = null) {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);
    
    const filter = {
      status: 'approved',
      leaveDate: { $gte: startBoundary, $lte: endBoundary }
    };

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    return await Leave.find(filter);
  }

  /**
   * Get approved leaves for specific employee and date range
   * @param {string} employeeId - Employee ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Employee's approved leaves
   */
  static async getEmployeeApprovedLeaves(employeeId, startDate, endDate) {
    return await this.getApprovedLeavesInRange(startDate, endDate, employeeId);
  }

  // Holiday Data Operations

  /**
   * Get holidays in date range with caching
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Map>} Holiday map with date keys
   */
  static async getHolidaysInRange(startDate, endDate) {
    return await AttendanceCacheService.getCachedHolidaysInRange(startDate, endDate);
  }

  // Task Report Operations

  /**
   * Create task report
   * @param {Object} taskReportData - Task report data
   * @returns {Promise<Object>} Created task report
   */
  static async createTaskReport(taskReportData) {
    return await TaskReport.create(taskReportData);
  }

  /**
   * Get task reports for employee in date range
   * @param {string} employeeObjectId - Employee ObjectId
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Task reports
   */
  static async getEmployeeTaskReports(employeeObjectId, startDate, endDate) {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);

    return await TaskReport.find({
      employee: employeeObjectId,
      date: { $gte: startBoundary, $lte: endBoundary }
    }).sort({ date: -1 });
  }

  // Complex Query Operations

  /**
   * Get attendance summary for multiple employees in date range
   * @param {Array} employeeIds - Array of employee ObjectIds
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Attendance summary data
   */
  static async getMultiEmployeeAttendanceSummary(employeeIds, startDate, endDate) {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      employee: { $in: employeeIds },
      date: { $gte: startBoundary, $lte: endBoundary }
    }).populate('employee', 'firstName lastName employeeId department');

    // Get approved leaves
    const allEmployees = await Employee.find({ _id: { $in: employeeIds } }, 'employeeId');
    const employeeIdMapping = allEmployees.reduce((acc, emp) => {
      acc[emp._id.toString()] = emp.employeeId;
      return acc;
    }, {});

    const approvedLeaves = await Leave.find({
      employeeId: { $in: Object.values(employeeIdMapping) },
      status: 'approved',
      leaveDate: { $gte: startBoundary, $lte: endBoundary }
    });

    // Get holidays
    const holidayMap = await this.getHolidaysInRange(startBoundary, endBoundary);

    return {
      attendanceRecords,
      approvedLeaves,
      holidayMap,
      employeeIdMapping
    };
  }

  /**
   * Get department-wise attendance statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Department statistics
   */
  static async getDepartmentAttendanceStats(startDate, endDate) {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);

    return await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startBoundary, $lte: endBoundary }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      {
        $unwind: '$employeeData'
      },
      {
        $group: {
          _id: '$employeeData.department',
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
            }
          },
          absentCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          },
          halfDayCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0]
            }
          },
          totalWorkHours: { $sum: '$workHours' }
        }
      },
      {
        $project: {
          department: '$_id',
          totalRecords: 1,
          presentCount: 1,
          absentCount: 1,
          halfDayCount: 1,
          totalWorkHours: 1,
          attendancePercentage: {
            $multiply: [
              { $divide: [{ $add: ['$presentCount', '$halfDayCount'] }, '$totalRecords'] },
              100
            ]
          }
        }
      }
    ]);
  }

  /**
   * Get attendance trends for a period
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Group by period ('day', 'week', 'month')
   * @returns {Promise<Array>} Attendance trends
   */
  static async getAttendanceTrends(startDate, endDate, groupBy = 'day') {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);

    let groupByFormat;
    switch (groupBy) {
      case 'week':
        groupByFormat = { $week: '$date' };
        break;
      case 'month':
        groupByFormat = { $month: '$date' };
        break;
      case 'day':
      default:
        groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
        break;
    }

    return await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startBoundary, $lte: endBoundary }
        }
      },
      {
        $group: {
          _id: groupByFormat,
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
          },
          halfDayCount: {
            $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
  }

  // Utility Methods

  /**
   * Check if attendance record exists for employee on date
   * @param {string} employeeObjectId - Employee ObjectId
   * @param {Date} date - Target date
   * @returns {Promise<boolean>} True if record exists
   */
  static async attendanceRecordExists(employeeObjectId, date) {
    const record = await this.findAttendanceByEmployeeAndDate(employeeObjectId, date);
    return !!record;
  }

  /**
   * Get attendance record count for employee in date range
   * @param {string} employeeObjectId - Employee ObjectId
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Record count
   */
  static async getAttendanceRecordCount(employeeObjectId, startDate, endDate) {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);

    return await Attendance.countDocuments({
      employee: employeeObjectId,
      date: { $gte: startBoundary, $lte: endBoundary }
    });
  }

  /**
   * Bulk create attendance records
   * @param {Array} attendanceRecords - Array of attendance record data
   * @returns {Promise<Array>} Created records
   */
  static async bulkCreateAttendanceRecords(attendanceRecords) {
    const records = await Attendance.insertMany(attendanceRecords);
    
    // Invalidate caches after bulk operation
    await AttendanceCacheService.invalidateAllAttendanceCaches();
    
    return records;
  }

  /**
   * Delete attendance record
   * @param {string} recordId - Attendance record ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteAttendanceRecord(recordId) {
    const result = await Attendance.findByIdAndDelete(recordId);
    
    if (result) {
      await AttendanceCacheService.invalidateAllAttendanceCaches();
      return true;
    }
    
    return false;
  }
}

export default AttendanceDataService;