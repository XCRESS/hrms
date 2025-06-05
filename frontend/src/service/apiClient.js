class ApiClient {
    constructor() {      
      this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";      
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
            sessionStorage.removeItem("authToken");
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
      const token = sessionStorage.getItem("authToken");
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
      const token = sessionStorage.getItem("authToken");
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
      const token = sessionStorage.getItem("authToken");
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
      const token = sessionStorage.getItem("authToken");
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
      const token = sessionStorage.getItem("authToken"); // get token
      console.log("Sending signup request with token:", token);
      return this.customFetch("/auth/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password }),
      });
    }
    
    async login(email, password) {
      return this.customFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    }
  
    async getProfile() {
      const token = sessionStorage.getItem("authToken"); // get token
      return this.customFetch("/employees/profile", {
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
      const token = sessionStorage.getItem("authToken"); // get token
      return this.customFetch("/employees/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      });
    }

    async getEmployees() {
      const token = sessionStorage.getItem("authToken"); // get token
      return this.customFetch("/employees", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async deleteEmployee(employeeId) {
      const token = sessionStorage.getItem("authToken"); // get token
      return this.customFetch(`/employees/delete/${employeeId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Check-in and Check-out
    async checkIn() {
      const token = sessionStorage.getItem("authToken");
      
      // Only proceed if we have a token
      if (!token) {
        throw new Error("Authentication required");
      }
      
      const result = await this.customFetch(`/attendance/checkin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Send empty body to ensure proper content-type headers
        body: JSON.stringify({})
      });
      
      return result;
    }
    
    async checkOut() {
      const token = sessionStorage.getItem("authToken");
      
      // Only proceed if we have a token
      if (!token) {
        throw new Error("Authentication required");
      }
      
      const result = await this.customFetch(`/attendance/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Send empty body to ensure proper content-type headers
        body: JSON.stringify({})
      });
      
      return result;
    }
    
    // Attendance records
    async getAttendanceRecords(params = {}) {
      const token = sessionStorage.getItem("authToken");
      const queryParams = new URLSearchParams();
      // Add any filters if provided
      if (params.employeeId) queryParams.append('employeeId', params.employeeId);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return this.customFetch(`/attendance${queryString}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
    }
    
    // Leave requests
    async requestLeave(leaveData) {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(`/leaves/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leaveData),
      });
    }
    
    async getMyLeaves() {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(`/leaves/my`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    // For admins/HR
    async getAllLeaves() {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch("/leaves/all", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    async updateLeaveStatus(leaveId, status) {
      // Uses the generic put method which handles token
      return this.put(`/leaves/${leaveId}/status`, { status });
    }
    
    // Holidays
    async getHolidays() {
      // Uses the generic get method which handles token
      return this.get("/holidays");
    }

    async createHoliday(holidayData) {
      const token = sessionStorage.getItem("authToken");
      return this.post("/holidays", holidayData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async updateHoliday(holidayId, holidayData) {
      const token = sessionStorage.getItem("authToken");
      return this.put(`/holidays/${holidayId}`, holidayData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async deleteHoliday(holidayId) {
      const token = sessionStorage.getItem("authToken");
      return this.delete(`/holidays/${holidayId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Announcements
    async getAnnouncements(params = {}) {
      // Pass query params for filtering (e.g., { status: 'draft' } for admin)
      return this.get("/announcements", { params });
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

    // Help/Support Inquiries
    async submitHelpInquiry(inquiryData) {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(`/help`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: inquiryData.title,
          description: inquiryData.message,
          category: inquiryData.category || "other",
          priority: inquiryData.priority || "medium"
        }),
      });
    }
    
    async getMyInquiries() {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(`/help/my`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    // For admins/HR only
    async getAllInquiries(filters = {}) {
      const token = sessionStorage.getItem("authToken");
      const queryParams = new URLSearchParams();
      
      // Add filters if provided
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.priority) queryParams.append('priority', filters.priority);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      
      return this.customFetch(`/help/all${queryString}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    async updateHelpInquiry(inquiryId, updateData) {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(`/help/${inquiryId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
    }

    // Link an employee ID to a user account (admin only)
    async linkEmployeeToUser(userId, employeeId, endpoint = "/users/profile/link") {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          employeeId
        }),
      });
    }
    
    // Find users with missing employee IDs (admin only)
    async getUsersWithMissingEmployeeIds() {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(`/users/missing-employee-id`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    async getAllUsers() {
      try {
        return await this.get('/users');
      } catch (err) {
        throw err;
      }
    }

    // Regularization: Employee submits a request
    async requestRegularization(data) {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch("/regularization/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
    }
    // Regularization: Employee gets own requests
    async getMyRegularizations() {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch("/regularization/my", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // Regularization: HR/Admin gets all requests
    async getAllRegularizations() {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch("/regularization/all", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    // Regularization: HR/Admin reviews a request
    async reviewRegularization(id, status, reviewComment) {
      const token = sessionStorage.getItem("authToken");
      return this.customFetch(`/regularization/${id}/review`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reviewComment }),
      });
    }

    // Password Reset Requests (for Admin/HR)
    async getAllPasswordResetRequests(params = {}) { // params for filtering if needed, e.g., { status: 'pending' }
      return this.get("/password-reset/requests", { params });
    }

    async approvePasswordResetRequest(requestId) {
      return this.put(`/password-reset/request/${requestId}/approve`, {});
    }

    async rejectPasswordResetRequest(requestId, remarks = "") {
      return this.put(`/password-reset/request/${requestId}/reject`, { remarks });
    }
  }
  
  const apiClient = new ApiClient();
  
  export default apiClient;