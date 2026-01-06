/**
 * Pino Logger Configuration
 * Structured logging for production-ready applications
 */

import pino from 'pino';
import type { Logger, LoggerOptions } from 'pino';

/**
 * Determine log level based on environment
 */
function getLogLevel(): 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(level)) {
    return level as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Pino logger configuration options
 */
const loggerOptions: LoggerOptions = {
  level: getLogLevel(),

  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'req.headers.authorization',
      'req.headers.cookie',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
    ],
    remove: true,
  },

  // Custom serializers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },

  // Base fields added to every log
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    env: process.env.NODE_ENV || 'development',
  },

  // Timestamp format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Pretty print in development
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,env',
            singleLine: true,
            messageFormat: '{msg}',
          },
        }
      : undefined,
};

/**
 * Create base logger instance
 */
const logger: Logger = pino(loggerOptions);

/**
 * Create child logger with specific context
 * @param context - Context object (e.g., module name, user ID, request ID)
 */
export function createLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

/**
 * Log database queries (for debugging)
 */
export function logDatabaseQuery(query: string, params?: unknown[], duration?: number): void {
  logger.debug(
    {
      query,
      params,
      duration,
      type: 'database',
    },
    'Database query executed'
  );
}

/**
 * Log external API calls
 */
export function logExternalAPI(
  service: string,
  endpoint: string,
  method: string,
  statusCode?: number,
  duration?: number
): void {
  const logData = {
    service,
    endpoint,
    method,
    statusCode,
    duration,
    type: 'external_api',
  };

  if (statusCode && statusCode >= 400) {
    logger.warn(logData, `External API call failed: ${service}`);
  } else {
    logger.info(logData, `External API call: ${service}`);
  }
}

/**
 * Log authentication events
 */
export function logAuthEvent(
  event: 'login' | 'logout' | 'token_refresh' | 'password_reset' | 'failed_login',
  userId?: string,
  email?: string,
  ip?: string
): void {
  logger.info(
    {
      event,
      userId,
      email,
      ip,
      type: 'authentication',
    },
    `Auth event: ${event}`
  );
}

/**
 * Log business events (e.g., attendance check-in, leave approval)
 */
export function logBusinessEvent(
  event: string,
  userId: string,
  data?: Record<string, unknown>
): void {
  logger.info(
    {
      event,
      userId,
      ...data,
      type: 'business',
    },
    `Business event: ${event}`
  );
}

/**
 * Log performance metrics
 */
export function logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
  logger.info(
    {
      operation,
      duration,
      ...metadata,
      type: 'performance',
    },
    `Performance: ${operation} took ${duration}ms`
  );
}

/**
 * Export default logger
 */
export default logger;
