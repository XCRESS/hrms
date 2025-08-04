# HR Bot Integration Guide
## Unified HR APIs for AI-Powered Bot Development

This guide provides comprehensive documentation for integrating the unified HR APIs with your AI bot, enabling natural language interactions with HR data and operations.

## 🎯 Overview

The unified HR API system provides two main endpoints designed specifically for HR bot integration:

1. **HR Attendance API** - `/api/hr/attendance`
2. **HR Task Reports API** - `/api/hr/task-reports`

Both APIs follow the same industry-standard patterns with operation-based routing, comprehensive validation, and AI-optimized response formats.

## 🚀 Quick Start

### 1. Authentication Setup
```javascript
// Set up authentication headers
const apiClient = {
  baseURL: 'http://your-api-domain.com/api/hr',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
};
```

### 2. Basic Integration Pattern
```javascript
class HRBot {
  async handleQuery(userQuery, context) {
    const intent = this.parseIntent(userQuery);
    const params = this.extractParameters(userQuery, context);
    
    switch (intent.domain) {
      case 'attendance':
        return await this.handleAttendanceQuery(intent.operation, params);
      case 'tasks':
        return await this.handleTaskQuery(intent.operation, params);
    }
  }
  
  async handleAttendanceQuery(operation, params) {
    const response = await fetch(`${apiClient.baseURL}/attendance?operation=${operation}`, {
      method: 'GET',
      headers: apiClient.headers,
      ...params
    });
    
    return this.formatBotResponse(await response.json());
  }
}
```

## 📊 HR Attendance API Integration

### Dashboard Overview
**Query:** "Show me today's attendance overview"
```javascript
GET /api/hr/attendance?operation=overview&date=2024-01-15

Response: {
  "success": true,
  "data": {
    "overview": {
      "statistics": {
        "totalEmployees": 150,
        "presentToday": 142,
        "absentToday": 8,
        "lateToday": 12,
        "attendanceRate": "94.7",
        "punctualityRate": "91.5"
      },
      "insights": [...],
      "alerts": [...],
      "quickActions": [...]
    }
  }
}
```

### Employee Analysis
**Query:** "Get John's attendance for last month"
```javascript
GET /api/hr/attendance?operation=employee&employeeId=EMP001&startDate=2024-01-01&endDate=2024-01-31

Response: {
  "success": true,
  "data": {
    "employee": { ... },
    "calendar": { ... },
    "analysis": {
      "attendanceRate": "96.8",
      "punctualityScore": "87.5",
      "patterns": [...]
    },
    "summary": { ... }
  }
}
```

### Advanced Analytics
**Query:** "Show attendance trends by department"
```javascript
GET /api/hr/attendance?operation=analytics&period=month&metricTypes=attendance_rate,trends&groupBy=department

Response: {
  "success": true,
  "data": {
    "analytics": {
      "attendanceRate": { ... },
      "trends": { ... }
    },
    "insights": [...],
    "recommendations": [...]
  }
}
```

### Bulk Operations
**Query:** "Update attendance records for these employees"
```javascript
POST /api/hr/attendance?operation=bulk

Body: {
  "operation": "update",
  "data": [
    {
      "recordId": "507f1f77bcf86cd799439011",
      "status": "present",
      "checkIn": "2024-01-15T09:30:00Z"
    }
  ]
}
```

## 📝 HR Task Reports API Integration

### Productivity Overview
**Query:** "Show task reporting overview for this month"
```javascript
GET /api/hr/task-reports?operation=overview&period=month

Response: {
  "success": true,
  "data": {
    "overview": {
      "statistics": {
        "totalEmployees": 150,
        "employeesWithTasks": 138,
        "taskReportingRate": "92.0",
        "avgProductivityScore": "78.5",
        "avgQualityScore": "82.1"
      },
      "productivity": { ... },
      "insights": [...],
      "topPerformers": [...]
    }
  }
}
```

### Employee Task Analysis
**Query:** "Analyze Sarah's task performance"
```javascript
GET /api/hr/task-reports?operation=employee&employeeId=EMP002&startDate=2024-01-01&endDate=2024-01-31

Response: {
  "success": true,
  "data": {
    "employee": { ... },
    "reports": [...],
    "analysis": {
      "productivityScore": 85.3,
      "qualityScore": 78.9,
      "taskCategories": { ... }
    },
    "recommendations": [...]
  }
}
```

### AI-Powered Insights
**Query:** "Give me AI insights on team productivity"
```javascript
GET /api/hr/task-reports?operation=insights&focusAreas=productivity,quality,patterns

Response: {
  "success": true,
  "data": {
    "insights": {
      "productivity": [...],
      "quality": [...],
      "patterns": [...]
    },
    "recommendations": [...],
    "actionableItems": [...],
    "confidenceScores": { ... }
  }
}
```

## 🤖 Natural Language Processing Integration

