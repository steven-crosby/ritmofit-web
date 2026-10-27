/**
 * Error boundary (B3). A render-time throw anywhere below this unmounts only to
 * the fallback instead of white-screening the whole tree. Used three ways: a global
 * net around <App/> (Root.tsx), one around LiveMode whose reset exits live mode
 * rather than reloading, and an inline `section` one around each Dashboard
 * destination so a crashed page keeps the app nav (Dashboard.tsx).
 *
 * Must be a class component — only class lifecycles (`getDerivedStateFromError` /
 * `componentDidCatch`) can catch descendant render errors in React.
 */
import { Component, createRef, type ReactNode } from 'react';
import { RecoveryState } from './SharedState.js';

interface Props {
  children: ReactNode;
  /** Label for the recover button. Defaults to a full reload. */
  resetLabel?: string;
  /** Recover action. When set, the button calls this instead of reloading. */
  onReset?: () => void;
  /** `section` renders inside the page (h2, focused reset) instead of taking the screen. */
  variant?: 'screen' | 'section';
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  resetRef = createRef<HTMLButtonElement>();

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Render error caught by ErrorBoundary:', error, info.componentStack);
  }

  componentDidMount() {
    if (this.props.variant === 'section' && this.state.error) this.resetRef.current?.focus();
  }

  componentDidUpdate(_prev: Props, prevState: State) {
    if (this.props.variant === 'section' && this.state.error && !prevState.error)
      this.resetRef.current?.focus();
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

    const resetButton = (
      <button
        ref={this.resetRef}
        type="button"
        onClick={this.handleReset}
        className="min-h-11 rounded-input rf-btn-primary px-5 font-ui text-sm font-semibold text-text-on-accent"
      >
        {this.props.resetLabel ?? 'Reload safely'}
      </button>
    );

    if (this.props.variant === 'section') {
      return (
        <section className="flex min-w-0 justify-center py-8">
          <RecoveryState
            kind="error"
            title="This page lost the beat."
            event="An unexpected render error interrupted this page. The rest of Ritmo Studio still works."
            safety="Your saved class work remains on the server. Unsaved changes on this page may need to be entered again."
            statusLabel="Render interrupted"
            role="alert"
            className="w-full max-w-md shadow-card"
            primaryAction={resetButton}
          />
        </section>
      );
    }

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
          primaryAction={resetButton}
        />
      </main>
    );
  }
}
