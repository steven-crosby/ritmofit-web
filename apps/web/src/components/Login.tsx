/** Email/password login + sign-up against Better Auth. */
import { useState } from 'react';
import { authClient } from '../lib/auth-client.js';

export function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res =
      mode === 'signup'
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) setError(res.error.message ?? 'Authentication failed');
    // On success, the useSession() hook in App flips to the dashboard.
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-semibold text-text-primary">RitmoFit</h1>
        <p className="font-ui text-text-secondary">
          {mode === 'signup' ? 'Create your instructor account' : 'Sign in to plan your classes'}
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-bg-raised p-6 shadow-card">
        {mode === 'signup' && (
          <input
            className="rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded-pill border border-interactive/30 bg-bg-base px-4 py-2 font-ui text-text-primary"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="font-ui text-sm text-intensity-all_out">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-pill bg-brand px-5 py-2 font-ui font-semibold text-text-on-accent disabled:opacity-50"
        >
          {busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button
        className="font-ui text-sm text-interactive"
        onClick={() => {
          setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
          setError(null);
        }}
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </main>
  );
}
