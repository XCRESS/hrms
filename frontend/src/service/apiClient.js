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
          console.error("API Server Unavailable", error);
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

    async getEmployees() {
      const token = localStorage.getItem("authToken"); // get token
      return this.customFetch("/employees", {
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

    // Check-in and Check-out
    async checkIn() {
      return this.post(API_ENDPOINTS.ATTENDANCE.CHECK_IN);
    }
    
    async checkOut(tasks) {
      // The 'tasks' parameter is an array of strings
      return this.post(API_ENDPOINTS.ATTENDANCE.CHECK_OUT, { tasks });
    }
    
    // Attendance records
    async getAttendanceRecords(params = {}) {
      const token = localStorage.getItem("authToken");
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ATTENDANCE.RECORDS, params);
      return this.customFetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
      const token = localStorage.getItem("authToken");
      return this.customFetch("/help/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inquiryData),
      });
    }
    
    async getMyInquiries() {
      const token = localStorage.getItem("authToken");
      return this.customFetch(`/help/my`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async getAllInquiries(filters = {}) {
      const token = localStorage.getItem("authToken");
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
      
      return this.customFetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async updateHelpInquiry(inquiryId, updateData) {
      const token = localStorage.getItem("authToken");
      return this.customFetch(`/help/${inquiryId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
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
      const token = localStorage.getItem("authToken");
      return this.customFetch(API_ENDPOINTS.REGULARIZATIONS.REVIEW(id), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reviewComment }),
      });
    }

    async getAllPasswordResetRequests(params = {}) { // params for filtering if needed, e.g., { status: 'pending' }
      return this.get("/password-reset/requests", params);
    }

    async approvePasswordResetRequest(requestId) {
      return this.put(`/password-reset/requests/${requestId}/approve`);
    }

    async rejectPasswordResetRequest(requestId, remarks = "") {
      return this.put(`/password-reset/requests/${requestId}/reject`, { remarks });
    }

    async getTaskReports(params = {}) {
      return this.get(buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.BASE, params));
    }
  }
  
  // Export the instance
  const apiClient = new ApiClient();
  export default apiClient;