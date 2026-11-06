/**
 * Root: gate on the Better Auth session, routed by the URL (RF-129, `lib/app-route.ts`).
 * - Signed out at "/" → MarketingPage (public front door, D15). Its CTAs go to
 *   "/sign-in" and "/sign-up", which have their own paths; old "/?auth=" links are
 *   redirected in `main.tsx` before the first render (`redirectLegacyAuthIntent`).
 * - Signed out on a signed-in path ("/classes/<id>", "/music", …) → "/sign-in",
 *   then back to that path once signed in.
 * - Signed in → Dashboard, which restores the screen the path names.
 * - Session lost during Live → Live stays mounted with a signed-out line.
 * - Session lost elsewhere (not Sign out) → Login with a "session ended" line.
 * - "/reset-password" → ResetPassword (works while signed out).
 * - Unknown path → NotFound.
 */
import { useLayoutEffect, useReducer, useRef } from 'react';
import { authClient } from './lib/auth-client.js';
import { clearExplicitSignOut, useLiveActive, wasExplicitSignOut } from './lib/session-guard.js';
import {
  clearReturnTo,
  consumeReturnTo,
  isDashboardRoute,
  navigate,
  parseRoute,
  rememberReturnTo,
  usePathname,
  type RouteHistoryState,
} from './lib/app-route.js';
import { Login } from './components/Login.js';
import { Dashboard } from './components/Dashboard.js';
import { MarketingPage } from './components/MarketingPage.js';
import { ResetPassword } from './components/ResetPassword.js';
import { NotFound } from './components/NotFound.js';
import { PrivacyPage } from './components/PrivacyPage.js';
import { WorkspaceLoadingState } from './components/SharedState.js';
import { markOnboardingVideoPending } from './lib/onboarding-video.js';

/** A redirect App makes before it paints the screen it lands on. */
type Redirect = 'after-sign-in' | 'to-sign-in' | 'to-root';

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const route = parseRoute(pathname);
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

  const retained = session || liveActive ? lastUser.current : null;
  const authRoute = route.kind === 'sign-in' || route.kind === 'sign-up';
  let redirect: Redirect | null = null;
  if (retained) {
    if (authRoute) redirect = 'after-sign-in';
  } else if (!isPending && !lastUser.current && isDashboardRoute(route) && route.kind !== 'root') {
    // Sign out lands on the front door; any other signed-out visit signs in first.
    redirect = wasExplicitSignOut() ? 'to-root' : 'to-sign-in';
  }

  useLayoutEffect(() => {
    if (redirect === 'after-sign-in') navigate(consumeReturnTo() ?? '/', { replace: true });
    else if (redirect === 'to-sign-in') {
      rememberReturnTo(window.location.pathname);
      navigate('/sign-in', { replace: true });
    } else if (redirect === 'to-root') navigate('/', { replace: true });
  }, [redirect]);

  // Signed in anywhere but Sign in or Sign up (on "/", say), a remembered deep link
  // is moot: drop it, so a later /sign-in visit in this tab cannot jump to it.
  // A failed Sign in with Apple returns to "/sign-in?error=<code>". Login shows it
  // once; drop the code so a refresh does not show it again, but only once the
  // session check settles: until then Login is not on screen to read it.
  const signedInAway = !!retained && !authRoute;
  const appleError =
    route.kind === 'sign-in' ? new URLSearchParams(window.location.search).get('error') : null;
  useLayoutEffect(() => {
    if (signedInAway) clearReturnTo();
    if (appleError && !isPending)
      window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [signedInAway, appleError, isPending]);

  // The signed-out landing page drops a remembered deep link: a visitor who left
  // sign-in for the front door has abandoned it, so a later sign-in lands on Classes.
  const atLanding = !retained && !isPending && !lastUser.current && route.kind === 'root';
  useLayoutEffect(() => {
    if (atLanding) clearReturnTo();
  }, [atLanding]);

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
  if (route.kind === 'reset-password') return <ResetPassword />;
  if (route.kind === 'privacy') return <PrivacyPage />;

  // Unknown path → 404 (Cloudflare SPA fallback serves index.html for all paths).
  if (route.kind === 'not-found') return <NotFound />;

  if (redirect) return <WorkspaceLoadingState />;

  // Signed in → Dashboard. A session lost while Live runs keeps Live mounted.
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
            navigate('/', { replace: true });
            rerender();
          }}
        />
      </>
    );
  }

  // Signed out on "/sign-in" or "/sign-up" → Login with a back link.
  if (authRoute) {
    return (
      <>
        {skipLink}
        <Login
          initialMode={route.kind === 'sign-up' ? 'signup' : 'signin'}
          onBack={() => {
            // From the landing page, Back is the browser's own Back.
            const state = window.history.state as RouteHistoryState | null;
            if (state?.from === '/') window.history.back();
            else navigate('/', { replace: true });
          }}
          onModeChange={(mode) =>
            navigate(mode === 'signup' ? '/sign-up' : '/sign-in', { replace: true })
          }
          onSignedUp={markOnboardingVideoPending}
          appleError={appleError}
        />
      </>
    );
  }

  // Signed out, default → Marketing landing (D15).
  return (
    <MarketingPage
      onSignIn={() => navigate('/sign-in')}
      onStartBuilding={() => navigate('/sign-up')}
    />
  );
}
