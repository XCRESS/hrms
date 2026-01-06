/**
 * Attendance Cache Service
 * Handles all caching operations and cache invalidation strategies for attendance system
 */

import { DateTime } from 'luxon';
import cache, { TTL } from '../../utils/cache.js';
import { invalidateAttendanceCache, invalidateDashboardCache } from '../../utils/cacheInvalidation.js';
import { CACHE_CONFIG } from '../../utils/attendance/attendanceConstants.js';
import { getISTDateString } from '../../utils/timezone.js';
import Employee from '../../models/Employee.model.js';
import Holiday from '../../models/Holiday.model.js';
import logger from '../../utils/logger.js';

/**
 * Cache statistics interface
 */
interface CacheStats {
  message: string;
  ttlConfig: typeof CACHE_CONFIG.TTL;
  keyPrefixes: string[];
}

/**
 * AttendanceCacheService
 * Centralized caching operations for attendance system
 */
export class AttendanceCacheService {

  /**
   * Get or set cache with automatic expiration
   * @param key - Cache key
   * @param fetchFunction - Function to fetch data if not cached
   * @param ttl - Time to live in seconds
   * @returns Cached or fetched data
   */
  static async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = CACHE_CONFIG.TTL.ATTENDANCE
  ): Promise<T> {
    return await cache.getOrSet(key, fetchFunction, ttl);
  }

  /**
   * Get cached active employees with basic information
   * @returns Array of active employee documents
   */
  static async getCachedActiveEmployees(): Promise<any[]> {
    const cacheKey = CACHE_CONFIG.KEYS.EMPLOYEES_ACTIVE;

    return await this.getOrSet(cacheKey, async () => {
      return await Employee.find({ isActive: true })
        .select('_id firstName lastName employeeId department position joiningDate')
        .sort({ firstName: 1, lastName: 1 })
        .lean(); // Use .lean() for better performance
    }, CACHE_CONFIG.TTL.EMPLOYEES);
  }

  /**
   * Get cached holidays for a date range with optimized lookup
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Holiday map with date keys for O(1) lookup
   */
  static async getCachedHolidaysInRange(startDate: Date, endDate: Date): Promise<Map<string, any>> {
    const cacheKey = `${CACHE_CONFIG.KEYS.HOLIDAYS_RANGE}:${getISTDateString(startDate)}:${getISTDateString(endDate)}`;

    return await this.getOrSet(cacheKey, async () => {
      const holidays = await Holiday.find({
        date: { $gte: startDate, $lte: endDate }
      }).lean(); // Use .lean() for better performance

      // Create a Map for O(1) lookup by date key (IST dates)
      const holidayMap = new Map<string, any>();
      holidays.forEach(holiday => {
        const dateKey = getISTDateString(holiday.date);
        holidayMap.set(dateKey, holiday);
      });

      return holidayMap;
    }, CACHE_CONFIG.TTL.HOLIDAYS);
  }

  /**
   * Get cached employee by ID with extended information
   * @param employeeId - Employee ID
   * @returns Employee document or null
   */
  static async getCachedEmployee(employeeId: string): Promise<any> {
    const cacheKey = `employee:${employeeId}`;

    return await this.getOrSet(cacheKey, async () => {
      return await Employee.findOne({ employeeId, isActive: true }).lean();
    }, CACHE_CONFIG.TTL.EMPLOYEES);
  }

  /**
   * Get cached employee by ObjectId
   * @param employeeObjectId - Employee ObjectId
   * @returns Employee document or null
   */
  static async getCachedEmployeeById(employeeObjectId: string): Promise<any> {
    const cacheKey = `employee:obj:${employeeObjectId}`;

    return await this.getOrSet(cacheKey, async () => {
      return await Employee.findById(employeeObjectId).lean();
    }, CACHE_CONFIG.TTL.EMPLOYEES);
  }

  /**
   * Cache today's attendance summary
   * @param summaryData - Summary data to cache
   * @param date - Date for the summary (optional, defaults to today)
   * @returns Promise<void>
   */
  static async cacheTodayAttendanceSummary(summaryData: any, date: Date = new Date()): Promise<void> {
    const dateKey = getISTDateString(date);
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${dateKey}`;

    await cache.set(cacheKey, summaryData, CACHE_CONFIG.TTL.ATTENDANCE);
  }

  /**
   * Get cached today's attendance summary
   * @param date - Date for the summary (optional, defaults to today)
   * @returns Cached summary or null
   */
  static async getCachedTodayAttendanceSummary(date: Date = new Date()): Promise<any> {
    const dateKey = getISTDateString(date);
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${dateKey}`;

    return await cache.get(cacheKey);
  }

  /**
   * Cache attendance range data
   * @param startDate - Start date string
   * @param endDate - End date string
   * @param rangeData - Range data to cache
   * @returns Promise<void>
   */
  static async cacheAttendanceRange(startDate: string, endDate: string, rangeData: any): Promise<void> {
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_RANGE}:${startDate}:${endDate}`;

    await cache.set(cacheKey, rangeData, CACHE_CONFIG.TTL.ATTENDANCE);
  }

  /**
   * Get cached attendance range data
   * @param startDate - Start date string
   * @param endDate - End date string
   * @returns Cached range data or null
   */
  static async getCachedAttendanceRange(startDate: string, endDate: string): Promise<any> {
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_RANGE}:${startDate}:${endDate}`;

    return await cache.get(cacheKey);
  }

  /**
   * Cache employee attendance statistics
   * @param employeeId - Employee ID
   * @param period - Period identifier (e.g., '2024-01', 'Q1-2024')
   * @param stats - Statistics to cache
   * @returns Promise<void>
   */
  static async cacheEmployeeAttendanceStats(employeeId: string, period: string, stats: any): Promise<void> {
    const cacheKey = `attendance:stats:${employeeId}:${period}`;

    await cache.set(cacheKey, stats, CACHE_CONFIG.TTL.REPORTS);
  }

  /**
   * Get cached employee attendance statistics
   * @param employeeId - Employee ID
   * @param period - Period identifier
   * @returns Cached statistics or null
   */
  static async getCachedEmployeeAttendanceStats(employeeId: string, period: string): Promise<any> {
    const cacheKey = `attendance:stats:${employeeId}:${period}`;

    return await cache.get(cacheKey);
  }

  /**
   * Cache department attendance summary
   * @param department - Department name
   * @param period - Period identifier
   * @param summary - Summary data to cache
   * @returns Promise<void>
   */
  static async cacheDepartmentAttendanceSummary(department: string, period: string, summary: any): Promise<void> {
    const cacheKey = `attendance:dept:${department}:${period}`;

    await cache.set(cacheKey, summary, CACHE_CONFIG.TTL.REPORTS);
  }

  /**
   * Get cached department attendance summary
   * @param department - Department name
   * @param period - Period identifier
   * @returns Cached summary or null
   */
  static async getCachedDepartmentAttendanceSummary(department: string, period: string): Promise<any> {
    const cacheKey = `attendance:dept:${department}:${period}`;

    return await cache.get(cacheKey);
  }

  // Cache Invalidation Methods

  /**
   * Invalidate all attendance-related caches
   * Called after major attendance operations (check-in, check-out, updates)
   * @returns Promise<void>
   */
  static async invalidateAllAttendanceCaches(): Promise<void> {
    // Use existing cache invalidation utilities
    invalidateAttendanceCache();
    invalidateDashboardCache();

    // Additional specific invalidations
    await this.invalidateAttendanceSummaries();
    await this.invalidateAttendanceRanges();
  }

  /**
   * Invalidate attendance caches for a specific employee
   * @param employeeId - Employee ID
   * @returns Promise<void>
   */
  static async invalidateEmployeeAttendanceCaches(employeeId: string): Promise<void> {
    // Invalidate employee-specific caches
    cache.delete(`employee:${employeeId}`);

    // Invalidate statistics caches (pattern-based deletion would be ideal)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    cache.delete(`attendance:stats:${employeeId}:${currentMonth}`);

    // Invalidate general caches
    invalidateAttendanceCache();
    invalidateDashboardCache();
  }

  /**
   * Invalidate attendance caches for a specific date
   * @param date - Target date
   * @returns Promise<void>
   */
  static async invalidateAttendanceCachesForDate(date: Date): Promise<void> {
    const dateKey = getISTDateString(date);

    // Invalidate today's summary if it matches
    cache.delete(`${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${dateKey}`);

    // Invalidate general caches
    invalidateAttendanceCache();
    invalidateDashboardCache();
  }

  /**
   * Invalidate all attendance summary caches
   * @returns Promise<void>
   */
  static async invalidateAttendanceSummaries(): Promise<void> {
    // Pattern-based cache deletion would be ideal here
    // For now, rely on TTL expiration and general invalidation

    const today = getISTDateString(new Date());
    cache.delete(`${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${today}`);
  }

  /**
   * Invalidate attendance range caches
   * @returns Promise<void>
   */
  static async invalidateAttendanceRanges(): Promise<void> {
    // Pattern-based cache deletion would be ideal here
    // For now, rely on TTL expiration
  }

  /**
   * Invalidate employee-related caches
   * Called when employee data is updated
   * @param employeeId - Employee ID (optional)
   * @returns Promise<void>
   */
  static async invalidateEmployeeCaches(employeeId: string | null = null): Promise<void> {
    if (employeeId) {
      cache.delete(`employee:${employeeId}`);
    } else {
      // Invalidate the active employees cache
      cache.delete(CACHE_CONFIG.KEYS.EMPLOYEES_ACTIVE);
    }
  }

  /**
   * Invalidate holiday caches
   * Called when holiday data is updated
   * @returns Promise<void>
   */
  static async invalidateHolidayCaches(): Promise<void> {
    // Pattern-based deletion would be ideal
    // For now, rely on TTL expiration and general invalidation
    invalidateAttendanceCache();
  }

  // Cache Management and Monitoring

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  static async getCacheStats(): Promise<CacheStats> {
    // This would depend on the cache implementation
    // For now, return basic info
    return {
      message: 'Cache statistics would be implementation-specific',
      ttlConfig: CACHE_CONFIG.TTL,
      keyPrefixes: Object.values(CACHE_CONFIG.KEYS)
    };
  }

  /**
   * Warm up frequently used caches
   * @returns Promise<void>
   */
  static async warmUpCaches(): Promise<void> {
    try {
      // Pre-load active employees
      await this.getCachedActiveEmployees();

      // Pre-load current month holidays
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      await this.getCachedHolidaysInRange(startOfMonth, endOfMonth);

      logger.info('Attendance caches warmed up successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      logger.error({ err }, 'Error warming up attendance caches');
    }
  }

  /**
   * Clear all attendance-related caches
   * Use with caution - typically only for maintenance or debugging
   * @returns Promise<void>
   */
  static async clearAllCaches(): Promise<void> {
    cache.delete(CACHE_CONFIG.KEYS.EMPLOYEES_ACTIVE);

    // Additional cleanup would depend on cache implementation
    invalidateAttendanceCache();
    invalidateDashboardCache();

    logger.info('All attendance caches cleared');
  }

  // Utility Methods

  /**
   * Generate cache key for attendance data
   * @param prefix - Key prefix
   * @param parts - Key parts
   * @returns Generated cache key
   */
  static generateCacheKey(prefix: string, ...parts: string[]): string {
    return [prefix, ...parts].join(':');
  }

  /**
   * Check if caching is enabled
   * @returns True if caching is enabled
   */
  static isCachingEnabled(): boolean {
    return cache && typeof cache.get === 'function';
  }
}

export default AttendanceCacheService;
