import { API_ENDPOINTS, buildEndpointWithQuery } from './apiEndpoints.js';

class ApiClient {
    constructor() {      
      this.baseURL = API_ENDPOINTS.BASE_URL;      
      this.defaultHeaders = {        
        "Content-Type": "application/json",        
        Accept: "application/json",      
      };    
    }    
    async customFetch(endpoint, options = {}) {
      const maxRetries = options.retries || 2;
      const retryDelay = options.retryDelay || 1000;
      const startTime = Date.now();
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const url = `${this.baseURL}${endpoint}`;
          const headers = { ...this.defaultHeaders, ...options.headers };
          const config = {
            ...options,
            headers,
            credentials: "include",
          };
          
          // Enhanced logging for debugging
          console.log(`🔍 API Call: ${options.method || 'GET'} ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);
          if (options.body && typeof options.body === 'string') {
            try {
              const bodyData = JSON.parse(options.body);
              console.log('📦 Request Body:', bodyData);
            } catch {
              console.log('📦 Request Body (raw):', options.body);
            }
          }
          
          const response = await fetch(url, config);
          const responseTime = Date.now() - startTime;
          console.log(`⏱️ Response time: ${responseTime}ms`);
        
        // Handle non-JSON responses
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          
          // Enhanced response logging
          console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
          console.log('📥 Response Data:', data);
          
          // For 401 unauthorized responses, clear token
          if (response.status === 401) {
            console.warn("🔐 Authentication error - clearing token");
            localStorage.removeItem("authToken");
            // Store detailed auth error info for debugging
            window.lastAuthError = {
              endpoint,
              timestamp: new Date().toISOString(),
              error: data,
              userAgent: navigator.userAgent
            };
          }
          
          if (!response.ok) {
            // Use the server message if available, otherwise a generic message
            const errorMessage = data.message || "API Error";
            
            // Create a custom error with additional data
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = data;
            error.endpoint = endpoint;
            error.timestamp = new Date().toISOString();
            error.responseTime = responseTime;
            
            // For 400 Bad Request, this is often validation errors, not server unavailability
            // Known validation errors should be silently handled
            error.isValidationError = response.status === 400;
            
            // Expected validation messages that should not be logged
            const expectedValidationMessages = [
              "Already checked in for today",
              "Already checked out for today", 
              "No check-in record found for today"
            ];
            
            error.isExpectedValidation = expectedValidationMessages.includes(errorMessage);
            
            // Enhanced error logging with more context
            if (!error.isValidationError && !error.isExpectedValidation) {
              console.error("🚨 API Error Details:", {
                endpoint,
                status: response.status,
                statusText: response.statusText,
                message: errorMessage,
                data,
                timestamp: error.timestamp,
                responseTime,
                url,
                headers: Object.fromEntries(response.headers.entries())
              });
              
              // Store error in global error log for debugging
              if (!window.apiErrorLog) window.apiErrorLog = [];
              window.apiErrorLog.push({
                endpoint,
                status: response.status,
                message: errorMessage,
                data,
                timestamp: error.timestamp,
                responseTime,
                userAgent: navigator.userAgent
              });
              
              // Keep only last 50 errors to prevent memory issues
              if (window.apiErrorLog.length > 50) {
                window.apiErrorLog = window.apiErrorLog.slice(-50);
              }
            }
            
            throw error;
          }
          
          // Log successful responses for important endpoints
          const importantEndpoints = ['/auth/login', '/auth/profile', '/employees/profile'];
          if (importantEndpoints.some(ep => endpoint.includes(ep))) {
            console.log(`✅ Important endpoint success: ${endpoint}`);
          }
          
          return data;
        } else {
          // Enhanced non-JSON response handling
          console.log(`📄 Non-JSON Response: ${response.status} ${response.statusText}`);
          console.log('📄 Content-Type:', contentType);
          
          if (!response.ok) {
            const responseText = await response.text();
            const error = new Error("API Error - Non-JSON Response");
            error.status = response.status;
            error.responseText = responseText;
            error.contentType = contentType;
            error.endpoint = endpoint;
            error.timestamp = new Date().toISOString();
            
            console.error("🚨 Non-JSON API Error:", {
              endpoint,
              status: response.status,
              statusText: response.statusText,
              contentType,
              responseText: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
              timestamp: error.timestamp
            });
            
            throw error;
          }
          return { success: response.ok };
        }
        } catch (error) {
          const errorTime = Date.now() - startTime;
          
          // Enhanced error logging with more context
          if (!error.isExpectedValidation) {
            console.error(`🚨 Fetch Error (attempt ${attempt + 1}):`, {
              endpoint,
              errorName: error.name,
              errorMessage: error.message,
              status: error.status,
              attempt: attempt + 1,
              maxRetries: maxRetries + 1,
              timeElapsed: errorTime,
              isNetworkError: error.name === 'TypeError' && error.message.includes('Failed to fetch'),
              stack: error.stack
            });
          }
          
          // If it's already been classified as a validation error, don't retry
          if (error.isExpectedValidation) {
            throw error;
          }
          
          // If it's a network error and we have retries left, retry with delay
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            error.isServerUnavailable = true;
            
            if (attempt < maxRetries) {
              console.warn(`🔄 Network error on attempt ${attempt + 1}, retrying in ${retryDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue; // Retry the request
            }
            
            // Final attempt failed - enhanced logging
            console.error("🚨 API Server Unavailable after all retries:", {
              endpoint,
              attempts: maxRetries + 1,
              totalTimeElapsed: errorTime,
              lastError: error.message,
              timestamp: new Date().toISOString()
            });
            
            // Store network error for debugging
            if (!window.networkErrors) window.networkErrors = [];
            window.networkErrors.push({
              endpoint,
              attempts: maxRetries + 1,
              timestamp: new Date().toISOString(),
              error: error.message
            });
          } else if (!error.isValidationError) {
            console.error("🚨 Unexpected API Error:", {
              endpoint,
              error: error.message,
              status: error.status,
              timestamp: new Date().toISOString(),
              stack: error.stack
            });
          }
          
          throw error;
        }
      }
    }

    

    // Ping the server to check if it's available
    async pingServer() {
      try {
        // Use a simple fetch with a timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(`${this.baseURL}`, {
          signal: controller.signal,
          method: 'GET'
        });
        
        clearTimeout(timeoutId);
        
        // Server is reachable if we get any response
        return response.ok;
      } catch (error) {
        console.warn("Server ping failed:", error.message);
        return false;
      }
    }

    // HTTP method helper functions
    async get(endpoint, options = {}) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          ...options.headers,
        },
        ...options,
      });
    }

    async post(endpoint, data = {}, options = {}) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });
    }

    async put(endpoint, data = {}, options = {}) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });
    }

    async delete(endpoint, options = {}) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          ...options.headers,
        },
        ...options,
      });
    }

    async patch(endpoint, data = {}, options = {}) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      });
    }
  
    //Auth endpoints
    async signup(name, email, password) {
      const token = localStorage.getItem("authToken"); // get token
      console.log("Sending signup request with token:", token);
      return this.customFetch(API_ENDPOINTS.AUTH.REGISTER, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password }),
      });
    }
    
    async login(email, password) {
      console.log("🔐 Login attempt for:", email);
      try {
        const result = await this.customFetch(API_ENDPOINTS.AUTH.LOGIN, {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        console.log("✅ Login successful for:", email);
        return result;
      } catch (error) {
        console.error("❌ Login failed for:", email, error.message);
        // Store login error for debugging
        if (!window.loginErrors) window.loginErrors = [];
        window.loginErrors.push({
          email,
          error: error.message,
          status: error.status,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    }
  
    async getProfile() {
      const token = localStorage.getItem("authToken");
      console.log("👤 Getting profile, token exists:", !!token);
      
      try {
        const result = await this.customFetch(API_ENDPOINTS.EMPLOYEES.PROFILE, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log("✅ Profile retrieved successfully");
        return result;
      } catch (error) {
        console.error("❌ Profile retrieval failed:", error.message);
        // Store profile error for debugging
        if (!window.profileErrors) window.profileErrors = [];
        window.profileErrors.push({
          hasToken: !!token,
          error: error.message,
          status: error.status,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    }
  
    async passwordChange(name, email, newPassword) {
      return this.post(API_ENDPOINTS.PASSWORD_RESET.REQUEST, { name, email, newPassword });
    }
   
    async createEmployee(employeeData) {
      return this.post(API_ENDPOINTS.EMPLOYEES.CREATE, employeeData);
    }

    async getEmployees(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.EMPLOYEES.GET_ALL, params);
      return this.get(endpoint);
    }

    async deleteEmployee(employeeId) {
      return this.delete(API_ENDPOINTS.EMPLOYEES.DELETE(employeeId));
    }

    async toggleEmployeeStatus(employeeId) {
      return this.put(`/employees/toggle-status/${employeeId}`);
    }

    // Check-in and Check-out
    async checkIn(locationData = {}) {
      // Use retry logic for check-in as it's critical
      return this.post(API_ENDPOINTS.ATTENDANCE.CHECK_IN, locationData, { 
        retries: 3, 
        retryDelay: 2000 
      });
    }
    
    async checkOut(tasks) {
      // The 'tasks' parameter is an array of strings
      return this.post(API_ENDPOINTS.ATTENDANCE.CHECK_OUT, { tasks });
    }
    
    // Attendance records
    async getAttendanceRecords(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.GET_RECORDS, params);
      return this.get(endpoint);
    }

    // Get missing checkouts for reminder purposes
    async getMissingCheckouts() {
      return this.get(API_ENDPOINTS.ATTENDANCE.GET_MISSING_CHECKOUTS);
    }

    // Get today's attendance for all employees including absent ones (Admin/HR only)
    async getTodayAttendanceWithAbsents() {
      return this.get(API_ENDPOINTS.ATTENDANCE.TODAY_WITH_ABSENTS);
    }

    // Get admin attendance data for a date range - optimized for AdminAttendanceTable
    async getAdminAttendanceRange(startDate, endDate, options = {}) {
      const params = {
        startDate,
        endDate,
        ...options
      };
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.ADMIN_RANGE, params);
      return this.get(endpoint);
    }

    // Get employee attendance with absent days included
    async getEmployeeAttendanceWithAbsents(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.EMPLOYEE_WITH_ABSENTS, params);
      return this.get(endpoint);
    }

    // Update attendance record (HR/Admin only)
    async updateAttendanceRecord(recordId, updateData) {
      return this.put(API_ENDPOINTS.ATTENDANCE.UPDATE_RECORD(recordId), updateData);
    }

    // Leave management
    async requestLeave(leaveData) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.LEAVES.REQUEST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leaveData),
      });
    }
    
    async getMyLeaves() {
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.LEAVES.MY_LEAVES, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async getAllLeaves() {
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.LEAVES.BASE, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async updateLeaveStatus(leaveId, status) {
      return this.put(API_ENDPOINTS.LEAVES.UPDATE_STATUS(leaveId), { status });
    }

    // Holidays
    async getHolidays() {
      return this.get(API_ENDPOINTS.HOLIDAYS.BASE);
    }

    async createHoliday(holidayData) {
      return this.post(API_ENDPOINTS.HOLIDAYS.CREATE, holidayData);
    }

    async updateHoliday(holidayId, holidayData) {
      return this.put(API_ENDPOINTS.HOLIDAYS.UPDATE(holidayId), holidayData);
    }

    async deleteHoliday(holidayId) {
      return this.delete(API_ENDPOINTS.HOLIDAYS.DELETE(holidayId));
    }

    // Announcements
    async getAnnouncements(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ANNOUNCEMENTS.BASE, params);
      return this.get(endpoint);
    }

    async getAnnouncementById(id) {
      return this.get(API_ENDPOINTS.ANNOUNCEMENTS.GET_BY_ID(id));
    }

    async createAnnouncement(announcementData) {
      return this.post(API_ENDPOINTS.ANNOUNCEMENTS.CREATE, announcementData);
    }

    async updateAnnouncement(id, announcementData) {
      return this.put(API_ENDPOINTS.ANNOUNCEMENTS.UPDATE(id), announcementData);
    }

    async deleteAnnouncement(id) {
      return this.delete(API_ENDPOINTS.ANNOUNCEMENTS.DELETE(id));
    }

    // Activity feed
    async getActivityFeed() {
      return this.get(API_ENDPOINTS.ACTIVITY.BASE);
    }

    async getAdminDashboardSummary() {
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.DASHBOARD.ADMIN, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Help/Support
    async submitHelpInquiry(inquiryData) {
      return this.post(API_ENDPOINTS.HELP.SUBMIT, inquiryData);
    }
    
    async getMyInquiries() {
      return this.get(API_ENDPOINTS.HELP.MY_INQUIRIES);
    }

    async getAllInquiries(filters = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.HELP.ALL_INQUIRIES, filters);
      return this.get(endpoint);
    }

    async updateHelpInquiry(inquiryId, updateData) {
      return this.patch(API_ENDPOINTS.HELP.UPDATE(inquiryId), updateData);
    }

    async linkEmployeeToUser(userId, employeeId) {
      return this.post(API_ENDPOINTS.USERS.LINK_EMPLOYEE, { userId, employeeId });
    }

    async getUsersWithMissingEmployeeIds() {
      return this.get(API_ENDPOINTS.USERS.MISSING_EMPLOYEES);
    }

    async getAllUsers() {
      return this.get(API_ENDPOINTS.USERS.BASE);
    }

    async requestRegularization(data) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.REGULARIZATIONS.REQUEST, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    }
    
    async getMyRegularizations() {
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.REGULARIZATIONS.MY_REGULARIZATIONS, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    async getAllRegularizations() {
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.REGULARIZATIONS.ALL_REGULARIZATIONS, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    async reviewRegularization(id, status, reviewComment) {
      // Debug logging
      console.log('reviewRegularization called with:', { id, status, reviewComment });
      const endpoint = API_ENDPOINTS.REGULARIZATIONS.REVIEW(id);
      const payload = { status, reviewComment };
      console.log('API call details:', { endpoint, payload });
      
      return this.post(endpoint, payload);
    }

    async getAllPasswordResetRequests(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.PASSWORD_RESET.REQUESTS, params);
      return this.get(endpoint);
    }

    async approvePasswordResetRequest(requestId) {
      return this.put(API_ENDPOINTS.PASSWORD_RESET.APPROVE(requestId));
    }

    async rejectPasswordResetRequest(requestId, remarks = "") {
      return this.put(API_ENDPOINTS.PASSWORD_RESET.REJECT(requestId), { remarks });
    }

    async getTaskReports(params = {}) {
      return this.get(buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.BASE, params));
    }

    // Employee-specific methods
    async getMyAttendanceRecords(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.MY_RECORDS, params);
      return this.get(endpoint);
    }

    async getMyTaskReports(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.MY_REPORTS, params);
      return this.get(endpoint);
    }

    async submitTaskReport(data) {
      return this.post(API_ENDPOINTS.TASK_REPORTS.BASE, data);
    }

    // Salary Slip Management
    async createOrUpdateSalarySlip(data) {
      return this.post(API_ENDPOINTS.SALARY_SLIPS.CREATE_OR_UPDATE, data);
    }

    async getSalarySlip(employeeId, month, year) {
      return this.get(API_ENDPOINTS.SALARY_SLIPS.GET_BY_EMPLOYEE_MONTH_YEAR(employeeId, month, year));
    }

    async getEmployeeSalarySlips(employeeId, params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SALARY_SLIPS.GET_EMPLOYEE_SLIPS(employeeId), params);
      return this.get(endpoint);
    }

    async getAllSalarySlips(params = {}) {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SALARY_SLIPS.GET_ALL, params);
      return this.get(endpoint);
    }

    async deleteSalarySlip(employeeId, month, year) {
      return this.delete(API_ENDPOINTS.SALARY_SLIPS.DELETE(employeeId, month, year));
    }

    async getTaxCalculation(grossSalary, taxRegime = 'new') {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SALARY_SLIPS.TAX_CALCULATION, { grossSalary, taxRegime });
      return this.get(endpoint);
    }

    async updateSalarySlipStatus(employeeId, month, year, status) {
      return this.put(`${API_ENDPOINTS.SALARY_SLIPS.BASE}/${employeeId}/${month}/${year}/status`, { status });
    }

    async bulkUpdateSalarySlipStatus(salarySlips, status) {
      return this.put(`${API_ENDPOINTS.SALARY_SLIPS.BASE}/bulk/status`, { salarySlips, status });
    }

    // Salary Structure Management
    async createOrUpdateSalaryStructure(data) {
      console.log('apiClient.createOrUpdateSalaryStructure: Endpoint:', API_ENDPOINTS.SALARY_STRUCTURES.CREATE_OR_UPDATE);
      console.log('apiClient.createOrUpdateSalaryStructure: Data:', data);
      return this.post(API_ENDPOINTS.SALARY_STRUCTURES.CREATE_OR_UPDATE, data);
    }

    async getSalaryStructure(employeeId) {
      const endpoint = API_ENDPOINTS.SALARY_STRUCTURES.GET_BY_EMPLOYEE(employeeId);
      console.log('apiClient.getSalaryStructure: Endpoint:', endpoint);
      console.log('apiClient.getSalaryStructure: EmployeeId:', employeeId);
      return this.get(endpoint);
    }

    async getAllSalaryStructures(params = {}) {
      return this.get(buildEndpointWithQuery(API_ENDPOINTS.SALARY_STRUCTURES.GET_ALL, params));
    }

    async deleteSalaryStructure(employeeId) {
      return this.delete(API_ENDPOINTS.SALARY_STRUCTURES.DELETE(employeeId));
    }

    async getEmployeesWithoutStructure() {
      return this.get(API_ENDPOINTS.SALARY_STRUCTURES.EMPLOYEES_WITHOUT_STRUCTURE);
    }

    async getSalaryStatistics() {
      return this.get(API_ENDPOINTS.SALARY_STRUCTURES.STATISTICS);
    }

    // Policy methods
    async createPolicy(policyData) {
      return this.post(API_ENDPOINTS.POLICIES.CREATE, policyData);
    }

    async getAllPolicies(params = {}) {
      return this.get(buildEndpointWithQuery(API_ENDPOINTS.POLICIES.GET_ALL, params));
    }

    async getActivePolicies(params = {}) {
      return this.get(buildEndpointWithQuery(API_ENDPOINTS.POLICIES.GET_ACTIVE, params));
    }

    async getPolicyById(id) {
      return this.get(API_ENDPOINTS.POLICIES.GET_BY_ID(id));
    }

    async updatePolicy(id, policyData) {
      return this.put(API_ENDPOINTS.POLICIES.UPDATE(id), policyData);
    }

    async deletePolicy(id) {
      return this.delete(API_ENDPOINTS.POLICIES.DELETE(id));
    }

    async permanentDeletePolicy(id) {
      return this.delete(`${API_ENDPOINTS.POLICIES.DELETE(id)}/permanent`);
    }

    async getPolicyStatistics() {
      return this.get(API_ENDPOINTS.POLICIES.STATISTICS);
    }
  }
  
  // Export the instance
  const apiClient = new ApiClient();
  export default apiClient;