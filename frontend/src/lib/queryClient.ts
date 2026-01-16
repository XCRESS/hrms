import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/types';

// Create React Query client with optimal configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,

      // Cache time: Unused data stays in cache for 10 minutes
      gcTime: 1000 * 60 * 10,

      // Refetch on window focus (good for attendance/dashboard)
      refetchOnWindowFocus: true,

      // Refetch on reconnect (handles offline scenarios)
      refetchOnReconnect: true,

      // Refetch on mount only if data is stale (prevents unnecessary requests while ensuring freshness)
      refetchOnMount: 'stale' as const,

      // Retry failed requests 2 times with exponential backoff
      retry: (failureCount, error: unknown) => {
        const apiError = error as ApiError;

        // Don't retry on authentication errors
        if (apiError?.status === 401) return false;

        // Don't retry on validation errors
        if (apiError?.isValidationError) return false;

        // Retry network errors up to 2 times
        return failureCount < 2;
      },

      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Use error boundaries for server errors (500+)
      // Client errors (400s) should be handled locally in components
      useErrorBoundary: (error: unknown) => {
        const apiError = error as ApiError;
        return (apiError?.status ?? 0) >= 500;
      },
    },
    mutations: {
      // Retry mutations once on network error
      retry: (failureCount, error: unknown) => {
        const apiError = error as ApiError;
        if (apiError?.status === 401 || apiError?.isValidationError) return false;
        return failureCount < 1;
      },

      // Throw server errors to error boundary
      useErrorBoundary: (error: unknown) => {
        const apiError = error as ApiError;
        return (apiError?.status ?? 0) >= 500;
      },
    },
  },
});
