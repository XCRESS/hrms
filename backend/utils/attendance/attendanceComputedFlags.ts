/**
 * Attendance Computed Flags Utility
 * Computes flags dynamically from existing data without storing in database
 */

import { BUSINESS_RULES } from './attendanceConstants.js';
import { getISTDateString, toIST } from '../timezone.js';
import settingsService from '../../services/settings/SettingsService.js';
import type { DateTime } from 'luxon';
import logger from '../logger.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AttendanceRecord {
  checkIn?: Date | null;
  checkOut?: Date | null;
  date: Date;
  [key: string]: unknown;
}

interface DayType {
  type: 'holiday' | 'weekend' | 'working';
  isWorkingDay: boolean;
}

interface ApprovedLeave {
  leaveType?: string;
  leaveReason?: string;
  [key: string]: unknown;
}

interface ComputedFlags {
  isLate?: boolean;
  isLeave?: boolean;
  isHoliday?: boolean;
  isWeekend?: boolean;
}

interface ComputeOptions {
  attendanceRecord?: AttendanceRecord | null;
  date: Date;
  holidayMap?: Map<string, unknown> | null;
  approvedLeave?: ApprovedLeave | null;
  dayTypeChecker?: ((date: Date, holidayMap?: Map<string, unknown> | null) => DayType | null) | null;
  department?: string | null;
}

interface BatchContextData {
  holidayMap?: Map<string, unknown> | null;
  leavesMap?: Map<string, ApprovedLeave> | null;
  dayTypeChecker?: ((date: Date, holidayMap?: Map<string, unknown> | null) => DayType | null) | null;
  department?: string | null;
}

// ============================================================================
// FLAG COMPUTATION FUNCTIONS
// ============================================================================

/**
 * Compute flags for attendance record based on existing data
 */
export const computeAttendanceFlags = async (
  record: AttendanceRecord | null | undefined,
  dayType: DayType | null = null,
  approvedLeave: ApprovedLeave | null = null,
  department: string | null = null
): Promise<ComputedFlags> => {
  const flags: ComputedFlags = {};

  // Compute late flag from check-in time using dynamic settings
  if (record?.checkIn) {
    const checkInIST: DateTime = toIST(record.checkIn);
    const checkInHour = checkInIST.hour;
    const checkInMinutes = checkInIST.minute;
    const checkInDecimal = checkInHour + (checkInMinutes / 60);

    try {
      // Get dynamic late arrival threshold from settings
      const checkInDate = new Date(record.checkIn);
      const businessHours = await settingsService.getBusinessHours(checkInDate, department);
      const lateThresholdDecimal = businessHours.lateThresholdDecimal;

      if (checkInDecimal > lateThresholdDecimal) {
        flags.isLate = true;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.warn({ err }, 'Failed to get business hours for late check, using fallback');
      // Fallback to hardcoded value if settings fail
      if (checkInDecimal > BUSINESS_RULES.LATE_THRESHOLD) {
        flags.isLate = true;
      }
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
 */
export const computeDayFlags = (
  date: Date,
  dayType: DayType | null,
  approvedLeave: ApprovedLeave | null = null
): ComputedFlags => {
  const flags: ComputedFlags = {};

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
 */
export const computeComprehensiveFlags = async (options: ComputeOptions): Promise<ComputedFlags> => {
  const {
    attendanceRecord,
    date,
    holidayMap,
    approvedLeave,
    dayTypeChecker,
    department
  } = options;

  // Determine day type
  let dayType: DayType | null = null;
  if (dayTypeChecker) {
    dayType = dayTypeChecker(date, holidayMap || null);
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
    return await computeAttendanceFlags(attendanceRecord, dayType, approvedLeave || null, department || null);
  } else {
    return computeDayFlags(date, dayType, approvedLeave || null);
  }
};

/**
 * Add computed flags to attendance record
 */
export const addComputedFlagsToRecord = <T extends Record<string, unknown>>(
  record: T | null | undefined,
  computedFlags: ComputedFlags
): (T & { flags: ComputedFlags }) | null => {
  if (!record) return null;

  return {
    ...record,
    flags: computedFlags || {}
  };
};

/**
 * Batch compute flags for multiple records
 */
export const batchComputeFlags = async <T extends AttendanceRecord>(
  records: T[],
  contextData: BatchContextData = {}
): Promise<Array<T & { flags: ComputedFlags }>> => {
  const {
    holidayMap,
    leavesMap,
    dayTypeChecker,
    department
  } = contextData;

  const flaggedRecords = await Promise.all(records.map(async (record) => {
    const dateKey = getISTDateString(record.date);
    const approvedLeave = leavesMap?.get(dateKey) || null;

    const flags = await computeComprehensiveFlags({
      attendanceRecord: record,
      date: record.date,
      holidayMap: holidayMap || null,
      approvedLeave,
      dayTypeChecker: dayTypeChecker || null,
      department: department || null
    });

    return addComputedFlagsToRecord(record, flags)!;
  }));

  return flaggedRecords;
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  computeAttendanceFlags,
  computeDayFlags,
  computeComprehensiveFlags,
  addComputedFlagsToRecord,
  batchComputeFlags
};
