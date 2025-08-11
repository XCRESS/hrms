/**
 * Attendance Computed Flags Utility
 * Computes flags dynamically from existing data without storing in database
 */

import { BUSINESS_RULES } from './attendanceConstants.js';
import { getISTDateString } from '../istUtils.js';

/**
 * Compute flags for attendance record based on existing data
 * @param {Object} record - Attendance record
 * @param {Object} dayType - Day type information (holiday, weekend, etc.)
 * @param {Object} approvedLeave - Approved leave record (optional)
 * @returns {Object} Computed flags object
 */
export const computeAttendanceFlags = (record, dayType = null, approvedLeave = null) => {
  const flags = {};

  // Compute late flag from check-in time
  if (record?.checkIn) {
    const checkInDate = new Date(record.checkIn);
    const checkInHour = checkInDate.getHours();
    const checkInMinutes = checkInDate.getMinutes();
    const checkInDecimal = checkInHour + (checkInMinutes / 60);
    
    if (checkInDecimal > BUSINESS_RULES.LATE_THRESHOLD) {
      flags.isLate = true;
    }
  }

  // Compute leave flag
  if (approvedLeave) {
    flags.isLeave = true;
  }

  // Compute holiday/weekend flags from day type
  if (dayType) {
    if (dayType.type === 'holiday') {
      flags.isHoliday = true;
    }
    if (dayType.type === 'weekend') {
      flags.isWeekend = true;
    }
  }

  return flags;
};

/**
 * Compute flags for a day without attendance record
 * @param {Date} date - Target date
 * @param {Object} dayType - Day type information
 * @param {Object} approvedLeave - Approved leave record (optional)
 * @returns {Object} Computed flags object
 */
export const computeDayFlags = (date, dayType, approvedLeave = null) => {
  const flags = {};

  // Leave flag
  if (approvedLeave) {
    flags.isLeave = true;
  }

  // Holiday/weekend flags
  if (dayType) {
    if (dayType.type === 'holiday') {
      flags.isHoliday = true;
    }
    if (dayType.type === 'weekend') {
      flags.isWeekend = true;
    }
  }

  return flags;
};

/**
 * Compute flags from multiple data sources
 * @param {Object} options - Options object
 * @param {Object} options.attendanceRecord - Attendance record (optional)
 * @param {Date} options.date - Target date
 * @param {Map} options.holidayMap - Holiday map (optional)
 * @param {Object} options.approvedLeave - Approved leave (optional)
 * @param {Function} options.dayTypeChecker - Function to determine day type
 * @returns {Object} Comprehensive flags object
 */
export const computeComprehensiveFlags = (options) => {
  const {
    attendanceRecord,
    date,
    holidayMap,
    approvedLeave,
    dayTypeChecker
  } = options;

  // Determine day type
  let dayType = null;
  if (dayTypeChecker) {
    dayType = dayTypeChecker(date, holidayMap);
  } else if (holidayMap) {
    // Basic day type checking
    const dateKey = getISTDateString(date);
    const dayOfWeek = date.getDay();
    
    if (holidayMap.has(dateKey)) {
      dayType = { type: 'holiday', isWorkingDay: false };
    } else if (dayOfWeek === 0) {
      dayType = { type: 'weekend', isWorkingDay: false };
    } else if (dayOfWeek === 6) {
      // Simplified Saturday check - in real usage, use proper business service
      dayType = { type: 'weekend', isWorkingDay: false };
    } else {
      dayType = { type: 'working', isWorkingDay: true };
    }
  }

  // Compute flags
  if (attendanceRecord) {
    return computeAttendanceFlags(attendanceRecord, dayType, approvedLeave);
  } else {
    return computeDayFlags(date, dayType, approvedLeave);
  }
};

/**
 * Add computed flags to attendance record
 * @param {Object} record - Attendance record
 * @param {Object} computedFlags - Computed flags object
 * @returns {Object} Record with flags added
 */
export const addComputedFlagsToRecord = (record, computedFlags) => {
  if (!record) return record;

  return {
    ...record,
    flags: computedFlags || {}
  };
};

/**
 * Batch compute flags for multiple records
 * @param {Array} records - Array of attendance records
 * @param {Object} contextData - Context data for computing flags
 * @returns {Array} Records with computed flags
 */
export const batchComputeFlags = (records, contextData = {}) => {
  const {
    holidayMap,
    leavesMap,
    dayTypeChecker
  } = contextData;

  return records.map(record => {
    const dateKey = getISTDateString(record.date);
    const approvedLeave = leavesMap?.get(dateKey);
    
    const flags = computeComprehensiveFlags({
      attendanceRecord: record,
      date: record.date,
      holidayMap,
      approvedLeave,
      dayTypeChecker
    });

    return addComputedFlagsToRecord(record, flags);
  });
};

export default {
  computeAttendanceFlags,
  computeDayFlags,
  computeComprehensiveFlags,
  addComputedFlagsToRecord,
  batchComputeFlags
};