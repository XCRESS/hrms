import express from 'express';
import hrAttendanceController from '../controllers/hr-attendance.controller.js';
import { authenticateToken } from '../middleware/auth.middlewares.js';
import { hrAuthMiddleware } from '../middleware/hr-auth.middleware.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware.js';
import { auditMiddleware } from '../middleware/audit.middleware.js';
import { performanceMiddleware } from '../middleware/performance.middleware.js';

/**
 * HR Attendance API Routes
 * Industry-standard REST API with comprehensive middleware stack
 * 
 * Features:
 * - Single unified endpoint with operation-based routing
 * - Comprehensive middleware chain for security and performance
 * - Rate limiting and audit logging
 * - Performance monitoring and caching
 * - Role-based access control
 */

const router = express.Router();

// Global middleware stack for all HR attendance routes
router.use(authenticateToken);           // JWT authentication
router.use(hrAuthMiddleware);            // HR/Admin role verification
router.use(performanceMiddleware);       // Performance tracking
router.use(auditMiddleware);             // Audit logging

// Rate limiting configuration
const hrAttendanceRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 100,                    // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many HR attendance requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for GET requests with smaller payloads
    return req.method === 'GET' && 
           ['overview', 'employee'].includes(req.query.operation);
  }
});

// Enhanced rate limiting for bulk operations
const bulkOperationRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 10,                     // Limit bulk operations to 10 per hour
  message: {
    success: false,
    message: 'Bulk operation rate limit exceeded. Please wait before retrying.',
    code: 'BULK_RATE_LIMIT_EXCEEDED'
  }
});

// Apply rate limiting
router.use(hrAttendanceRateLimit);

/**
 * Main HR Attendance Endpoint
 * Handles all HR attendance operations through query parameters
 */

// GET Operations
router.get('/attendance', 
  // Additional middleware for GET requests
  (req, res, next) => {
    req.startTime = Date.now(); // For performance tracking
    next();
  },
  hrAttendanceController.handleAttendanceRequest
);

// POST Operations (Bulk operations)
router.post('/attendance',
  bulkOperationRateLimit,
  // Additional validation for POST requests
  (req, res, next) => {
    req.startTime = Date.now();
    
    // Ensure operation is specified for POST requests
    if (!req.query.operation) {
      return res.status(400).json({
        success: false,
        message: 'Operation parameter is required for POST requests',
        code: 'MISSING_OPERATION'
      });
    }
    
    // Only allow specific operations for POST
    const allowedPostOperations = ['bulk'];
    if (!allowedPostOperations.includes(req.query.operation)) {
      return res.status(400).json({
        success: false,
        message: `Invalid POST operation. Allowed: ${allowedPostOperations.join(', ')}`,
        code: 'INVALID_POST_OPERATION'
      });
    }
    
    next();
  },
  hrAttendanceController.handleAttendanceRequest
);

// PUT Operations (Updates)
router.put('/attendance',
  // Additional validation for PUT requests
  (req, res, next) => {
    req.startTime = Date.now();
    
    // Ensure operation is update for PUT requests
    if (req.query.operation !== 'update') {
      return res.status(400).json({
        success: false,
        message: 'PUT requests must use operation=update',
        code: 'INVALID_PUT_OPERATION'
      });
    }
    
    next();
  },
  hrAttendanceController.handleAttendanceRequest
);

/**
 * Health Check Endpoint
 * For monitoring HR attendance API availability
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Attendance API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      overview: 'GET /hr/attendance?operation=overview',
      records: 'GET /hr/attendance?operation=records',
      employee: 'GET /hr/attendance?operation=employee',
      analytics: 'GET /hr/attendance?operation=analytics',
      bulk: 'POST /hr/attendance?operation=bulk',
      update: 'PUT /hr/attendance?operation=update',
      export: 'GET /hr/attendance?operation=export'
    }
  });
});

/**
 * API Documentation Endpoint
 * Self-documenting API for HR bot integration
 */
