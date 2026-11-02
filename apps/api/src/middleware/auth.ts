/**
 * Session middleware — resolves the Better Auth session to the canonical user.
 *
 * This is the identity gate. **Authorization** (per-resource access) is a separate
 * concern handled by `lib/authz.ts` `requireAccess` (step 5) — D1 has no RLS, so
 * both gates are load-bearing. Attach `requireSession` to every non-public route.
 *
 * Session refresh (RF-177, RF-178; audit AUD-007). Better Auth rolls a session
 * forward inside `getSession` once it is older than `updateAge` (1 day by default):
 * it extends `expires_at` and emits a `Set-Cookie` with a fresh `Max-Age`.
 *
 * - `POST /api/v1/auth/session` (`refreshSession`) lets it extend the row, so a
 *   native client keeps its session alive by calling that endpoint.
 * - Every other route (`requireSession`) resolves with refresh disabled.
 * - No `/api/v1` response ever carries a session cookie: not the refresh, and not
 *   Better Auth's `Max-Age=0` clear on 401. `getSession` is called without
 *   `returnHeaders`, so those cookies are discarded.
 *
 * Why no cookie at all (owner decision, option C, 2026-11-02): the session cookie
 * has the same name for every account, and URLSession applies `Set-Cookie` on its
 * own. A slow response for account A arriving after the user signed out and signed
 * in as B would overwrite B's cookie. The iOS app instead stores the cookie with no
 * client-side expiry and treats a 401 as signed out. Browsers keep their cookie
 * fresh through Better Auth's own `/api/auth/get-session` (the SPA's
 * `authClient.useSession()`), which this module does not touch.
 */
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/types.js';
import { createAuth } from '../lib/auth.js';
import { serializeUser } from '../lib/serialize.js';

const UNAUTHORIZED = { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } };

function sessionGate({ refresh }: { refresh: boolean }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    // Most routers register `use('*', requireSession)` and are mounted at `/`, so
    // this runs once per router on every request. Resolve only in the first run.
    if (c.get('sessionResolved')) return next();

    const auth = createAuth(c.env);
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
      ...(refresh ? {} : { query: { disableRefresh: true } }),
    });
    if (!session) return c.json(UNAUTHORIZED, 401);

    c.set('sessionResolved', true);
    c.set('userId', session.user.id);
    c.set('user', serializeUser(session.user));
    await next();
  });
}

/** The identity gate for ordinary routes: never refreshes, never sets a cookie. */
export const requireSession = sessionGate({ refresh: false });

/**
 * The identity gate for `POST /auth/session` only: extends a session older than
 * updateAge server-side, and still sets no cookie.
 */
export const refreshSession = sessionGate({ refresh: true });
