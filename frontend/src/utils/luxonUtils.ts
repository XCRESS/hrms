/**
 * Timezone-aware date utilities using Luxon
 * Replaces istUtils.js with proper timezone handling
 *
 * All dates in HRMS are handled in Indian Standard Time (IST) = Asia/Kolkata
 * This ensures consistent behavior regardless of user's browser timezone
 */
import { DateTime, DateTimeFormatOptions, DurationLike } from 'luxon';

// Constants
const IST_ZONE = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';

/**
 * Get current date/time in IST
 * @returns DateTime object in IST timezone
 */
export const getISTNow = (): DateTime => {
  return DateTime.now().setZone(IST_ZONE);
};

/**
 * Convert any DateTime to IST
 * @param date - DateTime, Date, or ISO string
 * @returns DateTime in IST
 */
export const toIST = (date: DateTime | Date | string): DateTime => {
  if (typeof date === 'string') {
    return DateTime.fromISO(date, { zone: IST_ZONE });
  }
  if (date instanceof Date) {
    return DateTime.fromJSDate(date, { zone: IST_ZONE });
  }
  return date.setZone(IST_ZONE);
};

/**
 * Format IST date for display
 * @param date - Date to format
 * @param options - Format options
 * @returns Formatted string
 */
export const formatISTDate = (
  date: DateTime | Date | string | null | undefined,
  options: {
    dateOnly?: boolean;
    timeOnly?: boolean;
    format12Hour?: boolean;
    includeSeconds?: boolean;
    customFormat?: string;
  } = {}
): string => {
  if (!date) return '';

  const {
    dateOnly = false,
    timeOnly = false,
    format12Hour = true,
    includeSeconds = false,
    customFormat
  } = options;

  const istDate = toIST(date);

  if (!istDate.isValid) return '';

  // Custom Luxon format
  if (customFormat) {
    return istDate.toFormat(customFormat);
  }

  // Date only: dd-MM-yyyy (Indian format)
  if (dateOnly) {
    return istDate.toFormat('dd-MM-yyyy');
  }

  // Time only
  if (timeOnly) {
    const timeFormat = format12Hour
      ? includeSeconds ? 'hh:mm:ss a' : 'hh:mm a'
      : includeSeconds ? 'HH:mm:ss' : 'HH:mm';
    return istDate.toFormat(timeFormat);
  }

  // Default: date + time
  const timeFormat = format12Hour
    ? includeSeconds ? 'hh:mm:ss a' : 'hh:mm a'
    : includeSeconds ? 'HH:mm:ss' : 'HH:mm';
  return istDate.toFormat(`dd-MM-yyyy, ${timeFormat}`);
};

/**
 * Get ISO date string in IST (YYYY-MM-DD)
 * @param date - Date to format (defaults to now)
 * @returns YYYY-MM-DD string in IST
 */
export const getISTDateString = (date?: DateTime | Date | string): string => {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.toFormat('yyyy-MM-dd');
};

/**
 * Parse date string in IST context
 * @param dateString - YYYY-MM-DD format
 * @returns DateTime at midnight IST
 */
export const parseISTDateString = (dateString: string): DateTime => {
  return DateTime.fromISO(dateString, { zone: IST_ZONE });
};

/**
 * Check if date is today in IST
 * @param date - Date to check
 * @returns True if date is today in IST
 */
export const isToday = (date: DateTime | Date | string): boolean => {
  const istDate = toIST(date);
  const today = getISTNow();
  return istDate.hasSame(today, 'day');
};

/**
 * Check if date is yesterday in IST
 * @param date - Date to check
 * @returns True if date is yesterday in IST
 */
export const isYesterday = (date: DateTime | Date | string): boolean => {
  const istDate = toIST(date);
  const yesterday = getISTNow().minus({ days: 1 });
  return istDate.hasSame(yesterday, 'day');
};

/**
 * Get start of day in IST
 * @param date - Date (defaults to today)
 * @returns DateTime at 00:00:00 IST
 */
export const getISTStartOfDay = (date?: DateTime | Date | string): DateTime => {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.startOf('day');
};

