import * as React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error; resetKey: number; showDetails: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: undefined, resetKey: 0, showDetails: false };
    this.handleRetry = this.handleRetry.bind(this);
    this.handleResetStorage = this.handleResetStorage.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught error in UI:', error, info);
  }

  handleRetry() {
    this.setState((s) => ({ hasError: false, error: undefined, resetKey: s.resetKey + 1 }));
  }

  handleResetStorage() {
    try {
      localStorage.removeItem('yortalks-storage');
      localStorage.removeItem('yortalks-tokens');
      sessionStorage.clear();
    } catch {
      // Ignore
    }
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" className="flex flex-col items-center justify-center min-h-[420px] px-6 py-12 text-center font-sans">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5 ring-4 ring-destructive/5">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2 text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6 font-serif">
            We couldn't load this part of the app. You can retry, refresh the page, or reset cached data.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <button
              onClick={this.handleRetry}
              aria-label="Retry loading"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity glow-neon-primary"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              aria-label="Reload page"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border/60 text-xs font-bold hover:bg-muted/50 transition-colors text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload Page
            </button>
            <button
              onClick={this.handleResetStorage}
              aria-label="Reset Cache & Reload"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-destructive/30 text-destructive text-xs font-bold hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset Cache & Reload
            </button>
          </div>

          {this.state.error && (
            <div className="mt-4 max-w-lg w-full text-left">
              <button
                type="button"
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                className="text-[0.68rem] text-muted-foreground hover:text-foreground font-mono underline block mx-auto text-center"
              >
                {this.state.showDetails ? 'Hide error details' : 'Show error details'}
              </button>
              {this.state.showDetails && (
                <pre className="mt-2 p-3 rounded-xl surface-1 border border-border/40 text-[0.65rem] font-mono text-destructive/90 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
