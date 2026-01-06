/**
 * Cache Invalidation Utilities
 * Automatic cache invalidation when data changes
 */

import type { Request, Response, NextFunction } from 'express';
import cache from './cache.js';
import logger from './logger.js';

/**
 * Cache invalidation patterns
 */
export const CACHE_PATTERNS = {
  EMPLOYEES: {
    ALL: 'employees:*',
    ACTIVE: 'employees:active:*',
    PROFILE: 'employee:profile:*',
  },
  HOLIDAYS: {
    ALL: 'holidays:*',
    RANGE: 'holidays:*:*',
  },
  ATTENDANCE: {
    ALL: 'attendance:*',
    EMPLOYEE: 'attendance:employee:*',
    ADMIN: 'attendance:admin:*',
    HR: 'hr:attendance:*',
  },
  TASK_REPORTS: {
    ALL: 'task-reports:*',
    HR: 'hr:task-reports:*',
    EMPLOYEE: 'task-reports:employee:*',
  },
  DASHBOARD: {
    ALL: 'dashboard:*',
    STATS: 'dashboard:stats:*',
  },
} as const;

/**
 * Invalidate cache entries matching a pattern
 * @param pattern - Pattern to match (supports wildcards)
 * @returns Number of invalidated keys
 */
export function invalidatePattern(pattern: string): number {
  const stats = cache.getStats();
  const keysToDelete: string[] = [];

  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*') // Replace * with .*
    .replace(/\?/g, '.'); // Replace ? with .

  const regex = new RegExp(`^${regexPattern}$`);

  // Find matching keys
  stats.keys.forEach((key: string) => {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  });

  // Delete matching keys
  keysToDelete.forEach((key) => {
    cache.delete(key);
  });

  if (keysToDelete.length > 0) {
    logger.info(
      { count: keysToDelete.length, pattern, keys: keysToDelete },
      'Cache invalidation: removed entries'
    );
  }

  return keysToDelete.length;
}

/**
 * Invalidate employee-related cache
 * Call this when employee data changes
 */
export function invalidateEmployeeCache(): void {
  logger.info('Invalidating employee cache');
  invalidatePattern(CACHE_PATTERNS.EMPLOYEES.ALL);
}

/**
 * Invalidate holiday-related cache
 * Call this when holiday data changes
 */
export function invalidateHolidayCache(): void {
  logger.info('Invalidating holiday cache');
  invalidatePattern(CACHE_PATTERNS.HOLIDAYS.ALL);
}

/**
 * Invalidate attendance-related cache
 * Call this when attendance data changes
 * @param employeeId - Optional employee ID to invalidate specific employee's cache
 */
export function invalidateAttendanceCache(employeeId?: string | null): void {
  logger.info({ employeeId }, 'Invalidating attendance cache');

  if (employeeId) {
    invalidatePattern(`attendance:employee:${employeeId}:*`);
    invalidatePattern(`hr:attendance:employee:${employeeId}:*`);
  } else {
    invalidatePattern(CACHE_PATTERNS.ATTENDANCE.ALL);
    invalidatePattern(CACHE_PATTERNS.ATTENDANCE.HR);
  }
}

/**
 * Invalidate task reports-related cache
 * Call this when task report data changes
 * @param employeeId - Optional employee ID to invalidate specific employee's cache
 */
export function invalidateTaskReportsCache(employeeId?: string | null): void {
  logger.info({ employeeId }, 'Invalidating task reports cache');

  if (employeeId) {
    invalidatePattern(`task-reports:employee:${employeeId}:*`);
    invalidatePattern(`hr:task-reports:employee:${employeeId}:*`);
  } else {
    invalidatePattern(CACHE_PATTERNS.TASK_REPORTS.ALL);
    invalidatePattern(CACHE_PATTERNS.TASK_REPORTS.HR);
  }
}

/**
 * Invalidate dashboard-related cache
 * Call this when dashboard data needs refresh
 */
export function invalidateDashboardCache(): void {
  logger.info('Invalidating dashboard cache');
  invalidatePattern(CACHE_PATTERNS.DASHBOARD.ALL);
}

/**
 * Middleware to automatically invalidate cache based on route
 */
export function autoInvalidateMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send.bind(res);

  res.send = function (data: unknown): Response {
    // Only invalidate on successful operations
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const { method, path } = req;

      // Determine what to invalidate based on the route
      if (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') {
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

    return originalSend(data);
  };

  next();
}

/**
 * Get cache invalidation statistics
 */
export function getCacheInvalidationStats(): {
  timestamp: string;
  cacheStats: ReturnType<typeof cache.getStats>;
  patterns: typeof CACHE_PATTERNS;
} {
  return {
    timestamp: new Date().toISOString(),
    cacheStats: cache.getStats(),
    patterns: CACHE_PATTERNS,
  };
}
