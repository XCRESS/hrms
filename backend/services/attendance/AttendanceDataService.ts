/**
 * Attendance Data Service
 * Handles all data access operations, complex queries, and database interactions
 */

import type { Types, FilterQuery } from 'mongoose';
import type { IAttendance, IEmployee, ILeave } from '../../types/index.js';
import Attendance from '../../models/Attendance.model.js';
import Employee from '../../models/Employee.model.js';
import Leave from '../../models/Leave.model.js';
import RegularizationRequest from '../../models/Regularization.model.js';
import {
  getISTDayBoundaries,
  parseISTDateString
} from '../../utils/timezone.js';
import {
  buildPaginationMeta
} from '../../utils/attendance/attendanceHelpers.js';
import { PAGINATION_DEFAULTS } from '../../utils/attendance/attendanceConstants.js';
import { getHolidayMap, type HolidayMap } from '../workCalendar.js';

/**
 * Query options interface
 */
interface QueryOptions {
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
  employeeId?: string;
  includeEmployee?: boolean;
}

/**
 * Pagination result interface
 */
interface PaginationResult {
  records: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * AttendanceDataService
 * Repository layer for all attendance-related data operations
 */
export class AttendanceDataService {

  // Employee Data Operations

  static async getActiveEmployees(): Promise<any[]> {
    return await Employee.find({ isActive: true })
      .select('_id firstName lastName employeeId department position joiningDate')
      .sort({ firstName: 1, lastName: 1 })
      .lean();
  }

  static async getEmployee(employeeId: string): Promise<IEmployee | null> {
    return await Employee.findOne({ employeeId, isActive: true }).lean<IEmployee>();
  }

  static async getEmployeeById(employeeObjectId: string | Types.ObjectId): Promise<IEmployee | null> {
    return await Employee.findById(employeeObjectId).lean<IEmployee>();
  }

  // Attendance Data Operations

  /**
   * Find attendance record for a specific employee and date
   * @param employeeObjectId - Employee ObjectId
   * @param date - Target date
   * @returns Attendance record or null
   */
  static async findAttendanceRecord(employeeObjectId: string | Types.ObjectId, date: Date): Promise<any> {
    const { startOfDay, endOfDay } = getISTDayBoundaries(date);

    return await Attendance.findOne({
      employee: employeeObjectId,
      date: {
        $gte: startOfDay.toJSDate(),
        $lte: endOfDay.toJSDate()
      }
    }).lean();
  }

  /**
   * Create new attendance record
   * @param attendanceData - Attendance data
   * @returns Created attendance record
   */
  static async createAttendanceRecord(attendanceData: Partial<IAttendance>): Promise<IAttendance> {
    // For absent status, ensure checkIn and checkOut are null
    if (attendanceData.status === 'absent') {
      attendanceData.checkIn = null;
      attendanceData.checkOut = null;
      attendanceData.workHours = 0;
    }

    return await Attendance.create(attendanceData);
  }

  /**
   * Update attendance record
   * @param recordId - Attendance record ID
   * @param updateData - Data to update
   * @returns Updated attendance record
   */
  static async updateAttendanceRecord(recordId: string, updateData: Partial<IAttendance>): Promise<IAttendance | null> {
    // For absent status, we need to handle validation manually since
    // mongoose required function can't see the new status during update
    if (updateData.status === 'absent') {
      // For absent status, clear checkIn and checkOut regardless of what was sent
      updateData.checkIn = null;
      updateData.checkOut = null;
      updateData.workHours = 0;

      // Update without running validators to avoid the checkIn required issue
      return await Attendance.findByIdAndUpdate(
        recordId,
        updateData,
        { new: true, runValidators: false }
      );
    } else {
      return await Attendance.findByIdAndUpdate(
        recordId,
        updateData,
        { new: true, runValidators: true }
      );
    }
  }

  /**
   * Find attendance record by employee and date
   * @param employeeObjectId - Employee ObjectId
   * @param date - Target date
   * @returns Attendance record or null
   */
  static async findAttendanceByEmployeeAndDate(employeeObjectId: string | Types.ObjectId, date: Date): Promise<IAttendance | null> {
    const { startOfDay, endOfDay } = getISTDayBoundaries(date);

    return await Attendance.findOne({
      employee: employeeObjectId,
      date: { $gte: startOfDay.toJSDate(), $lte: endOfDay.toJSDate() }
    });
  }