### Intent Recognition Patterns
```javascript
const intentPatterns = {
  attendance: {
    overview: /show|display|get.*attendance.*(overview|summary|stats)/i,
    employee: /get|show.*attendance.*(for|of)\s+(\w+)/i,
    trends: /attendance.*(trend|pattern|analysis)/i,
    update: /update|modify|change.*attendance/i
  },
  tasks: {
    overview: /task.*(overview|summary|report)/i,
    productivity: /productivity|performance.*(analysis|metrics)/i,
    insights: /insights?|recommendations?.*task/i,
    employee: /(\w+)'?s?\s*task.*(report|performance)/i
  }
};

function parseIntent(query) {
  const normalizedQuery = query.toLowerCase();
  
  for (const [domain, operations] of Object.entries(intentPatterns)) {
    for (const [operation, pattern] of Object.entries(operations)) {
      if (pattern.test(normalizedQuery)) {
        return { domain, operation };
      }
    }
  }
  
  return { domain: 'unknown', operation: 'help' };
}
```

### Parameter Extraction
```javascript
function extractParameters(query, context) {
  const params = {};
  
  // Date extraction
  const datePatterns = {
    today: /today/i,
    yesterday: /yesterday/i,
    lastWeek: /last week/i,
    lastMonth: /last month/i,
    thisMonth: /this month/i
  };
  
  // Employee name extraction
  const employeeMatch = query.match(/(?:for|of)\s+(\w+)/i);
  if (employeeMatch) {
    params.employeeName = employeeMatch[1];
    // Look up employee ID from name
    params.employeeId = lookupEmployeeId(employeeMatch[1]);
  }
  
  // Department extraction
  const deptMatch = query.match(/(?:in|for)\s+(engineering|hr|sales|marketing|finance)/i);
  if (deptMatch) {
    params.departments = [deptMatch[1]];
  }
  
  return params;
}
```

### Response Formatting for Bot
```javascript
function formatBotResponse(apiResponse) {
  if (!apiResponse.success) {
    return {
      type: 'error',
      message: apiResponse.message,
      suggestions: ['Try rephrasing your question', 'Check if the employee exists']
    };
  }
  
  const { operation } = apiResponse.metadata || {};
  
  switch (operation) {
    case 'overview':
      return formatOverviewResponse(apiResponse.data);
    case 'employee':
      return formatEmployeeResponse(apiResponse.data);
    case 'analytics':
      return formatAnalyticsResponse(apiResponse.data);
    default:
      return formatGenericResponse(apiResponse.data);
  }
}

function formatOverviewResponse(data) {
  const stats = data.overview.statistics;
  return {
    type: 'overview',
    message: `Here's today's attendance overview:
    • Total Employees: ${stats.totalEmployees}
    • Present: ${stats.presentToday} (${stats.attendanceRate}%)
    • Absent: ${stats.absentToday}
    • Late Arrivals: ${stats.lateToday}`,
    
    insights: data.overview.insights.map(insight => insight.message),
    
    actions: data.overview.quickActions.map(action => ({
      label: action.label,
      action: action.action,
      count: action.count
    }))
  };
}
```

## 🔍 Advanced Query Examples

### Complex Attendance Queries
```javascript
// "Show me attendance patterns for engineering team last quarter"
const response = await fetch('/api/hr/attendance?operation=analytics', {
  method: 'GET',
  params: {
    period: 'quarter',
    departments: ['Engineering'],
    metricTypes: ['attendance_rate', 'trends', 'patterns'],
    groupBy: 'week'
  }
});

// "Get employees with low attendance this month"
const response = await fetch('/api/hr/attendance?operation=records', {
  method: 'GET',
  params: {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    sortBy: 'attendanceRate',
    sortOrder: 'asc',
    limit: 10
  }
});
```

### Complex Task Queries
```javascript
// "Analyze productivity trends across all departments"
const response = await fetch('/api/hr/task-reports?operation=analytics', {
  method: 'GET',
  params: {
    period: 'month',
    metricTypes: ['productivity', 'trends'],
    groupBy: 'department',
    includeComparisons: true
  }
});

// "Get AI recommendations for improving team productivity"
const response = await fetch('/api/hr/task-reports?operation=insights', {
  method: 'GET',
  params: {
    analysisType: 'comprehensive',
    focusAreas: ['productivity', 'efficiency'],
    includeRecommendations: true
  }
});
```

## 🛡️ Error Handling

### Comprehensive Error Management
```javascript
class HRBotErrorHandler {
  static handle(error, context) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return this.handleValidationError(error, context);
      case 'INSUFFICIENT_PRIVILEGES':
        return this.handleAuthError(error, context);
      case 'RATE_LIMIT_EXCEEDED':
        return this.handleRateLimitError(error, context);
      case 'EMPLOYEE_NOT_FOUND':
        return this.handleNotFoundError(error, context);
      default:
        return this.handleGenericError(error, context);
    }
  }
  
  static handleValidationError(error, context) {
    const suggestions = error.errors?.map(e => 
      `• ${e.field}: ${e.message}`
    ).join('\n') || 'Please check your input parameters';
    
    return {
      type: 'validation_error',
      message: 'I need more information to help you:',
      details: suggestions,
      actions: ['Try with different parameters', 'Ask for help with the format']
    };
  }
}
```

