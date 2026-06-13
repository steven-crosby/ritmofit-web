/**
 * Error boundary (B3). A render-time throw anywhere below this unmounts only to
 * the fallback instead of white-screening the whole tree. Used twice: a global
 * net around <App/> (main.tsx), and a narrower one around LiveMode whose reset
 * exits live mode rather than reloading (Dashboard.tsx).
 *
 * Must be a class component — only class lifecycles (`getDerivedStateFromError` /
 * `componentDidCatch`) can catch descendant render errors in React.
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Label for the recover button. Defaults to a full reload. */
  resetLabel?: string;
  /** Recover action. When set, the button calls this instead of reloading. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack);
  }

  handleReset = () => {
    if (this.props.onReset) {
      this.setState({ error: null });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="rf-hero-glow flex min-h-screen flex-col items-center justify-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-card bg-bg-raised p-6 shadow-card">
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-text-primary">
            Something went wrong
          </h1>
          <p className="font-ui text-text-secondary">
            An unexpected error interrupted the app. Your saved work is safe on the server.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-pill rf-btn-primary px-5 py-2 font-ui font-semibold text-text-on-accent"
          >
            {this.props.resetLabel ?? 'Reload'}
          </button>
        </div>
      </main>
    );
  }
}
