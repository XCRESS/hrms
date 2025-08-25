/**
 * Attendance Business Service
 * Contains all core business logic, rules, and policies for attendance management
 */

import { 
  ATTENDANCE_STATUS, 
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '../../utils/attendance/attendanceConstants.js';
import { 
  getISTNow, 
  getISTDayBoundaries,
  getISTDateString,
  calculateWorkHours,
  determineAttendanceStatus as originalDetermineStatus,
  toIST
} from '../../utils/timezoneUtils.js';
import { computeAttendanceFlags, computeDayFlags } from '../../utils/attendance/attendanceComputedFlags.js';
import settingsService from '../settings/SettingsService.js';

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
   * @param {string} department - Department for settings lookup (optional)
   * @returns {Promise<Object>} Status and flags object
   */
  static async determineAttendanceStatus(checkInTime, checkOutTime = null, department = null) {
    if (!checkInTime) {
      return { 
        status: ATTENDANCE_STATUS.ABSENT, 
        flags: {},
        reason: 'No check-in recorded'
      };
    }

    const checkInIST = toIST(checkInTime);
    const checkInHour = checkInIST.hours();
    const checkInMinutes = checkInIST.minutes();
    const checkInDecimal = checkInHour + (checkInMinutes / 60);
    
    // Calculate work hours if checkout time is available
    let workHours = 0;
    if (checkOutTime) {
      workHours = calculateWorkHours(checkInTime, checkOutTime);
    }

    let status = ATTENDANCE_STATUS.PRESENT;
    
    // If checked out, determine final status based on work hours using dynamic settings
    if (checkOutTime) {
      const thresholds = await settingsService.getWorkHourThresholds(department);
      const attendanceSettings = await settingsService.getAttendanceSettings(department);
      
      // Check if it's Saturday and has half-day policy
      const dayOfWeek = checkInTime.getDay();
      const isSaturday = dayOfWeek === 6;
      const isSaturdayHalfDay = isSaturday && attendanceSettings.saturdayWorkType === 'half';
      
      if (workHours < thresholds.minimumWorkHours) {
        // Less than minimum required hours - mark as absent
        status = ATTENDANCE_STATUS.ABSENT;
      } else if (!isSaturdayHalfDay && workHours < thresholds.fullDayHours) {
        // Between minimum and full day hours - mark as half day
        // Exception: If it's Saturday with half-day policy, don't mark as half day
        status = ATTENDANCE_STATUS.HALF_DAY;
      } else {
        // Full day hours or more - mark as present
        // Also mark as present if it's Saturday half-day policy and worked >= minimum hours
        status = ATTENDANCE_STATUS.PRESENT;
      }
    }

    // Create a mock record for flag computation
    const mockRecord = { checkIn: checkInTime, checkOut: checkOutTime, status };
    const flags = await computeAttendanceFlags(mockRecord, null, null, department);

    return {
      status,
      flags,
      workHours
    };
  }

  /**
   * Check if a date is a working day for the company using dynamic settings
   * @param {Date} date - The IST date to check
   * @param {Map} holidayMap - Pre-fetched holiday map for O(1) lookup (optional)
   * @param {string} department - Department for settings lookup (optional)
   * @returns {Promise<boolean>} True if it's a working day
   */
  static async isWorkingDayForCompany(date, holidayMap = null, department = null) {
    // Check if it's a holiday using pre-fetched map (O(1) lookup)
    if (holidayMap) {
      const dateKey = getISTDateString(date);
      if (holidayMap.has(dateKey)) {
        return false; // It's a holiday, so not a working day
      }
    }
    
    // Use settings service to check if it's a working day
    return await settingsService.isWorkingDay(date, department);
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
    const checkInHour = now.hours();
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
   * @param {string} department - Department for settings lookup (optional)
   * @returns {Promise<Object>} Final status and metadata
   */
  static async calculateFinalStatus(checkInTime, checkOutTime, department = null) {
    const statusResult = await this.determineAttendanceStatus(checkInTime, checkOutTime, department);
    const workHours = calculateWorkHours(checkInTime, checkOutTime);
    
    return {
      status: statusResult.status,
      flags: statusResult.flags,
      workHours: parseFloat(workHours.toFixed(2)),
      isLate: statusResult.flags.isLate || false
    };
  }

  /**
   * Generate business hours for a specific date using dynamic settings
   * @param {Date} date - Target date
   * @param {string} department - Department for settings lookup (optional)
   * @returns {Promise<Object>} Business hours object
   */
  static async getBusinessHours(date, department = null) {
    return await settingsService.getBusinessHours(date, department);
  }

  /**
   * Determine day type (working day, weekend, holiday)
   * @param {Date} date - Date to check
   * @param {Map} holidayMap - Holiday map (optional)
   * @param {string} department - Department for settings lookup (optional)
   * @returns {Promise<Object>} Day type information
   */
  static async determineDayType(date, holidayMap = null, department = null) {
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
      // Check if it's a holiday Saturday using settings
      const isWorkingDay = await settingsService.isWorkingDay(date, department);
      if (!isWorkingDay) {
        const saturdayWeek = this.getSaturdayWeekOfMonth(date);
        return {
          type: 'weekend',
          isWorkingDay: false,
          flags: { isWeekend: true },
          reason: `${this.getOrdinalNumber(saturdayWeek)} Saturday`
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
   * Determine which Saturday of the month a given date is
   * @param {Date} date - Date to check (should be a Saturday)
   * @returns {number} 1, 2, 3, or 4 representing 1st, 2nd, 3rd, or 4th Saturday
   */
  static getSaturdayWeekOfMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const dateNum = date.getDate();
    
    // Find the first Saturday of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    
    // Calculate first Saturday date (0=Sunday, 6=Saturday)
    const firstSaturday = firstDayWeekday === 6 ? 1 : 7 - firstDayWeekday;
    
    // Calculate which Saturday this date is
    const saturdayWeek = Math.ceil((dateNum - firstSaturday + 1) / 7);
    
    return Math.max(1, Math.min(4, saturdayWeek)); // Ensure it's between 1-4
  }

  /**
   * Get ordinal number string (1st, 2nd, 3rd, 4th)
   * @param {number} num - Number (1-4)
   * @returns {string} Ordinal string
   */
  static getOrdinalNumber(num) {
    const ordinals = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };
    return ordinals[num] || `${num}th`;
  }

  /**
   * Process attendance for a specific day
   * Determines the appropriate status and flags based on attendance record, leaves, and day type
   * @param {Date} date - Target date
   * @param {Object} employee - Employee document
   * @param {Object} attendanceRecord - Attendance record (optional)
   * @param {Object} approvedLeave - Approved leave record (optional)
   * @param {Map} holidayMap - Holiday map (optional)
   * @returns {Promise<Object>} Processed attendance data
   */
  static async processAttendanceForDay(date, employee, attendanceRecord = null, approvedLeave = null, holidayMap = null) {
    const dayType = await this.determineDayType(date, holidayMap, employee.department);
    
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
      const statusResult = await this.determineAttendanceStatus(attendanceRecord.checkIn, attendanceRecord.checkOut, employee.department);
      
      result.checkIn = attendanceRecord.checkIn;
      result.checkOut = attendanceRecord.checkOut;
      result.status = statusResult.status;
      result.workHours = parseFloat(workHours.toFixed(2));
      result.flags = await computeAttendanceFlags(attendanceRecord, dayType, approvedLeave, employee.department);
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