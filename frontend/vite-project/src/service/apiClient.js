class ApiClient {
    constructor() {
      this.baseURL = "http://localhost:4000/api";
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
        //check if response.ok === value
  
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("API Error", error);
        throw error;
      }
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
      return this.customFetch("/auth/passwordChange", {
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
    async checkIn(name) {
      const token = sessionStorage.getItem("authToken"); // get token
      return this.customFetch(`/attendance/checkin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
    }
    async checkOut(name) {
      const token = sessionStorage.getItem("authToken"); // get token
      return this.customFetch(`/attendance/checkout/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
    }

  }
  
  const apiClient = new ApiClient();
  
  export default apiClient;