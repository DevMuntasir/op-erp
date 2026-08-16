import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Top-level error boundary: catches render-time errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
    // Store component stack for display
    this.setState({ componentStack: info.componentStack ?? null });
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-zinc-500">
            An unexpected error occurred. You can try again, or return to the dashboard.
          </p>
          {isDev && this.state.error && (
            <div className="mt-4 text-left rounded-xl bg-red-50 border border-red-200 p-4 overflow-auto max-h-64">
              <p className="text-xs font-bold text-red-700 mb-1">Error: {this.state.error.message}</p>
              {this.state.componentStack && (
                <pre className="text-[10px] text-red-600 whitespace-pre-wrap">{this.state.componentStack}</pre>
              )}
            </div>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
            <Button onClick={this.handleReload} className="bg-zinc-900 text-white hover:bg-zinc-800">
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
