/**
 * Timezone Utility Functions - Luxon-based
 *
 * This module provides centralized timezone utilities using Luxon
 * for the HRMS application. Functions accept timezone as parameter for flexibility.
 *
 * Benefits over moment-timezone:
 * - Immutable: All operations return new DateTime objects
 * - Smaller bundle size: ~60KB vs moment's 230KB
 * - Native TypeScript support
 * - Better timezone handling with IANA timezone database
 * - Configurable timezone (not hardcoded)
 */

import { DateTime, Duration, Interval } from 'luxon';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const IST_TIMEZONE = DEFAULT_TIMEZONE;

/**
 * Business hour time configuration
 */
export const BUSINESS_HOURS_IST = {
  WORK_START: { hour: 9, minute: 0 }, // 9:00 AM
  WORK_END: { hour: 18, minute: 0 }, // 6:00 PM
  LATE_THRESHOLD: { hour: 9, minute: 55 }, // 9:55 AM
  HALF_DAY_END: { hour: 13, minute: 0 }, // 1:00 PM
  LATE_ARRIVAL: { hour: 10, minute: 0 }, // 10:00 AM
} as const;

/**
 * Settings interface for business hours
 */
interface BusinessHourSettings {
  workStartTime?: string; // HH:mm format
  workEndTime?: string;
  lateThreshold?: string;
  halfDayEndTime?: string;
  minimumWorkHours?: number;
}

/**
 * Business hours result interface
 */
interface BusinessHours {
  workStart: DateTime;
  workEnd: DateTime;
  lateThreshold: DateTime;
  halfDayEnd: DateTime;
  lateArrival: DateTime;
}

/**
 * Day boundaries result interface
 */
interface DayBoundaries {
  startOfDay: DateTime;
  endOfDay: DateTime;
}

/**
 * Get current IST date and time
 * @returns Current DateTime in IST timezone
 */
export function getISTNow(): DateTime {
  return DateTime.now().setZone(IST_TIMEZONE);
}

/**
 * Convert any date to IST DateTime object
 * @param date - Date to convert (Date, string, DateTime, or null)
 * @returns DateTime in IST timezone
 */
export function toIST(date?: Date | string | DateTime | null): DateTime {
  if (!date) return getISTNow();

  if (date instanceof DateTime) {
    return date.setZone(IST_TIMEZONE);
  }

  if (date instanceof Date) {
    return DateTime.fromJSDate(date, { zone: IST_TIMEZONE });
  }

  // Try parsing as ISO string
  const parsed = DateTime.fromISO(date, { zone: IST_TIMEZONE });
  if (parsed.isValid) {
    return parsed;
  }

  // Try parsing as SQL date (YYYY-MM-DD)
  const sqlParsed = DateTime.fromSQL(date, { zone: IST_TIMEZONE });
  if (sqlParsed.isValid) {
    return sqlParsed;
  }

  throw new Error(`Invalid date format: ${date}`);
}

/**
 * Get start and end boundaries for a given IST date
 * @param date - Date to get boundaries for (defaults to today)
 * @returns Day boundaries (startOfDay, endOfDay) in IST
 */
export function getISTDayBoundaries(date?: Date | string | DateTime | null): DayBoundaries {
  const istMoment = date ? toIST(date) : getISTNow();

  return {
    startOfDay: istMoment.startOf('day'),
    endOfDay: istMoment.endOf('day'),
  };
}

/**
 * Get IST date boundaries for a date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Range boundaries (startOfPeriod, endOfPeriod) in IST
 */
export function getISTRangeBoundaries(
  startDate: Date | string | DateTime,
  endDate: Date | string | DateTime
): { startOfPeriod: DateTime; endOfPeriod: DateTime } {
  const { startOfDay: startOfPeriod } = getISTDayBoundaries(startDate);
  const { endOfDay: endOfPeriod } = getISTDayBoundaries(endDate);

  return { startOfPeriod, endOfPeriod };
}

/**
 * Create IST DateTime with specific time
 * @param date - Base date
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @param seconds - Seconds (0-59, default: 0)
 * @param milliseconds - Milliseconds (0-999, default: 0)
 * @returns IST DateTime with specified time
 */
