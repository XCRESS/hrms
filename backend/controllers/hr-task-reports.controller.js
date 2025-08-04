import { HRTaskReportsService } from '../services/hr-task-reports.service.js';
import { APIResponse } from '../utils/response.js';
import { APIError } from '../utils/errors.js';
import { hrTaskReportsValidator } from '../validators/hr-task-reports.validator.js';
import cache, { TTL } from '../utils/cache.js';
import { invalidateTaskReportsCache } from '../utils/cacheInvalidation.js';

/**
 * Unified HR/Admin Task Reports Controller
 * Industry-standard REST API for HR task management operations
 * 
 * Features:
 * - Single endpoint with query-based operations
 * - Role-based access control (HR/Admin only)
 * - Comprehensive task analytics and insights
 * - Performance optimized with caching
 * - Productivity tracking and reporting
 * - Bulk operations and export capabilities
 * - AI-friendly response formats
 */

class HRTaskReportsController {
  constructor() {
    this.service = new HRTaskReportsService();
  }

  /**
   * Main HR Task Reports API Handler
   * GET/POST/PUT /api/hr/task-reports
   * 
   * Supported operations:
   * - overview: Dashboard statistics and productivity insights
   * - reports: Detailed task reports with filtering
   * - employee: Individual employee task analysis
   * - analytics: Advanced productivity analytics and trends
   * - bulk: Bulk operations (update/import/export)
   * - productivity: Productivity metrics and benchmarking
   * - insights: AI-powered task insights and recommendations
   */
  async handleTaskReportsRequest(req, res, next) {
    try {
      const { method } = req;
      const operation = req.query.operation || 'reports';

      // Validate HR/Admin access
      if (!req.user?.role || !['admin', 'hr'].includes(req.user.role)) {
        throw new APIError('Access denied. HR/Admin role required.', 403, 'INSUFFICIENT_PRIVILEGES');
      }

      // Route to appropriate handler based on operation and method
      switch (`${method}:${operation}`) {
        case 'GET:overview':
          return await this.getTaskReportsOverview(req, res);
        
        case 'GET:reports':
          return await this.getTaskReports(req, res);
        
        case 'GET:employee':
          return await this.getEmployeeTaskReports(req, res);
        
        case 'GET:analytics':
          return await this.getTaskAnalytics(req, res);
        
        case 'GET:productivity':
          return await this.getProductivityMetrics(req, res);
        
        case 'GET:insights':
          return await this.getTaskInsights(req, res);
        
        case 'POST:bulk':
          return await this.handleBulkOperations(req, res);
        
        case 'PUT:update':
          return await this.updateTaskReport(req, res);
        
        case 'GET:export':
          return await this.exportTaskData(req, res);
        
        case 'POST:analyze':
          return await this.analyzeTaskPatterns(req, res);

        default:
          throw new APIError(`Unsupported operation: ${method}:${operation}`, 400, 'INVALID_OPERATION');
      }

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/hr/task-reports?operation=overview
   * Real-time task reports dashboard for HR
   */
  async getTaskReportsOverview(req, res) {
    const { 
      date = new Date().toISOString().split('T')[0],
      period = 'today'
    } = req.query;
    
    // Validate input
    const validation = hrTaskReportsValidator.validateOverviewQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const cacheKey = `hr:task-reports:overview:${date}:${period}`;
    
    const overview = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getTaskReportsOverview({
        date,
        period,
        userRole: req.user.role,
        requestedBy: req.user._id
      });
    }, TTL.DASHBOARD);

    return APIResponse.success(res, 'Task reports overview retrieved successfully', {
      overview,
      metadata: {
        date,
        period,
        generatedAt: new Date().toISOString(),
        requestedBy: req.user.role,
        cacheStatus: 'computed'
      }
    });
  }

  /**
   * GET /api/hr/task-reports?operation=reports
   * Comprehensive task reports with advanced filtering
   */
  async getTaskReports(req, res) {
    // Validate and sanitize query parameters
    const validation = hrTaskReportsValidator.validateReportsQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      startDate,
      endDate,
      employeeIds,
      departments,
      taskCategories,
      productivityLevel,
      hasTaskReports,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc',
      format = 'detailed',
      includeTaskContent = false
    } = validation.data;

    // Build cache key for complex queries
    const cacheKey = `hr:task-reports:reports:${this._generateCacheKey(validation.data)}`;
    
