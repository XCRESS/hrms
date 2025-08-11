/**
 * Attendance Cache Service
 * Handles all caching operations and cache invalidation strategies for attendance system
 */

import cache, { TTL } from '../../utils/cache.js';
import { invalidateAttendanceCache, invalidateDashboardCache } from '../../utils/cacheInvalidation.js';
import { CACHE_CONFIG } from '../../utils/attendance/attendanceConstants.js';
import { getISTDateString } from '../../utils/istUtils.js';
import Employee from '../../models/Employee.model.js';
import Holiday from '../../models/Holiday.model.js';

/**
 * AttendanceCacheService
 * Centralized caching operations for attendance system
 */
export class AttendanceCacheService {

  /**
   * Get or set cache with automatic expiration
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or fetched data
   */
  static async getOrSet(key, fetchFunction, ttl = CACHE_CONFIG.TTL.ATTENDANCE) {
    return await cache.getOrSet(key, fetchFunction, ttl);
  }

  /**
   * Get cached active employees with basic information
   * @returns {Promise<Array>} Array of active employee documents
   */
  static async getCachedActiveEmployees() {
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
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Map>} Holiday map with date keys for O(1) lookup
   */
  static async getCachedHolidaysInRange(startDate, endDate) {
    const cacheKey = `${CACHE_CONFIG.KEYS.HOLIDAYS_RANGE}:${getISTDateString(startDate)}:${getISTDateString(endDate)}`;
    
    return await this.getOrSet(cacheKey, async () => {
      const holidays = await Holiday.find({
        date: { $gte: startDate, $lte: endDate }
      }).lean(); // Use .lean() for better performance
      
      // Create a Map for O(1) lookup by date key (IST dates)
      const holidayMap = new Map();
      holidays.forEach(holiday => {
        const dateKey = getISTDateString(holiday.date);
        holidayMap.set(dateKey, holiday);
      });
      
      return holidayMap;
    }, CACHE_CONFIG.TTL.HOLIDAYS);
  }

  /**
   * Get cached employee by ID with extended information
   * @param {string} employeeId - Employee ID
   * @returns {Promise<Object|null>} Employee document or null
   */
  static async getCachedEmployee(employeeId) {
    const cacheKey = `employee:${employeeId}`;
    
    return await this.getOrSet(cacheKey, async () => {
      return await Employee.findOne({ employeeId, isActive: true }).lean();
    }, CACHE_CONFIG.TTL.EMPLOYEES);
  }

  /**
   * Get cached employee by ObjectId
   * @param {string} employeeObjectId - Employee ObjectId
   * @returns {Promise<Object|null>} Employee document or null
   */
  static async getCachedEmployeeById(employeeObjectId) {
    const cacheKey = `employee:obj:${employeeObjectId}`;
    
    return await this.getOrSet(cacheKey, async () => {
      return await Employee.findById(employeeObjectId).lean();
    }, CACHE_CONFIG.TTL.EMPLOYEES);
  }

  /**
   * Cache today's attendance summary
   * @param {Object} summaryData - Summary data to cache
   * @param {Date} date - Date for the summary (optional, defaults to today)
   * @returns {Promise<void>}
   */
  static async cacheTodayAttendanceSummary(summaryData, date = new Date()) {
    const dateKey = getISTDateString(date);
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${dateKey}`;
    
    await cache.set(cacheKey, summaryData, CACHE_CONFIG.TTL.ATTENDANCE);
  }

  /**
   * Get cached today's attendance summary
   * @param {Date} date - Date for the summary (optional, defaults to today)
   * @returns {Promise<Object|null>} Cached summary or null
   */
  static async getCachedTodayAttendanceSummary(date = new Date()) {
    const dateKey = getISTDateString(date);
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${dateKey}`;
    
    return await cache.get(cacheKey);
  }

