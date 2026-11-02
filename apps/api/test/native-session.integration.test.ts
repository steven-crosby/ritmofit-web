/**
 * Native-client session lifecycle (RF-177, the web half of iOS RF-1012; audit
 * code-audit-2026-10-27 AUD-007 and AUD-009).
 *
 * The iOS app talks to the API with URLSession: it carries the Better Auth session
 * cookie it saved in the Keychain, sends `content-type: application/json`, and sends
 * no `Origin`, `Referer` or `Sec-Fetch-*` headers. These tests drive the real worker
 * the same way (`call` adds none of those headers).
 */
import { describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { call, signUpUser } from './helpers.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Better Auth defaults (lib/auth.ts sets neither): expiresIn 7 days, updateAge 1 day.
const EXPIRES_IN_MS = 7 * DAY_MS;
const SESSION_COOKIE = '__Secure-better-auth.session_token';

async function sessionExpiresAt(userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE user_id = ?')
    .bind(userId)
    .first<{ expires_at: number }>();
  if (!row) throw new Error('no session row');
  return row.expires_at;
}

/** Make the user's session look `ageMs` old (Better Auth derives age from expires_at). */
async function ageSession(userId: string, ageMs: number): Promise<number> {
  const expiresAt = Date.now() + EXPIRES_IN_MS - ageMs;
  await env.DB.prepare('UPDATE sessions SET expires_at = ?, updated_at = ? WHERE user_id = ?')
    .bind(expiresAt, Date.now() - ageMs, userId)
    .run();
  return expiresAt;
}

function sessionSetCookie(res: Response): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
}

/** A request shaped like the iOS client's: cookie + JSON, no browser metadata. */
function nativePost(path: string, cookie: string, body: unknown = {}) {
  return call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
}

async function sessionStatus(cookie: string): Promise<number> {
  return (await nativePost('/api/v1/auth/session', cookie)).status;
}

describe('AUD-007: native session refresh reaches the client', () => {
  it('POST /auth/session returns a refreshed cookie with a later expiry for a session older than updateAge', async () => {
    const user = await signUpUser();
    const before = await ageSession(user.userId, 2 * DAY_MS);

    const res = await nativePost('/api/v1/auth/session', user.cookie);
    expect(res.status).toBe(200);

    // The server extended the session row...
    const after = await sessionExpiresAt(user.userId);
    expect(after).toBeGreaterThan(before + DAY_MS);
    // ...and the client receives that extension as a cookie it can persist.
    const setCookie = sessionSetCookie(res);
    expect(setCookie).toBeDefined();
    expect(setCookie).toMatch(/Max-Age=604800/i);
    // Same session token (the value before the signature), new lifetime.
    const sentToken = decodeURIComponent(user.cookie.split(`${SESSION_COOKIE}=`)[1]!).split('.')[0];
    const newToken = decodeURIComponent(setCookie!.split(';')[0]!.split('=')[1]!).split('.')[0];
    expect(newToken).toBe(sentToken);
  });

  it('an authed route that refreshes the session also returns the refreshed cookie', async () => {
    // Any authed call (requireSession) can be the one that crosses updateAge. If its
    // refresh were silent, the next /auth/session would see a fresh row and send no
    // cookie, and the client would keep the old expiry.
    const user = await signUpUser();
    const before = await ageSession(user.userId, 2 * DAY_MS);

    const res = await call('/api/v1/auth/me', { headers: { cookie: user.cookie } });
    expect(res.status).toBe(200);
    expect(await sessionExpiresAt(user.userId)).toBeGreaterThan(before + DAY_MS);
    expect(sessionSetCookie(res)).toMatch(/Max-Age=604800/i);
  });

  it('a session younger than updateAge gets no Set-Cookie (no churn on every call)', async () => {
    const user = await signUpUser();
    const before = await sessionExpiresAt(user.userId);

    const session = await nativePost('/api/v1/auth/session', user.cookie);
    expect(session.status).toBe(200);
    expect(sessionSetCookie(session)).toBeUndefined();

    const me = await call('/api/v1/auth/me', { headers: { cookie: user.cookie } });
    expect(me.status).toBe(200);
    expect(sessionSetCookie(me)).toBeUndefined();
    expect(await sessionExpiresAt(user.userId)).toBe(before);
  });

  it('a cookie-setting authed route returns both its own cookie and the refreshed session cookie', async () => {
    // POST /providers/:provider/connect sets the OAuth state cookie. Turn off the
    // mock seam (which skips the cookie) and give Spotify placeholder credentials.
    const mutableEnv = env as typeof env & {
      MOCK_PROVIDERS?: string;
      SPOTIFY_CLIENT_ID?: string;
      SPOTIFY_CLIENT_SECRET?: string;
    };
    const previous = { ...mutableEnv };
    mutableEnv.MOCK_PROVIDERS = 'false';
    mutableEnv.SPOTIFY_CLIENT_ID = 'test-spotify-client';
    mutableEnv.SPOTIFY_CLIENT_SECRET = 'test-spotify-secret';
    try {
      const user = await signUpUser();
      await ageSession(user.userId, 2 * DAY_MS);
      const res = await nativePost('/api/v1/providers/spotify/connect', user.cookie);
      expect(res.status).toBe(200);
      const cookies = res.headers.getSetCookie();
      expect(cookies.filter((c) => c.startsWith('rf_oauth_state='))).toHaveLength(1);
      expect(cookies.filter((c) => c.startsWith(`${SESSION_COOKIE}=`))).toHaveLength(1);
      expect(sessionSetCookie(res)).toMatch(/Max-Age=604800/i);
    } finally {
      mutableEnv.MOCK_PROVIDERS = previous.MOCK_PROVIDERS;
      mutableEnv.SPOTIFY_CLIENT_ID = previous.SPOTIFY_CLIENT_ID;
      mutableEnv.SPOTIFY_CLIENT_SECRET = previous.SPOTIFY_CLIENT_SECRET;
    }
  });

  it('a route behind many requireSession routers forwards the refresh exactly once', async () => {
    // /explore is served by one of the last routers mounted at '/', so every earlier
    // root router's `use('*', requireSession)` also runs on this request.
    const user = await signUpUser();
    await ageSession(user.userId, 2 * DAY_MS);
    const res = await call('/api/v1/explore', { headers: { cookie: user.cookie } });
    expect(res.status).toBe(200);
    const sessionCookies = res.headers
      .getSetCookie()
      .filter((c) => c.startsWith(`${SESSION_COOKIE}=`));
    expect(sessionCookies).toHaveLength(1);
  });

  it('an unauthenticated /auth/session is still a JSON 401', async () => {
    const res = await nativePost('/api/v1/auth/session', `${SESSION_COOKIE}=bogus.sig`);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });
});

