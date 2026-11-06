import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse } from '@/types';
import { tokenStorage } from './tokenStorage';
import { currentAssistantThread } from './assistantAudit';

// Base URL from environment or fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
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

    const assistantThread = currentAssistantThread();
    if (assistantThread && config.headers) {
      config.headers['X-Assistant-Thread'] = assistantThread;
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

/** The backend re-issues the token when role, name or employee link changed since login. */
export const adoptRefreshedToken = (headers: unknown): void => {
  const token =
    headers instanceof Headers
      ? headers.get('x-refreshed-token')
      : (headers as Record<string, unknown> | undefined)?.['x-refreshed-token'];
  if (typeof token !== 'string' || !token) return;
  tokenStorage.set(token);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: { token } }));
  }
};

/** Ends the session on 401, and on 403 only for SESSION_REVOKED; a plain role mismatch must not log the user out. */
export const handleAuthFailure = (status: number | undefined, body: { message?: string; code?: string } | undefined): string | null => {
  const redirect = (reason: string) => {
    tokenStorage.remove();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/')) {
      window.location.href = `/auth/login?reason=${reason}`;
    }
  };
  if (status === 401) {
    redirect('session_expired');
    return body?.message || 'Authentication failed. Please login again.';
  }
  if (status === 403 && body?.code === 'SESSION_REVOKED') {
    redirect('session_revoked');
    return body.message || 'Your session has been revoked. Please contact HR.';
  }
  return null;
};

// Response interceptor - Handle token refresh and errors
axiosInstance.interceptors.response.use(
  (response) => {
    adoptRefreshedToken(response.headers);
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    adoptRefreshedToken(error.response?.headers);

    const customError: ApiError = {
      message: 'An error occurred',
      status: error.response?.status || 500,
      endpoint: error.config?.url,
      timestamp: new Date().toISOString(),
    };

    const authMessage = handleAuthFailure(error.response?.status, error.response?.data as { message?: string; code?: string } | undefined);
    if (authMessage) {
      customError.message = authMessage;
    }

    else if (error.response?.status === 403) {
      customError.message = error.response.data?.message || 'Access forbidden.';
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

      const hostname = new URL(API_BASE_URL).hostname;
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
