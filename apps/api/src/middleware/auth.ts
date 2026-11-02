/**
 * Session middleware — resolves the Better Auth session to the canonical user.
 *
 * This is the identity gate. **Authorization** (per-resource access) is a separate
 * concern handled by `lib/authz.ts` `requireAccess` (step 5) — D1 has no RLS, so
 * both gates are load-bearing. Attach `requireSession` to every non-public route.
 */
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/types.js';
import { createAuth } from '../lib/auth.js';
import { serializeUser } from '../lib/serialize.js';

/**
 * Resolve the caller's Better Auth session, keeping any cookie Better Auth set.
 *
 * Better Auth rolls a session forward inside `getSession` once it is older than
 * `updateAge` (1 day by default): it extends `expires_at` and emits a `Set-Cookie`
 * with a fresh `Max-Age`. (For a dead session it emits a clearing cookie, which
 * `requireSession` does not forward.) Called as `auth.api.getSession({ headers })`, those cookies are dropped, so a
 * client that keeps its own cookie jar (the iOS app persists it in the Keychain)
 * never learns the later expiry, and its cookie dies on day 7 while the server row
 * is still live (audit AUD-007, RF-177). `returnHeaders` hands the cookies back so
 * callers can forward them. Browsers were unaffected only because the SPA also
 * calls Better Auth's own `/api/auth/get-session`.
 */
export async function resolveSession(env: AppEnv['Bindings'], headers: Headers) {
  const auth = createAuth(env);
  const { headers: authHeaders, response: session } = await auth.api.getSession({
    headers,
    returnHeaders: true,
  });
  // The Workers runtime implements getSetCookie; this package's Headers typing predates it.
  const setCookies = (authHeaders as Headers & { getSetCookie(): string[] }).getSetCookie();
  return { session, setCookies };
}

/**
 * Append session cookies to the response this request produced, keeping every
 * cookie the route set itself.
 *
 * Do not build a new Response and assign `c.res`: Hono 4.13's `res` setter replaces
 * the new response's `Set-Cookie` headers with the previous response's whenever the
 * previous one had any, so a route that sets its own cookie (the provider OAuth
 * state cookie) would silently drop the session cookie. `c.header(..., { append })`
 * appends to the response's headers (copying a finalized response first), keeping
 * the route's cookies.
 */
export function forwardSetCookies(c: Context<AppEnv>, setCookies: string[]): void {
  for (const cookie of setCookies) c.header('Set-Cookie', cookie, { append: true });
}

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  // Most routers register `use('*', requireSession)` and are mounted at `/`, so this
  // runs once per router on every request. Resolve (and forward the refresh) only
  // in the outermost run; nested runs see the identity already set.
  if (c.get('userId')) return next();

  const { session, setCookies } = await resolveSession(c.env, c.req.raw.headers);

  if (!session) {
    // Deliberately drop Better Auth's clearing cookie (Max-Age=0) here. The session
    // cookie name is the same for every account, so a slow request that carried
    // user A's dead cookie and answers after the client signed in as B would delete
    // B's cookie. A 401 already tells the client its session is gone; it clears its
    // own stored cookie.
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
  }

  c.set('userId', session.user.id);
  c.set('user', serializeUser(session.user));
  await next();
  // Any authed call can be the one that crosses updateAge, so every authed
  // response carries the refresh (a no-op on all other calls).
  forwardSetCookies(c, setCookies);
});
