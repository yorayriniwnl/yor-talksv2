import * as React from 'react';

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
    // Send to logging service in production
    // eslint-disable-next-line no-console
    console.error('Uncaught error:', error, info);
  }

  handleRetry() {
    this.setState((s) => ({ hasError: false, error: undefined, resetKey: s.resetKey + 1 }));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" aria-live="assertive" style={{padding: 20}}>
          <h2>Something went wrong</h2>
          <p>We couldn't load this part of the app. You can retry or refresh the page.</p>
          <div style={{display: 'flex', gap: 8}}>
            <button onClick={this.handleRetry} aria-label="Retry loading">Retry</button>
            <button onClick={() => window.location.reload()} aria-label="Reload page">Reload</button>
          </div>
        </div>
      );
    }

    // Key forces subtree remount when retrying
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