router.get('/docs', (req, res) => {
  res.json({
    title: 'HR Attendance API Documentation',
    version: '1.0.0',
    description: 'Unified HR attendance API for HR bot and admin operations',
    baseUrl: '/api/hr/attendance',
    operations: {
      overview: {
        method: 'GET',
        operation: 'overview',
        description: 'Get real-time attendance dashboard overview',
        parameters: {
          date: 'string (YYYY-MM-DD, optional, defaults to today)'
        },
        example: '/api/hr/attendance?operation=overview&date=2024-01-15'
      },
      records: {
        method: 'GET',
        operation: 'records',
        description: 'Get filtered attendance records with pagination',
        parameters: {
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)',
          employeeIds: 'array (optional)',
          departments: 'array (optional)',
          status: 'string (optional)',
          page: 'number (optional, default: 1)',
          limit: 'number (optional, default: 50, max: 200)'
        },
        example: '/api/hr/attendance?operation=records&startDate=2024-01-01&endDate=2024-01-31'
      },
      employee: {
        method: 'GET',
        operation: 'employee',
        description: 'Get detailed individual employee attendance analysis',
        parameters: {
          employeeId: 'string (required, format: EMP###)',
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)',
          includeAnalytics: 'boolean (optional, default: true)'
        },
        example: '/api/hr/attendance?operation=employee&employeeId=EMP001&startDate=2024-01-01&endDate=2024-01-31'
      },
      analytics: {
        method: 'GET',
        operation: 'analytics',
        description: 'Get advanced attendance analytics and insights',
        parameters: {
          period: 'string (day|week|month|quarter|year|custom, default: month)',
          startDate: 'string (required if period=custom)',
          endDate: 'string (required if period=custom)',
          metricTypes: 'array (optional)',
          groupBy: 'string (optional, default: department)'
        },
        example: '/api/hr/attendance?operation=analytics&period=month&metricTypes=attendance_rate,punctuality'
      },
      bulk: {
        method: 'POST',
        operation: 'bulk',
        description: 'Perform bulk operations on attendance records',
        bodyExample: {
          operation: 'update',
          data: [
            {
              recordId: '507f1f77bcf86cd799439011',
              status: 'present',
              checkIn: '2024-01-15T09:30:00Z'
            }
          ]
        }
      },
      update: {
        method: 'PUT',
        operation: 'update',
        description: 'Update individual attendance record',
        parameters: {
          recordId: 'string (required, MongoDB ObjectId or "new")'
        },
        bodyExample: {
          status: 'present',
          checkIn: '2024-01-15T09:30:00Z',
          checkOut: '2024-01-15T18:00:00Z'
        }
      },
      export: {
        method: 'GET',
        operation: 'export',
        description: 'Export attendance data in various formats',
        parameters: {
          format: 'string (csv|xlsx|json|pdf, default: csv)',
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)'
        },
        example: '/api/hr/attendance?operation=export&format=csv&startDate=2024-01-01&endDate=2024-01-31'
      }
    },
    responseFormat: {
      success: true,
      message: 'Operation completed successfully',
      data: '...',
      metadata: {
        timestamp: 'ISO string',
        requestId: 'unique identifier',
        performance: 'execution metrics'
      }
    },
    errorFormat: {
      success: false,
      message: 'Error description',
      code: 'ERROR_CODE',
      errors: 'Detailed validation errors (if applicable)'
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      requiredRole: 'hr or admin'
    },
    rateLimits: {
      standard: '100 requests per 15 minutes',
      bulk: '10 requests per hour'
    }
  });
});

// Error handling middleware (must be last)
router.use((error, req, res, next) => {
  console.error('HR Attendance API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?._id,
    timestamp: new Date().toISOString()
  });

  // Handle different error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }))
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate record conflict',
      code: 'DUPLICATE_RECORD'
    });
  }

  // Custom API errors
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code || 'API_ERROR'
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: req.id || Date.now().toString()
  });
});

export default router;