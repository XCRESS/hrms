// API Validation Utility
// This file helps validate API endpoint consistency and catch issues early

import { API_ENDPOINTS } from './apiEndpoints.js';

// Validation utilities
export const validateApiEndpoints = () => {
  const issues = [];
  
  // Check for common issues
  const checkEndpoint = (endpoint, name) => {
    if (!endpoint) {
      issues.push(`Missing endpoint: ${name}`);
      return;
    }
    
    if (typeof endpoint === 'string') {
      // Check for common patterns that might cause issues
      if (endpoint.includes('//')) {
        issues.push(`Double slash in endpoint: ${name} -> ${endpoint}`);
      }
      if (!endpoint.startsWith('/')) {
        issues.push(`Endpoint doesn't start with '/': ${name} -> ${endpoint}`);
      }
    }
  };
  
  // Validate all endpoint categories
  Object.entries(API_ENDPOINTS).forEach(([category, endpoints]) => {
    if (typeof endpoints === 'object' && endpoints !== null) {
      Object.entries(endpoints).forEach(([name, endpoint]) => {
        checkEndpoint(endpoint, `${category}.${name}`);
      });
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues: issues
  };
};

// Helper to log endpoint mapping for debugging
export const logEndpointMappings = () => {
  console.group('📡 API Endpoint Mappings');
  
  Object.entries(API_ENDPOINTS).forEach(([category, endpoints]) => {
    if (typeof endpoints === 'object' && endpoints !== null && category !== 'BASE_URL') {
      console.group(`🔗 ${category}`);
      Object.entries(endpoints).forEach(([name, endpoint]) => {
        const displayEndpoint = typeof endpoint === 'function' 
          ? `${endpoint('ID')} (function)` 
          : endpoint;
        console.log(`${name}: ${displayEndpoint}`);
      });
      console.groupEnd();
    }
  });
  
  console.groupEnd();
};

// Test endpoints reachability (in development)
export const testEndpointReachability = async (baseUrl = API_ENDPOINTS.BASE_URL) => {
  const results = {};
  
  // Test a few key endpoints
  const testEndpoints = [
    { name: 'Health Check', endpoint: '' },
    { name: 'Auth Login', endpoint: API_ENDPOINTS.AUTH.LOGIN },
    { name: 'Employees', endpoint: API_ENDPOINTS.EMPLOYEES.BASE },
    { name: 'Attendance', endpoint: API_ENDPOINTS.ATTENDANCE.BASE },
    { name: 'Regularizations', endpoint: API_ENDPOINTS.REGULARIZATIONS.BASE },
    { name: 'Task Reports', endpoint: API_ENDPOINTS.TASK_REPORTS.BASE }
  ];
  
  for (const { name, endpoint } of testEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        // Don't include auth headers for testing reachability
      });
      
      results[name] = {
        endpoint: `${baseUrl}${endpoint}`,
        status: response.status,
        reachable: response.status !== 404,
        statusText: response.statusText
      };
    } catch (error) {
      results[name] = {
        endpoint: `${baseUrl}${endpoint}`,
        status: 'ERROR',
        reachable: false,
        error: error.message
      };
    }
  }
  
  return results;
};

// Console helper for development
export const debugApiSetup = () => {
  console.group('🚀 API Configuration Debug');
  
  console.log('Base URL:', API_ENDPOINTS.BASE_URL);
  
  const validation = validateApiEndpoints();
  if (validation.isValid) {
    console.log('✅ All endpoints are valid');
  } else {
    console.error('❌ Endpoint validation issues:', validation.issues);
  }
  
  logEndpointMappings();
  
  console.groupEnd();
};

export default {
  validateApiEndpoints,
  logEndpointMappings,
  testEndpointReachability,
  debugApiSetup
}; 