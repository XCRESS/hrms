// Centralized API Endpoints Configuration
// This file ensures consistency between frontend API calls and backend routes

export const API_ENDPOINTS = {
  // Base configuration
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  
  // Authentication
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout"
  },
  
  // Employee Management
  EMPLOYEES: {
    BASE: "/employees",
    PROFILE: "/employees/profile",
    CREATE: "/employees/create",
    GET_ALL: "/employees",
    GET_BY_ID: (id) => `/employees/${encodeURIComponent(id)}`,
    UPDATE: (id) => `/employees/${encodeURIComponent(id)}`,
    DELETE: (id) => `/employees/${encodeURIComponent(id)}`
  },
  
  // Attendance Management
  ATTENDANCE: {
    BASE: "/attendance",
    CHECK_IN: "/attendance/checkin",
    CHECK_OUT: "/attendance/checkout",
    RECORDS: "/attendance/records", 
    GET_RECORDS: "/attendance",
    MY_RECORDS: "/attendance/my",
    MY_ATTENDANCE: "/attendance/my",
    GET_MISSING_CHECKOUTS: "/attendance/missing-checkouts",
    TODAY_WITH_ABSENTS: "/attendance/today-with-absents",
    ADMIN_RANGE: "/attendance/admin-range", 
    EMPLOYEE_WITH_ABSENTS: "/attendance/employee-with-absents",
    UPDATE_RECORD: (recordId) => `/attendance/update/${recordId}`
  },
  
  // Leave Management
  LEAVES: {
    BASE: "/leaves",
    REQUEST: "/leaves/request",
    MY_LEAVES: "/leaves/my",
    ALL_LEAVES: "/leaves/all",
    UPDATE_STATUS: (id) => `/leaves/${id}/status`
  },
  
  // Regularization Management
  REGULARIZATIONS: {
    BASE: "/regularizations",
    REQUEST: "/regularizations/request",
    MY_REGULARIZATIONS: "/regularizations/my",
    ALL_REGULARIZATIONS: "/regularizations",
    REVIEW: (id) => `/regularizations/${id}/review`
  },
  
  // Task Reports
  TASK_REPORTS: {
    BASE: "/task-reports",
    SUBMIT: "/task-reports/submit",
    MY_REPORTS: "/task-reports/my",
    ALL_REPORTS: "/task-reports"
  },
  
  // Holiday Management
  HOLIDAYS: {
    BASE: "/holidays",
    CREATE: "/holidays",
    UPDATE: (id) => `/holidays/${id}`,
    DELETE: (id) => `/holidays/${id}`
  },
  
  // Announcements
  ANNOUNCEMENTS: {
    BASE: "/announcements",
    CREATE: "/announcements",
    GET_BY_ID: (id) => `/announcements/${id}`,
    UPDATE: (id) => `/announcements/${id}`,
    DELETE: (id) => `/announcements/${id}`
  },
  
  // Help/Support
  HELP: {
    BASE: "/help",
    SUBMIT: "/help",
    MY_INQUIRIES: "/help/my",
    ALL_INQUIRIES: "/help/all",
    UPDATE: (id) => `/help/${id}`
  },
  
  // User Management
  USERS: {
    BASE: "/users",
    LINK_EMPLOYEE: "/employees/link",
    MISSING_EMPLOYEES: "/users/missing-employees"
  },
  
  // Documents
  DOCUMENTS: {
    BASE: "/documents",
    UPLOAD: "/documents/upload",
    GET_BY_EMPLOYEE: (employeeId) => `/documents/employee/${encodeURIComponent(employeeId)}`,
    DELETE: (id) => `/documents/${id}`
  },
  
  // Dashboard
  DASHBOARD: {
    ADMIN: "/dashboard/admin",
    ADMIN_SUMMARY: "/dashboard/admin-summary",
    ALERTS: "/dashboard/alerts"
  },
  
  // Activity Feed
  ACTIVITY: {
    BASE: "/activity",
    FEED: "/activity/feed"
  },
  
  // Password Reset
  PASSWORD_RESET: {
    REQUEST: "/password-reset/request",
    REQUESTS: "/password-reset/requests",
    APPROVE: (id) => `/password-reset/requests/${id}/approve`,
    REJECT: (id) => `/password-reset/requests/${id}/reject`
  },
  
  // Salary Slips
  SALARY_SLIPS: {
    BASE: "/salary-slips",
    CREATE_OR_UPDATE: "/salary-slips",
    GET_ALL: "/salary-slips",
    GET_BY_EMPLOYEE_MONTH_YEAR: (employeeId, month, year) => `/salary-slips/${encodeURIComponent(employeeId)}/${month}/${year}`,
    GET_EMPLOYEE_SLIPS: (employeeId) => `/salary-slips/employee/${encodeURIComponent(employeeId)}`,
    DELETE: (employeeId, month, year) => `/salary-slips/${encodeURIComponent(employeeId)}/${month}/${year}`,
    TAX_CALCULATION: "/salary-slips/tax-calculation"
  },

  // Salary Structures
  SALARY_STRUCTURES: {
    BASE: "/salary-structures",
    CREATE_OR_UPDATE: "/salary-structures",
    GET_ALL: "/salary-structures",
    GET_BY_EMPLOYEE: (employeeId) => `/salary-structures/${encodeURIComponent(employeeId)}`,
    DELETE: (employeeId) => `/salary-structures/${encodeURIComponent(employeeId)}`,
    EMPLOYEES_WITHOUT_STRUCTURE: "/salary-structures/employees-without-structure",
    STATISTICS: "/salary-structures/stats/overview"
  },

  // Policies
  POLICIES: {
    BASE: "/policies",
    CREATE: "/policies",
    GET_ALL: "/policies",
    GET_ACTIVE: "/policies/active",
    GET_BY_ID: (id) => `/policies/${id}`,
    UPDATE: (id) => `/policies/${id}`,
    DELETE: (id) => `/policies/${id}`,
    STATISTICS: "/policies/statistics"
  },

  // Settings
  SETTINGS: {
    BASE: "/settings",
    GLOBAL: "/settings/global",
    DEPARTMENT: (department) => `/settings/department/${encodeURIComponent(department)}`,
    EFFECTIVE: "/settings/effective",
    DEPARTMENTS: "/settings/departments/list",
    DEPARTMENT_STATS: "/settings/departments/stats",
    ADD_DEPARTMENT: "/settings/departments",
    RENAME_DEPARTMENT: (oldName) => `/settings/departments/${encodeURIComponent(oldName)}/rename`,
    DELETE_DEPARTMENT: (name) => `/settings/departments/${encodeURIComponent(name)}`
  },

  // Notifications
  NOTIFICATIONS: {
    BASE: "/notifications",
    TEST: "/notifications/test",
    STATUS: "/notifications/status",
    SUBSCRIBE: "/notifications/subscribe",
    UNSUBSCRIBE: "/notifications/unsubscribe",
    VAPID_KEY: "/notifications/vapid-key"
  }
};

// Helper function to build query string
export const buildQueryString = (params = {}) => {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  
  const queryString = new URLSearchParams(filteredParams).toString();
  return queryString ? `?${queryString}` : '';
};

// Helper function to build full URL with query params
export const buildEndpointWithQuery = (endpoint, params = {}) => {
  const queryString = buildQueryString(params);
  return `${endpoint}${queryString}`;
};

export default API_ENDPOINTS; 