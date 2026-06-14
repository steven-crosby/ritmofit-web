/**
 * Integration-test helpers: drive the *real* mounted worker (`src/index.ts`)
 * against the migrated test D1, including real Better Auth sign-up + session
 * cookies. Everything goes through `worker.fetch` with the shared `cloudflare:test`
 * `env`, so the auth → DB → route stack is exercised exactly as in prod.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index.js';

const ORIGIN = 'https://test.ritmofit.studio';

/** Fetch the worker once, draining the execution context (so waitUntil work settles). */
export async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await worker.fetch(new Request(`${ORIGIN}${path}`, init), env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

export interface TestUser {
  cookie: string;
  userId: string;
  email: string;
}

/**
 * Create a fresh user via the real `/api/auth/sign-up/email` route and return the
 * session cookie. Emails are unique per call so a file can make several users
 * without colliding. (Sign-up rate limit is 10/hr — keep per-file users modest.)
 */
export async function signUpUser(): Promise<TestUser> {
  const email = `u-${crypto.randomUUID()}@example.com`;
  const res = await call('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'sup3r-secret-pw', name: 'Test User' }),
  });
  if (!res.ok) throw new Error(`sign-up failed (${res.status}): ${await res.text()}`);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const body = (await res.json()) as { user: { id: string } };
  return { cookie, userId: body.user.id, email };
}

/** Mark a test user's Better Auth email as verified for trust-graph route coverage. */
export async function verifyUserEmail(userId: string): Promise<void> {
  await env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run();
}

/** Bind a cookie to a fetch helper for an authenticated user. */
export function authed(cookie: string) {
  return (path: string, init: RequestInit = {}): Promise<Response> =>
    call(path, {
      ...init,
      headers: { 'content-type': 'application/json', cookie, ...(init.headers ?? {}) },
    });
}