    const result = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getTaskReports({
        startDate,
        endDate,
        employeeIds,
        departments,
        taskCategories,
        productivityLevel,
        hasTaskReports,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 200),
        sortBy,
        sortOrder,
        format,
        includeTaskContent,
        requestedBy: req.user._id
      });
    }, TTL.TASK_REPORTS);

    return APIResponse.success(res, 'Task reports retrieved successfully', {
      ...result,
      metadata: {
        query: validation.data,
        performance: {
          totalRecords: result.pagination.total,
          processingTime: `${Date.now() - req.startTime}ms`,
          cacheStatus: 'computed'
        }
      }
    });
  }

  /**
   * GET /api/hr/task-reports?operation=employee&employeeId=EMP001
   * Individual employee task reports and productivity analysis
   */
  async getEmployeeTaskReports(req, res) {
    const validation = hrTaskReportsValidator.validateEmployeeQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      employeeId,
      startDate,
      endDate,
      includeAnalytics = true,
      includeProductivityTrends = true,
      includeTaskCategories = true,
      includeComparisons = false
    } = validation.data;

    const cacheKey = `hr:task-reports:employee:${employeeId}:${startDate}:${endDate}`;
    
    const result = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getEmployeeTaskReportsDetails({
        employeeId,
        startDate,
        endDate,
        includeAnalytics,
        includeProductivityTrends,
        includeTaskCategories,
        includeComparisons,
        requestedBy: req.user._id
      });
    }, TTL.TASK_REPORTS);

    return APIResponse.success(res, 'Employee task reports retrieved successfully', {
      ...result,
      metadata: {
        employeeId,
        dateRange: { startDate, endDate },
        generatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * GET /api/hr/task-reports?operation=analytics
   * Advanced task analytics and productivity insights
   */
  async getTaskAnalytics(req, res) {
    const validation = hrTaskReportsValidator.validateAnalyticsQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      period = 'month',
      startDate,
      endDate,
      departments,
      metricTypes = ['productivity', 'task_quality', 'trends'],
      groupBy = 'department',
      includeComparisons = true
    } = validation.data;

    const cacheKey = `hr:task-reports:analytics:${this._generateCacheKey(validation.data)}`;
    
    const analytics = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getTaskAnalytics({
        period,
        startDate,
        endDate,
        departments,
        metricTypes,
        groupBy,
        includeComparisons,
        requestedBy: req.user._id
      });
    }, TTL.ANALYTICS);

    return APIResponse.success(res, 'Task analytics retrieved successfully', {
      analytics,
      metadata: {
        period,
        dateRange: { startDate, endDate },
        computedMetrics: metricTypes,
        generatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * GET /api/hr/task-reports?operation=productivity
   * Productivity metrics and benchmarking
   */
  async getProductivityMetrics(req, res) {
    const validation = hrTaskReportsValidator.validateProductivityQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      startDate,
      endDate,
      departments,
      positions,
      benchmarkType = 'department',
      includeIndividualMetrics = false,
      includeTeamComparisons = true
    } = validation.data;

    const cacheKey = `hr:task-reports:productivity:${this._generateCacheKey(validation.data)}`;
    
    const metrics = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getProductivityMetrics({
        startDate,
        endDate,
        departments,
        positions,
        benchmarkType,
        includeIndividualMetrics,
        includeTeamComparisons,
        requestedBy: req.user._id
      });
    }, TTL.ANALYTICS);

    return APIResponse.success(res, 'Productivity metrics retrieved successfully', {
      metrics,
      metadata: {
        dateRange: { startDate, endDate },
        benchmarkType,
        generatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * GET /api/hr/task-reports?operation=insights
   * AI-powered task insights and recommendations
   */
  async getTaskInsights(req, res) {
    const validation = hrTaskReportsValidator.validateInsightsQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      analysisType = 'comprehensive',
      startDate,
      endDate,
      departments,
      focusAreas = ['productivity', 'quality', 'patterns'],
      includeRecommendations = true
    } = validation.data;

    const cacheKey = `hr:task-reports:insights:${this._generateCacheKey(validation.data)}`;
    
    const insights = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getTaskInsights({
        analysisType,
        startDate,
        endDate,
        departments,
        focusAreas,
        includeRecommendations,
        requestedBy: req.user._id
      });
    }, TTL.INSIGHTS);

    return APIResponse.success(res, 'Task insights retrieved successfully', {
      insights,
      metadata: {
        analysisType,
        dateRange: { startDate, endDate },
        focusAreas,
        generatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * POST /api/hr/task-reports?operation=bulk
   * Bulk operations: update, import, analyze, export
   */
  async handleBulkOperations(req, res) {
    const validation = hrTaskReportsValidator.validateBulkOperation(req.body);
    if (!validation.isValid) {
      throw new APIError('Invalid bulk operation data', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const { operation, data, options = {} } = validation.data;

    // Audit log for bulk operations
    const auditEntry = {
      userId: req.user._id,
      userRole: req.user.role,
      operation: `bulk_task_${operation}`,
      affectedRecords: Array.isArray(data) ? data.length : 1,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    let result;
    
    switch (operation) {
      case 'update':
        result = await this.service.bulkUpdateTaskReports(data, {
          ...options,
          auditEntry,
          requestedBy: req.user._id
        });
        break;
      
      case 'import':
        result = await this.service.bulkImportTaskReports(data, {
          ...options,
          auditEntry,
          requestedBy: req.user._id
        });
        break;
      
      case 'analyze':
        result = await this.service.bulkAnalyzeTaskReports(data, {
          ...options,
          auditEntry,
          requestedBy: req.user._id
        });
        break;
      
      case 'categorize':
        result = await this.service.bulkCategorizeTaskReports(data, {
          ...options,
          auditEntry,
          requestedBy: req.user._id
        });
        break;

      default:
        throw new APIError(`Unsupported bulk operation: ${operation}`, 400, 'INVALID_BULK_OPERATION');
    }

    // Invalidate relevant caches
    invalidateTaskReportsCache();

    return APIResponse.success(res, `Bulk ${operation} completed successfully`, {
      result,
      audit: auditEntry,
      metadata: {
        processedAt: new Date().toISOString(),
        processingTime: `${Date.now() - req.startTime}ms`
      }
    });
  }

  /**
   * PUT /api/hr/task-reports?operation=update&recordId=123
   * Update individual task report
   */
  async updateTaskReport(req, res) {
    const { recordId } = req.query;
    
    const validation = hrTaskReportsValidator.validateUpdateRequest({
      recordId,
      ...req.body
    });
    
    if (!validation.isValid) {
      throw new APIError('Invalid update data', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const auditEntry = {
      userId: req.user._id,
      userRole: req.user.role,
      operation: 'update_task_report',
      recordId,
      changes: req.body,
      timestamp: new Date(),
      ipAddress: req.ip
    };

    const result = await this.service.updateTaskReport(recordId, req.body, {
      auditEntry,
      requestedBy: req.user._id
    });

    // Invalidate specific caches
    invalidateTaskReportsCache();

    return APIResponse.success(res, 'Task report updated successfully', {
      record: result,
      audit: auditEntry
    });
  }

  /**
   * POST /api/hr/task-reports?operation=analyze
   * Analyze task patterns and productivity
   */
  async analyzeTaskPatterns(req, res) {
    const validation = hrTaskReportsValidator.validateAnalysisRequest(req.body);
    if (!validation.isValid) {
      throw new APIError('Invalid analysis request', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      analysisType,
      startDate,
      endDate,
      employeeIds,
      departments,
      analysisOptions = {}
    } = validation.data;

    const analysis = await this.service.analyzeTaskPatterns({
      analysisType,
      startDate,
      endDate,
      employeeIds,
      departments,
      analysisOptions,
      requestedBy: req.user._id
    });

    return APIResponse.success(res, 'Task pattern analysis completed successfully', {
      analysis,
      metadata: {
        analysisType,
        dateRange: { startDate, endDate },
        processedAt: new Date().toISOString(),
        processingTime: `${Date.now() - req.startTime}ms`
      }
    });
  }

  /**
   * GET /api/hr/task-reports?operation=export
   * Export task reports data in various formats
   */
  async exportTaskData(req, res) {
    const validation = hrTaskReportsValidator.validateExportQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid export parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      format = 'csv',
      startDate,
      endDate,
      employeeIds,
      departments,
      includeTaskContent = false,
      includeAnalytics = false,
      template = 'standard'
    } = validation.data;

    const exportData = await this.service.exportTaskReportsData({
      format,
      startDate,
      endDate,
      employeeIds,
      departments,
      includeTaskContent,
      includeAnalytics,
      template,
      requestedBy: req.user._id
    });

    // Set appropriate headers for file download
    res.setHeader('Content-Type', this._getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename=task_reports_export_${startDate}_${endDate}.${format}`);
    
    return res.send(exportData);
  }

  // Helper methods
  _generateCacheKey(data) {
    return Object.keys(data)
      .sort()
      .map(key => `${key}:${data[key]}`)
      .join('|');
  }

  _getContentType(format) {
    const contentTypes = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
      pdf: 'application/pdf'
    };
    return contentTypes[format] || 'application/octet-stream';
  }
}

export default new HRTaskReportsController();