/**
 * Cache invalidation utilities for HRMS application
 * Automatically invalidate cache when data changes
 */

import cache from './cache.js';

/**
 * Cache invalidation patterns
 */
export const CACHE_PATTERNS = {
  EMPLOYEES: {
    ALL: 'employees:*',
    ACTIVE: 'employees:active:*',
    PROFILE: 'employee:profile:*'
  },
  HOLIDAYS: {
    ALL: 'holidays:*',
    RANGE: 'holidays:*:*'
  },
  ATTENDANCE: {
    ALL: 'attendance:*',
    EMPLOYEE: 'attendance:employee:*',
    ADMIN: 'attendance:admin:*',
    HR: 'hr:attendance:*'
  },
  TASK_REPORTS: {
    ALL: 'task-reports:*',
    HR: 'hr:task-reports:*',
    EMPLOYEE: 'task-reports:employee:*'
  },
  DASHBOARD: {
    ALL: 'dashboard:*',
    STATS: 'dashboard:stats:*'
  }
};

/**
 * Invalidate cache entries matching a pattern
 * @param {string} pattern - Pattern to match (supports wildcards)
 */
export const invalidatePattern = (pattern) => {
  const stats = cache.getStats();
  const keysToDelete = [];

  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')  // Replace * with .*
    .replace(/\?/g, '.');   // Replace ? with .

  const regex = new RegExp(`^${regexPattern}$`);

  // Find matching keys
  stats.keys.forEach(key => {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  });

  // Delete matching keys
  keysToDelete.forEach(key => {
    cache.delete(key);
  });

  if (keysToDelete.length > 0) {
    console.log(`🧹 Cache invalidation: removed ${keysToDelete.length} entries matching pattern: ${pattern}`);
    console.log(`🔑 Invalidated keys:`, keysToDelete);
  }

  return keysToDelete.length;
};

/**
 * Invalidate employee-related cache
 * Call this when employee data changes
 */
export const invalidateEmployeeCache = () => {
  console.log('🧹 Invalidating employee cache...');
  invalidatePattern(CACHE_PATTERNS.EMPLOYEES.ALL);
};

/**
 * Invalidate holiday-related cache
 * Call this when holiday data changes
 */
export const invalidateHolidayCache = () => {
  console.log('🧹 Invalidating holiday cache...');
  invalidatePattern(CACHE_PATTERNS.HOLIDAYS.ALL);
};

/**
 * Invalidate attendance-related cache
 * Call this when attendance data changes
 */
export const invalidateAttendanceCache = (employeeId = null) => {
  console.log('🧹 Invalidating attendance cache...');
  
  if (employeeId) {
    invalidatePattern(`attendance:employee:${employeeId}:*`);
    invalidatePattern(`hr:attendance:employee:${employeeId}:*`);
  } else {
    invalidatePattern(CACHE_PATTERNS.ATTENDANCE.ALL);
    invalidatePattern(CACHE_PATTERNS.ATTENDANCE.HR);
  }
};

/**
 * Invalidate task reports-related cache
 * Call this when task report data changes
 */
export const invalidateTaskReportsCache = (employeeId = null) => {
  console.log('🧹 Invalidating task reports cache...');
  
  if (employeeId) {
    invalidatePattern(`task-reports:employee:${employeeId}:*`);
    invalidatePattern(`hr:task-reports:employee:${employeeId}:*`);
  } else {
    invalidatePattern(CACHE_PATTERNS.TASK_REPORTS.ALL);
    invalidatePattern(CACHE_PATTERNS.TASK_REPORTS.HR);
  }
};

/**
 * Invalidate dashboard-related cache
 * Call this when dashboard data needs refresh
 */
export const invalidateDashboardCache = () => {
  console.log('🧹 Invalidating dashboard cache...');
  invalidatePattern(CACHE_PATTERNS.DASHBOARD.ALL);
};

/**
 * Middleware to automatically invalidate cache based on route
 */
export const autoInvalidateMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only invalidate on successful operations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const { method, path } = req;
      
      // Determine what to invalidate based on the route
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        if (path.includes('/employees')) {
          invalidateEmployeeCache();
        }
        
        if (path.includes('/holidays')) {
          invalidateHolidayCache();
        }
        
        if (path.includes('/attendance')) {
          invalidateAttendanceCache();
          invalidateDashboardCache(); // Dashboard depends on attendance
        }
        
        if (path.includes('/task-reports')) {
          invalidateTaskReportsCache();
          invalidateDashboardCache(); // Dashboard depends on task reports
        }
        
        if (path.includes('/leaves') || path.includes('/regularizations')) {
          invalidateAttendanceCache(); // These affect attendance calculations
          invalidateDashboardCache();
        }
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Get cache invalidation statistics
 */
export const getCacheInvalidationStats = () => {
  return {
    timestamp: new Date().toISOString(),
    cacheStats: cache.getStats(),
    patterns: CACHE_PATTERNS
  };
};