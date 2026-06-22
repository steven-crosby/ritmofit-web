/**
 * Password-reset screen (B1). Reached via the link in the reset email, which
 * lands on `/reset-password?token=…` (Better Auth redirects here after validating
 * the token server-side). The app has no router, so `App` renders this purely on
 * pathname — it works signed-out. On success we send the user back to the root.
 */
import { useState } from 'react';
import { authClient } from '../lib/auth-client.js';

function readParams() {
  const params = new URLSearchParams(window.location.search);
  return { token: params.get('token'), linkError: params.get('error') };
}

export function ResetPassword() {
  const { token, linkError } = readParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setBusy(true);
    // try/catch so a network drop surfaces a message instead of hanging on `…`.
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

  const invalid = !token || linkError != null;

  return (
    <main className="rf-hero-glow flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="rf-brand-mark" aria-hidden="true">
              R
            </span>
            <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-text-primary">
              RitmoFit
            </h1>
          </div>
          <p className="font-ui text-text-secondary">Choose a new password</p>
        </header>

        <div className="flex flex-col gap-3 rounded-card bg-bg-raised p-6 shadow-card">
          {done ? (
            <>
              <p className="font-ui text-text-primary">Your password has been reset.</p>
              <a
                href="/"
                className="rounded-pill rf-btn-primary px-5 py-2 text-center font-ui font-semibold text-text-on-accent"
              >
                Go to sign in
              </a>
            </>
          ) : invalid ? (
            <>
              <p className="font-ui text-sm text-state-danger">
                This reset link is invalid or has expired.
              </p>
              <a
                href="/"
                className="rounded-pill rf-btn-primary px-5 py-2 text-center font-ui font-semibold text-text-on-accent"
              >
                Back to sign in
              </a>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <label htmlFor="new-password" className="sr-only">
                New password
              </label>
              <input
                id="new-password"
                className="rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                aria-describedby={error ? 'reset-error' : undefined}
              />
              {error && (
                <p id="reset-error" role="alert" className="font-ui text-sm text-state-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="rounded-pill rf-btn-primary px-5 py-2 font-ui font-semibold text-text-on-accent disabled:opacity-50"
              >
                {busy ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
