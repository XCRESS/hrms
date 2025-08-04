import TaskReport from '../models/TaskReport.model.js';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import { APIError } from '../utils/errors.js';
import cache, { TTL } from '../utils/cache.js';

/**
 * HR Task Reports Service Layer
 * Business logic for all HR task report operations
 * 
 * Features:
 * - Advanced task analytics and productivity metrics
 * - AI-powered insights and pattern recognition
 * - Performance benchmarking and comparisons
 * - Bulk operations with transaction support
 * - Task categorization and quality analysis
 * - Export capabilities with multiple formats
 */

export class HRTaskReportsService {
  constructor() {
    this.batchSize = 100;
    this.maxDateRange = 365;
    this.taskCategories = [
      'development', 'testing', 'documentation', 'meeting', 
      'review', 'planning', 'research', 'support', 'admin', 'other'
    ];
    this.productivityThresholds = {
      high: 0.8,
      medium: 0.6,
      low: 0.4
    };
  }

  /**
   * Get comprehensive task reports overview for HR dashboard
   */
  async getTaskReportsOverview({ date, period, userRole, requestedBy }) {
    const { startDate, endDate } = this._parsePeriod(period, date);

    // Parallel execution for performance
    const [
      taskReports,
      attendanceRecords,
      allActiveEmployees,
      previousPeriodData
    ] = await Promise.all([
      this._getTaskReportsInRange(startDate, endDate),
      this._getAttendanceInRange(startDate, endDate),
      this._getActiveEmployees(),
      this._getPreviousPeriodData(startDate, endDate, period)
    ]);

    // Calculate comprehensive statistics
    const stats = this._calculateOverviewStats({
      taskReports,
      attendanceRecords,
      allActiveEmployees,
      previousPeriodData,
      period
    });

    // Generate insights and productivity analysis
    const insights = this._generateTaskInsights(stats, taskReports);
    const productivity = this._calculateProductivityMetrics(taskReports, attendanceRecords);
    const trends = this._analyzeTrends(stats, previousPeriodData);

    return {
      period,
      dateRange: { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] },
      statistics: stats,
      productivity,
      insights,
      trends,
      topPerformers: this._identifyTopPerformers(taskReports, attendanceRecords),
      alerts: this._generateTaskAlerts(stats, productivity),
      quickActions: this._getQuickActions(stats),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get filtered task reports with advanced options
   */
  async getTaskReports(options) {
    const {
      startDate,
      endDate,
      employeeIds,
      departments,
      taskCategories,
      productivityLevel,
      hasTaskReports,
      page,
      limit,
      sortBy,
      sortOrder,
      format,
      includeTaskContent
    } = options;

    // Validate date range
    this._validateDateRange(startDate, endDate);

    // Build optimized query
    const query = await this._buildTaskReportsQuery({
      startDate,
      endDate,
      employeeIds,
      departments,
      taskCategories,
      productivityLevel,
      hasTaskReports
    });

    // Execute paginated query with population
    const [reports, total, metadata] = await Promise.all([
      this._executeTaskReportsQuery(query, { page, limit, sortBy, sortOrder, includeTaskContent }),
      this._getTaskReportsCount(query),
      this._getQueryMetadata({ startDate, endDate, employeeIds, departments })
    ]);

    // Enrich reports with additional data
    const enrichedReports = await this._enrichTaskReports(reports, {
      includeProductivityScores: format === 'detailed',
      includeTaskAnalysis: format === 'detailed',
      includeTrends: format === 'detailed'
    });

    return {
      reports: enrichedReports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      metadata,
      statistics: this._calculateReportsStatistics(enrichedReports),
      summary: this._generateReportsSummary(enrichedReports)
    };
  }

  /**
   * Get detailed employee task reports analysis
   */
  async getEmployeeTaskReportsDetails(options) {
    const {
      employeeId,
      startDate,
      endDate,
      includeAnalytics,
      includeProductivityTrends,
      includeTaskCategories,
      includeComparisons
    } = options;

    // Validate employee exists and is active
    const employee = await Employee.findOne({ 
      employeeId, 
      isActive: true 
    }).lean();

    if (!employee) {
      throw new APIError('Employee not found or inactive', 404, 'EMPLOYEE_NOT_FOUND');
    }

    // Parallel data fetching
    const [
      taskReports,
      attendanceRecords,
      departmentAverages,
      previousPeriodData
    ] = await Promise.all([
      this._getEmployeeTaskReports(employee._id, startDate, endDate),
      this._getEmployeeAttendance(employee._id, startDate, endDate),
      includeComparisons ? this._getDepartmentAverages(employee.department, startDate, endDate) : null,
      includeProductivityTrends ? this._getEmployeePreviousPeriodData(employee._id, startDate, endDate) : null
    ]);

    // Generate comprehensive analysis
    const analysis = includeAnalytics ? 
      await this._generateEmployeeTaskAnalysis(employee, {
        taskReports,
        attendanceRecords,
        startDate,
        endDate,
        departmentAverages,
        previousPeriodData
      }) : null;

    // Build productivity timeline
    const productivityTimeline = includeProductivityTrends ?
      this._buildProductivityTimeline(taskReports, attendanceRecords) : null;

    // Categorize tasks
    const taskCategorization = includeTaskCategories ?
      this._categorizeEmployeeTasks(taskReports) : null;

    return {
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        position: employee.position,
        joiningDate: employee.joiningDate
      },
      dateRange: { startDate, endDate },
      reports: taskReports,
      attendance: attendanceRecords,
      analysis,
      productivityTimeline,
      taskCategorization,
      comparisons: includeComparisons ? {
        departmentAverages,
        ranking: this._calculateEmployeeRanking(employee, analysis, departmentAverages)
      } : undefined,
      summary: this._generateEmployeeTaskSummary(taskReports, analysis),
      recommendations: this._generateEmployeeRecommendations(analysis, taskCategorization)
    };
  }

