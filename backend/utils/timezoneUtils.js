/**
 * Timezone Utility Functions - moment-timezone based
 * 
 * This module provides centralized timezone utilities using moment-timezone
 * for the HRMS application. All functions work explicitly with IST timezone
 * to ensure consistent behavior across development and production environments.
 * 
 * Key benefits:
 * - Production-safe: Works correctly regardless of server timezone
 * - Consistent: Always operates in IST (Asia/Kolkata)
 * - Reliable: Uses mature moment-timezone library for edge case handling
 */

import moment from 'moment-timezone';

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current IST date and time
 * @returns {moment.Moment} Current date in IST timezone
 */
export const getISTNow = () => {
  return moment.tz(IST_TIMEZONE);
};

/**
 * Convert any date to IST moment object
 * @param {Date|string|moment.Moment} date - Date to convert
 * @returns {moment.Moment} Date in IST timezone
 */
export const toIST = (date = null) => {
  if (!date) return getISTNow();
  return moment.tz(date, IST_TIMEZONE);
};

/**
 * Get start and end boundaries for a given IST date
 * @param {Date|string|moment.Moment} date - Date to get boundaries for (defaults to today)
 * @returns {Object} { startOfDay, endOfDay } both as moment objects in IST
 */
export const getISTDayBoundaries = (date = null) => {
  const istMoment = date ? toIST(date) : getISTNow();

  return {
    startOfDay: istMoment.clone().startOf('day'),
    endOfDay: istMoment.clone().endOf('day')
  };
};

/**
 * Normalize a date to IST start of day (UTC midnight)
 * Use this for fields that need unique daily constraints
 * @param {Date|string|moment.Moment} date - Date to normalize
 * @returns {Date} - UTC Date object representing IST start of day
 */
export const normalizeToISTDate = (date = null) => {
  const { startOfDay } = getISTDayBoundaries(date);
  return startOfDay.toDate();
};

/**
 * Get IST date boundaries for a date range
 * @param {Date|string|moment.Moment} startDate - Start date
 * @param {Date|string|moment.Moment} endDate - End date  
 * @returns {Object} { startOfPeriod, endOfPeriod } both as moment objects in IST
 */
export const getISTRangeBoundaries = (startDate, endDate) => {
  const { startOfDay: startOfPeriod } = getISTDayBoundaries(startDate);
  const { endOfDay: endOfPeriod } = getISTDayBoundaries(endDate);
  
  return { startOfPeriod, endOfPeriod };
};

/**
 * Create IST date with specific time
 * @param {Date|string|moment.Moment} date - Base date
 * @param {number} hours - Hours (0-23)
 * @param {number} minutes - Minutes (0-59)
 * @param {number} seconds - Seconds (0-59, default: 0)
 * @param {number} milliseconds - Milliseconds (0-999, default: 0)
 * @returns {moment.Moment} IST moment with specified time
 */
export const createISTDateTime = (date, hours, minutes, seconds = 0, milliseconds = 0) => {
  const istMoment = toIST(date);
  return istMoment.hours(hours).minutes(minutes).seconds(seconds).milliseconds(milliseconds);
};

/**
 * Common business hour times in IST
 */
export const BUSINESS_HOURS_IST = {
  WORK_START: { hour: 9, minute: 0 },     // 9:00 AM
  WORK_END: { hour: 18, minute: 0 },      // 6:00 PM  
  LATE_THRESHOLD: { hour: 9, minute: 55 }, // 9:55 AM
  HALF_DAY_END: { hour: 13, minute: 0 },   // 1:00 PM
  LATE_ARRIVAL: { hour: 10, minute: 0 }    // 10:00 AM
};

/**
 * Create IST business hours for a given date using settings
 * @param {Date|string|moment.Moment} date - Base date
 * @param {Object} settings - Time settings (workStartTime, workEndTime, etc.)
 * @returns {Object} Business hours as moment objects
 */
export const getBusinessHours = (date = null, settings = null) => {
  const baseDate = date ? toIST(date) : getISTNow();
  
  // Use provided settings or defaults
  const workStart = settings?.workStartTime || "09:00";
  const workEnd = settings?.workEndTime || "18:00";
  const lateThreshold = settings?.lateThreshold || "09:55";
  const halfDayEnd = settings?.halfDayEndTime || "13:00";
  
  // Parse time strings (HH:MM format)
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };
  
  const startTime = parseTime(workStart);
  const endTime = parseTime(workEnd);
  const lateTime = parseTime(lateThreshold);
  const halfTime = parseTime(halfDayEnd);
  
  return {
    workStart: createISTDateTime(baseDate, startTime.hours, startTime.minutes),
    workEnd: createISTDateTime(baseDate, endTime.hours, endTime.minutes),
    lateThreshold: createISTDateTime(baseDate, lateTime.hours, lateTime.minutes),
    halfDayEnd: createISTDateTime(baseDate, halfTime.hours, halfTime.minutes),
    lateArrival: createISTDateTime(baseDate, BUSINESS_HOURS_IST.LATE_ARRIVAL.hour, BUSINESS_HOURS_IST.LATE_ARRIVAL.minute)
  };
};

/**
 * Format IST date for display
 * @param {Date|string|moment.Moment} date - Date to format
 * @param {Object} options - Format options
 * @returns {string} Formatted date string
 */
