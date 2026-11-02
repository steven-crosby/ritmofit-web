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
 * Resolve the caller's Better Auth session, keeping any refreshed cookie.
 *
 * Better Auth rolls a session forward inside `getSession` once it is older than
 * `updateAge` (1 day by default): it extends `expires_at` and emits a `Set-Cookie`
 * with a fresh `Max-Age`. Called as `auth.api.getSession({ headers })`, that cookie
 * is dropped, so a client that keeps its own cookie jar (the iOS app persists it in
 * the Keychain) never learns the later expiry and its cookie dies on day 7 while the
 * server row is still live (audit AUD-007, RF-177). `returnHeaders` hands the
 * cookies back so callers can forward them. Browsers were unaffected only because
 * the SPA also calls Better Auth's own `/api/auth/get-session`.
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

/** Append refreshed session cookies to the response this handler produced. */
export function forwardSetCookies(c: Context<AppEnv>, setCookies: string[]): void {
  if (setCookies.length === 0) return;
  // Copy first: a Response built elsewhere can carry immutable headers.
  const res = new Response(c.res.body, c.res);
  for (const cookie of setCookies) res.headers.append('set-cookie', cookie);
  c.res = res;
}

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const { session, setCookies } = await resolveSession(c.env, c.req.raw.headers);

  if (!session) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
  }

  c.set('userId', session.user.id);
  c.set('user', serializeUser(session.user));
  await next();
  // Any authed call can be the one that crosses updateAge, so every authed
  // response carries the refresh (it is a no-op on all other calls).
  forwardSetCookies(c, setCookies);
});
