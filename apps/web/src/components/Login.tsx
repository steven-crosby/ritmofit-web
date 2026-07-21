/** Email/password login + sign-up against Better Auth. */
import { useEffect, useRef, useState } from 'react';
import { authClient } from '../lib/auth-client.js';
import { getAuthCapabilities } from '../lib/api.js';
import { CreatorLoopProof } from './CreatorLoopProof.js';

interface LoginProps {
  /** Acquisition intent selected on marketing. Defaults to returning-user sign-in. */
  initialMode?: 'signin' | 'signup';
  /** Optional: return to the marketing landing page. */
  onBack?: () => void;
  /** Called after a successful email sign-up, before App flips to the dashboard. */
  onSignedUp?: () => void;
}

type LoginMode = 'signin' | 'signup' | 'forgot';
type AppleAvailability = 'checking' | 'available' | 'unavailable' | 'unverified';

export function Login({ initialMode = 'signin', onBack, onSignedUp }: LoginProps = {}) {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [appleAvailability, setAppleAvailability] = useState<AppleAvailability>('checking');
  const [inviteOnly, setInviteOnly] = useState(true);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getAuthCapabilities()
      .then((capabilities) => {
        if (!cancelled) {
          setAppleAvailability(capabilities.socialProviders.apple ? 'available' : 'unavailable');
          setInviteOnly(capabilities.access.mode === 'invite_only');
        }
      })
      .catch(() => {
        if (!cancelled) setAppleAvailability('unverified');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
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
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: LoginMode) {
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

  const title =
    mode === 'signup'
      ? 'Use your invited email'
      : mode === 'forgot'
        ? 'Reset your password'
        : 'Welcome back, instructor.';
  const description =
    mode === 'signup'
      ? inviteOnly
        ? 'Your name and email stay here if the invitation needs attention.'
        : 'Create your personal instructor workspace.'
      : mode === 'forgot'
        ? 'We will send one secure reset link if the account exists.'
        : 'Continue to your personal class workspace.';
  const pendingLabel =
    mode === 'signup' ? 'Creating account…' : mode === 'forgot' ? 'Sending link…' : 'Signing in…';

  return (
    <main
      id="main-content"
      className="rf-hero-glow grid min-h-screen bg-bg-base lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]"
    >
      <section className="order-2 flex min-w-0 flex-col justify-between gap-8 border-t border-border-subtle p-5 sm:p-8 lg:order-1 lg:border-t-0 lg:border-r lg:p-12">
        <div className="flex items-center gap-3">
          <span className="rf-brand-mark" aria-hidden="true">
            R
          </span>
          <span className="font-display text-lg font-bold text-text-primary">Ritmo Studio</span>
        </div>
        <div className="mx-auto w-full max-w-2xl">
          <p className="rf-eyebrow">Your creative loop is waiting</p>
          <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[0.96] tracking-tight text-text-primary">
            The room starts here.
          </h2>
          <p className="mt-4 max-w-xl font-ui text-sm leading-6 text-text-secondary sm:text-base">
            Music, class shape, rehearsal, and Live—one private creator workspace.
          </p>
          <div className="mt-8">
            <CreatorLoopProof compact id="auth-product-proof" />
          </div>
        </div>
        <p className="font-ui text-xs text-text-tertiary">
          Private beta · invited instructors only · provider-authorized playback
        </p>
      </section>

      <section className="order-1 flex min-w-0 items-center justify-center p-5 sm:p-8 lg:order-2 lg:p-12">
        <div className="flex w-full max-w-md flex-col gap-6">
          {onBack && (
            <button
              type="button"
              id="login-back-btn"
              onClick={onBack}
              className="-ml-2 flex min-h-11 items-center gap-1.5 self-start rounded-control px-2 font-ui text-sm text-interactive hover:text-interactive-hover"
              aria-label="Back to home"
            >
              <span aria-hidden="true">←</span> Back to home
            </button>
          )}

          <header>
            <p className="rf-eyebrow">
              {mode === 'forgot'
                ? 'Account recovery'
                : mode === 'signup'
                  ? 'Invitation required'
                  : 'Sign in'}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text-primary">
              {title}
            </h1>
            <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">{description}</p>
          </header>

          <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
            {mode === 'signup' && (
              <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
                Name
                <input
                  id="login-name"
                  className="min-h-11 rounded-input border border-border-default bg-bg-sunken px-4 font-ui text-text-primary"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
              Email
              <input
                id="login-email"
                className="min-h-11 rounded-input border border-border-default bg-bg-sunken px-4 font-ui text-text-primary"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-describedby={error ? 'login-error' : undefined}
              />
            </label>

            {mode !== 'forgot' && (
              <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
                Password
                <input
                  id="login-password"
                  className="min-h-11 rounded-input border border-border-default bg-bg-sunken px-4 font-ui text-text-primary"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </label>
            )}

            {error && (
              <div
                id="login-error"
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="rounded-control border border-state-danger/30 bg-state-danger/5 p-3 font-ui text-sm leading-5 text-state-danger outline-none"
              >
                <strong className="block text-text-primary">Couldn’t continue</strong>
                <span>{error}</span>
                <span className="mt-1 block text-xs text-text-secondary">
                  Your entered name and email are still in the form.
                </span>
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="rounded-control border border-interactive/25 bg-interactive/5 p-3 font-ui text-sm text-text-primary"
              >
                {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || socialBusy}
              aria-busy={busy}
              className="min-h-11 rounded-input rf-btn-primary px-5 font-ui font-semibold text-text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy
                ? pendingLabel
                : mode === 'signup'
                  ? 'Create account'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : 'Sign in'}
            </button>

            {mode === 'signin' && appleAvailability === 'available' && (
              <button
                type="button"
                disabled={socialBusy || busy}
                aria-busy={socialBusy}
                onClick={signInWithApple}
                className="min-h-11 rounded-input border border-border-default bg-bg-sunken px-5 font-ui font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {socialBusy ? 'Opening Apple sign-in…' : 'Continue with Apple'}
              </button>
            )}

            {mode === 'signin' && appleAvailability !== 'available' && (
              <p aria-live="polite" className="font-ui text-xs leading-5 text-text-tertiary">
                {appleAvailability === 'checking'
                  ? 'Checking Sign in with Apple availability…'
                  : appleAvailability === 'unverified'
                    ? 'Couldn’t check Sign in with Apple. Email sign-in remains available.'
                    : 'Sign in with Apple is not available here. Email sign-in remains available.'}
              </p>
            )}

            {mode === 'signin' && (
              <button
                type="button"
                className="min-h-11 self-start rounded-control px-2 font-ui text-sm text-interactive"
                onClick={() => switchMode('forgot')}
              >
                Forgot password?
              </button>
            )}
          </form>

          <button
            type="button"
            className="min-h-11 self-start rounded-control px-2 font-ui text-sm text-interactive"
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin'
              ? 'Need an invited account? Sign up'
              : mode === 'forgot'
                ? 'Back to sign in'
                : 'Have an account? Sign in'}
          </button>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-subtle pt-4 font-ui text-xs text-text-tertiary">
            {inviteOnly && <span>Private beta · New accounts require an invitation.</span>}
            <a
              href="/privacy"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
            >
              Privacy and data
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