export const formatISTDate = (date, options = {}) => {
  const {
    dateOnly = false,
    timeOnly = false,
    format12Hour = true,
    format = null
  } = options;
  
  if (!date) return '';
  
  const istMoment = toIST(date);
  
  if (format) {
    return istMoment.format(format);
  }
  
  if (dateOnly) {
    return istMoment.format('YYYY-MM-DD');
  }
  
  if (timeOnly) {
    return istMoment.format(format12Hour ? 'h:mm A' : 'HH:mm');
  }
  
  return istMoment.format(format12Hour ? 'YYYY-MM-DD h:mm A' : 'YYYY-MM-DD HH:mm');
};

/**
 * Get IST date string in YYYY-MM-DD format
 * @param {Date|string|moment.Moment} date - Date to format
 * @returns {string} YYYY-MM-DD format
 */
export const getISTDateString = (date = null) => {
  const istMoment = date ? toIST(date) : getISTNow();
  return istMoment.format('YYYY-MM-DD');
};

/**
 * Parse date string in IST context
 * @param {string} dateString - Date string (YYYY-MM-DD or ISO format)
 * @returns {moment.Moment} IST moment object
 */
export const parseISTDateString = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('Date string is required and must be a string');
  }
  
  // Handle ISO date strings with timezone info
  if (dateString.includes('T') || dateString.includes('Z') || dateString.includes('+')) {
    return moment.tz(dateString, IST_TIMEZONE);
  }
  
  // Handle YYYY-MM-DD format - interpret as IST date
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return moment.tz(dateString, 'YYYY-MM-DD', IST_TIMEZONE);
  }
  
  throw new Error('Date must be in YYYY-MM-DD or ISO format');
};

/**
 * Check if two dates are on the same day in IST
 * @param {Date|string|moment.Moment} date1 - First date
 * @param {Date|string|moment.Moment} date2 - Second date
 * @returns {boolean} True if same day in IST
 */
export const isSameDayIST = (date1, date2) => {
  const ist1 = toIST(date1);
  const ist2 = toIST(date2);
  return ist1.format('YYYY-MM-DD') === ist2.format('YYYY-MM-DD');
};

/**
 * Add days to an IST date
 * @param {Date|string|moment.Moment} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {moment.Moment} New moment with days added
 */
export const addDaysIST = (date, days) => {
  return toIST(date).add(days, 'days');
};

/**
 * Calculate work hours between two IST times
 * @param {Date|string|moment.Moment} checkIn - Check-in time
 * @param {Date|string|moment.Moment} checkOut - Check-out time  
 * @returns {number} Work hours (decimal)
 */
export const calculateWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  
  const checkInIST = toIST(checkIn);
  const checkOutIST = toIST(checkOut);
  
  const duration = moment.duration(checkOutIST.diff(checkInIST));
  return Math.max(0, duration.asHours());
};

/**
 * Determine attendance status based on check-in time and work hours
 * @param {Date|string|moment.Moment} checkIn - Check-in time in IST
 * @param {Date|string|moment.Moment} checkOut - Check-out time in IST (optional)
 * @param {Object} settings - Attendance settings (optional)
 * @returns {string} Status: 'present', 'late', 'half-day', 'absent'
 */
export const determineAttendanceStatus = (checkIn, checkOut = null, settings = null) => {
  if (!checkIn) return 'absent';
  
  const checkInIST = toIST(checkIn);
  const businessHours = getBusinessHours(checkInIST, settings);
  
  // Check if late
  const isLate = checkInIST.isAfter(businessHours.lateThreshold);
  
  // Check if half day (less than minimum work hours)
  if (checkOut) {
    const workHours = calculateWorkHours(checkIn, checkOut);
    const minimumHours = settings?.minimumWorkHours || 4;
    
    if (workHours < minimumHours) {
      return 'half-day';
    }
  }
  
  return isLate ? 'late' : 'present';
};

/**
 * Convert moment object to JavaScript Date in IST
 * @param {moment.Moment} momentObj - Moment object
 * @returns {Date} JavaScript Date object
 */
export const momentToDate = (momentObj) => {
  return momentObj.toDate();
};

/**
 * Get timezone offset for IST
 * @returns {string} Timezone offset (+05:30)
 */
export const getISTOffset = () => {
  return getISTNow().format('Z');
};

/**
 * Convert time string to decimal hours for calculations
 * @param {string} timeString - Time in 24-hour format (HH:MM)
 * @returns {number} Decimal hours
 */
export const timeToDecimal = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return 0;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  
  return hours + (minutes / 60);
};

/**
 * Convert decimal hours to time string
 * @param {number} decimal - Decimal hours
 * @returns {string} Time in 24-hour format (HH:MM)
 */
export const decimalToTime24 = (decimal) => {
  if (typeof decimal !== 'number' || isNaN(decimal)) return '00:00';
  
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  
  const formattedHours = hours.toString().padStart(2, '0');
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `${formattedHours}:${formattedMinutes}`;
};

// Default export with all utilities
export default {
  getISTNow,
  toIST,
  getISTDayBoundaries,
  normalizeToISTDate,
  getISTRangeBoundaries,
  createISTDateTime,
  getBusinessHours,
  formatISTDate,
  getISTDateString,
  parseISTDateString,
  isSameDayIST,
  addDaysIST,
  calculateWorkHours,
  determineAttendanceStatus,
  momentToDate,
  getISTOffset,
  timeToDecimal,
  decimalToTime24,
  BUSINESS_HOURS_IST,
  IST_TIMEZONE
};