/**
 * Get end of day in IST
 * @param date - Date (defaults to today)
 * @returns DateTime at 23:59:59.999 IST
 */
export const getISTEndOfDay = (date?: DateTime | Date | string): DateTime => {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.endOf('day');
};

/**
 * Get start of month in IST
 * @param date - Date (defaults to current month)
 * @returns DateTime at first day of month, 00:00:00 IST
 */
export const getISTStartOfMonth = (date?: DateTime | Date | string): DateTime => {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.startOf('month');
};

/**
 * Get end of month in IST
 * @param date - Date (defaults to current month)
 * @returns DateTime at last day of month, 23:59:59.999 IST
 */
export const getISTEndOfMonth = (date?: DateTime | Date | string): DateTime => {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.endOf('month');
};

/**
 * Get start of year in IST
 * @param date - Date (defaults to current year)
 * @returns DateTime at Jan 1, 00:00:00 IST
 */
export const getISTStartOfYear = (date?: DateTime | Date | string): DateTime => {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.startOf('year');
};

/**
 * Get end of year in IST
 * @param date - Date (defaults to current year)
 * @returns DateTime at Dec 31, 23:59:59.999 IST
 */
export const getISTEndOfYear = (date?: DateTime | Date | string): DateTime => {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.endOf('year');
};

/**
 * Add duration to IST date
 * @param date - Starting date
 * @param duration - Duration to add (e.g., { days: 1, hours: 2 })
 * @returns New DateTime
 */
export const addToISTDate = (
  date: DateTime | Date | string,
  duration: DurationLike
): DateTime => {
  const istDate = toIST(date);
  return istDate.plus(duration);
};

/**
 * Subtract duration from IST date
 * @param date - Starting date
 * @param duration - Duration to subtract
 * @returns New DateTime
 */
export const subtractFromISTDate = (
  date: DateTime | Date | string,
  duration: DurationLike
): DateTime => {
  const istDate = toIST(date);
  return istDate.minus(duration);
};

/**
 * Get difference between two dates in specified unit
 * @param date1 - First date
 * @param date2 - Second date
 * @param unit - Unit to measure ('days', 'hours', 'minutes', etc.)
 * @returns Difference as number
 */
