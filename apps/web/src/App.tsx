/**
 * Root: gate on the Better Auth session.
 * - Signed out at "/" → MarketingPage (public front door, D15).
 *   Marketing CTAs carry an explicit sign-in/sign-up intent into Login.
 * - Signed in → Dashboard.
 * - Session lost during Live → Live stays mounted with a signed-out line.
 * - Session lost elsewhere (not Sign out) → Login with a "session ended" line.
 * - "/reset-password" → ResetPassword (works while signed out).
 * - Unknown path → NotFound.
 */
import { useReducer, useRef, useState } from 'react';
import { authClient } from './lib/auth-client.js';
import { clearExplicitSignOut, useLiveActive, wasExplicitSignOut } from './lib/session-guard.js';
import { Login } from './components/Login.js';
import { Dashboard } from './components/Dashboard.js';
import { MarketingPage } from './components/MarketingPage.js';
import { ResetPassword } from './components/ResetPassword.js';
import { NotFound } from './components/NotFound.js';
import { PrivacyPage } from './components/PrivacyPage.js';
import { WorkspaceLoadingState } from './components/SharedState.js';
import { markOnboardingVideoPending } from './lib/onboarding-video.js';

// The app navigates in-component (no router); the real URL surface is '/' and
// '/reset-password'. Everything else is an unknown path → NotFound.
const KNOWN_PATHS = new Set(['/', '/privacy', '/reset-password']);

function initialAuthIntent(): 'signin' | 'signup' | null {
  if (window.location.pathname !== '/') return null;
  const intent = new URLSearchParams(window.location.search).get('auth');
  return intent === 'signin' || intent === 'signup' ? intent : null;
}

export function App() {
  const { data: session, isPending } = authClient.useSession();
  // Preserve the acquisition promise across the signed-out state switch: a
  // "Start building" click must land on account creation, never generic sign-in.
  const [authIntent, setAuthIntent] = useState<'signin' | 'signup' | null>(initialAuthIntent);
  const liveActive = useLiveActive();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  // The last signed-in user, kept so a session lost mid-class can leave Live mounted
  // and a session lost elsewhere can say so on Sign in instead of showing marketing.
  const lastUser = useRef<{ id: string; name: string } | null>(null);
  if (session) {
    lastUser.current = { id: session.user.id, name: session.user.name || session.user.email };
    clearExplicitSignOut();
  } else if (!isPending && wasExplicitSignOut()) {
    lastUser.current = null;
  }

  const skipLink = (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] rounded-pill bg-bg-raised px-4 py-2 font-ui text-text-primary shadow-card rf-focus-ring"
    >
      Skip to main content
    </a>
  );

  // Reset-password lands here from the email link; render before the session
  // gate so it works while signed out.
  if (window.location.pathname === '/reset-password') return <ResetPassword />;
  if (window.location.pathname === '/privacy') return <PrivacyPage />;

  // Unknown path → 404 (Cloudflare SPA fallback serves index.html for all paths).
  if (!KNOWN_PATHS.has(window.location.pathname)) return <NotFound />;

  // Signed in → Dashboard. A session lost while Live runs keeps Live mounted.
  const retained = session || liveActive ? lastUser.current : null;
  if (retained) {
    return (
      <>
        {skipLink}
        <Dashboard userId={retained.id} userName={retained.name} sessionLost={!session} />
      </>
    );
  }

  if (isPending) {
    return <WorkspaceLoadingState />;
  }

  // Lost without the instructor pressing Sign out → Sign in, saying why.
  if (lastUser.current) {
    return (
      <>
        {skipLink}
        <Login
          statusNotice="Your session ended. Sign in to continue."
          onBack={() => {
            lastUser.current = null;
            window.history.replaceState({}, '', '/');
            setAuthIntent(null);
            rerender();
          }}
        />
      </>
    );
  }

  // Signed out + user clicked a CTA → Login with a back link.
  if (authIntent) {
    return (
      <>
        {skipLink}
        <Login
          initialMode={authIntent}
          onBack={() => {
            window.history.replaceState({}, '', '/');
            setAuthIntent(null);
          }}
          onSignedUp={markOnboardingVideoPending}
        />
      </>
    );
  }

  // Signed out, default → Marketing landing (D15).
  return (
    <MarketingPage
      onSignIn={() => setAuthIntent('signin')}
      onStartBuilding={() => setAuthIntent('signup')}
    />
  );
}
