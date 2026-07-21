/** Password-reset completion reached from Better Auth's emailed link. */
import { useEffect, useRef, useState } from 'react';
import { authClient } from '../lib/auth-client.js';
import { CreatorLoopProof } from './CreatorLoopProof.js';

function readParams() {
  const params = new URLSearchParams(window.location.search);
  return { token: params.get('token'), linkError: params.get('error') };
}

export function ResetPassword() {
  const { token, linkError } = readParams();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const invalid = !token || linkError != null;

  useEffect(() => {
    if (invalid || error || done) messageRef.current?.focus();
  }, [done, error, invalid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    if (password !== confirmation) {
      setError('The passwords do not match. Both entries are still here.');
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) setError(res.error.message ?? 'Could not reset password');
      else setDone(true);
    } catch {
      setError('Could not reset password. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

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
          <p className="rf-eyebrow">Account recovery</p>
          <h2 className="mt-3 max-w-xl font-display text-[clamp(2rem,5vw,4.5rem)] font-bold leading-[0.96] tracking-tight text-text-primary">
            The room starts here.
          </h2>
          <p className="mt-4 max-w-xl font-ui text-sm leading-6 text-text-secondary sm:text-base">
            Reset access without losing the product context you came back to.
          </p>
          <div className="mt-8">
            <CreatorLoopProof compact id="reset-product-proof" />
          </div>
        </div>
        <p className="font-ui text-xs text-text-tertiary">
          Private beta · account recovery does not change classes or music connections
        </p>
      </section>

      <section className="order-1 flex min-w-0 items-center justify-center p-5 sm:p-8 lg:order-2 lg:p-12">
        <div className="flex w-full max-w-md flex-col gap-6">
          <header>
            <p className="rf-eyebrow">Set a new password</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text-primary">
              Choose a new password
            </h1>
            <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
              Use at least eight characters. This changes sign-in only; saved classes and provider
              connections remain unchanged.
            </p>
          </header>

          {done ? (
            <div
              ref={messageRef}
              tabIndex={-1}
              role="status"
              className="rounded-card border border-state-positive/25 bg-state-positive/5 p-5 outline-none"
            >
              <p className="font-ui font-semibold text-text-primary">Password reset complete</p>
              <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
                Your classes and music connections did not change. Sign in with the new password.
              </p>
              <a
                href="/?auth=signin"
                className="mt-4 inline-flex min-h-11 items-center rounded-control rf-btn-primary px-5 font-ui font-semibold text-text-on-accent sm:rounded-pill"
              >
                Go to sign in
              </a>
            </div>
          ) : invalid ? (
            <div
              ref={messageRef}
              tabIndex={-1}
              role="alert"
              className="rounded-card border border-state-danger/30 bg-state-danger/5 p-5 outline-none"
            >
              <p className="font-ui font-semibold text-text-primary">
                This reset link is invalid or has expired
              </p>
              <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
                No password or saved work changed. Return to sign in and request a fresh link.
              </p>
              <a
                href="/?auth=signin"
                className="mt-4 inline-flex min-h-11 items-center rounded-control rf-btn-primary px-5 font-ui font-semibold text-text-on-accent sm:rounded-pill"
              >
                Back to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
              <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
                New password
                <input
                  id="new-password"
                  className="min-h-11 rounded-input border border-border-default bg-bg-sunken px-4 font-ui text-text-primary"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  aria-describedby={error ? 'reset-error' : 'reset-password-help'}
                />
              </label>
              <p id="reset-password-help" className="-mt-2 font-ui text-xs text-text-tertiary">
                At least eight characters.
              </p>
              <label className="flex flex-col gap-1.5 font-ui text-sm text-text-secondary">
                Confirm password
                <input
                  id="confirm-password"
                  className="min-h-11 rounded-input border border-border-default bg-bg-sunken px-4 font-ui text-text-primary"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  minLength={8}
                  required
                  aria-describedby={error ? 'reset-error' : undefined}
                />
              </label>
              {error && (
                <div
                  id="reset-error"
                  ref={messageRef}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-control border border-state-danger/30 bg-state-danger/5 p-3 font-ui text-sm leading-5 text-state-danger outline-none"
                >
                  <strong className="block text-text-primary">Password was not changed</strong>
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="min-h-11 rounded-input rf-btn-primary px-5 font-ui font-semibold text-text-on-accent disabled:opacity-50"
              >
                {busy ? 'Resetting password…' : 'Set password'}
              </button>
              <a
                href="/?auth=signin"
                className="inline-flex min-h-11 items-center self-start rounded-control px-2 font-ui text-sm text-interactive"
              >
                Back to sign in
              </a>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