describe('AUD-009: native sign-out revokes the server session', () => {
  it('sign-out from a native client (no Origin) revokes the session; the old cookie then gets 401', async () => {
    const user = await signUpUser();
    expect(await sessionStatus(user.cookie)).toBe(200);

    const res = await nativePost('/api/auth/sign-out', user.cookie);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });

    // Re-inject the old cookie: the server must no longer honour it.
    expect(await sessionStatus(user.cookie)).toBe(401);
  });

  it.each(['/api/v1/auth/session', '/api/v1/auth/me'])(
    'a revoked cookie gets 401 from %s with a clearing Set-Cookie (Max-Age=0)',
    async (path) => {
      const user = await signUpUser();
      expect((await nativePost('/api/auth/sign-out', user.cookie)).status).toBe(200);

      const res =
        path === '/api/v1/auth/me'
          ? await call(path, { headers: { cookie: user.cookie } })
          : await nativePost(path, user.cookie);
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
      expect(sessionSetCookie(res)).toMatch(/Max-Age=0/i);
    },
  );

  it('a native client that sends its own base-URL Origin can also sign out', async () => {
    const user = await signUpUser();
    const res = await call('/api/auth/sign-out', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: user.cookie,
        origin: new URL(env.BETTER_AUTH_URL).origin,
      },
      body: '{}',
    });
    expect(res.status).toBe(200);
    expect(await sessionStatus(user.cookie)).toBe(401);
  });

  // Browser CSRF protection is unchanged: each of these keeps Better Auth's origin check.
  it.each([
    ['an untrusted Origin', { origin: 'https://evil.example' }],
    ['an opaque null Origin', { origin: 'null' }],
    ['an untrusted Referer only', { referer: 'https://evil.example/page' }],
    ['browser fetch metadata and no Origin', { 'sec-fetch-site': 'cross-site' }],
  ])(
    'a cross-site browser sign-out with %s is still refused and revokes nothing',
    async (_, extra) => {
      const user = await signUpUser();
      const res = await call('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: user.cookie, ...extra },
        body: '{}',
      });
      expect(res.status).toBe(403);
      expect(await sessionStatus(user.cookie)).toBe(200);
    },
  );

  it.each(['application/x-www-form-urlencoded', 'text/plain'])(
    'a %s sign-out with no Origin (a form-shaped request, not the native one) revokes nothing',
    async (contentType) => {
      const user = await signUpUser();
      const res = await call('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'content-type': contentType, cookie: user.cookie },
        body: '{}',
      });
      // Refused either by Better Auth's media-type check (415) or its origin check (403).
      expect(res.ok).toBe(false);
      expect(await sessionStatus(user.cookie)).toBe(200);
    },
  );

  it('the native-origin allowance is sign-out only: a cookie-bearing native sign-in without Origin is unchanged', async () => {
    const user = await signUpUser();
    const res = await nativePost('/api/auth/sign-in/email', user.cookie, {
      email: user.email,
      password: 'sup3r-secret-pw',
    });
    // Better Auth's origin check still applies to every other cookie-bearing POST.
    expect(res.status).toBe(403);
  });
});
