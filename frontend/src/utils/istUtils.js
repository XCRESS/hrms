/**
 * Frontend IST (Indian Standard Time) Utility Functions
 * 
 * This module provides utilities to work with Indian Standard Time (IST)
 * on the frontend, complementing the backend IST utilities.
 * 
 * These functions handle date/time display and input formatting
 * consistently across the React application.
 */

/**
 * Get current IST date and time (browser-aware)
 * @returns {Date} Current date in IST
 */
export const getISTNow = () => {
  return new Date();
};

/**
 * Format IST date for display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Format options
 * @returns {string} Formatted date string
 */
export const formatISTDate = (date, options = {}) => {
  const {
    dateOnly = false,
    timeOnly = false,
    format12Hour = true,
    includeSeconds = false
  } = options;
  
  if (!date) return '';
  
  const istDate = date instanceof Date ? date : new Date(date);
  
  if (dateOnly) {
    // Indian format: dd-mm-yyyy
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    return `${day}-${month}-${year}`;
  }
  
  if (timeOnly) {
    const timeOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format12Hour
    };
    
    if (includeSeconds) {
      timeOptions.second = '2-digit';
    }
    
    return istDate.toLocaleTimeString('en-IN', timeOptions);
  }
  
  // Indian format: dd-mm-yyyy with time
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = istDate.getFullYear();
  const timeStr = formatISTDate(istDate, { timeOnly: true, format12Hour, includeSeconds });
  return `${day}-${month}-${year}, ${timeStr}`;
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
 * Parse date string in IST context for input fields
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {Date} IST Date object
 */
export const parseISTDateString = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Format time for display with AM/PM
 * @param {Date|string} time - Time to format
 * @returns {string} Formatted time string
 */
export const formatTime = (time) => {
  if (!time) return '—';
  return formatISTDate(time, { timeOnly: true, format12Hour: true });
};

/**
 * Format date for display (date only)
 * @param {Date|string} date - Date to format
 * @param {boolean} shortYear - Use 2-digit year (dd-mm-yy)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, shortYear = false) => {
  if (!date) return '';
  
  const istDate = date instanceof Date ? date : new Date(date);
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = shortYear ? String(istDate.getFullYear()).slice(-2) : istDate.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Create datetime-local input value from IST date
 * This is used for HTML datetime-local inputs
 * @param {Date|string} date - IST date
 * @returns {string} datetime-local format (YYYY-MM-DDTHH:MM)
 */
export const toDateTimeLocal = (date) => {
  if (!date) return '';
  
  const istDate = date instanceof Date ? date : new Date(date);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Create datetime-local input value with specific date and time
 * @param {Date|string} date - Base date
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} datetime-local format
 */
export const createDateTimeLocal = (date, timeString) => {
  if (!date || !timeString) return '';
  
  const baseDate = getISTDateString(date);
  return `${baseDate}T${timeString}`;
};

/**
 * Calculate work hours between two times
 * @param {Date|string} checkIn - Check-in time
 * @param {Date|string} checkOut - Check-out time
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
 * Check if two dates are the same day (IST)
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if same day
 */
export const isSameDay = (date1, date2) => {
  return getISTDateString(date1) === getISTDateString(date2);
};

/**
 * Get month options for select dropdowns
 * @param {number} monthsBack - How many months back to show (default: 12)
 * @returns {Array} Array of {value, label, display} objects
 */
export const getMonthOptions = (monthsBack = 12) => {
  const options = [];
  const today = getISTNow();
  const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthShort = monthShortNames[date.getMonth()];
    const yearShort = String(date.getFullYear()).slice(-2);
    
    options.push({
      value,
      label: `${monthShort} ${date.getFullYear()}`,
      display: `${monthShort} '${yearShort}`
    });
  }
  
  return options;
};

/**
 * Common business hour defaults for form inputs
 */
export const BUSINESS_HOURS = {
  WORK_START: '09:30',
  WORK_END: '17:30',
  LATE_THRESHOLD: '09:55',
  HALF_DAY_END: '13:30',
  LATE_ARRIVAL: '10:00'
};

/**
 * Get all days in a month
 * @param {Date|string} date - Any date in the target month
 * @returns {Array<Date>} Array of all days in the month
 */
export const getAllDaysInMonth = (date) => {
  const targetDate = date instanceof Date ? date : new Date(date);
  const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  
  const days = [];
  const currentDate = new Date(firstDay);
  
  while (currentDate <= lastDay) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
};

export default {
  getISTNow,
  formatISTDate,
  getISTDateString,
  parseISTDateString,
  formatTime,
  formatDate,
  toDateTimeLocal,
  createDateTimeLocal,
  calculateWorkHours,
  isSameDay,
  getMonthOptions,
  getAllDaysInMonth,
  BUSINESS_HOURS
};