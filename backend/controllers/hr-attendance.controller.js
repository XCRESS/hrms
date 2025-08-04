import { HRAttendanceService } from '../services/hr-attendance.service.js';
import { APIResponse } from '../utils/response.js';
import { APIError } from '../utils/errors.js';
import { hrAttendanceValidator } from '../validators/hr-attendance.validator.js';
import cache, { TTL } from '../utils/cache.js';
import { invalidateAttendanceCache } from '../utils/cacheInvalidation.js';

/**
 * Unified HR/Admin Attendance Controller
 * Industry-standard REST API for HR operations
 * 
 * Features:
 * - Single endpoint with query-based operations
 * - Role-based access control (HR/Admin only)
 * - Comprehensive validation and error handling
 * - Performance optimized with caching
 * - Standardized response format
 * - Full audit logging
 */

class HRAttendanceController {
  constructor() {
    this.service = new HRAttendanceService();
  }

  /**
   * Main HR Attendance API Handler
   * GET/POST/PUT /api/hr/attendance
   * 
   * Supports multiple operations through query parameters:
   * - overview: Dashboard statistics and insights
   * - records: Detailed attendance records with filtering
   * - employee: Individual employee attendance analysis
   * - bulk: Bulk operations (update/export)
   * - analytics: Advanced reporting and trends
   */
  async handleAttendanceRequest(req, res, next) {
    try {
      const { method } = req;
      const operation = req.query.operation || 'records';

      // Validate HR/Admin access
      if (!req.user?.role || !['admin', 'hr'].includes(req.user.role)) {
        throw new APIError('Access denied. HR/Admin role required.', 403, 'INSUFFICIENT_PRIVILEGES');
      }

      // Route to appropriate handler based on operation and method
      switch (`${method}:${operation}`) {
        case 'GET:overview':
          return await this.getAttendanceOverview(req, res);
        
        case 'GET:records':
          return await this.getAttendanceRecords(req, res);
        
        case 'GET:employee':
          return await this.getEmployeeAttendance(req, res);
        
        case 'GET:analytics':
          return await this.getAttendanceAnalytics(req, res);
        
        case 'POST:bulk':
          return await this.handleBulkOperations(req, res);
        
        case 'PUT:update':
          return await this.updateAttendanceRecord(req, res);
        
        case 'GET:export':
          return await this.exportAttendanceData(req, res);

        default:
          throw new APIError(`Unsupported operation: ${method}:${operation}`, 400, 'INVALID_OPERATION');
      }

    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/hr/attendance?operation=overview
   * Real-time attendance dashboard for HR
   */
  async getAttendanceOverview(req, res) {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    // Validate input
    const validation = hrAttendanceValidator.validateOverviewQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const cacheKey = `hr:attendance:overview:${date}`;
    
    const overview = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getAttendanceOverview({
        date,
        userRole: req.user.role,
        requestedBy: req.user._id
      });
    }, TTL.DASHBOARD);

    return APIResponse.success(res, 'Attendance overview retrieved successfully', {
      overview,
      metadata: {
        generatedAt: new Date().toISOString(),
        requestedBy: req.user.role,
        cacheStatus: 'hit'
      }
    });
  }

  /**
   * GET /api/hr/attendance?operation=records
   * Comprehensive attendance records with advanced filtering
   */
  async getAttendanceRecords(req, res) {
    // Validate and sanitize query parameters
    const validation = hrAttendanceValidator.validateRecordsQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      startDate,
      endDate,
      employeeIds,
      departments,
      status,
      includeAbsents = true,
      includeWeekends = false,
      includeHolidays = false,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc',
      format = 'detailed'
    } = validation.data;

    // Build cache key for complex queries
    const cacheKey = `hr:attendance:records:${this._generateCacheKey(validation.data)}`;
    
