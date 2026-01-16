/**
 * Environment-aware logging utility
 *
 * IMPORTANT: Use this logger instead of console.log/warn/info throughout the app.
 * This prevents sensitive information from being logged in production builds.
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.log('Debug info');        // Development only
 *   logger.warn('Warning');          // Development only
 *   logger.error('Error occurred');  // Always logged (for monitoring)
 *
 * Only console.error logs in production to capture critical errors for monitoring.
 * All other logs (log, info, warn, debug) are stripped in production builds.
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * General logging - development only
   */
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Error logging - always logged (for production error monitoring)
   * Be careful not to log sensitive data (passwords, tokens, PII)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Warning logging - development only
   */
  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Info logging - development only
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Debug logging - development only (same as log but more explicit)
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};
