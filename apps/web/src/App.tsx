/**
 * Root: gate on the Better Auth session. Signed out → Login; signed in →
 * Dashboard (the minimal builder: create class → add a tagged track), proving
 * the end-to-end flow through the backend (M1 step 12 acceptance).
 */
import { authClient } from './lib/auth-client.js';
import { Login } from './components/Login.js';
import { Dashboard } from './components/Dashboard.js';
import { ResetPassword } from './components/ResetPassword.js';
import { NotFound } from './components/NotFound.js';

// The app navigates in-component (no router); the only real URLs are the root
// and the email-link reset page. Everything else is an unknown path.
const KNOWN_PATHS = new Set(['/', '/reset-password']);

export function App() {
  const { data: session, isPending } = authClient.useSession();

  const skipLink = (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] rounded-pill bg-bg-raised px-4 py-2 font-ui text-text-primary shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
    >
      Skip to main content
    </a>
  );

  // Reset-password lands here from the email link (no router); render it on
  // pathname before the session gate so it works while signed out.
  if (window.location.pathname === '/reset-password') return <ResetPassword />;

  // Cloudflare serves the SPA for every path, so an unknown URL must render a
  // 404 view here rather than silently falling through to Login/Dashboard.
  if (!KNOWN_PATHS.has(window.location.pathname)) return <NotFound />;

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-ui text-text-tertiary">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <>
        {skipLink}
        <Login />
      </>
    );
  }
  return (
    <>
      {skipLink}
      <Dashboard userId={session.user.id} userName={session.user.name || session.user.email} />
    </>
  );
}
