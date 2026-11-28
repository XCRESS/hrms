// Centralized API Endpoints Configuration
// This file ensures consistency between frontend API calls and backend routes

export const API_ENDPOINTS = {
  // Base configuration
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',

  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
  },

  // Employee Management
  EMPLOYEES: {
    BASE: '/employees',
    PROFILE: '/employees/profile',
    CREATE: '/employees/create',
    GET_ALL: '/employees',
    GET_BY_ID: (id: string) => `/employees/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/employees/update/${encodeURIComponent(id)}`,
    CHANGE_ID: (id: string) => `/employees/${encodeURIComponent(id)}/employee-id`,
    SET_SUPERVISOR: (id: string) => `/employees/${encodeURIComponent(id)}/supervisor`,
    DELETE: (id: string) => `/employees/${encodeURIComponent(id)}`,
  },

  ACCESS: {
    ME: '/access/me',
    TEAM: '/access/team',
    GRANTS: '/access/grants',
    GRANT: (id: string) => `/access/grants/${encodeURIComponent(id)}`,
  },

  // Attendance Management
  ATTENDANCE: {
    BASE: '/attendance',
    CHECK_IN: '/attendance/checkin',
    CHECK_OUT: '/attendance/checkout',
    RECORDS: '/attendance/records',
    GET_RECORDS: '/attendance',
    MY_RECORDS: '/attendance/my',
    MY_ATTENDANCE: '/attendance/my',
    GET_MISSING_CHECKOUTS: '/attendance/missing-checkouts',
    TODAY_WITH_ABSENTS: '/attendance/today-with-absents',
    ADMIN_RANGE: '/attendance/admin-range',
    EMPLOYEE_WITH_ABSENTS: '/attendance/employee-with-absents',
    UPDATE_RECORD: (recordId: string) => `/attendance/update/${recordId}`,
  },

  OFFICE_LOCATIONS: {
    BASE: '/office-locations',
    ACTIVE: '/office-locations/active',
    GEOFENCE_CHECK: '/attendance/geofence-check',
    CREATE: '/office-locations',
    UPDATE: (id: string) => `/office-locations/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/office-locations/${encodeURIComponent(id)}`,
  },

  WFH_REQUESTS: {
    BASE: '/wfh-requests',
    MY: '/wfh-requests/my',
    REVIEW: (id: string) => `/wfh-requests/${encodeURIComponent(id)}/status`,
  },

  // WFH alias (same as WFH_REQUESTS, used by some hooks)
  WFH: {
    BASE: '/wfh-requests',
    MY: '/wfh-requests/my',
    REVIEW: (id: string) => `/wfh-requests/${encodeURIComponent(id)}/status`,
  },

  // Leave Management
  LEAVES: {
    BASE: '/leaves',
    REQUEST: '/leaves/request',
    MY_LEAVES: '/leaves/my',
    ALL_LEAVES: '/leaves/all',
    PREVIEW_DAYS: '/leaves/preview-days',
    UPDATE_STATUS: (id: string) => `/leaves/${id}/status`,
  },

  // Expense Management
  EXPENSES: {
    BASE: '/expenses',
    REQUEST: '/expenses/request',
    MY_EXPENSES: '/expenses/my',
    ALL_EXPENSES: '/expenses/all',
    UPDATE: (id: string) => `/expenses/${id}`,
    UPDATE_STATUS: (id: string) => `/expenses/${id}/status`,
    BULK_UPDATE: '/expenses/bulk-status',
    EXPORT: '/expenses/export',
  },

  // Regularization Management
  REGULARIZATIONS: {
    BASE: '/regularizations',
    REQUEST: '/regularizations/request',
    MY_REGULARIZATIONS: '/regularizations/my',
    ALL_REGULARIZATIONS: '/regularizations',
    REVIEW: (id: string) => `/regularizations/${id}/review`,
    BULK_REVIEW: '/regularizations/bulk-review',
  },

  // Task Reports
  TASK_REPORTS: {
    BASE: '/task-reports',
    SUBMIT: '/task-reports/submit',
    MY_REPORTS: '/task-reports/my',
    ALL_REPORTS: '/task-reports/all',
  },

  // Holiday Management
  HOLIDAYS: {
    BASE: '/holidays',
    CREATE: '/holidays',
    UPDATE: (id: string) => `/holidays/${id}`,
    DELETE: (id: string) => `/holidays/${id}`,
  },

  // Festive games
  FESTIVE: {
    START: (instanceId: string, game: string) => `/festive/${encodeURIComponent(instanceId)}/${encodeURIComponent(game)}/start`,
    FINISH: (instanceId: string, game: string) => `/festive/${encodeURIComponent(instanceId)}/${encodeURIComponent(game)}/finish`,
    LEADERBOARD: (instanceId: string, game: string) => `/festive/${encodeURIComponent(instanceId)}/${encodeURIComponent(game)}/leaderboard`,
  },

  // Announcements
  ANNOUNCEMENTS: {
    BASE: '/announcements',
    CREATE: '/announcements',
    GET_BY_ID: (id: string) => `/announcements/${id}`,
    UPDATE: (id: string) => `/announcements/${id}`,
    DELETE: (id: string) => `/announcements/${id}`,
  },

  // Help/Support
  HELP: {
    BASE: '/help',
    SUBMIT: '/help',
    MY_INQUIRIES: '/help/my',
    ALL_INQUIRIES: '/help/all',
    UPDATE: (id: string) => `/help/${id}`,
  },

  // User Management
  USERS: {
    BASE: '/users',
    GET_ALL: '/users',
    GET_BY_ID: (id: string) => `/users/${encodeURIComponent(id)}`,
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${encodeURIComponent(id)}`,
    UPDATE_ROLE: (id: string) => `/users/${encodeURIComponent(id)}/role`,
    DELETE: (id: string) => `/users/${encodeURIComponent(id)}`,
    LINK_EMPLOYEE: '/employees/link',
    UNLINK_EMPLOYEE: '/employees/unlink',
    MISSING_EMPLOYEES: '/users/missing-employees',
  },

  // Documents
  DOCUMENTS: {
    BASE: '/documents',
    UPLOAD: '/documents/upload',
    GET_BY_EMPLOYEE: (employeeId: string) => `/documents/employee/${encodeURIComponent(employeeId)}`,
    DELETE: (id: string) => `/documents/${id}`,
  },

  // Dashboard
  DASHBOARD: {
    ADMIN: '/dashboard/admin',
    ADMIN_SUMMARY: '/dashboard/admin-summary',
    ALERTS: '/dashboard/alerts',
  },

  // Activity Feed
  ACTIVITY: {
    BASE: '/activity',
    FEED: '/activity/feed',
  },

  // Password Reset
  PASSWORD_RESET: {
    REQUEST: '/password-reset/request',
    CONFIRM: '/password-reset/confirm',
  },

  // Salary Slips
  SALARY_SLIPS: {
    BASE: '/salary-slips',
    CREATE_OR_UPDATE: '/salary-slips',
    GET_ALL: '/salary-slips',
    GET_BY_EMPLOYEE_MONTH_YEAR: (employeeId: string, month: number, year: number) =>
      `/salary-slips/${encodeURIComponent(employeeId)}/${month}/${year}`,
    GET_EMPLOYEE_SLIPS: (employeeId: string) => `/salary-slips/employee/${encodeURIComponent(employeeId)}`,
    DELETE: (employeeId: string, month: number, year: number) =>
      `/salary-slips/${encodeURIComponent(employeeId)}/${month}/${year}`,
    TAX_CALCULATION: '/salary-slips/tax-calculation',
    BULK_GENERATE: '/salary-slips/bulk/generate',
  },

  // Salary Structures
  SALARY_STRUCTURES: {
    BASE: '/salary-structures',
    CREATE_OR_UPDATE: '/salary-structures',
    GET_ALL: '/salary-structures',
    GET_BY_EMPLOYEE: (employeeId: string) => `/salary-structures/${encodeURIComponent(employeeId)}`,
    DELETE: (employeeId: string) => `/salary-structures/${encodeURIComponent(employeeId)}`,
    EMPLOYEES_WITHOUT_STRUCTURE: '/salary-structures/employees-without-structure',
    STATISTICS: '/salary-structures/stats/overview',
  },

  // Policies
  POLICIES: {
    BASE: '/policies',
    CREATE: '/policies',
    GET_ALL: '/policies',
    GET_ACTIVE: '/policies/active',
    GET_BY_ID: (id: string) => `/policies/${id}`,
    UPDATE: (id: string) => `/policies/${id}`,
    DELETE: (id: string) => `/policies/${id}`,
    STATISTICS: '/policies/statistics',
  },

  // Settings
  SETTINGS: {
    BASE: '/settings',
    GLOBAL: '/settings/global',
    DEPARTMENT: (department: string) => `/settings/department/${encodeURIComponent(department)}`,
    EFFECTIVE: '/settings/effective',
    DEPARTMENTS: '/settings/departments/list',
    DEPARTMENT_STATS: '/settings/departments/stats',
    ADD_DEPARTMENT: '/settings/departments',
    RENAME_DEPARTMENT: (oldName: string) => `/settings/departments/${encodeURIComponent(oldName)}/rename`,
    DELETE_DEPARTMENT: (name: string) => `/settings/departments/${encodeURIComponent(name)}`,
    DEPARTMENT_EMPLOYEES: (name: string) => `/settings/departments/${encodeURIComponent(name)}/employees`,
    RESCHEDULE_HR_REPORT: '/settings/daily-hr-attendance-report/reschedule',
    TEST_HR_REPORT: '/settings/daily-hr-attendance-report/test',
    RUN_REGULARIZATION_CLEANUP: '/settings/regularization-retention/run-now',
    COMPANIES: '/settings/companies',
    COMPANY: (id: string) => `/settings/companies/${encodeURIComponent(id)}`,
  },

  // Notifications
  NOTIFICATIONS: {
    INBOX: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_READ: '/notifications/read',
    TEST: '/notifications/test',
    STATUS: '/notifications/status',
    SUBSCRIBE: '/notifications/subscribe',
    UNSUBSCRIBE: '/notifications/unsubscribe',
    VAPID_KEY: '/notifications/vapid-key',
  },

  ASSISTANT: {
    CHAT: '/assistant/chat',
    THREADS: '/assistant/threads',
    THREAD: (id: string) => `/assistant/threads/${id}`,
    MESSAGES: (id: string) => `/assistant/threads/${id}/messages`,
    TITLE: (id: string) => `/assistant/threads/${id}/title`,
    RECEIPTS: (id: string) => `/assistant/threads/${id}/receipts`,
    EMAIL: '/assistant/email',
    FILES: '/assistant/files',
    FILE: (id: string) => `/assistant/files/${id}`,
    EXPORT: '/assistant/export',
  },
  LETTERS: {
    BASE: '/letters',
    PREVIEW_UNSAVED: '/letters/preview',
    FIELDS: '/letters/fields',
    MINE: '/letters/mine',
    TEMPLATES: '/letters/templates',
    TEMPLATE: (id: string) => `/letters/templates/${id}`,
    TEMPLATE_PREVIEW: '/letters/templates/preview',
    IMPORT_DOCX: '/letters/import-docx',
    APPLY_MAPPING: '/letters/apply-mapping',
    LETTERHEADS: '/letters/letterheads',
    LETTERHEAD: (companyId: string) => `/letters/letterheads/${companyId}`,
    LETTERHEAD_PREVIEW: (companyId: string) => `/letters/letterheads/${companyId}/preview`,
    LETTER: (id: string) => `/letters/${id}`,
    WORDING: (id: string) => `/letters/${id}/wording`,
    PREVIEW: (id: string) => `/letters/${id}/preview`,
    ISSUE: (id: string) => `/letters/${id}/issue`,
    SEND: (id: string) => `/letters/${id}/send`,
    VOID: (id: string) => `/letters/${id}/void`,
    PDF: (id: string) => `/letters/${id}/pdf`,
  },
} as const;

type QueryValue = string | number | boolean | undefined | null;
/** Mapped rather than Record<string, …> so named interfaces (no index signature) are accepted. */
type QueryParams<T> = { [K in keyof T]: QueryValue };

export const buildQueryString = <T extends QueryParams<T>>(params: T = {} as T): string => {
  const entries = Object.entries(params as Record<string, QueryValue>)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => [key, String(value)]);

  const queryString = new URLSearchParams(entries).toString();
  return queryString ? `?${queryString}` : '';
};

export const buildEndpointWithQuery = <T extends QueryParams<T>>(endpoint: string, params: T = {} as T): string => {
  const queryString = buildQueryString(params);
  return `${endpoint}${queryString}`;
};

export default API_ENDPOINTS;
