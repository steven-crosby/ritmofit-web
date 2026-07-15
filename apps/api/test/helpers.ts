/**
 * Integration-test helpers: drive the *real* mounted worker (`src/index.ts`)
 * against the migrated test D1, including real Better Auth sign-up + session
 * cookies. Everything goes through `worker.fetch` with the shared `cloudflare:test`
 * `env`, so the auth → DB → route stack is exercised exactly as in prod.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index.js';

const ORIGIN = 'https://test.ritmofit.studio';
const TEST_CLIENT_IP = '203.0.113.10';

/** Fetch the worker once, draining the execution context (so waitUntil work settles). */
export async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const ctx = createExecutionContext();
  const headers = new Headers(init.headers);
  if (!headers.has('cf-connecting-ip')) headers.set('cf-connecting-ip', TEST_CLIENT_IP);
  const res = await worker.fetch(new Request(`${ORIGIN}${path}`, { ...init, headers }), env, ctx);
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
  // The integration Worker uses an HTTPS origin, so exercise the same explicit
  // invite path as production. MOCK_PROVIDERS is only a music seam and must not
  // make generated test accounts implicitly eligible for signup.
  const mutableEnv = env as typeof env & { BETA_ALLOWED_EMAILS?: string };
  mutableEnv.BETA_ALLOWED_EMAILS = [mutableEnv.BETA_ALLOWED_EMAILS, email]
    .filter(Boolean)
    .join(',');
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

/**
 * Read the Better Auth password-reset token for a user straight from D1. Better
 * Auth stores it as a `verifications` row keyed `reset-password:<token>` with the
 * user id in `value`, so a test can drive the reset flow without parsing the
 * dev-fallback email log.
 */
export async function readResetToken(userId: string): Promise<string | null> {
  const row = await env.DB.prepare(
    "SELECT identifier FROM verifications WHERE value = ? AND identifier LIKE 'reset-password:%' ORDER BY created_at DESC LIMIT 1",
  )
    .bind(userId)
    .first<{ identifier: string }>();
  return row ? row.identifier.slice('reset-password:'.length) : null;
}

/** Bind a cookie to a fetch helper for an authenticated user. */
export function authed(cookie: string) {
  return (path: string, init: RequestInit = {}): Promise<Response> =>
    call(path, {
      ...init,
      headers: { 'content-type': 'application/json', cookie, ...(init.headers ?? {}) },
    });
}
