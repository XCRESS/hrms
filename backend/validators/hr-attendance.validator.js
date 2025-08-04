import Joi from 'joi';

/**
 * HR Attendance API Validation Layer
 * Industry-standard input validation using Joi
 * 
 * Features:
 * - Comprehensive validation rules
 * - Custom error messages
 * - Type coercion and sanitization
 * - Business rule validation
 * - Security input filtering
 */

class HRAttendanceValidator {
  constructor() {
    // Common validation schemas
    this.commonSchemas = {
      employeeId: Joi.string()
        .pattern(/^EMP\d{3,}$/)
        .message('Employee ID must be in format EMP### (e.g., EMP001)'),
      
      date: Joi.date()
        .iso()
        .max('now')
        .message('Date must be a valid ISO date and not in the future'),
      
      dateRange: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
      }),
      
      pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(200).default(50)
      }),
      
      sorting: Joi.object({
        sortBy: Joi.string()
          .valid('date', 'employeeName', 'status', 'checkIn', 'department')
          .default('date'),
        sortOrder: Joi.string()
          .valid('asc', 'desc')
          .default('desc')
      }),
      
      attendanceStatus: Joi.string()
        .valid('present', 'absent', 'late', 'half-day', 'leave', 'holiday', 'weekend'),
      
      departments: Joi.array()
        .items(Joi.string().min(2).max(50))
        .max(20),
      
      employeeIds: Joi.array()
        .items(this.commonSchemas.employeeId)
        .max(100)
    };

    // Initialize validation schemas
    this.schemas = this._initializeSchemas();
  }

  _initializeSchemas() {
    return {
      overviewQuery: Joi.object({
        date: this.commonSchemas.date.default(() => new Date().toISOString().split('T')[0])
      }).options({ stripUnknown: true }),

      recordsQuery: Joi.object({
        startDate: Joi.date().iso().required()
          .messages({
            'any.required': 'Start date is required',
            'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
          }),
        
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
          .messages({
            'any.required': 'End date is required',
            'date.min': 'End date must be after start date'
          }),
        
        employeeIds: this.commonSchemas.employeeIds,
        departments: this.commonSchemas.departments,
        status: this.commonSchemas.attendanceStatus,
        
        includeAbsents: Joi.boolean().default(true),
        includeWeekends: Joi.boolean().default(false),
        includeHolidays: Joi.boolean().default(false),
        
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(200).default(50),
        
        sortBy: Joi.string()
          .valid('date', 'employeeName', 'status', 'checkIn', 'department', 'workHours')
          .default('date'),
        
        sortOrder: Joi.string()
          .valid('asc', 'desc')
          .default('desc'),
        
        format: Joi.string()
          .valid('detailed', 'summary', 'compact')
          .default('detailed')
      }).options({ stripUnknown: true }),

      employeeQuery: Joi.object({
        employeeId: this.commonSchemas.employeeId.required()
          .messages({
            'any.required': 'Employee ID is required for individual employee queries'
          }),
        
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        
        includeAnalytics: Joi.boolean().default(true),
        includeRegularizations: Joi.boolean().default(true),
        includeTaskReports: Joi.boolean().default(false)
      }).options({ stripUnknown: true }),

      analyticsQuery: Joi.object({
        period: Joi.string()
          .valid('day', 'week', 'month', 'quarter', 'year', 'custom')
          .default('month'),
        
        startDate: Joi.when('period', {
          is: 'custom',
          then: Joi.date().iso().required(),
          otherwise: Joi.date().iso().optional()
        }),
        
        endDate: Joi.when('period', {
          is: 'custom',
          then: Joi.date().iso().min(Joi.ref('startDate')).required(),
          otherwise: Joi.date().iso().optional()
        }),
        
        departments: this.commonSchemas.departments,
        
        metricTypes: Joi.array()
          .items(Joi.string().valid(
            'attendance_rate',
            'punctuality',
            'trends',
            'patterns',
            'compliance',
            'productivity'
          ))
          .min(1)
          .default(['attendance_rate', 'punctuality', 'trends']),
        
        groupBy: Joi.string()
          .valid('department', 'position', 'employee', 'date', 'week', 'month')
          .default('department')
      }).options({ stripUnknown: true }),

      bulkOperation: Joi.object({
        operation: Joi.string()
          .valid('update', 'import', 'regularize', 'export')
          .required()
          .messages({
            'any.required': 'Bulk operation type is required',
            'any.only': 'Operation must be one of: update, import, regularize, export'
          }),
        
        data: Joi.when('operation', {
          switch: [
            {
              is: 'update',
              then: Joi.array().items(
                Joi.object({
                  recordId: Joi.string().required(),
                  employeeId: this.commonSchemas.employeeId,
                  date: this.commonSchemas.date,
                  status: this.commonSchemas.attendanceStatus,
                  checkIn: Joi.date().iso().allow(null),
                  checkOut: Joi.date().iso().allow(null),
                  reason: Joi.string().max(500)
                }).min(1)
              ).min(1).max(100)
            },
            {
              is: 'import',
              then: Joi.array().items(
                Joi.object({
                  employeeId: this.commonSchemas.employeeId.required(),
                  date: this.commonSchemas.date.required(),
                  checkIn: Joi.date().iso().allow(null),
                  checkOut: Joi.date().iso().allow(null),
                  status: this.commonSchemas.attendanceStatus
                })
              ).min(1).max(1000)
            },
            {
              is: 'regularize',
              then: Joi.array().items(
                Joi.object({
                  employeeId: this.commonSchemas.employeeId.required(),
                  date: this.commonSchemas.date.required(),
                  regularizationType: Joi.string()
                    .valid('missing_checkin', 'missing_checkout', 'wrong_timing', 'system_error')
                    .required(),
                  reason: Joi.string().min(10).max(500).required(),
                  proposedCheckIn: Joi.date().iso().allow(null),
                  proposedCheckOut: Joi.date().iso().allow(null)
                })
              ).min(1).max(50)
            }
          ]
        }).required(),
        
        options: Joi.object({
          validateOnly: Joi.boolean().default(false),
          skipDuplicates: Joi.boolean().default(true),
          sendNotifications: Joi.boolean().default(true),
          batchSize: Joi.number().integer().min(10).max(100).default(50)
        }).default({})
      }).options({ stripUnknown: true }),

      updateRequest: Joi.object({
        recordId: Joi.alternatives()
          .try(
            Joi.string().pattern(/^[0-9a-fA-F]{24}$/), // MongoDB ObjectId
            Joi.string().valid('new') // For creating new records
          )
          .required(),
        
        employeeId: Joi.when('recordId', {
          is: 'new',
          then: this.commonSchemas.employeeId.required(),
          otherwise: this.commonSchemas.employeeId.optional()
        }),
        
        date: Joi.when('recordId', {
          is: 'new',
          then: this.commonSchemas.date.required(),
          otherwise: this.commonSchemas.date.optional()
        }),
        
        status: this.commonSchemas.attendanceStatus,
        
        checkIn: Joi.date().iso().allow(null)
          .when('status', {
            is: 'absent',
            then: Joi.valid(null),
            otherwise: Joi.optional()
          }),
        
        checkOut: Joi.date().iso().allow(null)
          .when('checkIn', {
            is: Joi.exist(),
            then: Joi.date().iso().min(Joi.ref('checkIn')).allow(null),
            otherwise: Joi.allow(null)
          }),
        
        reason: Joi.string().max(500),
        comments: Joi.string().max(1000),
        
        location: Joi.object({
          latitude: Joi.number().min(-90).max(90),
          longitude: Joi.number().min(-180).max(180)
        }),
        
        manualEntry: Joi.boolean().default(true),
        approvedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
      }).options({ stripUnknown: true }),

      exportQuery: Joi.object({
        format: Joi.string()
          .valid('csv', 'xlsx', 'json', 'pdf')
          .default('csv'),
        
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        
        employeeIds: this.commonSchemas.employeeIds,
        departments: this.commonSchemas.departments,
        
        includeAnalytics: Joi.boolean().default(false),
        includeTaskReports: Joi.boolean().default(false),
        includeRegularizations: Joi.boolean().default(false),
        
        template: Joi.string()
          .valid('standard', 'payroll', 'compliance', 'summary')
          .default('standard'),
        
        compression: Joi.string()
          .valid('none', 'zip', 'gzip')
          .default('none')
      }).options({ stripUnknown: true })
    };
  }

  // Validation methods
  validateOverviewQuery(data) {
    return this._validate(this.schemas.overviewQuery, data);
  }

  validateRecordsQuery(data) {
    return this._validate(this.schemas.recordsQuery, data);
  }

  validateEmployeeQuery(data) {
    return this._validate(this.schemas.employeeQuery, data);
  }

  validateAnalyticsQuery(data) {
    return this._validate(this.schemas.analyticsQuery, data);
  }

  validateBulkOperation(data) {
    return this._validate(this.schemas.bulkOperation, data);
  }

  validateUpdateRequest(data) {
    return this._validate(this.schemas.updateRequest, data);
  }

  validateExportQuery(data) {
    return this._validate(this.schemas.exportQuery, data);
  }

  // Custom validations
  validateBusinessRules(data, operation) {
    const errors = [];

    switch (operation) {
      case 'attendance_update':
        errors.push(...this._validateAttendanceBusinessRules(data));
        break;
      
      case 'date_range':
        errors.push(...this._validateDateRangeBusinessRules(data));
        break;
      
      case 'bulk_operation':
        errors.push(...this._validateBulkOperationBusinessRules(data));
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private helper methods
  _validate(schema, data) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })),
        data: null
      };
    }

    return {
      isValid: true,
      errors: [],
      data: value
    };
  }

  _validateAttendanceBusinessRules(data) {
    const errors = [];
    
    // Check-out must be after check-in
    if (data.checkIn && data.checkOut) {
      const checkInTime = new Date(data.checkIn);
      const checkOutTime = new Date(data.checkOut);
      
      if (checkOutTime <= checkInTime) {
        errors.push({
          field: 'checkOut',
          message: 'Check-out time must be after check-in time',
          code: 'INVALID_TIME_SEQUENCE'
        });
      }
      
      // Maximum work hours validation (e.g., 16 hours)
      const workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      if (workHours > 16) {
        errors.push({
          field: 'workHours',
          message: 'Work hours cannot exceed 16 hours per day',
          code: 'EXCESSIVE_WORK_HOURS'
        });
      }
    }
    
    // Status consistency validation
    if (data.status === 'absent' && (data.checkIn || data.checkOut)) {
      errors.push({
        field: 'status',
        message: 'Absent status cannot have check-in or check-out times',
        code: 'STATUS_INCONSISTENCY'
      });
    }
    
    return errors;
  }

  _validateDateRangeBusinessRules(data) {
    const errors = [];
    
    // Maximum date range validation
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      
      if (diffDays > 365) {
        errors.push({
          field: 'dateRange',
          message: 'Date range cannot exceed 365 days',
          code: 'DATE_RANGE_TOO_LARGE'
        });
      }
    }
    
    return errors;
  }

  _validateBulkOperationBusinessRules(data) {
    const errors = [];
    
    // Bulk operation size limits
    const maxSizes = {
      update: 100,
      import: 1000,
      regularize: 50,
      export: 10000
    };
    
    if (data.data && Array.isArray(data.data)) {
      const maxSize = maxSizes[data.operation] || 100;
      if (data.data.length > maxSize) {
        errors.push({
          field: 'data',
          message: `Bulk ${data.operation} cannot exceed ${maxSize} records`,
          code: 'BULK_SIZE_EXCEEDED'
        });
      }
    }
    
    return errors;
  }

  // Sanitization methods
  sanitizeInput(data) {
    // Remove potential XSS and injection attempts
    const sanitized = JSON.parse(JSON.stringify(data));
    
    this._sanitizeStringFields(sanitized);
    this._sanitizeDateFields(sanitized);
    
    return sanitized;
  }

  _sanitizeStringFields(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential script tags and SQL injection attempts
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/['";\\]/g, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this._sanitizeStringFields(obj[key]);
      }
    }
  }

  _sanitizeDateFields(obj) {
    const dateFields = ['date', 'startDate', 'endDate', 'checkIn', 'checkOut'];
    
    for (const field of dateFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        // Ensure date is in valid ISO format
        try {
          const date = new Date(obj[field]);
          if (!isNaN(date.getTime())) {
            obj[field] = date.toISOString();
          }
        } catch (error) {
          delete obj[field]; // Remove invalid dates
        }
      }
    }
  }
}

export const hrAttendanceValidator = new HRAttendanceValidator();