export const getISTDifference = (
  date1: DateTime | Date | string,
  date2: DateTime | Date | string,
  unit: 'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds' = 'days'
): number => {
  const istDate1 = toIST(date1);
  const istDate2 = toIST(date2);
  return istDate1.diff(istDate2, unit).as(unit);
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export const formatRelativeTime = (date: DateTime | Date | string): string => {
  const istDate = toIST(date);
  return istDate.toRelative() || '';
};

/**
 * Convert to ISO 8601 with IST timezone
 * @param date - Date to convert
 * @returns ISO string with +05:30 offset (e.g., "2026-01-12T14:30:00.000+05:30")
 */
export const toISTISO = (date: DateTime | Date | string): string => {
  const istDate = toIST(date);
  return istDate.toISO() || '';
};

/**
 * Convert to JavaScript Date object (loses timezone info)
 * @param date - Luxon DateTime
 * @returns JavaScript Date
 */
export const toJSDate = (date: DateTime): Date => {
  return date.toJSDate();
};

/**
 * Format time for display (12-hour with AM/PM)
 * @param time - Time to format
 * @returns Formatted time or em dash if invalid
 */
export const formatTime = (time: DateTime | Date | string | null | undefined): string => {
  if (!time) return '—';
  return formatISTDate(time, { timeOnly: true, format12Hour: true });
};

/**
 * Check if current time is between two times (IST)
 * @param start - Start time
 * @param end - End time
 * @returns True if now is between start and end
 */
export const isTimeBetween = (
  start: DateTime | Date | string,
  end: DateTime | Date | string
): boolean => {
  const now = getISTNow();
  const startTime = toIST(start);
  const endTime = toIST(end);
  return now >= startTime && now <= endTime;
};

/**
 * Get month name in English
 * @param date - Date
 * @returns Month name (e.g., "January")
 */
export const getMonthName = (date: DateTime | Date | string): string => {
  const istDate = toIST(date);
  return istDate.monthLong || '';
};

/**
 * Get short month name in English
 * @param date - Date
 * @returns Short month name (e.g., "Jan")
 */
export const getMonthNameShort = (date: DateTime | Date | string): string => {
  const istDate = toIST(date);
  return istDate.monthShort || '';
};

/**
 * Get day name in English
 * @param date - Date
 * @returns Day name (e.g., "Monday")
 */
export const getDayName = (date: DateTime | Date | string): string => {
  const istDate = toIST(date);
  return istDate.weekdayLong || '';
};

/**
 * Get short day name in English
 * @param date - Date
 * @returns Short day name (e.g., "Mon")
 */
export const getDayNameShort = (date: DateTime | Date | string): string => {
  const istDate = toIST(date);
  return istDate.weekdayShort || '';
};

/**
 * Get day of month
 * @param date - Date
 * @returns Day number (1-31)
 */
export const getDayOfMonth = (date: DateTime | Date | string): number => {
  const istDate = toIST(date);
  return istDate.day;
};

/**
 * Get month number
 * @param date - Date
 * @returns Month number (1-12)
 */
export const getMonth = (date: DateTime | Date | string): number => {
  const istDate = toIST(date);
  return istDate.month;
};

/**
 * Get year
 * @param date - Date
 * @returns Year number
 */
export const getYear = (date: DateTime | Date | string): number => {
  const istDate = toIST(date);
  return istDate.year;
};

/**
 * Check if date is in the past (IST)
 * @param date - Date to check
 * @returns True if date is in the past
 */
export const isPast = (date: DateTime | Date | string): boolean => {
  const istDate = toIST(date);
  const now = getISTNow();
  return istDate < now;
};

/**
 * Check if date is in the future (IST)
 * @param date - Date to check
 * @returns True if date is in the future
 */
export const isFuture = (date: DateTime | Date | string): boolean => {
  const istDate = toIST(date);
  const now = getISTNow();
  return istDate > now;
};

/**
 * Check if date is a weekend (Saturday or Sunday) in IST
 * @param date - Date to check
 * @returns True if date is Saturday or Sunday
 */
export const isWeekend = (date: DateTime | Date | string): boolean => {
  const istDate = toIST(date);
  return istDate.weekday === 6 || istDate.weekday === 7; // 6=Saturday, 7=Sunday
};

/**
 * Check if date is a weekday (Monday-Friday) in IST
 * @param date - Date to check
 * @returns True if date is Monday through Friday
 */
export const isWeekday = (date: DateTime | Date | string): boolean => {
  const istDate = toIST(date);
  return istDate.weekday >= 1 && istDate.weekday <= 5;
};

/**
 * Check if two dates are on the same day (IST)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on same day
 */
export const isSameDay = (
  date1: DateTime | Date | string,
  date2: DateTime | Date | string
): boolean => {
  const istDate1 = toIST(date1);
  const istDate2 = toIST(date2);
  return istDate1.hasSame(istDate2, 'day');
};

/**
 * Check if two dates are in the same month (IST)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are in same month
 */
export const isSameMonth = (
  date1: DateTime | Date | string,
  date2: DateTime | Date | string
): boolean => {
  const istDate1 = toIST(date1);
  const istDate2 = toIST(date2);
  return istDate1.hasSame(istDate2, 'month');
};

/**
 * Check if two dates are in the same year (IST)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are in same year
 */
export const isSameYear = (
  date1: DateTime | Date | string,
  date2: DateTime | Date | string
): boolean => {
  const istDate1 = toIST(date1);
  const istDate2 = toIST(date2);
  return istDate1.hasSame(istDate2, 'year');
};

/**
 * Get number of days in month
 * @param date - Date in the month to check
 * @returns Number of days (28-31)
 */
export const getDaysInMonth = (date: DateTime | Date | string): number => {
  const istDate = toIST(date);
  return istDate.daysInMonth || 0;
};

/**
 * Get array of all days in a month
 * @param date - Date in the month
 * @returns Array of DateTime objects for each day
 */
export const getAllDaysInMonth = (date: DateTime | Date | string): DateTime[] => {
  const istDate = toIST(date);
  const daysInMonth = istDate.daysInMonth || 0;
  const startOfMonth = istDate.startOf('month');

  return Array.from({ length: daysInMonth }, (_, i) =>
    startOfMonth.plus({ days: i })
  );
};

/**
 * Parse time string (HH:mm or hh:mm a) and set it on a date
 * @param dateString - YYYY-MM-DD format
 * @param timeString - HH:mm or hh:mm a format
 * @returns DateTime with date and time set in IST
 */
export const parseDateAndTime = (dateString: string, timeString: string): DateTime => {
  const date = parseISTDateString(dateString);

  // Try to parse as 24-hour format first
  const time24Match = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    const [, hours, minutes] = time24Match;
    return date.set({ hour: parseInt(hours), minute: parseInt(minutes), second: 0, millisecond: 0 });
  }

  // Try to parse as 12-hour format with AM/PM
  const time12Match = timeString.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (time12Match) {
    const [, hoursStr, minutes, meridiem] = time12Match;
    let hours = parseInt(hoursStr);

    if (meridiem.toLowerCase() === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridiem.toLowerCase() === 'am' && hours === 12) {
      hours = 0;
    }

    return date.set({ hour: hours, minute: parseInt(minutes), second: 0, millisecond: 0 });
  }

  // Return date with time at midnight if parsing fails
  return date.startOf('day');
};

