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
      try {
        const url = `${this.baseURL}${endpoint}`;
        const headers = { ...this.defaultHeaders, ...options.headers };
        const config = {
          ...options,
          headers,
          credentials: "include",
        };
        console.log(`Fetching ${url}`);
        const response = await fetch(url, config);
        
        // Handle non-JSON responses
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          
          // For 401 unauthorized responses, clear token
          if (response.status === 401) {
            console.warn("Authentication error - clearing token");
            localStorage.removeItem("authToken");
          }
          
          if (!response.ok) {
            // Use the server message if available, otherwise a generic message
            const errorMessage = data.message || "API Error";
            
            // Create a custom error with additional data
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = data;
            
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
            
            // Only log unexpected errors (not validation errors)
            if (!error.isValidationError && !error.isExpectedValidation) {
              console.error("API Error", error);
            }
            
            throw error;
          }
          return data;
        } else {
          if (!response.ok) {
            const error = new Error("API Error");
            error.status = response.status;
            console.error("API Error (non-JSON)", error);
            throw error;
          }
          return { success: response.ok };
        }
      } catch (error) {
        // If it's already been classified as a validation error, don't log it
        if (error.isExpectedValidation) {
          // Silently pass through expected validation errors
          throw error;
        }
        
        // If it's a network error (like server not available), mark it as such
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          error.isServerUnavailable = true;
          // Only log server unavailable errors in development or if not already logged
          if (import.meta.env.MODE !== 'production') {
            console.error("API Server Unavailable", error);
          }
        } else if (!error.isValidationError) {
          // Only log unexpected errors that haven't been logged already
          console.error("API Error", error);
        }
        
        throw error;
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
      return this.customFetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    }
  
    async getProfile() {
      const token = localStorage.getItem("authToken"); // get token
      return this.customFetch(API_ENDPOINTS.EMPLOYEES.PROFILE, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  
    async passwordChange(name, email, newPassword) {
      return this.customFetch("/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ name, email, newPassword }),
      });
    }
   
    async createEmployee(employeeData) {
      const token = localStorage.getItem("authToken"); // get token
      return this.customFetch("/employees/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      });
    }

    async getEmployees(params = {}) {
      const token = localStorage.getItem("authToken"); // get token
      const queryString = params.status ? `?status=${params.status}` : '';
      return this.customFetch(`/employees${queryString}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async deleteEmployee(employeeId) {
      const token = localStorage.getItem("authToken"); // get token
      return this.customFetch(`/employees/delete/${employeeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async toggleEmployeeStatus(employeeId) {
      const token = localStorage.getItem("authToken"); // get token
      return this.customFetch(`/employees/toggle-status/${employeeId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Check-in and Check-out
    async checkIn(locationData = {}) {
      return this.post(API_ENDPOINTS.ATTENDANCE.CHECK_IN, locationData);
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
      return this.get("/attendance/today-with-absents");
    }

    // Get admin attendance data for a date range - optimized for AdminAttendanceTable
    async getAdminAttendanceRange(startDate, endDate) {
      const queryParams = new URLSearchParams({
        startDate: startDate,
        endDate: endDate
      });
      return this.get(`/attendance/admin-range?${queryParams.toString()}`);
    }

    // Get employee attendance with absent days included
    async getEmployeeAttendanceWithAbsents(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString ? `/attendance/employee-with-absents?${queryString}` : '/attendance/employee-with-absents';
      return this.get(endpoint);
    }

    // Update attendance record (HR/Admin only)
    async updateAttendanceRecord(recordId, updateData) {
      return this.put(`/attendance/update/${recordId}`, updateData);
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
      return this.get("/holidays");
    }

    async createHoliday(holidayData) {
      const token = localStorage.getItem("authToken");
      return this.post("/holidays", holidayData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async updateHoliday(holidayId, holidayData) {
      const token = localStorage.getItem("authToken");
      return this.put(`/holidays/${holidayId}`, holidayData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async deleteHoliday(holidayId) {
      const token = localStorage.getItem("authToken");
      return this.delete(`/holidays/${holidayId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Announcements
    async getAnnouncements(params = {}) {
      return this.get(`/announcements${Object.keys(params).length ? '?' + new URLSearchParams(params) : ''}`);
    }

    async getAnnouncementById(id) {
      return this.get(`/announcements/${id}`);
    }

    async createAnnouncement(announcementData) {
      return this.post("/announcements", announcementData);
    }

    async updateAnnouncement(id, announcementData) {
      return this.put(`/announcements/${id}`, announcementData);
    }

    async deleteAnnouncement(id) {
      return this.delete(`/announcements/${id}`);
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
      return this.post("/help", inquiryData);
    }
    
    async getMyInquiries() {
      return this.get(`/help/my`);
    }

    async getAllInquiries(filters = {}) {
      // Convert filters to query string
      const queryParams = new URLSearchParams();
      if (filters.status) {
        queryParams.append('status', filters.status);
      }
      if (filters.priority) {
        queryParams.append('priority', filters.priority);
      }
      const queryString = queryParams.toString();
      const endpoint = `/help/all${queryString ? `?${queryString}` : ''}`;
      
      return this.get(endpoint);
    }

    async updateHelpInquiry(inquiryId, updateData) {
      return this.patch(`/help/${inquiryId}`, updateData);
    }

    async linkEmployeeToUser(userId, employeeId, endpoint = "/users/profile/link") {
      const token = localStorage.getItem("authToken");
      return this.customFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, employeeId }),
      });
    }

    async getUsersWithMissingEmployeeIds() {
      const token = localStorage.getItem("authToken");
      return this.customFetch("/users/missing-employees", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async getAllUsers() {
      const token = localStorage.getItem("authToken");
      return this.customFetch("/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

    async getAllPasswordResetRequests(params = {}) { // params for filtering if needed, e.g., { status: 'pending' }
      return this.get("/password-reset/requests", params);
    }

    async approvePasswordResetRequest(requestId) {
      return this.put(`/password-reset/request/${requestId}/approve`);
    }

    async rejectPasswordResetRequest(requestId, remarks = "") {
      return this.put(`/password-reset/request/${requestId}/reject`, { remarks });
    }

    async getTaskReports(params = {}) {
      return this.get(buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.BASE, params));
    }

    // Employee-specific methods
    async getMyAttendanceRecords(params = {}) {
      const queryString = new URLSearchParams();
      if (params.page) queryString.append('page', params.page);
      if (params.limit) queryString.append('limit', params.limit);
      if (params.startDate) queryString.append('startDate', params.startDate);
      if (params.endDate) queryString.append('endDate', params.endDate);
      
      const endpoint = `/attendance/my${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      return this.get(endpoint);
    }

    async getMyTaskReports(params = {}) {
      const queryString = new URLSearchParams();
      if (params.page) queryString.append('page', params.page);
      if (params.limit) queryString.append('limit', params.limit);
      if (params.search) queryString.append('search', params.search);
      if (params.status && params.status !== 'all') queryString.append('status', params.status);
      if (params.startDate) queryString.append('startDate', params.startDate);
      if (params.endDate) queryString.append('endDate', params.endDate);
      
      const endpoint = `/task-reports/my${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      return this.get(endpoint);
    }

    async submitTaskReport(data) {
      return this.post("/task-reports/submit", data);
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
      return this.put(`/salary-slips/${employeeId}/${month}/${year}/status`, { status });
    }

    async bulkUpdateSalarySlipStatus(salarySlips, status) {
      return this.put('/salary-slips/bulk/status', { salarySlips, status });
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
  }
  
  // Export the instance
  const apiClient = new ApiClient();
  export default apiClient;