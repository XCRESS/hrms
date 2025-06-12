import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Force a re-render by updating the key prop if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-xl shadow-xl p-8 text-center border border-neutral-200 dark:border-neutral-700">
            <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">
              Something went wrong
            </h2>
            
            <p className="text-neutral-600 dark:text-neutral-300 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6 p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg text-sm">
                <summary className="cursor-pointer font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                Refresh Page
              </button>
              
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-xl font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-all duration-200 hover:scale-105"
              >
                Try Again
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-600">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Need help? Contact our support team for assistance.
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