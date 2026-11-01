/**
 * Attendance Services Barrel Export
 * Centralized export for all attendance service classes
 */

// Business Service - Core business logic and rules
export { AttendanceBusinessService, default as BusinessService } from './AttendanceBusinessService.js';

// Data Service - Database operations and queries
export { AttendanceDataService, default as DataService } from './AttendanceDataService.js';

// Report Service - Analytics and reporting
export { AttendanceReportService, default as ReportService } from './AttendanceReportService.js';

// Import all services
import { AttendanceBusinessService } from './AttendanceBusinessService.js';
import { AttendanceDataService } from './AttendanceDataService.js';
import { AttendanceReportService } from './AttendanceReportService.js';

/**
 * Composite service object for easy access
 * Usage: import { AttendanceServices } from './services/attendance';
 */
export const AttendanceServices = {
  Business: AttendanceBusinessService,
  Data: AttendanceDataService,
  Report: AttendanceReportService
};

/**
 * Service configuration interface
 */
interface ServiceConfig {
  // Add any configuration options here if needed
  [key: string]: any;
}

/**
 * Service factory result interface
 */
interface AttendanceServiceFactory {
  business: typeof AttendanceBusinessService;
  data: typeof AttendanceDataService;
  report: typeof AttendanceReportService;
  config: ServiceConfig;
}

/**
 * Service factory for dependency injection
 * @param config - Configuration object
 * @returns Configured services
 */
export const createAttendanceServices = (config: ServiceConfig = {}): AttendanceServiceFactory => {
  return {
    business: AttendanceBusinessService,
    data: AttendanceDataService,
    report: AttendanceReportService,
    config
  };
};

// Default export - all services
export default {
  AttendanceBusinessService,
  AttendanceDataService,
  AttendanceReportService,
  AttendanceServices,
  createAttendanceServices
};
