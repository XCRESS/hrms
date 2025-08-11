/**
 * Attendance Business Service
 * Contains all core business logic, rules, and policies for attendance management
 */

import { 
  ATTENDANCE_STATUS, 
  BUSINESS_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '../../utils/attendance/attendanceConstants.js';
import { 
  getISTNow, 
  getISTDayBoundaries,
  getBusinessHours,
  getISTDateString,
  calculateWorkHours,
  determineAttendanceStatus as originalDetermineStatus
} from '../../utils/istUtils.js';
import { computeAttendanceFlags, computeDayFlags } from '../../utils/attendance/attendanceComputedFlags.js';

/**
 * AttendanceBusinessService
 * Centralized business logic for attendance operations
 */
export class AttendanceBusinessService {

  /**
   * Determine attendance status based on check-in time and work hours
   * Uses simplified 3-status system: Present (includes late), Absent, Half-day
   * @param {Date} checkInTime - Check-in timestamp
   * @param {Date} checkOutTime - Check-out timestamp (optional)
   * @returns {Object} Status and flags object
   */
  static determineAttendanceStatus(checkInTime, checkOutTime = null) {
    if (!checkInTime) {
      return { 
        status: ATTENDANCE_STATUS.ABSENT, 
        flags: {},
        reason: 'No check-in recorded'
      };
    }

    const checkInDate = new Date(checkInTime);
    const checkInHour = checkInDate.getHours();
    const checkInMinutes = checkInDate.getMinutes();
    const checkInDecimal = checkInHour + (checkInMinutes / 60);
    
    // Calculate work hours if checkout time is available
    let workHours = 0;
    if (checkOutTime) {
      workHours = calculateWorkHours(checkInTime, checkOutTime);
    }

    let status = ATTENDANCE_STATUS.PRESENT;
    
    // If checked out, determine final status based on work hours
    if (checkOutTime && workHours < BUSINESS_RULES.MINIMUM_WORK_HOURS) {
      status = ATTENDANCE_STATUS.HALF_DAY;
    }

    // Create a mock record for flag computation
    const mockRecord = { checkIn: checkInTime, checkOut: checkOutTime, status };
    const flags = computeAttendanceFlags(mockRecord);

    return {
      status,
      flags,
      workHours
    };
  }

  /**
   * Check if a date is a working day for the company
   * Working days: Monday to Friday + 1st, 3rd, 4th, 5th Saturday (excluding 2nd Saturday)
   * Non-working days: Sunday + 2nd Saturday of each month + holidays
   * @param {Date} date - The IST date to check
   * @param {Map} holidayMap - Pre-fetched holiday map for O(1) lookup (optional)
   * @returns {boolean} True if it's a working day
   */
  static isWorkingDayForCompany(date, holidayMap = null) {
    const dayOfWeek = date.getDay();
    
    // Sunday is always a non-working day
    if (dayOfWeek === 0) {
      return false;
    }
    
    // Check if it's a holiday using pre-fetched map (O(1) lookup)
    if (holidayMap) {
      const dateKey = getISTDateString(date);
      if (holidayMap.has(dateKey)) {
        return false; // It's a holiday, so not a working day
      }
    }
    
    // Monday to Friday are working days (if not a holiday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      return true;
    }
    
    // Saturday logic: exclude 2nd Saturday of the month
    if (dayOfWeek === 6) {
      const dateNum = date.getDate();
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstSaturday = 7 - firstDayOfMonth.getDay() || 7; // Get first Saturday of month
      const secondSaturday = firstSaturday + 7; // Second Saturday is 7 days later
      
      // If this Saturday is the 2nd Saturday, it's a non-working day
      if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
        return false;
      }
      
      // All other Saturdays are working days (if not a holiday)
      return true;
    }
    
    return false;
  }

  /**
   * Validate check-in eligibility
   * @param {Object} employee - Employee document
   * @param {Date} currentTime - Current IST time (optional, defaults to now)
   * @returns {Object} Validation result
   */
  static validateCheckInEligibility(employee, currentTime = null) {
    const now = currentTime || getISTNow();
    const { startOfDay, endOfDay } = getISTDayBoundaries(now);
    
    const validation = {
      isEligible: true,
      errors: [],
      warnings: []
    };

    // Check if employee is active
    if (!employee.isActive) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.EMPLOYEE_INACTIVE);
    }

    // Check if operation date is before joining date
    if (employee.joiningDate && startOfDay < employee.joiningDate) {
      validation.isEligible = false;
      validation.errors.push('Cannot check-in before joining date');
    }

    // Check if it's a very early check-in (before 6 AM)
    const checkInHour = now.getHours();
    if (checkInHour < 6) {
      validation.warnings.push('Very early check-in detected');
    }

    // Check if it's a very late check-in (after 12 PM)
    if (checkInHour > 12) {
      validation.warnings.push('Late check-in detected');
    }

    return validation;
  }

  /**
   * Validate check-out eligibility
   * @param {Object} attendanceRecord - Existing attendance record
   * @param {Array} tasks - Task report array
   * @param {Date} currentTime - Current IST time (optional, defaults to now)
   * @returns {Object} Validation result
   */
  static validateCheckOutEligibility(attendanceRecord, tasks, currentTime = null) {
    const now = currentTime || getISTNow();
    
    const validation = {
      isEligible: true,
      errors: [],
      warnings: []
    };

    // Check if attendance record exists
    if (!attendanceRecord) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.NO_CHECKIN_RECORD);
      return validation;
    }

    // Check if already checked out
    if (attendanceRecord.checkOut) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.ALREADY_CHECKED_OUT);
      return validation;
    }

    // Validate task report
    const taskValidation = this.validateTaskReport(tasks);
    if (!taskValidation.isValid) {
      validation.isEligible = false;
      validation.errors.push(ERROR_MESSAGES.TASK_REPORT_REQUIRED);
    }

    // Check minimum work duration (warning if less than 2 hours)
    const workHours = calculateWorkHours(attendanceRecord.checkIn, now);
    if (workHours < 2) {
      validation.warnings.push('Short work duration detected');
    }

    return validation;
  }

  /**
   * Validate task report
   * @param {Array} tasks - Array of task strings
   * @returns {Object} Validation result
   */
  static validateTaskReport(tasks) {
    if (!tasks || !Array.isArray(tasks)) {
      return { isValid: false, errors: ['Tasks must be provided as an array'] };
    }

    const validTasks = tasks.filter(task => 
      typeof task === 'string' && task.trim() !== ''
    );

    if (validTasks.length === 0) {
      return { isValid: false, errors: ['At least one valid task is required'] };
    }

    return { isValid: true, validTasks };
  }

  /**
   * Calculate final attendance status after checkout
   * @param {Date} checkInTime - Check-in time
   * @param {Date} checkOutTime - Check-out time
   * @returns {Object} Final status and metadata
   */
  static calculateFinalStatus(checkInTime, checkOutTime) {
    const statusResult = this.determineAttendanceStatus(checkInTime, checkOutTime);
    const workHours = calculateWorkHours(checkInTime, checkOutTime);
    
    return {
      status: statusResult.status,
      flags: statusResult.flags,
      workHours: parseFloat(workHours.toFixed(2)),
      isLate: statusResult.flags.isLate || false
    };
  }

  /**
   * Generate business hours for a specific date
   * @param {Date} date - Target date
   * @returns {Object} Business hours object
   */
  static getBusinessHours(date) {
    return getBusinessHours(date);
  }

  /**
   * Determine day type (working day, weekend, holiday)
   * @param {Date} date - Date to check
   * @param {Map} holidayMap - Holiday map (optional)
   * @returns {Object} Day type information
   */
  static determineDayType(date, holidayMap = null) {
    const dateKey = getISTDateString(date);
    const dayOfWeek = date.getDay();
    
    // Check for holiday first
    if (holidayMap && holidayMap.has(dateKey)) {
      const holiday = holidayMap.get(dateKey);
      return {
        type: 'holiday',
        isWorkingDay: false,
        flags: { isHoliday: true },
        holidayTitle: holiday.title || holiday.holidayName || 'Holiday'
      };
    }

    // Check for weekend
    if (dayOfWeek === 0) { // Sunday
      return {
        type: 'weekend',
        isWorkingDay: false,
        flags: { isWeekend: true },
        reason: 'Sunday'
      };
    }

    if (dayOfWeek === 6) { // Saturday
      // Check if it's 2nd Saturday
      const dateNum = date.getDate();
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstSaturday = 7 - firstDayOfMonth.getDay() || 7;
      const secondSaturday = firstSaturday + 7;
      
      if (dateNum >= secondSaturday && dateNum < secondSaturday + 7) {
        return {
          type: 'weekend',
          isWorkingDay: false,
          flags: { isWeekend: true },
          reason: '2nd Saturday'
        };
      }
    }

    // It's a working day
    return {
      type: 'working',
      isWorkingDay: true,
      flags: {}
    };
  }

  /**
   * Process attendance for a specific day
   * Determines the appropriate status and flags based on attendance record, leaves, and day type
   * @param {Date} date - Target date
   * @param {Object} employee - Employee document
   * @param {Object} attendanceRecord - Attendance record (optional)
   * @param {Object} approvedLeave - Approved leave record (optional)
   * @param {Map} holidayMap - Holiday map (optional)
   * @returns {Object} Processed attendance data
   */
  static processAttendanceForDay(date, employee, attendanceRecord = null, approvedLeave = null, holidayMap = null) {
    const dayType = this.determineDayType(date, holidayMap);
    
    // Base result structure
    const result = {
      date: new Date(date),
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName
      },
      employeeName: `${employee.firstName} ${employee.lastName}`,
      checkIn: null,
      checkOut: null,
      status: ATTENDANCE_STATUS.ABSENT,
      workHours: null,
      comments: null,
      reason: null
    };

    // Handle holidays
    if (dayType.type === 'holiday') {
      result.status = ATTENDANCE_STATUS.ABSENT;
      result.holidayTitle = dayType.holidayTitle;
      result.flags = computeDayFlags(date, dayType, null);
      return result;
    }

    // Handle weekends
    if (dayType.type === 'weekend') {
      result.status = ATTENDANCE_STATUS.ABSENT;
      result.reason = dayType.reason;
      result.flags = computeDayFlags(date, dayType, null);
      return result;
    }

    // Handle approved leave
    if (approvedLeave) {
      result.status = ATTENDANCE_STATUS.ABSENT;
      result.comments = `Leave: ${approvedLeave.leaveType || 'Approved'}`;
      result.reason = approvedLeave.leaveReason || 'Approved leave';
      result.flags = computeDayFlags(date, dayType, approvedLeave);
      return result;
    }

    // Handle attendance record
    if (attendanceRecord) {
      const workHours = calculateWorkHours(attendanceRecord.checkIn, attendanceRecord.checkOut);
      const statusResult = this.determineAttendanceStatus(attendanceRecord.checkIn, attendanceRecord.checkOut);
      
      result.checkIn = attendanceRecord.checkIn;
      result.checkOut = attendanceRecord.checkOut;
      result.status = statusResult.status;
      result.workHours = parseFloat(workHours.toFixed(2));
      result.flags = statusResult.flags;
      result.comments = attendanceRecord.comments;
      result.reason = attendanceRecord.reason;
      result.location = attendanceRecord.location;
      
      return result;
    }

    // No attendance record for a working day - absent
    result.reason = 'No check-in recorded';
    result.flags = computeDayFlags(date, dayType, null);
    return result;
  }

  /**
   * Calculate attendance percentage for a period
   * @param {Array} attendanceRecords - Array of attendance records
   * @returns {Object} Attendance percentage and statistics
   */
  static calculateAttendancePercentage(attendanceRecords) {
    let totalWorkingDays = 0;
    let presentDays = 0;

    attendanceRecords.forEach(record => {
      // Only count working days (exclude weekends and holidays)
      if (!record.flags?.isWeekend && !record.flags?.isHoliday) {
        totalWorkingDays++;
        
        if (record.status === ATTENDANCE_STATUS.PRESENT || record.status === ATTENDANCE_STATUS.HALF_DAY) {
          presentDays++;
        }
      }
    });

    const percentage = totalWorkingDays > 0 ? ((presentDays / totalWorkingDays) * 100) : 0;

    return {
      totalWorkingDays,
      presentDays,
      absentDays: totalWorkingDays - presentDays,
      percentage: parseFloat(percentage.toFixed(1))
    };
  }

  /**
   * Validate status transition
   * @param {string} currentStatus - Current status
   * @param {string} newStatus - Desired new status
   * @returns {boolean} True if transition is valid
   */
  static validateStatusTransition(currentStatus, newStatus) {
    if (!currentStatus || !newStatus) return false;
    
    const validTransitions = {
      [ATTENDANCE_STATUS.ABSENT]: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY],
      [ATTENDANCE_STATUS.PRESENT]: [ATTENDANCE_STATUS.ABSENT, ATTENDANCE_STATUS.HALF_DAY],
      [ATTENDANCE_STATUS.HALF_DAY]: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.ABSENT]
    };

    const allowed = validTransitions[currentStatus];
    return allowed ? allowed.includes(newStatus) : false;
  }
}

export default AttendanceBusinessService;