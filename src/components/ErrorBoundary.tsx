import React from "react";

interface State {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ hasError: true, error, errorInfo });
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 text-red-900 p-6">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">An unexpected error occurred while rendering this page. Details have been logged to the console.</p>
          {this.state.error && (
            <details className="whitespace-pre-wrap bg-white p-4 rounded shadow-sm">
              <summary className="cursor-pointer">Error details</summary>
              <div className="mt-2">
                <strong>{this.state.error.name}:</strong> {this.state.error.message}
                <pre className="mt-2 text-xs">{this.state.errorInfo?.componentStack}</pre>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
