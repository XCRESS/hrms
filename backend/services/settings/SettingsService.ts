/**
 * Settings Service
 * Provides centralized access to dynamic settings with caching
 */

import Settings from '../../models/Settings.model.js';
import { getISTNow, createISTDateTime, timeToDecimal, toIST } from '../../utils/timezone.js';
import type { DateTime } from 'luxon';
import logger from '../../utils/logger.js';

type EffectiveSettings = Record<string, unknown>;

interface AttendanceSettings {
  lateThreshold: string;
  workStartTime: string;
  workEndTime: string;
  halfDayEndTime: string;
  minimumWorkHours: number;
  fullDayHours: number;
  workingDays: number[];
  nonWorkingDays: number[];
  saturdayWorkType: string;
  saturdayHolidays: number[];
}

interface BusinessHours {
  workStart: Date;
  workEnd: Date;
  lateThreshold: Date;
  halfDayEnd: Date;
  workStartDecimal: number;
  workEndDecimal: number;
  lateThresholdDecimal: number;
  halfDayEndDecimal: number;
}

interface WorkHourThresholds {
  minimumWorkHours: number;
  fullDayHours: number;
}

/**
 * Settings Service Class
 * Handles fetching and caching of settings with department-specific overrides
 */
export class SettingsService {
  private cache: Map<string, EffectiveSettings>;
  private cacheExpiry: Map<string, number>;
  private defaultCacheTTL: number;

  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get effective settings for a department or employee
   * Priority: Department > Global
   * @param department - Department name (optional)
   * @returns Effective settings
   */
  async getEffectiveSettings(department: string | null = null): Promise<EffectiveSettings> {
    const cacheKey = `settings:${department || 'global'}`;

    // Check cache first
    const cachedExpiry = this.cacheExpiry.get(cacheKey);
    if (this.cache.has(cacheKey) && cachedExpiry && cachedExpiry > Date.now()) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const effectiveSettings = await Settings.getEffectiveSettings(department);

      // Cache the result
      this.cache.set(cacheKey, effectiveSettings);
      this.cacheExpiry.set(cacheKey, Date.now() + this.defaultCacheTTL);

      return effectiveSettings;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Error fetching effective settings');
      // Return default settings if fetch fails
      return this.getDefaultSettings();
    }
  }

  /**
   * Get attendance-specific settings for a department
   * @param department - Department name (optional)
   * @returns Attendance settings
   */
  async getAttendanceSettings(department: string | null = null): Promise<AttendanceSettings> {
    const settings = await this.getEffectiveSettings(department);
    return (settings as { attendance: AttendanceSettings }).attendance;
  }

  /**
   * Clear cache for specific department or all
   * @param department - Department name (optional)
   */
  clearCache(department: string | null = null): void {
    if (department) {
      const cacheKey = `settings:${department}`;
      this.cache.delete(cacheKey);
      this.cacheExpiry.delete(cacheKey);
    } else {
      // Clear all cache
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Get default settings as fallback
   * @returns Default settings
   */
  getDefaultSettings(): EffectiveSettings {
    return {
      attendance: {
        lateThreshold: '09:55',
        workStartTime: '09:00',
        workEndTime: '18:00',
        halfDayEndTime: '13:00',
        minimumWorkHours: 4,
        fullDayHours: 8,
        workingDays: [1, 2, 3, 4, 5, 6],
        nonWorkingDays: [0],
        saturdayWorkType: 'full',
        saturdayHolidays: []
      },
      scope: 'global'
    };
  }

  /**
   * Get business hours for a specific department and date
   * @param date - Target date
   * @param department - Department name (optional)
   * @returns Business hours object
   */
  async getBusinessHours(date: Date | DateTime | null = null, department: string | null = null): Promise<BusinessHours> {
    const attendanceSettings = await this.getAttendanceSettings(department);
    const targetDate = date || getISTNow();

    // Parse time strings (HH:MM) and create IST datetime objects
    const [startHour = 9, startMinute = 0] = attendanceSettings.workStartTime.split(':').map(Number);
    const [endHour = 18, endMinute = 0] = attendanceSettings.workEndTime.split(':').map(Number);
    const [lateHour = 9, lateMinute = 55] = attendanceSettings.lateThreshold.split(':').map(Number);
    const [halfHour = 13, halfMinute = 0] = attendanceSettings.halfDayEndTime.split(':').map(Number);

    // Create IST datetime objects using timezone utils
    const workStart = createISTDateTime(targetDate, startHour || 9, startMinute || 0);
    const workEnd = createISTDateTime(targetDate, endHour || 18, endMinute || 0);
    const lateThreshold = createISTDateTime(targetDate, lateHour || 9, lateMinute || 55);
    const halfDayEnd = createISTDateTime(targetDate, halfHour || 13, halfMinute || 0);

    return {
      workStart: workStart.toJSDate(), // Convert to Date for backward compatibility
      workEnd: workEnd.toJSDate(),
      lateThreshold: lateThreshold.toJSDate(),
      halfDayEnd: halfDayEnd.toJSDate(),
      workStartDecimal: timeToDecimal(attendanceSettings.workStartTime),
      workEndDecimal: timeToDecimal(attendanceSettings.workEndTime),
      lateThresholdDecimal: timeToDecimal(attendanceSettings.lateThreshold),
      halfDayEndDecimal: timeToDecimal(attendanceSettings.halfDayEndTime)
    };
  }

  /**
   * Check if a specific day is a working day for a department
   * @param date - Date to check
   * @param department - Department name (optional)
   * @returns True if working day
   */
  async isWorkingDay(date: Date, department: string | null = null): Promise<boolean> {
    const attendanceSettings = await this.getAttendanceSettings(department);

    // Convert to IST DateTime for consistent timezone handling
    const istDateTime = toIST(date);

    // Luxon uses 1=Monday, 7=Sunday. Convert to 0=Sunday, 6=Saturday for compatibility
    const luxonWeekday = istDateTime.weekday; // 1-7
    const dayOfWeek = luxonWeekday === 7 ? 0 : luxonWeekday; // Convert Sunday from 7 to 0

    // Check if it's in working days
    if (!attendanceSettings.workingDays.includes(dayOfWeek)) {
      return false;
    }

    // Special handling for Saturday - check if it's a holiday Saturday
    if (dayOfWeek === 6) {
      // Saturday
      const saturdayWeek = this.getSaturdayWeekOfMonth(istDateTime);
      if (attendanceSettings.saturdayHolidays && attendanceSettings.saturdayHolidays.includes(saturdayWeek)) {
        return false; // This Saturday is configured as a holiday
      }
    }

    return true;
  }

  /**
   * Determine which Saturday of the month a given date is.
   *
   * Takes an IST DateTime rather than a Date: the previous implementation used
   * getDate()/getDay(), which read in the server's local zone and could land on
   * the wrong day (and therefore the wrong week) near month boundaries when the
   * host runs in UTC.
   *
   * @param date - IST DateTime to check (should be a Saturday)
   * @returns 1-4 for the 1st-4th Saturday. A 5th Saturday clamps to 4, matching
   *          the settings UI, which only exposes four checkboxes.
   */
  getSaturdayWeekOfMonth(date: DateTime): number {
    const saturdayWeek = Math.ceil(date.day / 7);

    return Math.max(1, Math.min(4, saturdayWeek));
  }

  /**
   * Get work hour thresholds for a department
   * @param department - Department name (optional)
   * @returns Work hour thresholds
   */
  async getWorkHourThresholds(department: string | null = null): Promise<WorkHourThresholds> {
    const attendanceSettings = await this.getAttendanceSettings(department);

    return {
      minimumWorkHours: attendanceSettings.minimumWorkHours,
      fullDayHours: attendanceSettings.fullDayHours
    };
  }
}

// Export singleton instance
const settingsService = new SettingsService();
export default settingsService;
