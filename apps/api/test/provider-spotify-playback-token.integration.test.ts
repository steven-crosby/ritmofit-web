/**
 * Spotify Web Playback SDK token endpoint (integration) — drives the real worker's
 * `GET /providers/spotify/playback-token`, the deliberate exception to "provider
 * tokens are never returned to the client" (short-lived, owner-only, playback-scoped).
 *
 * The suite-wide `MOCK_PROVIDERS='true'` short-circuits `mintSpotifyPlaybackToken` to
 * a placeholder before any connection/scope logic runs, so the mock path covers
 * routing + auth + response shape. The prod-facing behaviour (not-connected /
 * reconnect-for-playback / dead-grant / decrypt-and-return) runs against a
 * production-like env (`MOCK_PROVIDERS` unset + injected Spotify creds), seeding
 * `music_connections` rows directly. The expired→refresh happy path spends an
 * outbound Spotify token request, which the integration suite does not stub, so it is
 * left to the unit level; the no-refresh-token branch of expiry is covered here.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import worker from '../src/index.js';
import { createDb } from '../src/lib/db.js';
import { musicConnections } from '../src/db/schema.js';
import { encryptSecret } from '../src/lib/crypto.js';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

const PATH = '/api/v1/providers/spotify/playback-token';

// Same bindings as the suite, but with the mock seam off (prod-like) and Spotify app
// creds present so `spotifyCreds` resolves.
const prodEnv = {
  ...env,
  MOCK_PROVIDERS: undefined,
  SPOTIFY_CLIENT_ID: 'sid-test',
  SPOTIFY_CLIENT_SECRET: 'ssec-test',
};

async function callProd(cookie: string): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(`https://test.ritmofit.studio${PATH}`, {
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.21', cookie },
    }),
    prodEnv,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

async function seedSpotifyConnection(
  userId: string,
  opts: {
    scope: string | null;
    expiresAt: number | null;
    refreshToken?: string | null;
    accessToken?: string;
  },
): Promise<void> {
  const now = Date.now();
  await createDb(env)
    .insert(musicConnections)
    .values({
      id: crypto.randomUUID(),
      userId,
      provider: 'spotify',
      accessTokenEncrypted: await encryptSecret(
        opts.accessToken ?? 'spotify-access-token',
        env.ENCRYPTION_KEY!,
      ),
      refreshTokenEncrypted: opts.refreshToken
        ? await encryptSecret(opts.refreshToken, env.ENCRYPTION_KEY!)
        : null,
      providerUserId: null,
      scope: opts.scope,
      expiresAt: opts.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
}

describe('Spotify playback-token endpoint (integration)', () => {
  it('requires a session', async () => {
    const res = await authed('')(PATH);
    expect(res.status).toBe(401);
  });

  it('serves a placeholder token in mock mode (routing + response shape)', async () => {
    const user = await signUpUser();
    const res = await authed(user.cookie)(PATH);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string; expiresInMs: number };
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(typeof body.expiresInMs).toBe('number');
    expect(body.expiresInMs).toBeGreaterThan(0);
  });

  describe('prod-like path (mock seam off)', () => {
    let user: TestUser;
    beforeEach(async () => {
      user = await signUpUser();
      await verifyUserEmail(user.userId);
    });

    it('returns 409 NOT_CONNECTED when Spotify is not linked', async () => {
      const res = await callProd(user.cookie);
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe('NOT_CONNECTED');
    });

    it('returns 409 PLAYBACK_REAUTH_REQUIRED for a pre-expansion library-only connection', async () => {
      await seedSpotifyConnection(user.userId, {
        scope: 'user-library-read',
        expiresAt: Date.now() + 30 * 60_000,
      });
      const res = await callProd(user.cookie);
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe('PLAYBACK_REAUTH_REQUIRED');
    });

    it('returns the decrypted access token for a playback-scoped, unexpired connection', async () => {
      await seedSpotifyConnection(user.userId, {
        scope: 'user-library-read streaming user-modify-playback-state',
        expiresAt: Date.now() + 30 * 60_000,
        accessToken: 'sp-access-xyz',
      });
      const res = await callProd(user.cookie);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { accessToken: string; expiresInMs: number };
      expect(body.accessToken).toBe('sp-access-xyz');
      expect(body.expiresInMs).toBeGreaterThan(0);
      expect(body.expiresInMs).toBeLessThanOrEqual(30 * 60_000);
    });

    it('returns 409 REAUTH_REQUIRED when the token is expired and there is no refresh token', async () => {
      await seedSpotifyConnection(user.userId, {
        scope: 'user-library-read streaming',
        expiresAt: Date.now() - 1000,
        refreshToken: null,
      });
      const res = await callProd(user.cookie);
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error?: { code?: string } };
      expect(body.error?.code).toBe('REAUTH_REQUIRED');
    });
  });
});
