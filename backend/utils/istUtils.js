/**
 * IST (Indian Standard Time) Utility Functions
 * 
 * This module provides utilities to work exclusively with Indian Standard Time (IST)
 * for the HRMS application. All functions assume IST timezone (UTC+5:30).
 * 
 * Key benefits:
 * - Eliminates timezone conversion complexity
 * - Consistent date/time handling across the application
 * - Simplified business logic for Indian operations
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Get current IST date and time
 * @returns {Date} Current date in IST
 */
export const getISTNow = () => {
  return new Date(Date.now() + IST_OFFSET_MS);
};

/**
 * Convert any date to IST
 * @param {Date|string} date - Date to convert (if already IST, returns as-is)
 * @returns {Date} Date in IST
 */
export const toIST = (date = new Date()) => {
  const inputDate = new Date(date);
  return new Date(inputDate.getTime() + IST_OFFSET_MS);
};

/**
 * Get start and end boundaries for a given IST date
 * @param {Date|string} date - Date to get boundaries for (defaults to today)
 * @returns {Object} { startOfDay, endOfDay } both in IST
 */
export const getISTDayBoundaries = (date = getISTNow()) => {
  const istDate = date instanceof Date ? date : new Date(date);
  
  const startOfDay = new Date(
    istDate.getFullYear(),
    istDate.getMonth(),
    istDate.getDate(),
    0, 0, 0, 0
  );
  
  const endOfDay = new Date(
    istDate.getFullYear(),
    istDate.getMonth(),
    istDate.getDate(),
    23, 59, 59, 999
  );
  
  return { startOfDay, endOfDay };
};

/**
 * Get IST date boundaries for a date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date  
 * @returns {Object} { startOfPeriod, endOfPeriod } both in IST
 */
export const getISTRangeBoundaries = (startDate, endDate) => {
  const { startOfDay: startOfPeriod } = getISTDayBoundaries(startDate);
  const { endOfDay: endOfPeriod } = getISTDayBoundaries(endDate);
  
  return { startOfPeriod, endOfPeriod };
};

/**
 * Create IST date with specific time
 * @param {Date|string} date - Base date
 * @param {number} hours - Hours (0-23)
 * @param {number} minutes - Minutes (0-59)
 * @param {number} seconds - Seconds (0-59, default: 0)
 * @param {number} milliseconds - Milliseconds (0-999, default: 0)
 * @returns {Date} IST date with specified time
 */
export const createISTDateTime = (date, hours, minutes, seconds = 0, milliseconds = 0) => {
  const baseDate = date instanceof Date ? date : new Date(date);
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    seconds,
    milliseconds
  );
};

/**
 * Common business hour times in IST
 */
export const BUSINESS_HOURS_IST = {
  WORK_START: { hour: 9, minute: 30 }, // 9:30 AM
  WORK_END: { hour: 17, minute: 30 },  // 5:30 PM
  LATE_THRESHOLD: { hour: 9, minute: 55 }, // 9:55 AM
  HALF_DAY_END: { hour: 13, minute: 30 }, // 1:30 PM
  LATE_ARRIVAL: { hour: 10, minute: 0 }   // 10:00 AM
};

/**
 * Create IST business hours for a given date
 * @param {Date|string} date - Base date
 * @returns {Object} Business hours for the date
 */
export const getBusinessHours = (date = getISTNow()) => {
  const baseDate = date instanceof Date ? date : new Date(date);
  
  return {
    workStart: createISTDateTime(baseDate, BUSINESS_HOURS_IST.WORK_START.hour, BUSINESS_HOURS_IST.WORK_START.minute),
    workEnd: createISTDateTime(baseDate, BUSINESS_HOURS_IST.WORK_END.hour, BUSINESS_HOURS_IST.WORK_END.minute),
    lateThreshold: createISTDateTime(baseDate, BUSINESS_HOURS_IST.LATE_THRESHOLD.hour, BUSINESS_HOURS_IST.LATE_THRESHOLD.minute),
    halfDayEnd: createISTDateTime(baseDate, BUSINESS_HOURS_IST.HALF_DAY_END.hour, BUSINESS_HOURS_IST.HALF_DAY_END.minute),
    lateArrival: createISTDateTime(baseDate, BUSINESS_HOURS_IST.LATE_ARRIVAL.hour, BUSINESS_HOURS_IST.LATE_ARRIVAL.minute)
  };
};

/**
 * Format IST date for display
 * @param {Date} date - IST date
 * @param {Object} options - Format options
 * @returns {string} Formatted date string
 */
export const formatISTDate = (date, options = {}) => {
  const {
    dateOnly = false,
    timeOnly = false,
    format12Hour = true
  } = options;
  
  if (!date) return '';
  
  const istDate = date instanceof Date ? date : new Date(date);
  
  if (dateOnly) {
    return istDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  }
  
  if (timeOnly) {
    return istDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format12Hour,
      timeZone: 'Asia/Kolkata'
    });
  }
  
  return istDate.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: format12Hour,
    timeZone: 'Asia/Kolkata'
  });
};

/**
 * Get IST date string in YYYY-MM-DD format
 * @param {Date|string} date - Date to format
 * @returns {string} YYYY-MM-DD format
 */
export const getISTDateString = (date = getISTNow()) => {
  const istDate = date instanceof Date ? date : new Date(date);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse date string in IST context
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {Date} IST Date object
 */
export const parseISTDateString = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Check if two IST dates are on the same day
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} True if same day
 */
export const isSameDayIST = (date1, date2) => {
  return getISTDateString(date1) === getISTDateString(date2);
};

/**
 * Add days to an IST date
 * @param {Date} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date with days added
 */
export const addDaysIST = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Calculate work hours between two IST times
 * @param {Date} checkIn - Check-in time
 * @param {Date} checkOut - Check-out time  
 * @returns {number} Work hours (decimal)
 */
export const calculateWorkHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  
  const checkInTime = new Date(checkIn);
  const checkOutTime = new Date(checkOut);
  
  const diffMs = checkOutTime - checkInTime;
  return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
};

/**
 * Determine attendance status based on check-in time
 * @param {Date} checkIn - Check-in time in IST
 * @param {Date} checkOut - Check-out time in IST (optional)
 * @returns {string} Status: 'present', 'late', 'half-day', 'absent'
 */
export const determineAttendanceStatus = (checkIn, checkOut = null) => {
  if (!checkIn) return 'absent';
  
  const checkInTime = new Date(checkIn);
  const businessHours = getBusinessHours(checkInTime);
  
  // Check if late
  const isLate = checkInTime > businessHours.lateThreshold;
  
  // Check if half day (less than 4 hours of work)
  if (checkOut) {
    const workHours = calculateWorkHours(checkIn, checkOut);
    if (workHours < 4) {
      return 'half-day';
    }
  }
  
  return isLate ? 'late' : 'present';
};

/**
 * Migration helper: Convert UTC stored dates to IST equivalents
 * This is for database migration purposes only
 * @param {Date} utcDate - Date stored as UTC in database
 * @returns {Date} Equivalent IST date
 */
export const convertStoredUTCToIST = (utcDate) => {
  if (!utcDate) return null;
  
  // For dates that were stored as UTC but were actually IST times
  // We need to subtract the IST offset to get the actual IST time
  return new Date(utcDate.getTime() - IST_OFFSET_MS);
};

export default {
  getISTNow,
  toIST,
  getISTDayBoundaries,
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
  convertStoredUTCToIST,
  BUSINESS_HOURS_IST
};