  /**
   * Generate advanced task analytics
   */
  async getTaskAnalytics(options) {
    const {
      period,
      startDate,
      endDate,
      departments,
      metricTypes,
      groupBy,
      includeComparisons
    } = options;

    const analytics = {};

    // Execute requested analytics
    for (const metricType of metricTypes) {
      switch (metricType) {
        case 'productivity':
          analytics.productivity = await this._calculateProductivityAnalytics({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'task_quality':
          analytics.taskQuality = await this._calculateTaskQualityAnalytics({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'trends':
          analytics.trends = await this._calculateTaskTrends({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'patterns':
          analytics.patterns = await this._identifyTaskPatterns({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'categories':
          analytics.categories = await this._analyzeTaskCategories({
            period, startDate, endDate, departments, groupBy
          });
          break;

        case 'correlations':
          analytics.correlations = await this._calculateTaskAttendanceCorrelations({
            period, startDate, endDate, departments, groupBy
          });
          break;
      }
    }

    // Add comparisons if requested
    if (includeComparisons) {
      analytics.comparisons = await this._generateAnalyticsComparisons(analytics, {
        period, startDate, endDate, departments, groupBy
      });
    }

    return {
      period,
      dateRange: { startDate, endDate },
      groupBy,
      metrics: analytics,
      insights: this._generateAnalyticsInsights(analytics),
      recommendations: this._generateAnalyticsRecommendations(analytics),
      benchmarks: this._calculateBenchmarks(analytics),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get productivity metrics and benchmarking
   */
  async getProductivityMetrics(options) {
    const {
      startDate,
      endDate,
      departments,
      positions,
      benchmarkType,
      includeIndividualMetrics,
      includeTeamComparisons
    } = options;

    // Get comprehensive productivity data
    const [
      taskReports,
      attendanceRecords,
      employeeData
    ] = await Promise.all([
      this._getTaskReportsInRange(new Date(startDate), new Date(endDate)),
      this._getAttendanceInRange(new Date(startDate), new Date(endDate)),
      this._getEmployeesByFilters({ departments, positions })
    ]);

    // Calculate individual productivity metrics
    const individualMetrics = includeIndividualMetrics ?
      this._calculateIndividualProductivityMetrics(taskReports, attendanceRecords, employeeData) : null;

    // Calculate team/department metrics
    const teamMetrics = includeTeamComparisons ?
      this._calculateTeamProductivityMetrics(taskReports, attendanceRecords, employeeData, benchmarkType) : null;

    // Generate benchmarks
    const benchmarks = this._calculateProductivityBenchmarks(taskReports, attendanceRecords, benchmarkType);

    // Identify top and bottom performers
    const performance = this._analyzeProductivityPerformance(individualMetrics, teamMetrics);

    return {
      dateRange: { startDate, endDate },
      benchmarkType,
      overallMetrics: this._calculateOverallProductivityMetrics(taskReports, attendanceRecords),
      individualMetrics,
      teamMetrics,
      benchmarks,
      performance,
      trends: this._calculateProductivityTrends(taskReports, attendanceRecords),
      insights: this._generateProductivityInsights(performance, benchmarks),
      recommendations: this._generateProductivityRecommendations(performance, trends)
    };
  }

  /**
   * Get AI-powered task insights and recommendations
   */
  async getTaskInsights(options) {
    const {
      analysisType,
      startDate,
      endDate,
      departments,
      focusAreas,
      includeRecommendations
    } = options;

    // Get comprehensive data for analysis
    const [
      taskReports,
      attendanceRecords,
      employeeData,
      historicalData
    ] = await Promise.all([
      this._getTaskReportsInRange(new Date(startDate), new Date(endDate)),
      this._getAttendanceInRange(new Date(startDate), new Date(endDate)),
      this._getActiveEmployees(),
      this._getHistoricalTaskData(new Date(startDate), new Date(endDate))
    ]);

    const insights = {};

    // Generate insights for each focus area
    for (const area of focusAreas) {
      switch (area) {
        case 'productivity':
          insights.productivity = this._generateProductivityInsights(taskReports, attendanceRecords);
          break;

        case 'quality':
          insights.quality = this._generateQualityInsights(taskReports);
          break;

        case 'patterns':
          insights.patterns = this._generatePatternInsights(taskReports, historicalData);
          break;

        case 'engagement':
          insights.engagement = this._generateEngagementInsights(taskReports, attendanceRecords);
          break;

        case 'efficiency':
          insights.efficiency = this._generateEfficiencyInsights(taskReports, attendanceRecords);
          break;

        case 'collaboration':
          insights.collaboration = this._generateCollaborationInsights(taskReports);
          break;
      }
    }

    // Generate AI-powered recommendations
    const recommendations = includeRecommendations ?
      this._generateAIRecommendations(insights, analysisType) : null;

    // Calculate confidence scores for insights
    const confidenceScores = this._calculateInsightConfidence(insights, taskReports.length);

    return {
      analysisType,
      dateRange: { startDate, endDate },
      focusAreas,
      insights,
      recommendations,
      confidenceScores,
      actionableItems: this._generateActionableItems(insights, recommendations),
      riskFactors: this._identifyRiskFactors(insights),
      opportunities: this._identifyOpportunities(insights),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Bulk update task reports with transaction support
   */
  async bulkUpdateTaskReports(updates, options) {
    const { auditEntry, requestedBy } = options;
    const results = { success: [], failed: [], summary: {} };

    // Process in batches for performance
    const batches = this._createBatches(updates, this.batchSize);
    
    for (const batch of batches) {
      try {
        const batchResults = await this._processBulkUpdateBatch(batch, {
          auditEntry,
          requestedBy
        });
        
        results.success.push(...batchResults.success);
        results.failed.push(...batchResults.failed);
      } catch (error) {
        console.error('Bulk task update batch failed:', error);
        results.failed.push(...batch.map(update => ({
          ...update,
          error: error.message
        })));
      }
    }

    results.summary = {
      totalUpdates: updates.length,
      successful: results.success.length,
      failed: results.failed.length,
      successRate: ((results.success.length / updates.length) * 100).toFixed(2) + '%'
    };

    return results;
  }

  /**
   * Analyze task patterns and productivity trends
   */
  async analyzeTaskPatterns(options) {
    const {
      analysisType,
      startDate,
      endDate,
      employeeIds,
      departments,
      analysisOptions
    } = options;

    // Get comprehensive data for analysis
    const [
      taskReports,
      attendanceRecords,
      employeeData
    ] = await Promise.all([
      this._getFilteredTaskReports({ startDate, endDate, employeeIds, departments }),
      this._getFilteredAttendance({ startDate, endDate, employeeIds, departments }),
      this._getEmployeesByIds(employeeIds)
    ]);

    let analysis;

    switch (analysisType) {
      case 'productivity_patterns':
        analysis = this._analyzeProductivityPatterns(taskReports, attendanceRecords, analysisOptions);
        break;

      case 'task_quality_trends':
        analysis = this._analyzeTaskQualityTrends(taskReports, analysisOptions);
        break;

      case 'work_distribution':
        analysis = this._analyzeWorkDistribution(taskReports, employeeData, analysisOptions);
        break;

      case 'time_patterns':
        analysis = this._analyzeTimePatterns(taskReports, attendanceRecords, analysisOptions);
        break;

      case 'performance_correlation':
        analysis = this._analyzePerformanceCorrelation(taskReports, attendanceRecords, analysisOptions);
        break;

      default:
        analysis = this._performComprehensiveAnalysis(taskReports, attendanceRecords, employeeData, analysisOptions);
    }

    return {
      analysisType,
      dateRange: { startDate, endDate },
      dataPoints: {
        taskReports: taskReports.length,
        attendanceRecords: attendanceRecords.length,
        employees: employeeData.length
      },
      analysis,
      insights: this._extractAnalysisInsights(analysis),
      recommendations: this._generateAnalysisRecommendations(analysis),
      confidence: this._calculateAnalysisConfidence(analysis, taskReports.length),
      generatedAt: new Date().toISOString()
    };
  }

  // Private helper methods
  _parsePeriod(period, date) {
    const targetDate = new Date(date);
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = new Date(targetDate);
        endDate = new Date(targetDate);
        break;
      case 'week':
        startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(targetDate);
        break;
      case 'month':
        startDate = new Date(targetDate);
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date(targetDate);
        break;
      case 'quarter':
        startDate = new Date(targetDate);
        startDate.setMonth(startDate.getMonth() - 3);
        endDate = new Date(targetDate);
        break;
      default:
        startDate = new Date(targetDate);
        endDate = new Date(targetDate);
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  async _getTaskReportsInRange(startDate, endDate) {
    return await TaskReport.find({
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('employee', 'firstName lastName employeeId department position')
    .lean();
  }

  async _getAttendanceInRange(startDate, endDate) {
    return await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('employee', 'firstName lastName employeeId department')
    .lean();
  }

  async _getActiveEmployees() {
    return await cache.getOrSet('employees:active:hr-tasks', async () => {
      return await Employee.find({ isActive: true })
        .select('_id employeeId firstName lastName department position')
        .lean();
    }, TTL.EMPLOYEES);
  }

  _calculateOverviewStats({ taskReports, attendanceRecords, allActiveEmployees, previousPeriodData, period }) {
    const totalEmployees = allActiveEmployees.length;
    const employeesWithTasks = new Set(taskReports.map(tr => tr.employee?._id?.toString() || tr.employee)).size;
    const totalTasks = taskReports.reduce((sum, tr) => sum + (tr.tasks?.length || 0), 0);
    const avgTasksPerEmployee = employeesWithTasks > 0 ? (totalTasks / employeesWithTasks).toFixed(1) : 0;
    
    // Task quality metrics
    const taskQualityScores = this._calculateTaskQualityScores(taskReports);
    const avgQualityScore = taskQualityScores.length > 0 ? 
      (taskQualityScores.reduce((sum, score) => sum + score, 0) / taskQualityScores.length).toFixed(1) : 0;

    // Productivity metrics
    const productivityScores = this._calculateProductivityScores(taskReports, attendanceRecords);
    const avgProductivityScore = productivityScores.length > 0 ?
      (productivityScores.reduce((sum, score) => sum + score, 0) / productivityScores.length).toFixed(1) : 0;

    // Task completion rate
    const completedTasks = taskReports.filter(tr => tr.status === 'completed').length;
    const completionRate = taskReports.length > 0 ? ((completedTasks / taskReports.length) * 100).toFixed(1) : 0;

    return {
      totalEmployees,
      employeesWithTasks,
      taskReportingRate: totalEmployees > 0 ? ((employeesWithTasks / totalEmployees) * 100).toFixed(1) : 0,
      totalTasks,
      avgTasksPerEmployee,
      avgQualityScore,
      avgProductivityScore,
      completionRate,
      period,
      previousPeriodComparison: this._calculatePeriodComparison(
        { employeesWithTasks, totalTasks, avgQualityScore, avgProductivityScore },
        previousPeriodData
      )
    };
  }

  _generateTaskInsights(stats, taskReports) {
    const insights = [];

    // Task reporting insights
    if (stats.taskReportingRate < 70) {
      insights.push({
        type: 'warning',
        category: 'reporting',
        message: `Low task reporting rate: ${stats.taskReportingRate}% of employees submitted reports`,
        priority: 'high',
        recommendation: 'Consider implementing reminder systems or reviewing task reporting processes'
      });
    }

    // Productivity insights
    if (stats.avgProductivityScore < 60) {
      insights.push({
        type: 'alert',
        category: 'productivity',
        message: `Below average productivity score: ${stats.avgProductivityScore}/100`,
        priority: 'medium',
        recommendation: 'Analyze task complexity and provide additional support or training'
      });
    }

    // Task quality insights
    if (stats.avgQualityScore > 85) {
      insights.push({
        type: 'success',
        category: 'quality',
        message: `Excellent task quality: ${stats.avgQualityScore}/100 average score`,
        priority: 'low',
        recommendation: 'Consider recognizing high-performing employees and sharing best practices'
      });
    }

    return insights;
  }

  _calculateProductivityScores(taskReports, attendanceRecords) {
    // Create attendance map for quick lookup
    const attendanceMap = new Map();
    attendanceRecords.forEach(att => {
      const key = `${att.employee?._id || att.employee}-${att.date.toISOString().split('T')[0]}`;
      attendanceMap.set(key, att);
    });

    return taskReports.map(taskReport => {
      const dateKey = `${taskReport.employee?._id || taskReport.employee}-${taskReport.date.toISOString().split('T')[0]}`;
      const attendance = attendanceMap.get(dateKey);
      
      if (!attendance || !attendance.checkIn || !attendance.checkOut) {
        return 0; // No attendance data
      }

      const workHours = (new Date(attendance.checkOut) - new Date(attendance.checkIn)) / (1000 * 60 * 60);
      const taskCount = taskReport.tasks?.length || 0;
      const taskComplexity = this._calculateTaskComplexity(taskReport.tasks || []);
      
      // Productivity score based on tasks completed per hour and complexity
      const tasksPerHour = workHours > 0 ? taskCount / workHours : 0;
      return Math.min(100, (tasksPerHour * taskComplexity * 20)); // Scale to 0-100
    }).filter(score => score > 0);
  }

  _calculateTaskQualityScores(taskReports) {
    return taskReports.map(taskReport => {
      const tasks = taskReport.tasks || [];
      if (tasks.length === 0) return 0;

      let qualityScore = 0;
      tasks.forEach(task => {
        // Quality based on task description length and detail
        const descriptionLength = task.length || 0;
        const hasDetail = descriptionLength > 20;
        const hasAction = /\b(completed|finished|done|implemented|fixed|resolved)\b/i.test(task);
        const hasSpecifics = /\b(bug|feature|test|review|meeting|document)\b/i.test(task);
        
        let taskScore = 50; // Base score
        if (hasDetail) taskScore += 20;
        if (hasAction) taskScore += 20;
        if (hasSpecifics) taskScore += 10;
        
        qualityScore += Math.min(100, taskScore);
      });

      return qualityScore / tasks.length;
    }).filter(score => score > 0);
  }

  _calculateTaskComplexity(tasks) {
    if (tasks.length === 0) return 1;

    let complexityScore = 1;
    tasks.forEach(task => {
      const taskText = task.toLowerCase();
      
      // Complexity indicators
      if (taskText.includes('bug') || taskText.includes('fix')) complexityScore += 0.3;
      if (taskText.includes('implement') || taskText.includes('develop')) complexityScore += 0.4;
      if (taskText.includes('review') || taskText.includes('test')) complexityScore += 0.2;
      if (taskText.includes('meeting') || taskText.includes('discuss')) complexityScore += 0.1;
      if (taskText.includes('research') || taskText.includes('analyze')) complexityScore += 0.3;
    });

    return Math.min(3, complexityScore); // Cap at 3x complexity
  }

  _validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 0) {
      throw new APIError('Start date must be before end date', 400, 'INVALID_DATE_RANGE');
    }
    
    if (diffDays > this.maxDateRange) {
      throw new APIError(`Date range too large. Maximum ${this.maxDateRange} days allowed`, 400, 'DATE_RANGE_TOO_LARGE');
    }
  }

  _createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  _identifyTopPerformers(taskReports, attendanceRecords) {
    const employeePerformance = new Map();

    // Calculate performance metrics for each employee
    taskReports.forEach(taskReport => {
      const empId = taskReport.employee?._id?.toString() || taskReport.employee;
      const empName = taskReport.employee?.firstName ? 
        `${taskReport.employee.firstName} ${taskReport.employee.lastName}` : 'Unknown';
      
      if (!employeePerformance.has(empId)) {
        employeePerformance.set(empId, {
          employeeId: taskReport.employee?.employeeId || empId,
          name: empName,
          department: taskReport.employee?.department || 'Unknown',
          totalTasks: 0,
          qualityScore: 0,
          productivityScore: 0,
          reportCount: 0
        });
      }

      const performance = employeePerformance.get(empId);
      performance.totalTasks += taskReport.tasks?.length || 0;
      performance.qualityScore += this._calculateTaskQualityScores([taskReport])[0] || 0;
      performance.reportCount += 1;
    });

    // Calculate averages and sort by performance
    const performers = Array.from(employeePerformance.values())
      .map(perf => ({
        ...perf,
        avgQualityScore: perf.reportCount > 0 ? (perf.qualityScore / perf.reportCount).toFixed(1) : 0,
        avgTasksPerReport: perf.reportCount > 0 ? (perf.totalTasks / perf.reportCount).toFixed(1) : 0
      }))
      .sort((a, b) => (b.avgQualityScore * b.avgTasksPerReport) - (a.avgQualityScore * a.avgTasksPerReport))
      .slice(0, 5); // Top 5 performers

    return performers;
  }

  _generateTaskAlerts(stats, productivity) {
    const alerts = [];

    if (stats.taskReportingRate < 50) {
      alerts.push({
        type: 'critical',
        message: `Very low task reporting: Only ${stats.taskReportingRate}% of employees are submitting reports`,
        action: 'immediate_attention_required',
        priority: 'high'
      });
    }

    if (stats.completionRate < 70) {
      alerts.push({
        type: 'warning',
        message: `Low task completion rate: ${stats.completionRate}%`,
        action: 'review_task_management',
        priority: 'medium'
      });
    }

    return alerts;
  }

  _getQuickActions(stats) {
    return [
      {
        label: 'View Task Reports',
        action: 'view_task_reports',
        count: stats.totalTasks
      },
      {
        label: 'Review Low Performers',
        action: 'review_low_performers',
        count: Math.round(stats.totalEmployees * (100 - stats.taskReportingRate) / 100)
      },
      {
        label: 'Export Productivity Report',
        action: 'export_productivity',
        count: stats.employeesWithTasks
      }
    ];
  }
}