import Joi from 'joi';

/**
 * HR Task Reports API Validation Layer
 * Industry-standard input validation using Joi
 * 
 * Features:
 * - Comprehensive validation rules for task reports
 * - Custom error messages and business rules
 * - Type coercion and sanitization
 * - Productivity and quality validation
 * - Security input filtering
 */

class HRTaskReportsValidator {
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
          .valid('date', 'employeeName', 'taskCount', 'productivityScore', 'department')
          .default('date'),
        sortOrder: Joi.string()
          .valid('asc', 'desc')
          .default('desc')
      }),
      
      departments: Joi.array()
        .items(Joi.string().min(2).max(50))
        .max(20),
      
      employeeIds: Joi.array()
        .items(this.employeeId)
        .max(100),
      
      taskCategories: Joi.array()
        .items(Joi.string().valid(
          'development', 'testing', 'documentation', 'meeting', 
          'review', 'planning', 'research', 'support', 'admin', 'other'
        ))
        .max(10),
      
      productivityLevel: Joi.string()
        .valid('high', 'medium', 'low', 'all')
        .default('all'),
      
      period: Joi.string()
        .valid('today', 'week', 'month', 'quarter', 'year', 'custom')
        .default('month')
    };

    // Initialize validation schemas
    this.schemas = this._initializeSchemas();
  }

  _initializeSchemas() {
    return {
      overviewQuery: Joi.object({
        date: this.commonSchemas.date.default(() => new Date().toISOString().split('T')[0]),
        period: this.commonSchemas.period
      }).options({ stripUnknown: true }),

      reportsQuery: Joi.object({
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
        taskCategories: this.commonSchemas.taskCategories,
        productivityLevel: this.commonSchemas.productivityLevel,
        
        hasTaskReports: Joi.string()
          .valid('true', 'false', 'all')
          .default('all')
          .messages({
            'any.only': 'hasTaskReports must be true, false, or all'
          }),
        
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(200).default(50),
        
        sortBy: Joi.string()
          .valid('date', 'employeeName', 'taskCount', 'productivityScore', 'qualityScore', 'department')
          .default('date'),
        
        sortOrder: Joi.string()
          .valid('asc', 'desc')
          .default('desc'),
        
        format: Joi.string()
          .valid('detailed', 'summary', 'compact')
          .default('detailed'),
        
        includeTaskContent: Joi.boolean().default(false)
          .messages({
            'boolean.base': 'includeTaskContent must be a boolean value'
          })
      }).options({ stripUnknown: true }),

      employeeQuery: Joi.object({
        employeeId: this.commonSchemas.employeeId.required()
          .messages({
            'any.required': 'Employee ID is required for individual employee queries'
          }),
        
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        
        includeAnalytics: Joi.boolean().default(true),
        includeProductivityTrends: Joi.boolean().default(true),
        includeTaskCategories: Joi.boolean().default(true),
        includeComparisons: Joi.boolean().default(false)
      }).options({ stripUnknown: true }),

      analyticsQuery: Joi.object({
        period: this.commonSchemas.period,
        
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
            'productivity',
            'task_quality',
            'trends',
            'patterns',
            'categories',
            'correlations'
          ))
          .min(1)
          .default(['productivity', 'task_quality', 'trends']),
        
        groupBy: Joi.string()
          .valid('department', 'position', 'employee', 'date', 'week', 'month')
          .default('department'),
        
        includeComparisons: Joi.boolean().default(true)
      }).options({ stripUnknown: true }),

      productivityQuery: Joi.object({
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        
        departments: this.commonSchemas.departments,
        
        positions: Joi.array()
          .items(Joi.string().min(2).max(50))
          .max(20),
        
        benchmarkType: Joi.string()
          .valid('department', 'position', 'company', 'individual')
          .default('department'),
        
        includeIndividualMetrics: Joi.boolean().default(false),
        includeTeamComparisons: Joi.boolean().default(true)
      }).options({ stripUnknown: true }),

      insightsQuery: Joi.object({
        analysisType: Joi.string()
          .valid('comprehensive', 'focused', 'comparative', 'predictive')
          .default('comprehensive'),
        
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        
        departments: this.commonSchemas.departments,
        
        focusAreas: Joi.array()
          .items(Joi.string().valid(
            'productivity',
            'quality', 
            'patterns',
            'engagement',
            'efficiency',
            'collaboration'
          ))
          .min(1)
          .default(['productivity', 'quality', 'patterns']),
        
        includeRecommendations: Joi.boolean().default(true)
      }).options({ stripUnknown: true }),

      bulkOperation: Joi.object({
        operation: Joi.string()
          .valid('update', 'import', 'analyze', 'categorize', 'export')
          .required()
          .messages({
            'any.required': 'Bulk operation type is required',
            'any.only': 'Operation must be one of: update, import, analyze, categorize, export'
          }),
        
        data: Joi.when('operation', {
          switch: [
            {
              is: 'update',
              then: Joi.array().items(
                Joi.object({
                  recordId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
                  employeeId: this.commonSchemas.employeeId,
                  date: this.commonSchemas.date,
                  tasks: Joi.array().items(Joi.string().min(5).max(500)).max(20),
                  category: Joi.string().valid(...this.commonSchemas.taskCategories.items[0].allow()),
                  productivityScore: Joi.number().min(0).max(100),
                  qualityScore: Joi.number().min(0).max(100),
                  notes: Joi.string().max(1000)
                }).min(1)
              ).min(1).max(100)
            },
            {
              is: 'import',
              then: Joi.array().items(
                Joi.object({
                  employeeId: this.commonSchemas.employeeId.required(),
                  date: this.commonSchemas.date.required(),
                  tasks: Joi.array().items(Joi.string().min(5).max(500)).min(1).max(20).required(),
                  category: Joi.string().valid(...this.commonSchemas.taskCategories.items[0].allow()),
                  notes: Joi.string().max(1000)
                })
              ).min(1).max(500)
            },
            {
              is: 'analyze',
              then: Joi.object({
                analysisType: Joi.string()
                  .valid('productivity_patterns', 'task_quality_trends', 'work_distribution', 'time_patterns')
                  .required(),
                employeeIds: this.commonSchemas.employeeIds,
                departments: this.commonSchemas.departments,
                startDate: Joi.date().iso().required(),
                endDate: Joi.date().iso().min(Joi.ref('startDate')).required()
              })
            },
            {
              is: 'categorize',
              then: Joi.array().items(
                Joi.object({
                  recordId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
                  suggestedCategory: Joi.string().valid(...this.commonSchemas.taskCategories.items[0].allow()).required(),
                  confidence: Joi.number().min(0).max(1)
                })
              ).min(1).max(200)
            }
          ]
        }).required(),
        
        options: Joi.object({
          validateOnly: Joi.boolean().default(false),
          skipDuplicates: Joi.boolean().default(true),
          sendNotifications: Joi.boolean().default(false),
          batchSize: Joi.number().integer().min(10).max(100).default(50),
          autoCategorizeTasks: Joi.boolean().default(false),
          calculateProductivityScores: Joi.boolean().default(true)
        }).default({})
      }).options({ stripUnknown: true }),

      updateRequest: Joi.object({
        recordId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
          .messages({
            'string.pattern.base': 'Record ID must be a valid MongoDB ObjectId',
            'any.required': 'Record ID is required'
          }),
        
        employeeId: this.commonSchemas.employeeId,
        date: this.commonSchemas.date,
        
        tasks: Joi.array()
          .items(Joi.string().min(5).max(500).messages({
            'string.min': 'Each task must be at least 5 characters long',
            'string.max': 'Each task cannot exceed 500 characters'
          }))
          .min(1)
          .max(20)
          .messages({
            'array.min': 'At least one task is required',
            'array.max': 'Maximum 20 tasks allowed per report'
          }),
        
        category: Joi.string().valid(...this.commonSchemas.taskCategories.items[0].allow()),
        
        productivityScore: Joi.number().min(0).max(100)
          .messages({
            'number.min': 'Productivity score must be between 0 and 100',
            'number.max': 'Productivity score must be between 0 and 100'
          }),
        
        qualityScore: Joi.number().min(0).max(100)
          .messages({
            'number.min': 'Quality score must be between 0 and 100',
            'number.max': 'Quality score must be between 0 and 100'
          }),
        
        notes: Joi.string().max(1000)
          .messages({
            'string.max': 'Notes cannot exceed 1000 characters'
          }),
        
        status: Joi.string()
          .valid('draft', 'submitted', 'reviewed', 'approved')
          .default('submitted'),
        
        reviewedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
        reviewNotes: Joi.string().max(500)
      }).options({ stripUnknown: true }),

      analysisRequest: Joi.object({
        analysisType: Joi.string()
          .valid('productivity_patterns', 'task_quality_trends', 'work_distribution', 'time_patterns', 'performance_correlation')
          .required(),
        
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        
        employeeIds: this.commonSchemas.employeeIds,
        departments: this.commonSchemas.departments,
        
        analysisOptions: Joi.object({
          groupBy: Joi.string().valid('day', 'week', 'month', 'department', 'position'),
          includeCorrelations: Joi.boolean().default(true),
          includeComparisons: Joi.boolean().default(true),
          minDataPoints: Joi.number().integer().min(1).max(1000).default(10),
          confidenceThreshold: Joi.number().min(0).max(1).default(0.7)
        }).default({})
      }).options({ stripUnknown: true }),

      exportQuery: Joi.object({
        format: Joi.string()
          .valid('csv', 'xlsx', 'json', 'pdf')
          .default('csv'),
        
        startDate: Joi.date().iso().required(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
        
        employeeIds: this.commonSchemas.employeeIds,
        departments: this.commonSchemas.departments,
        
        includeTaskContent: Joi.boolean().default(false),
        includeAnalytics: Joi.boolean().default(false),
        includeProductivityScores: Joi.boolean().default(true),
        includeQualityScores: Joi.boolean().default(true),
        
        template: Joi.string()
          .valid('standard', 'detailed', 'summary', 'analytics', 'management')
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

  validateReportsQuery(data) {
    return this._validate(this.schemas.reportsQuery, data);
  }

  validateEmployeeQuery(data) {
    return this._validate(this.schemas.employeeQuery, data);
  }

  validateAnalyticsQuery(data) {
    return this._validate(this.schemas.analyticsQuery, data);
  }

  validateProductivityQuery(data) {
    return this._validate(this.schemas.productivityQuery, data);
  }

  validateInsightsQuery(data) {
    return this._validate(this.schemas.insightsQuery, data);
  }

  validateBulkOperation(data) {
    return this._validate(this.schemas.bulkOperation, data);
  }

  validateUpdateRequest(data) {
    return this._validate(this.schemas.updateRequest, data);
  }

  validateAnalysisRequest(data) {
    return this._validate(this.schemas.analysisRequest, data);
  }

  validateExportQuery(data) {
    return this._validate(this.schemas.exportQuery, data);
  }

  // Custom business rule validations
  validateBusinessRules(data, operation) {
    const errors = [];

    switch (operation) {
      case 'task_report_update':
        errors.push(...this._validateTaskReportBusinessRules(data));
        break;
      
      case 'productivity_analysis':
        errors.push(...this._validateProductivityAnalysisRules(data));
        break;
      
      case 'bulk_operation':
        errors.push(...this._validateBulkOperationBusinessRules(data));
        break;
      
      case 'date_range':
        errors.push(...this._validateDateRangeBusinessRules(data));
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

  _validateTaskReportBusinessRules(data) {
    const errors = [];
    
    // Task content validation
    if (data.tasks && Array.isArray(data.tasks)) {
      const duplicateTasks = this._findDuplicateTasks(data.tasks);
      if (duplicateTasks.length > 0) {
        errors.push({
          field: 'tasks',
          message: 'Duplicate tasks found in report',
          code: 'DUPLICATE_TASKS',
          duplicates: duplicateTasks
        });
      }

      // Task quality validation
      const lowQualityTasks = data.tasks.filter(task => 
        task.length < 10 || !/\b(completed|done|finished|implemented|fixed|resolved)\b/i.test(task)
      );
      
      if (lowQualityTasks.length > data.tasks.length * 0.5) {
        errors.push({
          field: 'tasks',
          message: 'More than 50% of tasks appear to be low quality or incomplete',
          code: 'LOW_QUALITY_TASKS'
        });
      }
    }

    // Productivity score validation
    if (data.productivityScore && data.qualityScore) {
      const scoreDifference = Math.abs(data.productivityScore - data.qualityScore);
      if (scoreDifference > 30) {
        errors.push({
          field: 'scores',
          message: 'Large discrepancy between productivity and quality scores may indicate data inconsistency',
          code: 'SCORE_INCONSISTENCY'
        });
      }
    }

    return errors;
  }

  _validateProductivityAnalysisRules(data) {
    const errors = [];
    
    // Minimum data points for reliable analysis
    if (data.employeeIds && data.employeeIds.length < 3) {
      errors.push({
        field: 'employeeIds',
        message: 'Minimum 3 employees required for meaningful productivity analysis',
        code: 'INSUFFICIENT_DATA_POINTS'
      });
    }

    // Date range for trends analysis
    if (data.analysisType === 'trends' && data.startDate && data.endDate) {
      const diffDays = (new Date(data.endDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        errors.push({
          field: 'dateRange',
          message: 'Minimum 7 days required for trend analysis',
          code: 'INSUFFICIENT_DATE_RANGE'
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
      import: 500,
      analyze: 1000,
      categorize: 200,
      export: 5000
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

    // Import validation
    if (data.operation === 'import' && data.data) {
      const invalidRecords = data.data.filter(record => 
        !record.tasks || record.tasks.length === 0
      );
      
      if (invalidRecords.length > 0) {
        errors.push({
          field: 'data',
          message: `${invalidRecords.length} records are missing required task data`,
          code: 'INVALID_IMPORT_DATA'
        });
      }
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

      // Future date validation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (end > today) {
        errors.push({
          field: 'endDate',
          message: 'End date cannot be in the future',
          code: 'FUTURE_DATE_NOT_ALLOWED'
        });
      }
    }
    
    return errors;
  }

  _findDuplicateTasks(tasks) {
    const taskCounts = {};
    const duplicates = [];
    
    tasks.forEach(task => {
      const normalizedTask = task.toLowerCase().trim();
      taskCounts[normalizedTask] = (taskCounts[normalizedTask] || 0) + 1;
      
      if (taskCounts[normalizedTask] === 2) {
        duplicates.push(task);
      }
    });
    
    return duplicates;
  }

  // Sanitization methods
  sanitizeInput(data) {
    const sanitized = JSON.parse(JSON.stringify(data));
    
    this._sanitizeStringFields(sanitized);
    this._sanitizeDateFields(sanitized);
    this._sanitizeTaskContent(sanitized);
    
    return sanitized;
  }

  _sanitizeStringFields(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential script tags and harmful content
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this._sanitizeStringFields(obj[key]);
      }
    }
  }

  _sanitizeDateFields(obj) {
    const dateFields = ['date', 'startDate', 'endDate'];
    
    for (const field of dateFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        try {
          const date = new Date(obj[field]);
          if (!isNaN(date.getTime())) {
            obj[field] = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        } catch (error) {
          delete obj[field];
        }
      }
    }
  }

  _sanitizeTaskContent(obj) {
    if (obj.tasks && Array.isArray(obj.tasks)) {
      obj.tasks = obj.tasks.map(task => {
        if (typeof task === 'string') {
          return task
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .substring(0, 500); // Limit length
        }
        return task;
      }).filter(task => task && task.length > 0);
    }
  }
}

export const hrTaskReportsValidator = new HRTaskReportsValidator();