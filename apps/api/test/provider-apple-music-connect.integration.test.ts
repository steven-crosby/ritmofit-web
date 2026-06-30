/**
 * Apple Music connect (integration) — drives the real mounted worker's MusicKit
 * connect surface: `GET /providers/apple_music/config` (the developer token the SPA
 * configures MusicKit with) and `POST /providers/apple_music/connection` (store the
 * Music-User-Token the browser returned). Apple Music has no redirect OAuth, so this
 * is the whole server-side connect path; the MusicKit browser handshake itself is
 * verified live, not here.
 *
 * The suite runs with `MOCK_PROVIDERS='true'`, so `config` returns a placeholder
 * developer token and `connection` stores the posted token without real Apple creds.
 */
import { env } from 'cloudflare:test';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { musicConnections } from '../src/db/schema.js';
import { authed, signUpUser } from './helpers.js';

describe('Apple Music connect (integration)', () => {
  it('serves a developer token from the authed config endpoint', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const res = await api('/api/v1/providers/apple_music/config');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { developerToken: string; storefront: string | null };
    expect(typeof body.developerToken).toBe('string');
    expect(body.developerToken.length).toBeGreaterThan(0);
  });

  it('requires a session for the config endpoint', async () => {
    const res = await authed('')('/api/v1/providers/apple_music/config');
    expect(res.status).toBe(401);
  });

  it('stores the posted Music-User-Token and surfaces it in connections (tokens stripped)', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const stored = await api('/api/v1/providers/apple_music/connection', {
      method: 'POST',
      body: JSON.stringify({ musicUserToken: 'mut-abc-123' }),
    });
    expect(stored.status).toBe(204);

    // The connection is listed (token-free view) ...
    const listed = (await (await api('/api/v1/providers/connections')).json()) as Array<{
      provider: string;
      refreshTokenEncrypted?: unknown;
    }>;
    expect(listed).toHaveLength(1);
    expect(listed[0]?.provider).toBe('apple_music');
    expect(listed[0]?.refreshTokenEncrypted).toBeUndefined();

    // ... and persisted with the token encrypted (never equal to the plaintext) and
    // no refresh token (Apple Music has no server-side refresh).
    const row = await createDb(env)
      .select()
      .from(musicConnections)
      .where(
        and(eq(musicConnections.userId, user.userId), eq(musicConnections.provider, 'apple_music')),
      )
      .get();
    expect(row?.accessTokenEncrypted).toBeTruthy();
    expect(row?.accessTokenEncrypted).not.toBe('mut-abc-123');
    expect(row?.refreshTokenEncrypted).toBeNull();
    expect(row?.expiresAt).toBeNull();
  });

  it('rejects a connection POST with no token (validation)', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    const res = await api('/api/v1/providers/apple_music/connection', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
  });

  it('re-storing replaces the token rather than duplicating the connection', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);

    await api('/api/v1/providers/apple_music/connection', {
      method: 'POST',
      body: JSON.stringify({ musicUserToken: 'mut-first' }),
    });
    await api('/api/v1/providers/apple_music/connection', {
      method: 'POST',
      body: JSON.stringify({ musicUserToken: 'mut-second' }),
    });

    const rows = await createDb(env)
      .select()
      .from(musicConnections)
      .where(
        and(eq(musicConnections.userId, user.userId), eq(musicConnections.provider, 'apple_music')),
      )
      .all();
    expect(rows).toHaveLength(1);
  });
});
