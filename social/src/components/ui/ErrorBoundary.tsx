import * as React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error; resetKey: number };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined, resetKey: 0 };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  handleRetry() {
    this.setState((s) => ({ hasError: false, error: undefined, resetKey: s.resetKey + 1 }));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6 font-serif">
            We couldn't load this part of the app. You can retry or refresh the page.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRetry}
              aria-label="Retry loading"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              aria-label="Reload page"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border/50 text-sm font-bold hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reload Page
            </button>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
