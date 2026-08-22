import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
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

/**
 * Top-level error boundary.
 *
 * Renders two different screens. Users get a calm, plain-language page with one
 * obvious way out. Developers additionally get the message, stack and component
 * stack inline, gated on `import.meta.env.DEV`.
 *
 * The previous version showed everyone four competing coloured buttons, a stack
 * trace, and a "Copy Debug Info" that put component props and auth-token
 * metadata on the clipboard. It also claimed the error "has been logged", which
 * was not true: nothing is reported anywhere. Neither belongs in front of an
 * employee who just wants to check in.
 *
 * NOTE: this component sits outside <BrowserRouter> in main.tsx, so it cannot
 * use <Link> or router hooks — navigation here has to go through
 * window.location.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });

    // The console is the only sink now. A window.reactErrors ring buffer used
    // to be maintained here for DebugPanel to render; with that panel gone
    // nothing read it back, so it was retaining error objects for no one.
    console.error('React Error Boundary caught an error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;
    // Only offer "Try again" when a parent passed a way to actually reset the
    // subtree. Without one it just re-renders the same broken tree and fails
    // again, which reads as the button being broken.
    const canRetry = Boolean(this.props.onRetry);

    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>

          <h1 className="text-xl font-semibold text-foreground mb-2">
            This page didn't load
          </h1>

          <p className="text-sm text-muted-foreground mb-8">
            Something went wrong on our end. Reloading usually fixes it — your
            data hasn't been affected.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reload page
            </button>

            {canRetry && (
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-input bg-background px-5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Try again
              </button>
            )}

            <button
              type="button"
              onClick={() => { window.location.href = '/dashboard'; }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Go to dashboard
            </button>
          </div>

          {/* Developer-only. Production users get nothing below this line. */}
          {isDev && this.state.error && (
            <details
              open={this.state.showDetails}
              onToggle={(e) => this.setState({ showDetails: e.currentTarget.open })}
              className="mt-10 text-left"
            >
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-3.5 w-3.5 transition-transform [details[open]_&]:rotate-180" aria-hidden="true" />
                Developer details
              </summary>

              <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {this.state.error.name}
                  </p>
                  <p className="mt-1 font-mono text-xs wrap-break-word text-muted-foreground">
                    {this.state.error.message}
                  </p>
                </div>

                {this.state.error.stack && (
                  <pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {this.state.error.stack}
                  </pre>
                )}

                {this.state.errorInfo?.componentStack && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-foreground">Component stack</p>
                    <pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
