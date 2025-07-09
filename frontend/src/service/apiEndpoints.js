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
    GET_BY_ID: (id) => `/employees/${id}`,
    UPDATE: (id) => `/employees/${id}`,
    DELETE: (id) => `/employees/${id}`
  },
  
  // Attendance Management
  ATTENDANCE: {
    BASE: "/attendance",
    CHECK_IN: "/attendance/checkin",
    CHECK_OUT: "/attendance/checkout",
    RECORDS: "/attendance/records",
    GET_RECORDS: "/attendance/records",
    MY_RECORDS: "/attendance",
    GET_MISSING_CHECKOUTS: "/attendance/missing-checkouts"
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
    LINK_EMPLOYEE: "/users/profile/link",
    MISSING_EMPLOYEES: "/users/missing-employees"
  },
  
  // Dashboard
  DASHBOARD: {
    ADMIN: "/dashboard/admin",
    ADMIN_SUMMARY: "/dashboard/admin-summary"
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
    GET_BY_EMPLOYEE_MONTH_YEAR: (employeeId, month, year) => `/salary-slips/${employeeId}/${month}/${year}`,
    GET_EMPLOYEE_SLIPS: (employeeId) => `/salary-slips/employee/${employeeId}`,
    DELETE: (employeeId, month, year) => `/salary-slips/${employeeId}/${month}/${year}`,
    TAX_CALCULATION: "/salary-slips/tax-calculation"
  },

  // Salary Structures
  SALARY_STRUCTURES: {
    BASE: "/salary-structures",
    CREATE_OR_UPDATE: "/salary-structures",
    GET_ALL: "/salary-structures",
    GET_BY_EMPLOYEE: (employeeId) => `/salary-structures/${employeeId}`,
    DELETE: (employeeId) => `/salary-structures/${employeeId}`,
    EMPLOYEES_WITHOUT_STRUCTURE: "/salary-structures/employees-without-structure"
  }
};

// Helper function to build query string
export const buildQueryString = (params = {}) => {
  const filteredParams = Object.entries(params)
    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
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