import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, Info } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  showDebugInfo: boolean;
}

interface ApiError {
  endpoint: string;
  status: number | string;
  message: string;
  timestamp: string;
}

interface ReactErrorLog {
  error: string;
  message: string;
  stack?: string;
  componentStack: string;
  timestamp: string;
  url: string;
  userAgent: string;
  props: unknown;
}

interface DebugInfo {
  currentError: {
    message?: string;
    stack?: string;
    componentStack?: string;
    timestamp: string;
  };
  environment: {
    url: string;
    userAgent: string;
    timestamp: string;
    localStorage: {
      hasAuthToken: boolean;
      authTokenLength: number;
    };
  };
  apiErrors: ApiError[];
  networkErrors: unknown[];
  loginErrors: unknown[];
  profileErrors: unknown[];
  reactErrors: ReactErrorLog[];
  lastAuthError: unknown;
}

// Extend the Window interface to include custom error logs
declare global {
  interface Window {
    reactErrors?: ReactErrorLog[];
    apiErrorLog?: ApiError[];
    networkErrors?: unknown[];
    loginErrors?: unknown[];
    profileErrors?: unknown[];
    lastAuthError?: unknown;
  }
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      showDebugInfo: false
    };
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Enhanced error logging for debugging
    console.error('🚨 React Error Boundary caught an error:', error);
    console.error('🔍 Error Info:', errorInfo);
    console.error('📍 Component Stack:', errorInfo.componentStack);

    // Store error in global error log for debugging
    if (!window.reactErrors) window.reactErrors = [];
    window.reactErrors.push({
      error: error.toString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      props: this.props
    });

    // Keep only last 20 errors to prevent memory issues
    if (window.reactErrors.length > 20) {
      window.reactErrors = window.reactErrors.slice(-20);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      showDebugInfo: false
    });
    // Force a re-render by updating the key prop if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  copyErrorToClipboard = (): void => {
    const debugInfo = this.getDebugInfo();

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
      .then(() => {
        alert('Debug information copied to clipboard! Please share this with support.');
      })
      .catch(err => {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: create a text area and select its content
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(debugInfo, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Debug information copied to clipboard! Please share this with support.');
      });
  };

  getDebugInfo = (): DebugInfo => {
    return {
      // Current error details
      currentError: {
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        timestamp: new Date().toISOString()
      },
      // Environment info
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        localStorage: {
          hasAuthToken: !!localStorage.getItem('authToken'),
          authTokenLength: localStorage.getItem('authToken')?.length || 0
        }
      },
      // API error logs
      apiErrors: window.apiErrorLog || [],
      networkErrors: window.networkErrors || [],
      loginErrors: window.loginErrors || [],
      profileErrors: window.profileErrors || [],
      reactErrors: window.reactErrors || [],
      lastAuthError: window.lastAuthError || null
    };
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const debugInfo = this.getDebugInfo();
      const hasApiErrors = debugInfo.apiErrors.length > 0 || debugInfo.networkErrors.length > 0;

      return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-8 border border-neutral-200 dark:border-neutral-700">
            <div className="text-center mb-8">
              <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>

              <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">
                Something went wrong
              </h2>

              <p className="text-neutral-600 dark:text-neutral-300 mb-6">
                We're sorry, but something unexpected happened. This error has been logged for debugging.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 hover:scale-105 shadow-lg flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>

                <button
                  onClick={this.handleRetry}
                  className="px-6 py-3 bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-xl font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-all duration-200 hover:scale-105"
                >
                  Try Again
                </button>

                <button
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-all duration-200 hover:scale-105 flex items-center gap-2"
                >
                  <Bug className="w-4 h-4" />
                  {this.state.showDetails ? 'Hide' : 'Show'} Details
                </button>

                <button
                  onClick={this.copyErrorToClipboard}
                  className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-all duration-200 hover:scale-105 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Debug Info
                </button>
              </div>

              {/* Debug Information Toggle */}
              <button
                onClick={() => this.setState({ showDebugInfo: !this.state.showDebugInfo })}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mx-auto"
              >
                <Info className="w-4 h-4" />
                {this.state.showDebugInfo ? 'Hide' : 'Show'} Debug Summary
              </button>
            </div>

            {/* Debug Summary */}
            {this.state.showDebugInfo && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Debug Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
                  <div>
                    <p><strong>Error Type:</strong> {this.state.error?.name || 'Unknown'}</p>
                    <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
                    <p><strong>Auth Token:</strong> {debugInfo.environment.localStorage.hasAuthToken ? 'Present' : 'Missing'}</p>
                  </div>
                  <div>
                    <p><strong>Recent API Errors:</strong> {debugInfo.apiErrors.length}</p>
                    <p><strong>Network Errors:</strong> {debugInfo.networkErrors.length}</p>
                    <p><strong>React Errors:</strong> {debugInfo.reactErrors.length}</p>
                  </div>
                </div>
                {hasApiErrors && (
                  <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ Recent API/Network errors detected. This may be related to server connectivity issues.
                  </div>
                )}
              </div>
            )}

            {/* Detailed Error Information */}
            {this.state.showDetails && this.state.error && (
              <div className="text-left space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error Details</h3>
                  <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                    <p><strong>Message:</strong> {this.state.error.message}</p>
                    <details>
                      <summary className="cursor-pointer font-medium">Stack Trace</summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-48 whitespace-pre-wrap bg-red-100 dark:bg-red-900/30 p-2 rounded">
                        {this.state.error.stack}
                      </pre>
                    </details>
                    {this.state.errorInfo?.componentStack && (
                      <details>
                        <summary className="cursor-pointer font-medium">Component Stack</summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-48 whitespace-pre-wrap bg-red-100 dark:bg-red-900/30 p-2 rounded">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>

                {/* Recent API Errors */}
                {debugInfo.apiErrors.length > 0 && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                      Recent API Errors ({debugInfo.apiErrors.length})
                    </h3>
                    <div className="max-h-48 overflow-auto">
                      {debugInfo.apiErrors.slice(-5).map((error, index) => (
                        <div key={index} className="text-sm text-orange-700 dark:text-orange-300 mb-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <p><strong>{error.endpoint}</strong> - {error.status} - {error.message}</p>
                          <p className="text-xs opacity-75">{error.timestamp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-600 text-center">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                If this problem persists, please copy the debug information and contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;