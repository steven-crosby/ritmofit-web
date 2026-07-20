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
import { RecoveryState } from './SharedState.js';

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
        <RecoveryState
          kind="error"
          title="This view lost the beat."
          event="An unexpected render error interrupted Ritmo Studio."
          safety="Your saved class work remains on the server. Unsaved changes in this view may need to be entered again."
          statusLabel="Render interrupted"
          role="alert"
          headingLevel="h1"
          className="w-full max-w-md shadow-card"
          primaryAction={
            <button
              type="button"
              onClick={this.handleReset}
              className="min-h-11 rounded-input rf-btn-primary px-5 font-ui text-sm font-semibold text-text-on-accent"
            >
              {this.props.resetLabel ?? 'Reload safely'}
            </button>
          }
        />
      </main>
    );
  }
}