  /**
   * Cache attendance range data
   * @param {string} startDate - Start date string
   * @param {string} endDate - End date string
   * @param {Object} rangeData - Range data to cache
   * @returns {Promise<void>}
   */
  static async cacheAttendanceRange(startDate, endDate, rangeData) {
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_RANGE}:${startDate}:${endDate}`;
    
    await cache.set(cacheKey, rangeData, CACHE_CONFIG.TTL.ATTENDANCE);
  }

  /**
   * Get cached attendance range data
   * @param {string} startDate - Start date string
   * @param {string} endDate - End date string
   * @returns {Promise<Object|null>} Cached range data or null
   */
  static async getCachedAttendanceRange(startDate, endDate) {
    const cacheKey = `${CACHE_CONFIG.KEYS.ATTENDANCE_RANGE}:${startDate}:${endDate}`;
    
    return await cache.get(cacheKey);
  }

  /**
   * Cache employee attendance statistics
   * @param {string} employeeId - Employee ID
   * @param {string} period - Period identifier (e.g., '2024-01', 'Q1-2024')
   * @param {Object} stats - Statistics to cache
   * @returns {Promise<void>}
   */
  static async cacheEmployeeAttendanceStats(employeeId, period, stats) {
    const cacheKey = `attendance:stats:${employeeId}:${period}`;
    
    await cache.set(cacheKey, stats, CACHE_CONFIG.TTL.REPORTS);
  }

  /**
   * Get cached employee attendance statistics
   * @param {string} employeeId - Employee ID
   * @param {string} period - Period identifier
   * @returns {Promise<Object|null>} Cached statistics or null
   */
  static async getCachedEmployeeAttendanceStats(employeeId, period) {
    const cacheKey = `attendance:stats:${employeeId}:${period}`;
    
    return await cache.get(cacheKey);
  }

  /**
   * Cache department attendance summary
   * @param {string} department - Department name
   * @param {string} period - Period identifier
   * @param {Object} summary - Summary data to cache
   * @returns {Promise<void>}
   */
  static async cacheDepartmentAttendanceSummary(department, period, summary) {
    const cacheKey = `attendance:dept:${department}:${period}`;
    
    await cache.set(cacheKey, summary, CACHE_CONFIG.TTL.REPORTS);
  }

  /**
   * Get cached department attendance summary
   * @param {string} department - Department name
   * @param {string} period - Period identifier
   * @returns {Promise<Object|null>} Cached summary or null
   */
  static async getCachedDepartmentAttendanceSummary(department, period) {
    const cacheKey = `attendance:dept:${department}:${period}`;
    
    return await cache.get(cacheKey);
  }

  // Cache Invalidation Methods

  /**
   * Invalidate all attendance-related caches
   * Called after major attendance operations (check-in, check-out, updates)
   * @returns {Promise<void>}
   */
  static async invalidateAllAttendanceCaches() {
    // Use existing cache invalidation utilities
    invalidateAttendanceCache();
    invalidateDashboardCache();
    
    // Additional specific invalidations
    await this.invalidateAttendanceSummaries();
    await this.invalidateAttendanceRanges();
  }

  /**
   * Invalidate attendance caches for a specific employee
   * @param {string} employeeId - Employee ID
   * @returns {Promise<void>}
   */
  static async invalidateEmployeeAttendanceCaches(employeeId) {
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
   * @param {Date} date - Target date
   * @returns {Promise<void>}
   */
  static async invalidateAttendanceCachesForDate(date) {
    const dateKey = getISTDateString(date);
    
    // Invalidate today's summary if it matches
    cache.delete(`${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${dateKey}`);
    
    // Invalidate general caches
    invalidateAttendanceCache();
    invalidateDashboardCache();
  }

  /**
   * Invalidate all attendance summary caches
   * @returns {Promise<void>}
   */
  static async invalidateAttendanceSummaries() {
    // Pattern-based cache deletion would be ideal here
    // For now, rely on TTL expiration and general invalidation
    
    const today = getISTDateString(new Date());
    cache.delete(`${CACHE_CONFIG.KEYS.ATTENDANCE_TODAY}:${today}`);
  }

  /**
   * Invalidate attendance range caches
   * @returns {Promise<void>}
   */
  static async invalidateAttendanceRanges() {
    // Pattern-based cache deletion would be ideal here
    // For now, rely on TTL expiration
  }

  /**
   * Invalidate employee-related caches
   * Called when employee data is updated
   * @param {string} employeeId - Employee ID (optional)
   * @returns {Promise<void>}
   */
  static async invalidateEmployeeCaches(employeeId = null) {
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
   * @returns {Promise<void>}
   */
  static async invalidateHolidayCaches() {
    // Pattern-based deletion would be ideal
    // For now, rely on TTL expiration and general invalidation
    invalidateAttendanceCache();
  }

  // Cache Management and Monitoring

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  static async getCacheStats() {
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
   * @returns {Promise<void>}
   */
  static async warmUpCaches() {
    try {
      // Pre-load active employees
      await this.getCachedActiveEmployees();
      
      // Pre-load current month holidays
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      await this.getCachedHolidaysInRange(startOfMonth, endOfMonth);
      
      console.log('Attendance caches warmed up successfully');
    } catch (error) {
      console.error('Error warming up attendance caches:', error);
    }
  }

  /**
   * Clear all attendance-related caches
   * Use with caution - typically only for maintenance or debugging
   * @returns {Promise<void>}
   */
  static async clearAllCaches() {
    cache.delete(CACHE_CONFIG.KEYS.EMPLOYEES_ACTIVE);
    
    // Additional cleanup would depend on cache implementation
    invalidateAttendanceCache();
    invalidateDashboardCache();
    
    console.log('All attendance caches cleared');
  }

  // Utility Methods

  /**
   * Generate cache key for attendance data
   * @param {string} prefix - Key prefix
   * @param {...string} parts - Key parts
   * @returns {string} Generated cache key
   */
  static generateCacheKey(prefix, ...parts) {
    return [prefix, ...parts].join(':');
  }

  /**
   * Check if caching is enabled
   * @returns {boolean} True if caching is enabled
   */
  static isCachingEnabled() {
    return cache && typeof cache.get === 'function';
  }
}

export default AttendanceCacheService;