  /**
   * Get attendance records for employee with pagination
   * @param employeeObjectId - Employee ObjectId
   * @param options - Query options
   * @returns Paginated attendance records
   */
  static async getEmployeeAttendanceRecords(
    employeeObjectId: string | Types.ObjectId,
    options: QueryOptions = {}
  ): Promise<PaginationResult> {
    const {
      startDate,
      endDate,
      status,
      page = PAGINATION_DEFAULTS.PAGE,
      limit = PAGINATION_DEFAULTS.LIMIT
    } = options;

    const filter: FilterQuery<IAttendance> = { employee: employeeObjectId };

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const { startOfDay } = getISTDayBoundaries(parseISTDateString(startDate).toJSDate());
        filter.date.$gte = startOfDay.toJSDate();
      }
      if (endDate) {
        const { endOfDay } = getISTDayBoundaries(parseISTDateString(endDate).toJSDate());
        filter.date.$lte = endOfDay.toJSDate();
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
   * @param startDate - Start date
   * @param endDate - End date
   * @param options - Additional options
   * @returns Attendance records
   */
  /**
   * Get today's attendance for all employees
   * @param date - Target date (optional, defaults to today)
   * @returns Today's attendance records
   */
  static async getTodayAttendanceRecords(date: Date = new Date()): Promise<any[]> {
    const { startOfDay, endOfDay } = getISTDayBoundaries(date);

    return await Attendance.find({
      date: { $gte: startOfDay.toJSDate(), $lte: endOfDay.toJSDate() }
    }).populate('employee', 'firstName lastName employeeId department');
  }

  /**
   * Get missing checkout records
   * Excludes dates that have pending regularization requests to avoid showing reminders
   * when employee has already submitted a regularization request
   * @param employeeObjectId - Employee ObjectId
   * @param lookbackDays - Number of days to look back (default: 7)
   * @returns Records with missing checkouts (excluding dates with pending regularizations)
   */
  static async getMissingCheckoutRecords(
    employeeObjectId: string | Types.ObjectId,
    lookbackDays: number = 7
  ): Promise<any[]> {
    const now = new Date();
    const { startOfDay: today } = getISTDayBoundaries(now);

    const lookbackDate = new Date(today.toJSDate());
    lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

    // Step 1: Get all attendance records with missing checkouts
    const missingCheckouts = await Attendance.find({
      employee: employeeObjectId,
      date: {
        $gte: lookbackDate,
        $lt: today.toJSDate()
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

    // Step 3: Get all pending regularization requests for this employee in the date range
    const pendingRegularizations = await RegularizationRequest.find({
      employee: employeeObjectId,
      status: 'pending',
      date: {
        $gte: lookbackDate,
        $lt: today.toJSDate()
      }
    }).lean();

    // Step 5: Create a Set of dates with pending regularizations for O(1) lookup
    // IMPORTANT: Use UTC date strings (YYYY-MM-DD) to avoid timezone issues
    // Both Attendance and RegularizationRequest dates are stored as UTC in MongoDB
    const pendingRegDates = new Set(
      pendingRegularizations.map(reg => {
        // Convert to YYYY-MM-DD format using UTC components
        const d = new Date(reg.date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })
    );

    // Step 6: Filter out missing checkouts that have pending regularizations
    const filteredMissingCheckouts = missingCheckouts.filter(attendance => {
      // Convert attendance date to YYYY-MM-DD format using UTC components
      const attDate = new Date(attendance.date);
      const year = attDate.getUTCFullYear();
      const month = String(attDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(attDate.getUTCDate()).padStart(2, '0');
      const attDateNormalized = `${year}-${month}-${day}`;

      // Keep attendance record only if it doesn't have a pending regularization
      return !pendingRegDates.has(attDateNormalized);
    });

    return filteredMissingCheckouts;
  }

  // Leave Data Operations

  /**
   * Get approved leaves for date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param employeeId - Employee ID (optional)
   * @returns Approved leave records
   */
  static async getApprovedLeavesInRange(
    startDate: Date,
    endDate: Date,
    employeeId: string | null = null
  ): Promise<any[]> {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);

    // Use overlapping date range query: leave overlaps [start, end] if
    // leave.startDate <= endBoundary AND leave.endDate >= startBoundary
    const filter: FilterQuery<ILeave> = {
      status: 'approved',
      startDate: { $lte: endBoundary.toJSDate() },
      endDate: { $gte: startBoundary.toJSDate() }
    };

    if (employeeId) {
      // Leave model stores `employee` as ObjectId, not `employeeId` string
      const emp = await Employee.findOne({ employeeId }).select('_id');
      if (emp) {
        filter.employee = emp._id;
      } else {
        return []; // Employee not found → no leaves
      }
    }

    return await Leave.find(filter).populate('employee', 'firstName lastName employeeId');
  }

  /**
   * Get approved leaves for specific employee and date range
   * @param employeeId - Employee ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Employee's approved leaves
   */
  // Holiday Data Operations

  static async getHolidaysInRange(startDate: Date, endDate: Date): Promise<HolidayMap> {
    return await getHolidayMap(startDate, endDate);
  }

  // Task Report Operations

  /**
   * Create task report
   * @param taskReportData - Task report data
   * @returns Created task report
   */
  /**
   * Get task reports for employee in date range
   * @param employeeObjectId - Employee ObjectId
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Task reports
   */
  // Complex Query Operations

  /**
   * Get attendance summary for multiple employees in date range
   * @param employeeIds - Array of employee ObjectIds
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Attendance summary data
   */
  /**
   * Get department-wise attendance statistics
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Department statistics
   */
  /**
   * Get attendance trends for a period
   * @param startDate - Start date
   * @param endDate - End date
   * @param groupBy - Group by period ('day', 'week', 'month')
   * @returns Attendance trends
   */
  static async getAttendanceTrends(startDate: Date, endDate: Date, groupBy: string = 'day'): Promise<any[]> {
    const { startOfDay: startBoundary } = getISTDayBoundaries(startDate);
    const { endOfDay: endBoundary } = getISTDayBoundaries(endDate);

    let groupByFormat: any;
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
          date: { $gte: startBoundary.toJSDate(), $lte: endBoundary.toJSDate() }
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
   * @param employeeObjectId - Employee ObjectId
   * @param date - Target date
   * @returns True if record exists
   */
  /**
   * Get attendance record count for employee in date range
   * @param employeeObjectId - Employee ObjectId
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Record count
   */
  /**
   * Bulk create attendance records
   * @param attendanceRecords - Array of attendance record data
   * @returns Created records
   */
  /**
   * Delete attendance record
   * @param recordId - Attendance record ID
   * @returns True if deleted successfully
   */
}

export default AttendanceDataService;