    const result = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getAttendanceRecords({
        startDate,
        endDate,
        employeeIds,
        departments,
        status,
        includeAbsents,
        includeWeekends,
        includeHolidays,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 200), // Max 200 records per request
        sortBy,
        sortOrder,
        format,
        requestedBy: req.user._id
      });
    }, TTL.ATTENDANCE);

    return APIResponse.success(res, 'Attendance records retrieved successfully', {
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
   * GET /api/hr/attendance?operation=employee&employeeId=EMP001
   * Individual employee attendance analysis
   */
  async getEmployeeAttendance(req, res) {
    const validation = hrAttendanceValidator.validateEmployeeQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      employeeId,
      startDate,
      endDate,
      includeAnalytics = true,
      includeRegularizations = true,
      includeTaskReports = false
    } = validation.data;

    const cacheKey = `hr:attendance:employee:${employeeId}:${startDate}:${endDate}`;
    
    const result = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getEmployeeAttendanceDetails({
        employeeId,
        startDate,
        endDate,
        includeAnalytics,
        includeRegularizations,
        includeTaskReports,
        requestedBy: req.user._id
      });
    }, TTL.ATTENDANCE);

    return APIResponse.success(res, 'Employee attendance retrieved successfully', {
      ...result,
      metadata: {
        employeeId,
        dateRange: { startDate, endDate },
        generatedAt: new Date().toISOString()
      }
    });
  }

  /**
   * GET /api/hr/attendance?operation=analytics
   * Advanced attendance analytics and reporting
   */
  async getAttendanceAnalytics(req, res) {
    const validation = hrAttendanceValidator.validateAnalyticsQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid query parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      period = 'month',
      startDate,
      endDate,
      departments,
      metricTypes = ['attendance_rate', 'punctuality', 'trends'],
      groupBy = 'department'
    } = validation.data;

    const cacheKey = `hr:attendance:analytics:${this._generateCacheKey(validation.data)}`;
    
    const analytics = await cache.getOrSet(cacheKey, async () => {
      return await this.service.getAttendanceAnalytics({
        period,
        startDate,
        endDate,
        departments,
        metricTypes,
        groupBy,
        requestedBy: req.user._id
      });
    }, TTL.ANALYTICS);

    return APIResponse.success(res, 'Attendance analytics retrieved successfully', {
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
   * POST /api/hr/attendance?operation=bulk
   * Bulk operations: update, import, process
   */
  async handleBulkOperations(req, res) {
    const validation = hrAttendanceValidator.validateBulkOperation(req.body);
    if (!validation.isValid) {
      throw new APIError('Invalid bulk operation data', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const { operation, data, options = {} } = validation.data;

    // Audit log for bulk operations
    const auditEntry = {
      userId: req.user._id,
      userRole: req.user.role,
      operation: `bulk_${operation}`,
      affectedRecords: Array.isArray(data) ? data.length : 1,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    let result;
    
    switch (operation) {
      case 'update':
        result = await this.service.bulkUpdateAttendance(data, {
          ...options,
          auditEntry,
          requestedBy: req.user._id
        });
        break;
      
      case 'import':
        result = await this.service.bulkImportAttendance(data, {
          ...options,
          auditEntry,
          requestedBy: req.user._id
        });
        break;
      
      case 'regularize':
        result = await this.service.bulkRegularizeAttendance(data, {
          ...options,
          auditEntry,
          requestedBy: req.user._id
        });
        break;

      default:
        throw new APIError(`Unsupported bulk operation: ${operation}`, 400, 'INVALID_BULK_OPERATION');
    }

    // Invalidate relevant caches
    invalidateAttendanceCache();

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
   * PUT /api/hr/attendance?operation=update&recordId=123
   * Update individual attendance record
   */
  async updateAttendanceRecord(req, res) {
    const { recordId } = req.query;
    
    const validation = hrAttendanceValidator.validateUpdateRequest({
      recordId,
      ...req.body
    });
    
    if (!validation.isValid) {
      throw new APIError('Invalid update data', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const auditEntry = {
      userId: req.user._id,
      userRole: req.user.role,
      operation: 'update_attendance',
      recordId,
      changes: req.body,
      timestamp: new Date(),
      ipAddress: req.ip
    };

    const result = await this.service.updateAttendanceRecord(recordId, req.body, {
      auditEntry,
      requestedBy: req.user._id
    });

    // Invalidate specific caches
    invalidateAttendanceCache();

    return APIResponse.success(res, 'Attendance record updated successfully', {
      record: result,
      audit: auditEntry
    });
  }

  /**
   * GET /api/hr/attendance?operation=export
   * Export attendance data in various formats
   */
  async exportAttendanceData(req, res) {
    const validation = hrAttendanceValidator.validateExportQuery(req.query);
    if (!validation.isValid) {
      throw new APIError('Invalid export parameters', 400, 'VALIDATION_ERROR', validation.errors);
    }

    const {
      format = 'csv',
      startDate,
      endDate,
      employeeIds,
      departments,
      includeAnalytics = false
    } = validation.data;

    const exportData = await this.service.exportAttendanceData({
      format,
      startDate,
      endDate,
      employeeIds,
      departments,
      includeAnalytics,
      requestedBy: req.user._id
    });

    // Set appropriate headers for file download
    res.setHeader('Content-Type', this._getContentType(format));
    res.setHeader('Content-Disposition', `attachment; filename=attendance_export_${startDate}_${endDate}.${format}`);
    
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

export default new HRAttendanceController();