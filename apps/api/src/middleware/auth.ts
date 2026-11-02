/**
 * Session middleware — resolves the Better Auth session to the canonical user.
 *
 * This is the identity gate. **Authorization** (per-resource access) is a separate
 * concern handled by `lib/authz.ts` `requireAccess` (step 5) — D1 has no RLS, so
 * both gates are load-bearing. Attach `requireSession` to every non-public route.
 *
 * Session refresh (RF-177, audit AUD-007). Better Auth rolls a session forward
 * inside `getSession` once it is older than `updateAge` (1 day by default): it
 * extends `expires_at` and emits a `Set-Cookie` with a fresh `Max-Age`. Only
 * `POST /api/v1/auth/session` (`refreshSession`) is allowed to do that, and it
 * forwards the cookie so a native client that keeps its own cookie jar (iOS, in the
 * Keychain) learns the later expiry. Every other route resolves the session with
 * refresh disabled: it neither extends the row nor emits a cookie, so the next
 * `/auth/session` still finds the row due and refreshes it.
 *
 * Why only one route: the session cookie has the same name for every account. A
 * cookie sent on a slow response for account A (a refresh, or Better Auth's
 * `Max-Age=0` clear on 401) can land after the client signed out and signed in as
 * B, and overwrite B's cookie. Confining the cookie to one endpoint lets the client
 * guard that single response. A 401 never carries a cookie; the client discards
 * its own. Browsers keep refreshing through Better Auth's own
 * `/api/auth/get-session` (the SPA's `authClient.useSession()`).
 */
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/types.js';
import { createAuth } from '../lib/auth.js';
import { serializeUser } from '../lib/serialize.js';

const UNAUTHORIZED = { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } };

/** Resolve the caller's session; `refresh` lets Better Auth roll it forward. */
async function resolveSession(env: AppEnv['Bindings'], headers: Headers, refresh: boolean) {
  const auth = createAuth(env);
  const { headers: authHeaders, response: session } = await auth.api.getSession({
    headers,
    ...(refresh ? {} : { query: { disableRefresh: true } }),
    returnHeaders: true,
  });
  // The Workers runtime implements getSetCookie; this package's Headers typing predates it.
  const setCookies = (authHeaders as Headers & { getSetCookie(): string[] }).getSetCookie();
  return { session, setCookies };
}

/**
 * Append cookies to the response, keeping every cookie the route set itself.
 *
 * Do not build a new Response and assign `c.res`: Hono 4.13's `res` setter replaces
 * the new response's `Set-Cookie` headers with the previous response's whenever the
 * previous one had any. `c.header(..., { append })` appends in place (copying a
 * finalized response first).
 */
function forwardSetCookies(c: Context<AppEnv>, setCookies: string[]): void {
  for (const cookie of setCookies) c.header('Set-Cookie', cookie, { append: true });
}

/** The identity gate for ordinary routes: never refreshes, never sets a cookie. */
export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  // Most routers register `use('*', requireSession)` and are mounted at `/`, so this
  // runs once per router on every request. Resolve only in the first run.
  if (c.get('sessionResolved')) return next();

  const { session } = await resolveSession(c.env, c.req.raw.headers, false);
  // No Set-Cookie on 401: see the module comment.
  if (!session) return c.json(UNAUTHORIZED, 401);

  c.set('sessionResolved', true);
  c.set('userId', session.user.id);
  c.set('user', serializeUser(session.user));
  await next();
});

/**
 * The identity gate for `POST /auth/session` only: lets Better Auth refresh a
 * session older than updateAge and forwards that refresh cookie on success.
 */
export const refreshSession = createMiddleware<AppEnv>(async (c, next) => {
  const { session, setCookies } = await resolveSession(c.env, c.req.raw.headers, true);
  // No Set-Cookie on 401 (Better Auth's clearing cookie is dropped): see the module comment.
  if (!session) return c.json(UNAUTHORIZED, 401);

  c.set('sessionResolved', true);
  c.set('userId', session.user.id);
  c.set('user', serializeUser(session.user));
  await next();
  forwardSetCookies(c, setCookies);
});
