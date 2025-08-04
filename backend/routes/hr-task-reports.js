import express from 'express';
import hrTaskReportsController from '../controllers/hr-task-reports.controller.js';
import { authenticateToken } from '../middleware/auth.middlewares.js';
import { hrAuthMiddleware } from '../middleware/hr-auth.middleware.js';
import { rateLimitMiddleware } from '../middleware/rateLimit.middleware.js';
import { auditMiddleware } from '../middleware/audit.middleware.js';
import { performanceMiddleware } from '../middleware/performance.middleware.js';

/**
 * HR Task Reports API Routes
 * Industry-standard REST API with comprehensive middleware stack
 * 
 * Features:
 * - Single unified endpoint with operation-based routing
 * - Advanced task analytics and productivity insights
 * - Comprehensive middleware chain for security and performance
 * - Rate limiting and audit logging optimized for task operations
 * - AI-powered insights and recommendations
 * - Bulk operations with transaction support
 */

const router = express.Router();

// Global middleware stack for all HR task reports routes
router.use(authenticateToken);           // JWT authentication
router.use(hrAuthMiddleware);            // HR/Admin role verification
router.use(performanceMiddleware);       // Performance tracking
router.use(auditMiddleware);             // Audit logging

// Rate limiting configuration for task reports
const hrTaskReportsRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  max: 150,                    // Higher limit due to analytics operations
  message: {
    success: false,
    message: 'Too many HR task reports requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Different limits based on operation complexity
    const operation = req.query.operation;
    const complexOperations = ['analytics', 'insights', 'productivity'];
    return `${req.ip}:${complexOperations.includes(operation) ? 'complex' : 'simple'}`;
  },
  skip: (req) => {
    // Skip rate limiting for simple overview requests
    return req.method === 'GET' && req.query.operation === 'overview';
  }
});

// Enhanced rate limiting for analytics and bulk operations
const analyticsRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 20,                     // Limit analytics operations
  message: {
    success: false,
    message: 'Analytics operation rate limit exceeded. Please wait before retrying.',
    code: 'ANALYTICS_RATE_LIMIT_EXCEEDED'
  }
});

const bulkOperationRateLimit = rateLimitMiddleware({
  windowMs: 60 * 60 * 1000,    // 1 hour
  max: 5,                      // Very limited bulk operations
  message: {
    success: false,
    message: 'Bulk operation rate limit exceeded. Please wait before retrying.',
    code: 'BULK_RATE_LIMIT_EXCEEDED'
  }
});

// Apply base rate limiting
router.use(hrTaskReportsRateLimit);

/**
 * Main HR Task Reports Endpoint
 * Handles all HR task report operations through query parameters
 */

// GET Operations
router.get('/task-reports', 
  // Additional middleware for GET requests
  (req, res, next) => {
    req.startTime = Date.now();
    
    // Apply analytics rate limiting for complex operations
    const complexOperations = ['analytics', 'insights', 'productivity'];
    if (complexOperations.includes(req.query.operation)) {
      return analyticsRateLimit(req, res, next);
    }
    
    next();
  },
  hrTaskReportsController.handleTaskReportsRequest
);

// POST Operations (Bulk operations and analysis)
router.post('/task-reports',
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
    const allowedPostOperations = ['bulk', 'analyze'];
    if (!allowedPostOperations.includes(req.query.operation)) {
      return res.status(400).json({
        success: false,
        message: `Invalid POST operation. Allowed: ${allowedPostOperations.join(', ')}`,
        code: 'INVALID_POST_OPERATION'
      });
    }
    
    // Apply bulk operation rate limiting
    if (req.query.operation === 'bulk') {
      return bulkOperationRateLimit(req, res, next);
    }
    
    next();
  },
  hrTaskReportsController.handleTaskReportsRequest
);

// PUT Operations (Updates)
router.put('/task-reports',
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
    
    // Validate recordId parameter
    if (!req.query.recordId) {
      return res.status(400).json({
        success: false,
        message: 'Record ID is required for update operations',
        code: 'MISSING_RECORD_ID'
      });
    }
    
    next();
  },
  hrTaskReportsController.handleTaskReportsRequest
);

