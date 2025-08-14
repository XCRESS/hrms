/**
 * Settings Service
 * Provides centralized access to dynamic settings with caching
 */

import Settings from '../../models/Settings.model.js';
import { getISTNow } from '../../utils/istUtils.js';

/**
 * Settings Service Class
 * Handles fetching and caching of settings with department-specific overrides
 */
export class SettingsService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get effective settings for a department or employee
   * Priority: Department > Global
   * @param {string} department - Department name (optional)
   * @returns {Promise<Object>} Effective settings
   */
  async getEffectiveSettings(department = null) {
    const cacheKey = `settings:${department || 'global'}`;
    
    // Check cache first
    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey) > Date.now()) {
      return this.cache.get(cacheKey);
    }

    try {
      const effectiveSettings = await Settings.getEffectiveSettings(department);
      
      // Cache the result
      this.cache.set(cacheKey, effectiveSettings);
      this.cacheExpiry.set(cacheKey, Date.now() + this.defaultCacheTTL);
      
      return effectiveSettings;
    } catch (error) {
      console.error('Error fetching effective settings:', error);
      // Return default settings if fetch fails
      return this.getDefaultSettings();
    }
  }

  /**
   * Get attendance-specific settings for a department
   * @param {string} department - Department name (optional)
   * @returns {Promise<Object>} Attendance settings
   */
  async getAttendanceSettings(department = null) {
    const settings = await this.getEffectiveSettings(department);
    return settings.attendance;
  }

  /**
   * Convert time string to decimal hours for calculations
   * @param {string} timeString - Time in 24-hour format (HH:MM)
   * @returns {number} Decimal hours
   */
  timeToDecimal(timeString) {
    return Settings.timeToDecimal(timeString);
  }

  /**
   * Convert decimal hours to time string
   * @param {number} decimal - Decimal hours
   * @returns {string} Time in 24-hour format (HH:MM)
   */
  decimalToTime(decimal) {
    return Settings.decimalToTime24(decimal);
  }

  /**
   * Clear cache for specific department or all
   * @param {string} department - Department name (optional)
   */
  clearCache(department = null) {
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
   * @returns {Object} Default settings
   */
  getDefaultSettings() {
    return {
      attendance: {
        lateThreshold: "09:55",
        workStartTime: "09:00",
        workEndTime: "18:00",
        halfDayEndTime: "13:00",
        minimumWorkHours: 4,
        fullDayHours: 8,
        workingDays: [1, 2, 3, 4, 5, 6],
        nonWorkingDays: [0],
        saturdayWorkType: "full",
        saturdayHolidays: []
      },
      scope: "global"
    };
  }

  /**
   * Get business hours for a specific department and date
   * @param {Date} date - Target date
   * @param {string} department - Department name (optional)
   * @returns {Promise<Object>} Business hours object
   */
  async getBusinessHours(date = null, department = null) {
    const attendanceSettings = await this.getAttendanceSettings(department);
    const targetDate = date || getISTNow();
    
    // Create date objects for start and end times
    const startTime = new Date(targetDate);
    const endTime = new Date(targetDate);
    
    // Parse time strings (HH:MM) and set the hours/minutes
    const [startHour, startMinute] = attendanceSettings.workStartTime.split(':').map(Number);
    const [endHour, endMinute] = attendanceSettings.workEndTime.split(':').map(Number);
    
    startTime.setHours(startHour, startMinute, 0, 0);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    return {
      workStart: startTime,
      workEnd: endTime,
      workStartDecimal: this.timeToDecimal(attendanceSettings.workStartTime),
      workEndDecimal: this.timeToDecimal(attendanceSettings.workEndTime),
      lateThresholdDecimal: this.timeToDecimal(attendanceSettings.lateThreshold),
      halfDayEndDecimal: this.timeToDecimal(attendanceSettings.halfDayEndTime)
    };
  }

  /**
   * Check if a specific day is a working day for a department
   * @param {Date} date - Date to check
   * @param {string} department - Department name (optional)
   * @returns {Promise<boolean>} True if working day
   */
  async isWorkingDay(date, department = null) {
    const attendanceSettings = await this.getAttendanceSettings(department);
    const dayOfWeek = date.getDay();
    
    // Check if it's in working days
    if (!attendanceSettings.workingDays.includes(dayOfWeek)) {
      return false;
    }
    
    // Special handling for Saturday - check if it's a holiday Saturday
    if (dayOfWeek === 6) { // Saturday
      const saturdayWeek = this.getSaturdayWeekOfMonth(date);
      if (attendanceSettings.saturdayHolidays && attendanceSettings.saturdayHolidays.includes(saturdayWeek)) {
        return false; // This Saturday is configured as a holiday
      }
    }
    
    return true;
  }

  /**
   * Determine which Saturday of the month a given date is
   * @param {Date} date - Date to check (should be a Saturday)
   * @returns {number} 1, 2, 3, or 4 representing 1st, 2nd, 3rd, or 4th Saturday
   */
  getSaturdayWeekOfMonth(date) {
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
   * Get work hour thresholds for a department
   * @param {string} department - Department name (optional)
   * @returns {Promise<Object>} Work hour thresholds
   */
  async getWorkHourThresholds(department = null) {
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