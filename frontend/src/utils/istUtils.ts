/**
 * Frontend IST (Indian Standard Time) Utility Functions
 *
 * This module provides utilities to work with Indian Standard Time (IST)
 * on the frontend, complementing the backend IST utilities.
 *
 * These functions handle date/time display and input formatting
 * consistently across the React application.
 */

export type DateInput = Date | string | number;

export interface FormatISTDateOptions {
  dateOnly?: boolean;
  timeOnly?: boolean;
  format12Hour?: boolean;
  includeSeconds?: boolean;
}

export interface MonthOption {
  value: string;
  label: string;
  display: string;
}

/** Coerce any accepted date input into a Date. */
const toDate = (date: DateInput): Date => (date instanceof Date ? date : new Date(date));

/**
 * Get current IST date and time (browser-aware)
 */
export const getISTNow = (): Date => {
  return new Date();
};

/**
 * Format IST date for display
 */
export const formatISTDate = (
  date: DateInput | null | undefined,
  options: FormatISTDateOptions = {}
): string => {
  const {
    dateOnly = false,
    timeOnly = false,
    format12Hour = true,
    includeSeconds = false
  } = options;

  if (!date) return '';

  const istDate = toDate(date);

  if (dateOnly) {
    // Indian format: dd-mm-yyyy
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    return `${day}-${month}-${year}`;
  }

  if (timeOnly) {
    const timeOptions: Intl.DateTimeFormatOptions = {
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
 */
export const getISTDateString = (date: DateInput = getISTNow()): string => {
  const istDate = toDate(date);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse date string in IST context for input fields
 */
export const parseISTDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

/**
 * Format time for display with AM/PM
 */
export const formatTime = (time: DateInput | null | undefined): string => {
  if (!time) return '—';
  return formatISTDate(time, { timeOnly: true, format12Hour: true });
};

export type DateFormatPattern =
  | 'MMM DD, YYYY'
  | 'DD MMM YYYY'
  | 'MMMM DD, YYYY'
  | 'DD MMMM YYYY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY';

/**
 * Format date for display (date only)
 */
export const formatDate = (
  date: DateInput | null | undefined,
  shortYear: boolean = false,
  format: DateFormatPattern | null = null
): string => {
  if (!date) return '';

  const istDate = toDate(date);

  // Handle specific format patterns
  if (format) {
    switch (format) {
      case 'MMM DD, YYYY':
      case 'DD MMM YYYY':
        // Indian format: "9 Aug 2025" (not American "Aug 9, 2025")
        return istDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      case 'MMMM DD, YYYY':
      case 'DD MMMM YYYY':
        // Indian format: "9 August 2025" (not American "August 9, 2025")
        return istDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      case 'DD/MM/YYYY': {
        const day1 = String(istDate.getDate()).padStart(2, '0');
        const month1 = String(istDate.getMonth() + 1).padStart(2, '0');
        const year1 = istDate.getFullYear();
        return `${day1}/${month1}/${year1}`;
      }
      case 'MM/DD/YYYY': {
        // Convert to Indian DD/MM/YYYY format instead of American MM/DD/YYYY
        const day2 = String(istDate.getDate()).padStart(2, '0');
        const month2 = String(istDate.getMonth() + 1).padStart(2, '0');
        const year2 = istDate.getFullYear();
        return `${day2}/${month2}/${year2}`;
      }
      default:
        // Fall back to default behavior for unknown formats
        break;
    }
  }

  // Default IST formatting: dd-mm-yyyy or dd-mm-yy
  const day = String(istDate.getDate()).padStart(2, '0');
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const year = shortYear ? String(istDate.getFullYear()).slice(-2) : istDate.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Create datetime-local input value from IST date
 * This is used for HTML datetime-local inputs
 */
export const toDateTimeLocal = (date: DateInput | null | undefined): string => {
  if (!date) return '';

  const istDate = toDate(date);
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Create datetime-local input value with specific date and time
 */
export const createDateTimeLocal = (
  date: DateInput | null | undefined,
  timeString: string | null | undefined
): string => {
  if (!date || !timeString) return '';

  const baseDate = getISTDateString(date);
  return `${baseDate}T${timeString}`;
};

/**
 * Calculate work hours between two times
 */
export const calculateWorkHours = (
  checkIn: DateInput | null | undefined,
  checkOut: DateInput | null | undefined
): number => {
  if (!checkIn || !checkOut) return 0;

  const checkInTime = toDate(checkIn);
  const checkOutTime = toDate(checkOut);

  const diffMs = checkOutTime.getTime() - checkInTime.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
};

/**
 * Check if two dates are the same day (IST)
 */
export const isSameDay = (date1: DateInput, date2: DateInput): boolean => {
  return getISTDateString(date1) === getISTDateString(date2);
};

/**
 * Get month options for select dropdowns
 */
export const getMonthOptions = (monthsBack: number = 12): MonthOption[] => {
  const options: MonthOption[] = [];
  const today = getISTNow();
  const monthShortNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ] as const;

  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthShort = monthShortNames[date.getMonth()] ?? '';
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
} as const;

/**
 * Get all days in a month
 */
export const getAllDaysInMonth = (date: DateInput): Date[] => {
  const targetDate = toDate(date);
  const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

  const days: Date[] = [];
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