/**
 * Health Check Endpoint
 * For monitoring HR task reports API availability
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'HR Task Reports API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      taskAnalytics: 'enabled',
      productivityInsights: 'enabled',
      aiRecommendations: 'enabled',
      bulkOperations: 'enabled',
      realTimeAnalytics: 'enabled'
    },
    endpoints: {
      overview: 'GET /hr/task-reports?operation=overview',
      reports: 'GET /hr/task-reports?operation=reports',
      employee: 'GET /hr/task-reports?operation=employee',
      analytics: 'GET /hr/task-reports?operation=analytics',
      productivity: 'GET /hr/task-reports?operation=productivity',
      insights: 'GET /hr/task-reports?operation=insights',
      bulk: 'POST /hr/task-reports?operation=bulk',
      analyze: 'POST /hr/task-reports?operation=analyze',
      update: 'PUT /hr/task-reports?operation=update',
      export: 'GET /hr/task-reports?operation=export'
    }
  });
});

/**
 * API Documentation Endpoint
 * Comprehensive documentation for HR bot integration
 */
router.get('/docs', (req, res) => {
  res.json({
    title: 'HR Task Reports API Documentation',
    version: '1.0.0',
    description: 'Unified HR task reports API for productivity analytics, insights, and management',
    baseUrl: '/api/hr/task-reports',
    features: [
      'Task productivity analytics',
      'AI-powered insights and recommendations',
      'Individual and team performance metrics',
      'Advanced filtering and search',
      'Bulk operations with transaction support',
      'Real-time dashboard statistics',
      'Export capabilities (CSV, Excel, PDF)',
      'Pattern recognition and trend analysis'
    ],
    operations: {
      overview: {
        method: 'GET',
        operation: 'overview',
        description: 'Get real-time task reports dashboard overview with productivity insights',
        parameters: {
          date: 'string (YYYY-MM-DD, optional, defaults to today)',
          period: 'string (today|week|month|quarter, default: month)'
        },
        example: '/api/hr/task-reports?operation=overview&period=month',
        responseIncludes: [
          'Task reporting statistics',
          'Productivity metrics',
          'Quality scores',
          'Top performers',
          'Alerts and insights',
          'Trend analysis'
        ]
      },
      reports: {
        method: 'GET',
        operation: 'reports',
        description: 'Get filtered task reports with advanced analytics',
        parameters: {
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)',
          employeeIds: 'array (optional)',
          departments: 'array (optional)',
          taskCategories: 'array (optional)',
          productivityLevel: 'string (high|medium|low|all, default: all)',
          hasTaskReports: 'string (true|false|all, default: all)',
          page: 'number (optional, default: 1)',
          limit: 'number (optional, default: 50, max: 200)',
          format: 'string (detailed|summary|compact, default: detailed)',
          includeTaskContent: 'boolean (default: false)'
        },
        example: '/api/hr/task-reports?operation=reports&startDate=2024-01-01&endDate=2024-01-31&productivityLevel=high',
        responseIncludes: [
          'Paginated task reports',
          'Productivity and quality scores',
          'Task categorization',
          'Employee performance metrics',
          'Summary statistics'
        ]
      },
      employee: {
        method: 'GET',
        operation: 'employee',
        description: 'Get detailed individual employee task analysis and productivity trends',
        parameters: {
          employeeId: 'string (required, format: EMP###)',
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)',
          includeAnalytics: 'boolean (default: true)',
          includeProductivityTrends: 'boolean (default: true)',
          includeTaskCategories: 'boolean (default: true)',
          includeComparisons: 'boolean (default: false)'
        },
        example: '/api/hr/task-reports?operation=employee&employeeId=EMP001&startDate=2024-01-01&endDate=2024-01-31',
        responseIncludes: [
          'Employee task history',
          'Productivity timeline',
          'Task categorization analysis',
          'Performance comparisons',
          'Personalized recommendations'
        ]
      },
      analytics: {
        method: 'GET',
        operation: 'analytics',
        description: 'Get advanced task analytics with productivity insights and trends',
        parameters: {
          period: 'string (day|week|month|quarter|year|custom, default: month)',
          startDate: 'string (required if period=custom)',
          endDate: 'string (required if period=custom)',
          departments: 'array (optional)',
          metricTypes: 'array (productivity|task_quality|trends|patterns|categories|correlations)',
          groupBy: 'string (department|position|employee|date|week|month, default: department)',
          includeComparisons: 'boolean (default: true)'
        },
        example: '/api/hr/task-reports?operation=analytics&period=month&metricTypes=productivity,trends&groupBy=department',
        responseIncludes: [
          'Productivity analytics',
          'Task quality metrics',
          'Trend analysis',
          'Pattern recognition',
          'Benchmark comparisons'
        ]
      },
      productivity: {
        method: 'GET',
        operation: 'productivity',
        description: 'Get comprehensive productivity metrics and benchmarking',
        parameters: {
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)',
          departments: 'array (optional)',
          positions: 'array (optional)',
          benchmarkType: 'string (department|position|company|individual, default: department)',
          includeIndividualMetrics: 'boolean (default: false)',
          includeTeamComparisons: 'boolean (default: true)'
        },
        example: '/api/hr/task-reports?operation=productivity&startDate=2024-01-01&endDate=2024-01-31&benchmarkType=department',
        responseIncludes: [
          'Individual productivity scores',
          'Team performance metrics',
          'Benchmark comparisons',
          'Performance rankings',
          'Improvement recommendations'
        ]
      },
      insights: {
        method: 'GET',
        operation: 'insights',
        description: 'Get AI-powered task insights and recommendations',
        parameters: {
          analysisType: 'string (comprehensive|focused|comparative|predictive, default: comprehensive)',
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)',
          departments: 'array (optional)',
          focusAreas: 'array (productivity|quality|patterns|engagement|efficiency|collaboration)',
          includeRecommendations: 'boolean (default: true)'
        },
        example: '/api/hr/task-reports?operation=insights&analysisType=comprehensive&focusAreas=productivity,quality',
        responseIncludes: [
          'AI-generated insights',
          'Actionable recommendations',
          'Risk factor identification',
          'Opportunity analysis',
          'Confidence scores'
        ]
      },
      bulk: {
        method: 'POST',
        operation: 'bulk',
        description: 'Perform bulk operations on task reports',
        bodyExamples: {
          update: {
            operation: 'update',
            data: [
              {
                recordId: '507f1f77bcf86cd799439011',
                tasks: ['Updated task 1', 'Updated task 2'],
                category: 'development',
                productivityScore: 85
              }
            ]
          },
          import: {
            operation: 'import',
            data: [
              {
                employeeId: 'EMP001',
                date: '2024-01-15',
                tasks: ['Task 1', 'Task 2'],
                category: 'development'
              }
            ]
          },
          categorize: {
            operation: 'categorize',
            data: [
              {
                recordId: '507f1f77bcf86cd799439011',
                suggestedCategory: 'development',
                confidence: 0.9
              }
            ]
          }
        }
      },
      analyze: {
        method: 'POST',
        operation: 'analyze',
        description: 'Perform advanced task pattern analysis',
        bodyExample: {
          analysisType: 'productivity_patterns',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          departments: ['Engineering', 'Design'],
          analysisOptions: {
            groupBy: 'week',
            includeCorrelations: true
          }
        }
      },
      update: {
        method: 'PUT',
        operation: 'update',
        description: 'Update individual task report',
        parameters: {
          recordId: 'string (required, MongoDB ObjectId)'
        },
        bodyExample: {
          tasks: ['Updated task 1', 'Updated task 2'],
          category: 'development',
          productivityScore: 85,
          qualityScore: 90,
          notes: 'Updated by HR'
        }
      },
      export: {
        method: 'GET',
        operation: 'export',
        description: 'Export task reports data in various formats',
        parameters: {
          format: 'string (csv|xlsx|json|pdf, default: csv)',
          startDate: 'string (YYYY-MM-DD, required)',
          endDate: 'string (YYYY-MM-DD, required)',
          template: 'string (standard|detailed|summary|analytics|management)',
          includeTaskContent: 'boolean (default: false)',
          includeAnalytics: 'boolean (default: false)'
        },
        example: '/api/hr/task-reports?operation=export&format=xlsx&startDate=2024-01-01&endDate=2024-01-31&template=analytics'
      }
    },
    hrBotIntegration: {
      description: 'Optimized for HR bot natural language queries',
      examples: [
        {
          query: "Show me today's task reporting overview",
          api: "GET /hr/task-reports?operation=overview&period=today"
        },
        {
          query: "Get John's productivity analysis for last month",
          api: "GET /hr/task-reports?operation=employee&employeeId=EMP001&startDate=2024-01-01&endDate=2024-01-31"
        },
        {
          query: "Analyze productivity trends by department",
          api: "GET /hr/task-reports?operation=analytics&metricTypes=productivity,trends&groupBy=department"
        },
        {
          query: "Get AI insights on team performance",
          api: "GET /hr/task-reports?operation=insights&focusAreas=productivity,quality,engagement"
        }
      ]
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
      standard: '150 requests per 15 minutes',
      analytics: '20 requests per hour',
      bulk: '5 requests per hour'
    }
  });
});

// Error handling middleware (must be last)
router.use((error, req, res, next) => {
  console.error('HR Task Reports API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?._id,
    operation: req.query?.operation,
    timestamp: new Date().toISOString()
  });

  // Handle different error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Task report validation failed',
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
      message: 'Duplicate task report conflict',
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
    message: 'Internal server error in task reports API',
    code: 'INTERNAL_ERROR',
    requestId: req.id || Date.now().toString()
  });
});

export default router;