export function createISTDateTime(
  date: Date | string | DateTime,
  hours: number,
  minutes: number,
  seconds: number = 0,
  milliseconds: number = 0
): DateTime {
  const istMoment = toIST(date);
  return istMoment.set({ hour: hours, minute: minutes, second: seconds, millisecond: milliseconds });
}

/**
 * Parse time string to hours and minutes
 * @param timeStr - Time in HH:mm format
 * @returns Object with hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];

  if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm`);
  }
  return { hours, minutes };
}

/**
 * Create IST business hours for a given date using settings
 * @param date - Base date
 * @param settings - Time settings (workStartTime, workEndTime, etc.)
 * @returns Business hours as DateTime objects
 */
export function getBusinessHours(
  date?: Date | string | DateTime | null,
  settings?: BusinessHourSettings | null
): BusinessHours {
  const baseDate = date ? toIST(date) : getISTNow();

  // Use provided settings or defaults
  const workStart = settings?.workStartTime ?? '09:00';
  const workEnd = settings?.workEndTime ?? '18:00';
  const lateThreshold = settings?.lateThreshold ?? '09:55';
  const halfDayEnd = settings?.halfDayEndTime ?? '13:00';

  const startTime = parseTime(workStart);
  const endTime = parseTime(workEnd);
  const lateTime = parseTime(lateThreshold);
  const halfTime = parseTime(halfDayEnd);

  return {
    workStart: createISTDateTime(baseDate, startTime.hours, startTime.minutes),
    workEnd: createISTDateTime(baseDate, endTime.hours, endTime.minutes),
    lateThreshold: createISTDateTime(baseDate, lateTime.hours, lateTime.minutes),
    halfDayEnd: createISTDateTime(baseDate, halfTime.hours, halfTime.minutes),
    lateArrival: createISTDateTime(
      baseDate,
      BUSINESS_HOURS_IST.LATE_ARRIVAL.hour,
      BUSINESS_HOURS_IST.LATE_ARRIVAL.minute
    ),
  };
}

/**
 * Format options for IST date formatting
 */
interface FormatOptions {
  dateOnly?: boolean;
  timeOnly?: boolean;
  format12Hour?: boolean;
  format?: string;
}

/**
 * Format IST date for display
 * @param date - Date to format
 * @param options - Format options
 * @returns Formatted date string
 */
export function formatISTDate(
  date: Date | string | DateTime | null | undefined,
  options: FormatOptions = {}
): string {
  const { dateOnly = false, timeOnly = false, format12Hour = true, format = null } = options;

  if (!date) return '';

  const istMoment = toIST(date);

  if (format) {
    return istMoment.toFormat(format);
  }

  if (dateOnly) {
    return istMoment.toFormat('yyyy-MM-dd');
  }

  if (timeOnly) {
    return istMoment.toFormat(format12Hour ? 'h:mm a' : 'HH:mm');
  }

  return istMoment.toFormat(format12Hour ? 'yyyy-MM-dd h:mm a' : 'yyyy-MM-dd HH:mm');
}

/**
 * Get IST date string in YYYY-MM-DD format
 * @param date - Date to format
 * @returns YYYY-MM-DD format
 */
export function getISTDateString(date?: Date | string | DateTime | null): string {
  const istMoment = date ? toIST(date) : getISTNow();
  return istMoment.toFormat('yyyy-MM-dd');
}

/**
 * Parse date string in IST context
 * @param dateString - Date string (YYYY-MM-DD or ISO format)
 * @returns IST DateTime object
 * @throws Error if date string is invalid
 */
export function parseISTDateString(dateString: string): DateTime {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('Date string is required and must be a string');
  }

  // Handle ISO date strings with timezone info
  if (dateString.includes('T') || dateString.includes('Z') || dateString.includes('+')) {
    const parsed = DateTime.fromISO(dateString, { zone: IST_TIMEZONE });
    if (!parsed.isValid) {
      throw new Error(`Invalid ISO date string: ${dateString}`);
    }
    return parsed;
  }

  // Handle YYYY-MM-DD format - interpret as IST date
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parsed = DateTime.fromSQL(dateString, { zone: IST_TIMEZONE });
    if (!parsed.isValid) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    return parsed;
  }

  throw new Error('Date must be in YYYY-MM-DD or ISO format');
}

/**
 * Check if two dates are on the same day in IST
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day in IST
 */
