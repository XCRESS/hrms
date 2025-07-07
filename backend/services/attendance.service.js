import Attendance from "../models/Attendance.model.js";
import Employee from "../models/Employee.model.js";
import Leave from "../models/Leave.model.js";
import Holiday from "../models/Holiday.model.js";
import moment from "moment-timezone";

/**
 * Attendance Service - Handles all attendance-related business logic
 */
export class AttendanceService {
  
  /**
   * Calculate attendance status based on check-in time and hours worked
   * @param {Date} checkInTime - Check-in timestamp
   * @param {number} hoursWorked - Hours worked
   * @returns {string} Attendance status
   */
  static calculateAttendanceStatus(checkInTime, hoursWorked = 0) {
    const checkInMoment = moment(checkInTime).tz("Asia/Kolkata");
    const cutoffTime = moment().tz("Asia/Kolkata").hour(9).minute(55).second(0);
    
    // If no check-in, it's absent
    if (!checkInTime) return 'absent';
    
    // If worked less than 4 hours, it's half day
    if (hoursWorked < 4) return 'half-day';
    
    // If checked in after 9:55 AM, it's late
    if (checkInMoment.isAfter(cutoffTime)) return 'late';
    
    // Otherwise, it's present
    return 'present';
  }
  
  /**
   * Check if a date is a working day (not weekend or holiday)
   * @param {Date} date - Date to check
   * @returns {Promise<boolean>} Is working day
   */
  static async isWorkingDay(date) {
    const dayOfWeek = moment(date).day();
    
    // Check if it's weekend (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Check if it's a holiday
    const holiday = await Holiday.findOne({
      date: {
        $gte: moment(date).startOf('day').toDate(),
        $lte: moment(date).endOf('day').toDate()
      }
    });
    
    return !holiday;
  }
  
  /**
   * Check if employee is on approved leave for a specific date
   * @param {string} employeeId - Employee ID
   * @param {Date} date - Date to check
   * @returns {Promise<boolean>} Is on leave
   */
  static async isOnLeave(employeeId, date) {
    const leave = await Leave.findOne({
      employeeId,
      status: 'approved',
      startDate: { $lte: date },
      endDate: { $gte: date }
    });
    
    return !!leave;
  }
  
  /**
   * Get attendance records for an employee with filtering and pagination
   * @param {string} employeeId - Employee ID
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Attendance records with metadata
   */
  static async getEmployeeAttendance(employeeId, filters = {}, pagination = {}) {
    const { skip = 0, limit = 10 } = pagination;
    const { startDate, endDate, status } = filters;
    
    // Build query
    const query = { employeeId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      };
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get records and total count
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employee', 'firstName lastName employeeId'),
      Attendance.countDocuments(query)
    ]);
    
    return {
      records,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    };
  }
  
  /**
   * Generate attendance records for employees who didn't check in
   * @param {Date} date - Date to generate records for
   * @returns {Promise<Array>} Created attendance records
   */
  static async generateAbsentRecords(date) {
    const targetDate = moment(date).startOf('day').toDate();
    
    // Check if it's a working day
    const isWorking = await this.isWorkingDay(targetDate);
    if (!isWorking) {
      return [];
    }
    
    // Get all employees
    const employees = await Employee.find({}, 'employeeId firstName lastName');
    
    // Get employees who already have attendance records for this date
    const existingAttendance = await Attendance.find({
      date: {
        $gte: targetDate,
        $lte: moment(date).endOf('day').toDate()
      }
    });
    
    const employeesWithAttendance = new Set(
      existingAttendance.map(record => record.employeeId)
    );
    
    // Generate absent records for employees without attendance
    const absentRecords = [];
    
    for (const employee of employees) {
      if (!employeesWithAttendance.has(employee.employeeId)) {
        // Check if employee is on leave
        const onLeave = await this.isOnLeave(employee.employeeId, targetDate);
        
        if (!onLeave) {
          const record = new Attendance({
            employeeId: employee.employeeId,
            employee: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            date: targetDate,
            status: 'absent',
            hoursWorked: 0
          });
          
          await record.save();
          absentRecords.push(record);
        }
      }
    }
    
    return absentRecords;
  }
  
  /**
   * Get attendance summary for a date range
   * @param {string} employeeId - Employee ID (optional, for specific employee)
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Attendance summary
   */
  static async getAttendanceSummary(employeeId, startDate, endDate) {
    const query = {
      date: {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      }
    };
    
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    const records = await Attendance.find(query);
    
    const summary = {
      totalDays: records.length,
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      totalHours: 0,
      averageHours: 0
    };
    
    records.forEach(record => {
      summary[record.status] = (summary[record.status] || 0) + 1;
      summary.totalHours += record.hoursWorked || 0;
    });
    
    summary.averageHours = summary.totalDays > 0 ? 
      Math.round((summary.totalHours / summary.totalDays) * 100) / 100 : 0;
    
    return summary;
  }
  
  /**
   * Get employees with missing checkouts
   * @param {number} lookbackDays - Number of days to look back
   * @returns {Promise<Array>} Employees with missing checkouts
   */
  static async getMissingCheckouts(lookbackDays = 7) {
    const startDate = moment().subtract(lookbackDays, 'days').startOf('day').toDate();
    const endDate = moment().endOf('day').toDate();
    
    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
      checkInTime: { $exists: true },
      $or: [
        { checkOutTime: { $exists: false } },
        { checkOutTime: null }
      ]
    }).populate('employee', 'firstName lastName employeeId email');
    
    return records.map(record => ({
      employee: record.employee,
      date: record.date,
      checkInTime: record.checkInTime,
      hoursWorked: record.hoursWorked || 0
    }));
  }
  
  /**
   * Update attendance record with checkout information
   * @param {string} attendanceId - Attendance record ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated attendance record
   */
  static async updateAttendanceRecord(attendanceId, updateData) {
    const record = await Attendance.findById(attendanceId);
    
    if (!record) {
      throw new Error('Attendance record not found');
    }
    
    // Calculate hours worked if checkout time is provided
    if (updateData.checkOutTime && record.checkInTime) {
      const checkIn = moment(record.checkInTime);
      const checkOut = moment(updateData.checkOutTime);
      const hoursWorked = checkOut.diff(checkIn, 'hours', true);
      
      updateData.hoursWorked = Math.round(hoursWorked * 100) / 100;
      updateData.status = this.calculateAttendanceStatus(record.checkInTime, hoursWorked);
    }
    
    Object.assign(record, updateData);
    await record.save();
    
    return record;
  }
}