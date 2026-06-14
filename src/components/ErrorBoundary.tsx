import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
    // In production, send to error reporting service
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload(); // Simple recovery
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-600 mb-6">An unexpected error occurred. The team has been notified.</p>
            <Button onClick={this.handleReset} className="rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" /> Reload Application
            </Button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 text-left text-xs bg-slate-100 p-4 rounded-xl overflow-auto text-rose-600">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;