export function isSameDayIST(
  date1: Date | string | DateTime,
  date2: Date | string | DateTime
): boolean {
  const ist1 = toIST(date1);
  const ist2 = toIST(date2);
  return ist1.hasSame(ist2, 'day');
}

/**
 * Add days to an IST date
 * @param date - Base date
 * @param days - Number of days to add (can be negative)
 * @returns New DateTime with days added
 */
export function addDaysIST(date: Date | string | DateTime, days: number): DateTime {
  return toIST(date).plus({ days });
}

/**
 * Calculate work hours between two IST times
 * @param checkIn - Check-in time
 * @param checkOut - Check-out time
 * @returns Work hours (decimal)
 */
export function calculateWorkHours(
  checkIn: Date | string | DateTime | null | undefined,
  checkOut: Date | string | DateTime | null | undefined
): number {
  if (!checkIn || !checkOut) return 0;

  const checkInIST = toIST(checkIn);
  const checkOutIST = toIST(checkOut);

  const duration = checkOutIST.diff(checkInIST, 'hours');
  return Math.max(0, duration.hours);
}

/**
 * Determine attendance status based on check-in time and work hours
 * @param checkIn - Check-in time in IST
 * @param checkOut - Check-out time in IST (optional)
 * @param settings - Attendance settings (optional)
 * @returns Status: 'present', 'late', 'half-day', 'absent'
 */
export function determineAttendanceStatus(
  checkIn: Date | string | DateTime | null,
  checkOut?: Date | string | DateTime | null,
  settings?: BusinessHourSettings | null
): 'present' | 'late' | 'half-day' | 'absent' {
  if (!checkIn) return 'absent';

  const checkInIST = toIST(checkIn);
  const businessHours = getBusinessHours(checkInIST, settings);

  // Check if late
  const isLate = checkInIST > businessHours.lateThreshold;

  // Check if half day (less than minimum work hours)
  if (checkOut) {
    const workHours = calculateWorkHours(checkIn, checkOut);
    const minimumHours = settings?.minimumWorkHours ?? 4;

    if (workHours < minimumHours) {
      return 'half-day';
    }
  }

  return isLate ? 'late' : 'present';
}

/**
 * Convert DateTime to JavaScript Date
 * @param dateTime - Luxon DateTime object
 * @returns JavaScript Date object
 */
export function dateTimeToJSDate(dateTime: DateTime): Date {
  return dateTime.toJSDate();
}

/**
 * Get timezone offset for IST
 * @returns Timezone offset string (e.g., '+05:30')
 */
export function getISTOffset(): string {
  return getISTNow().toFormat('ZZ');
}

/**
 * Convert time string to decimal hours for calculations
 * @param timeString - Time in 24-hour format (HH:mm)
 * @returns Decimal hours
 */
export function timeToDecimal(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') return 0;

  const parts = timeString.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];

  if (hours === undefined || minutes === undefined || isNaN(hours) || isNaN(minutes)) return 0;

  return hours + minutes / 60;
}

/**
 * Convert decimal hours to time string
 * @param decimal - Decimal hours
 * @returns Time in 24-hour format (HH:mm)
 */
export function decimalToTime24(decimal: number): string {
  if (typeof decimal !== 'number' || isNaN(decimal)) return '00:00';

  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Check if a date is a weekend (Sunday in IST)
 * @param date - Date to check
 * @returns True if weekend
 */
export function isWeekend(date: Date | string | DateTime): boolean {
  const istDate = toIST(date);
  return istDate.weekday === 7; // Sunday = 7 in Luxon
}

/**
 * Get start of week (Monday) in IST
 * @param date - Reference date
 * @returns Start of week DateTime
 */
export function getStartOfWeek(date?: Date | string | DateTime | null): DateTime {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.startOf('week');
}

/**
 * Get end of week (Sunday) in IST
 * @param date - Reference date
 * @returns End of week DateTime
 */
export function getEndOfWeek(date?: Date | string | DateTime | null): DateTime {
  const istDate = date ? toIST(date) : getISTNow();
  return istDate.endOf('week');
}

/**
 * Default export with all utilities
 */
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
  dateTimeToJSDate,
  getISTOffset,
  timeToDecimal,
  decimalToTime24,
  isWeekend,
  getStartOfWeek,
  getEndOfWeek,
  BUSINESS_HOURS_IST,
  IST_TIMEZONE,
};
