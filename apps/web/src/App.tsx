/**
 * Root: gate on the Better Auth session.
 * - Signed out at "/" → MarketingPage (public front door, D15).
 *   "Sign in" / "Start building" CTAs flip showLogin → Login with onBack.
 * - Signed in → Dashboard.
 * - "/reset-password" → ResetPassword (works while signed out).
 * - Unknown path → NotFound.
 */
import { useState } from 'react';
import { authClient } from './lib/auth-client.js';
import { Login } from './components/Login.js';
import { Dashboard } from './components/Dashboard.js';
import { MarketingPage } from './components/MarketingPage.js';
import { ResetPassword } from './components/ResetPassword.js';
import { NotFound } from './components/NotFound.js';

// The app navigates in-component (no router); the real URL surface is '/' and
// '/reset-password'. Everything else is an unknown path → NotFound.
const KNOWN_PATHS = new Set(['/', '/reset-password']);

export function App() {
  const { data: session, isPending } = authClient.useSession();
  // Controls the signed-out state-switch: false = MarketingPage, true = Login.
  const [showLogin, setShowLogin] = useState(false);

  const skipLink = (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] rounded-pill bg-bg-raised px-4 py-2 font-ui text-text-primary shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
    >
      Skip to main content
    </a>
  );

  // Reset-password lands here from the email link; render before the session
  // gate so it works while signed out.
  if (window.location.pathname === '/reset-password') return <ResetPassword />;

  // Unknown path → 404 (Cloudflare SPA fallback serves index.html for all paths).
  if (!KNOWN_PATHS.has(window.location.pathname)) return <NotFound />;

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-ui text-text-tertiary">Loading…</p>
      </main>
    );
  }

  // Signed in → Dashboard.
  if (session) {
    return (
      <>
        {skipLink}
        <Dashboard userId={session.user.id} userName={session.user.name || session.user.email} />
      </>
    );
  }

  // Signed out + user clicked a CTA → Login with a back link.
  if (showLogin) {
    return (
      <>
        {skipLink}
        <Login onBack={() => setShowLogin(false)} />
      </>
    );
  }

  // Signed out, default → Marketing landing (D15).
  return <MarketingPage onSignIn={() => setShowLogin(true)} />;
}