### Retry Logic
```javascript
class HRBotAPIClient {
  async request(endpoint, options, retries = 3) {
    try {
      const response = await fetch(endpoint, options);
      
      if (response.status === 429) { // Rate limited
        if (retries > 0) {
          const delay = Math.pow(2, 4 - retries) * 1000; // Exponential backoff
          await this.sleep(delay);
          return this.request(endpoint, options, retries - 1);
        }
      }
      
      return await response.json();
    } catch (error) {
      if (retries > 0) {
        return this.request(endpoint, options, retries - 1);
      }
      throw error;
    }
  }
}
```

## 📈 Performance Optimization

### Caching Strategy
```javascript
class HRBotCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }
  
  set(key, value, ttlMs = 300000) { // 5 minutes default
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }
  
  get(key) {
    if (this.ttl.get(key) < Date.now()) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
  
  generateKey(operation, params) {
    return `${operation}:${JSON.stringify(params)}`;
  }
}
```

### Batch Requests
```javascript
class HRBotBatchProcessor {
  async processBatch(queries) {
    const grouped = this.groupByEndpoint(queries);
    const promises = [];
    
    for (const [endpoint, queryGroup] of Object.entries(grouped)) {
      promises.push(this.processBatchForEndpoint(endpoint, queryGroup));
    }
    
    const results = await Promise.all(promises);
    return this.mergeResults(results);
  }
}
```

## 🎯 Best Practices

### 1. API Usage Patterns
- **Cache frequently requested data** (employee lists, department info)
- **Use appropriate pagination** for large datasets
- **Implement exponential backoff** for rate limiting
- **Batch similar requests** when possible

### 2. Natural Language Processing
- **Parse dates intelligently** ("last month", "this quarter")
- **Handle employee name variations** (nicknames, partial names)
- **Provide context-aware suggestions** when queries are ambiguous
- **Remember conversation context** for follow-up questions

### 3. Response Formatting
- **Keep responses concise** but informative
- **Use bullet points** for multiple data points
- **Provide actionable insights** not just raw data
- **Include relevant follow-up suggestions**

### 4. Error Recovery
- **Graceful degradation** when data is unavailable
- **Helpful error messages** with suggested fixes
- **Alternative data sources** when primary fails
- **User-friendly explanations** of technical errors

## 🔧 Monitoring & Analytics

### API Usage Tracking
```javascript
class HRBotAnalytics {
  trackQuery(query, intent, response, performance) {
    const event = {
      timestamp: new Date().toISOString(),
      query: query,
      intent: intent,
      success: response.success,
      responseTime: performance.duration,
      endpoint: response.endpoint,
      userId: response.userId
    };
    
    this.sendAnalytics(event);
  }
  
  generateUsageReport() {
    return {
      topQueries: this.getTopQueries(),
      successRate: this.getSuccessRate(),
      averageResponseTime: this.getAverageResponseTime(),
      errorPatterns: this.getErrorPatterns()
    };
  }
}
```

## 📚 Complete Integration Example

```javascript
class HRBot {
  constructor() {
    this.cache = new HRBotCache();
    this.errorHandler = new HRBotErrorHandler();
    this.analytics = new HRBotAnalytics();
  }
  
  async processQuery(userQuery, userId) {
    const startTime = Date.now();
    
    try {
      // Parse user intent
      const intent = this.parseIntent(userQuery);
      const params = this.extractParameters(userQuery);
      
      // Check cache first
      const cacheKey = this.cache.generateKey(intent.operation, params);
      let response = this.cache.get(cacheKey);
      
      if (!response) {
        // Make API request
        response = await this.makeAPIRequest(intent, params);
        
        // Cache successful responses
        if (response.success) {
          this.cache.set(cacheKey, response);
        }
      }
      
      // Format response for user
      const botResponse = this.formatBotResponse(response, intent);
      
      // Track analytics
      this.analytics.trackQuery(userQuery, intent, response, {
        duration: Date.now() - startTime
      });
      
      return botResponse;
      
    } catch (error) {
      return this.errorHandler.handle(error, { userQuery, userId });
    }
  }
  
  async makeAPIRequest(intent, params) {
    const endpoint = `/api/hr/${intent.domain}`;
    const queryParams = new URLSearchParams({
      operation: intent.operation,
      ...params
    });
    
    const response = await fetch(`${endpoint}?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    
    return await response.json();
  }
}

// Usage
const hrBot = new HRBot();

// Example interactions
const response1 = await hrBot.processQuery("Show me today's attendance", "user123");
const response2 = await hrBot.processQuery("How is John performing with his tasks?", "user123");
const response3 = await hrBot.processQuery("Get productivity insights for engineering team", "user123");
```

This integration guide provides everything needed to build a sophisticated HR bot that can handle complex queries, provide intelligent responses, and maintain high performance through caching and optimization strategies.

## 🚀 Next Steps

1. **Implement basic intent recognition** using the patterns provided
2. **Set up authentication** and test basic API calls
3. **Build response formatting** for your specific use case
4. **Add caching layer** for performance optimization
5. **Implement error handling** and retry logic
6. **Add analytics tracking** for continuous improvement

The unified HR APIs are designed to make your bot development as smooth as possible while providing enterprise-grade performance and security.