/**
 * Format date range for display
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted range string (e.g., "01-Jan-2026 to 15-Jan-2026")
 */
export const formatDateRange = (
  startDate: DateTime | Date | string,
  endDate: DateTime | Date | string
): string => {
  const start = toIST(startDate);
  const end = toIST(endDate);

  const startStr = start.toFormat('dd-MMM-yyyy');
  const endStr = end.toFormat('dd-MMM-yyyy');

  return `${startStr} to ${endStr}`;
};

/**
 * Get current financial year in India (April 1 to March 31)
 * @returns Object with start and end of current financial year
 */
export const getCurrentFinancialYear = (): { start: DateTime; end: DateTime; label: string } => {
  const now = getISTNow();
  const currentYear = now.year;
  const month = now.month;

  // Financial year starts on April 1
  let fyStartYear = month >= 4 ? currentYear : currentYear - 1;
  let fyEndYear = fyStartYear + 1;

  const start = DateTime.fromObject({ year: fyStartYear, month: 4, day: 1 }, { zone: IST_ZONE });
  const end = DateTime.fromObject({ year: fyEndYear, month: 3, day: 31 }, { zone: IST_ZONE }).endOf('day');

  return {
    start,
    end,
    label: `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`
  };
};

/**
 * Validate if a string is valid ISO date
 * @param dateString - String to validate
 * @returns True if valid ISO date
 */
export const isValidISODate = (dateString: string): boolean => {
  const dt = DateTime.fromISO(dateString);
  return dt.isValid;
};

/**
 * Get age from birth date
 * @param birthDate - Date of birth
 * @returns Age in years
 */
export const getAge = (birthDate: DateTime | Date | string): number => {
  const birth = toIST(birthDate);
  const now = getISTNow();
  return Math.floor(now.diff(birth, 'years').years);
};

/**
 * Get month options for dropdown (for the last N months)
 * @param count - Number of months to return
 * @returns Array of month options with value and display strings
 */
export const getMonthOptions = (count: number): Array<{ value: string; display: string }> => {
  const options: Array<{ value: string; display: string }> = [];
  const now = getISTNow();

  for (let i = 0; i < count; i++) {
    const date = now.minus({ months: i });
    const monthYear = date.toFormat('yyyy-MM');
    const display = date.toFormat('MMMM yyyy');
    options.push({ value: monthYear, display });
  }

  return options;
};

// Re-export DateTime and common types for convenience
export { DateTime };
export type { DateTimeFormatOptions, DurationLike };
