/** Email/password login + sign-up against Better Auth. */
import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client.js';
import { getAuthCapabilities } from '../lib/api.js';

interface LoginProps {
  /** Optional: return to the marketing landing page. */
  onBack?: () => void;
  /** Called after a successful email sign-up, before App flips to the dashboard. */
  onSignedUp?: () => void;
}

export function Login({ onBack, onSignedUp }: LoginProps = {}) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [appleSignInEnabled, setAppleSignInEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAuthCapabilities()
      .then((capabilities) => {
        if (!cancelled) setAppleSignInEnabled(capabilities.socialProviders.apple);
      })
      .catch(() => {
        if (!cancelled) setAppleSignInEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    // try/catch: Better Auth returns `{ error }` for handled failures, but a network
    // drop *rejects* — without this the button would hang on `…` with no message.
    try {
      if (mode === 'forgot') {
        const res = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (res.error) setError(res.error.message ?? 'Could not send reset email');
        else setNotice('If that email has an account, a reset link is on its way.');
        return;
      }
      const res =
        mode === 'signup'
          ? await authClient.signUp.email({ email, password, name })
          : await authClient.signIn.email({ email, password });
      if (res.error) setError(res.error.message ?? 'Authentication failed');
      else if (mode === 'signup') onSignedUp?.();
      // On success, the useSession() hook in App flips to the dashboard.
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: 'signin' | 'signup' | 'forgot') {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function signInWithApple() {
    setError(null);
    setNotice(null);
    setSocialBusy(true);
    try {
      const res = await authClient.signIn.social({
        provider: 'apple',
        callbackURL: window.location.origin,
        errorCallbackURL: window.location.origin,
        disableRedirect: true,
      });
      if (res.error) {
        setError(res.error.message ?? 'Apple sign-in failed');
        return;
      }
      if (res.data?.url) {
        window.location.assign(res.data.url);
        return;
      }
      setError('Apple sign-in did not return a redirect URL.');
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setSocialBusy(false);
    }
  }

  return (
    <main className="rf-heat-bloom flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        {onBack && (
          <button
            type="button"
            id="login-back-btn"
            onClick={onBack}
            className="-ml-1 flex items-center gap-1.5 self-start font-ui text-sm text-interactive hover:text-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive rounded"
            aria-label="Back to home"
          >
            <span aria-hidden="true">←</span> Back to home
          </button>
        )}
        <header className="flex flex-col gap-3">
          <span className="rf-eyebrow">For instructors who build the class</span>
          <div className="flex items-center gap-3">
            <span className="rf-brand-mark" aria-hidden="true">
              R
            </span>
            <h1 className="rf-heat-text font-display text-display-lg">Ritmo Studio</h1>
          </div>
          <p className="font-ui text-text-secondary">
            {mode === 'signup'
              ? 'Create your instructor account'
              : mode === 'forgot'
                ? 'Reset your password'
                : 'Sign in to plan your classes'}
          </p>
        </header>

        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-card bg-bg-raised p-6 shadow-card"
        >
          {mode === 'signup' && (
            <>
              <label htmlFor="login-name" className="sr-only">
                Name
              </label>
              <input
                id="login-name"
                className="rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}
          <label htmlFor="login-email" className="sr-only">
            Email
          </label>
          <input
            id="login-email"
            className="rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode !== 'forgot' && (
            <>
              <label htmlFor="login-password" className="sr-only">
                Password
              </label>
              <input
                id="login-password"
                className="rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby={error ? 'login-error' : undefined}
              />
            </>
          )}
          {error && (
            <p id="login-error" role="alert" className="font-ui text-sm text-state-danger">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="font-ui text-sm text-interactive">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="rounded-pill rf-btn-primary px-5 py-2 font-ui font-semibold text-text-on-accent disabled:opacity-50"
          >
            {busy
              ? '…'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : 'Sign in'}
          </button>
          {mode === 'signin' && appleSignInEnabled && (
            <button
              type="button"
              disabled={socialBusy}
              aria-busy={socialBusy}
              onClick={signInWithApple}
              className="rounded-pill border border-text-primary/30 bg-bg-base px-5 py-2 font-ui font-semibold text-text-primary disabled:opacity-50"
            >
              {socialBusy ? '…' : 'Continue with Apple'}
            </button>
          )}
          {mode === 'signin' && (
            <button
              type="button"
              className="self-start font-ui text-sm text-interactive"
              onClick={() => switchMode('forgot')}
            >
              Forgot password?
            </button>
          )}
        </form>

        <button
          className="font-ui text-sm text-interactive"
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
      </div>
    </main>
  );
}
