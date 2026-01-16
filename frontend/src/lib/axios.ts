import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse } from '@/types';
import { tokenStorage } from './tokenStorage';

// Base URL from environment or fallback
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Expected validation error codes (backend should provide these)
// TODO: Coordinate with backend to use error codes instead of messages
const EXPECTED_VALIDATION_MESSAGES = [
  'Already checked in for today',
  'Already checked out for today',
  'No check-in record found for today',
] as const;

// Response interceptor - Handle token refresh and errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Handle token refresh from backend
    const data = response.data as ApiResponse;
    if (data?.newToken) {
      tokenStorage.set(data.newToken);

      // Dispatch event for other components to update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tokenRefreshed', {
            detail: { token: data.newToken },
          })
        );
      }
    }

    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const customError: ApiError = {
      message: 'An error occurred',
      status: error.response?.status || 500,
      endpoint: error.config?.url,
      timestamp: new Date().toISOString(),
    };

    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      tokenStorage.remove();
      customError.message = 'Authentication failed. Please login again.';
    }

    // Handle 400 - Validation errors
    else if (error.response?.status === 400) {
      customError.isValidationError = true;
      customError.message = error.response.data?.message || 'Validation failed';

      // Capture validation details from backend
      if (error.response.data?.details) {
        customError.validationDetails = error.response.data.details;
      }

      // Check if this is an expected validation (not a real error)
      customError.isExpectedValidation = EXPECTED_VALIDATION_MESSAGES.includes(
        customError.message as typeof EXPECTED_VALIDATION_MESSAGES[number]
      );
    }

    // Handle network errors
    else if (error.code === 'ERR_NETWORK' || !error.response) {
      customError.isServerUnavailable = true;
      customError.isDNSError = true;
      customError.message = 'Network error. Please check your connection.';

      const hostname = new URL(BASE_URL).hostname;
      customError.userFriendlyMessage =
        `Cannot connect to ${hostname}. This may be due to:\n` +
        `• Network connection issues\n` +
        `• Server is temporarily unavailable\n` +
        `• Try switching networks or contact support`;
    }

    // Use server error message if available
    else if (error.response?.data?.message) {
      customError.message = error.response.data.message;
    }

    return Promise.reject(customError);
  }
);

export default axiosInstance;
