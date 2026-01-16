import type { ApiError } from '@/types';
import { Button } from './button';

interface QueryErrorStateProps {
  error: ApiError | Error;
  title?: string;
  onRetry?: () => void;
}

/**
 * QueryErrorState Component
 * Reusable error UI for React Query errors
 *
 * Usage:
 * ```tsx
 * const { data, isError, error, refetch } = useEmployees();
 *
 * if (isError) {
 *   return (
 *     <QueryErrorState
 *       error={error}
 *       title="Failed to load employees"
 *       onRetry={refetch}
 *     />
 *   );
 * }
 * ```
 */
export const QueryErrorState: React.FC<QueryErrorStateProps> = ({
  error,
  title = 'Failed to load data',
  onRetry,
}) => {
  const apiError = error as ApiError;
  const isNetworkError = apiError?.isServerUnavailable || apiError?.isDNSError;
  const isAuthError = apiError?.status === 401;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
      <div className="text-destructive text-5xl mb-4">
        {isAuthError ? '🔒' : isNetworkError ? '🌐' : '⚠️'}
      </div>

      <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>

      <p className="text-muted-foreground mb-6 max-w-md">
        {isAuthError
          ? 'Your session has expired. Please login again to continue.'
          : isNetworkError
          ? 'Unable to connect to the server. Please check your internet connection and try again.'
          : apiError?.userFriendlyMessage ||
            apiError?.message ||
            error.message ||
            'An unexpected error occurred. Please try again.'}
      </p>

      {onRetry && !isAuthError && (
        <Button onClick={onRetry} variant="outline" className="gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          Try Again
        </Button>
      )}

      {/* Debug info (only show in development) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 text-left w-full max-w-md">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Debug Information
          </summary>
          <div className="mt-2 p-4 bg-muted rounded-lg text-xs font-mono">
            <div className="mb-2">
              <strong>Status:</strong> {apiError?.status || 'N/A'}
            </div>
            <div className="mb-2">
              <strong>Endpoint:</strong> {apiError?.endpoint || 'N/A'}
            </div>
            <div className="mb-2">
              <strong>Timestamp:</strong> {apiError?.timestamp || new Date().toISOString()}
            </div>
            <div className="mb-2">
              <strong>Message:</strong> {apiError?.message || error.message}
            </div>
            {apiError?.isValidationError && (
              <div className="mb-2">
                <strong>Type:</strong> Validation Error
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};
