/**
 * Server-side bulk playlist import (D21) — drives the real worker's
 * `POST /providers/:provider/playlists/:playlistId/import`.
 *
 * Coverage caveat: the suite-wide `MOCK_PROVIDERS='true'` short-circuits
 * `fetchUserPlaylistTracks` to `[]` before any upstream fetch, so the DB-touching
 * happy path (real tracks created/deduped) is NOT reachable in-suite — the suite
 * never stubs outbound provider HTTP. The happy-path resolution/dedup logic is
 * covered by the pure `dedupeByMatchKey` unit test (`import-playlist.test.ts`);
 * here we cover wiring + the auth/validation/limiter/connection error contract.
 * The `NOT_CONNECTED` case runs against a prod-like env (mock seam off) so it
 * proves the real provider path, mirroring `provider-apple-music-likes`.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import worker from '../src/index.js';
import { call, signUpUser, verifyUserEmail, authed, type TestUser } from './helpers.js';

const IMPORT_PATH = (provider: string, playlistId = 'pl-1') =>
  `/api/v1/providers/${provider}/playlists/${playlistId}/import`;

// Prod-like env: mock seam off (so the real provider path runs) plus a static Apple
// Music developer token so `appleMusicCreds` resolves before the connection lookup.
const prodEnv = { ...env, MOCK_PROVIDERS: undefined, APPLE_MUSIC_DEVELOPER_TOKEN: 'devtok-test' };

async function callProd(path: string, cookie: string): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(`https://test.ritmofit.studio${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.30', cookie },
    }),
    prodEnv,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

describe('POST /providers/:provider/playlists/:playlistId/import (integration)', () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await signUpUser();
    await verifyUserEmail(user.userId);
  });

  it('401 when unauthenticated', async () => {
    const res = await call(IMPORT_PATH('spotify'), { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('400 for an unknown provider', async () => {
    const api = authed(user.cookie);
    const res = await api(IMPORT_PATH('bandcamp'), { method: 'POST' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns an empty summary (200) when the playlist yields no tracks (mock seam)', async () => {
    // MOCK_PROVIDERS='true' makes fetchUserPlaylistTracks return [] → nothing to
    // import → created===0 → 200. Proves the route is mounted and wired end to end.
    const api = authed(user.cookie);
    const res = await api(IMPORT_PATH('spotify'), { method: 'POST' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      created: number;
      existing: number;
      skipped: number;
      tracks: unknown[];
    };
    expect(body).toEqual({ created: 0, existing: 0, skipped: 0, tracks: [] });
  });

  it('409 NOT_CONNECTED on the real provider path when the account is not linked', async () => {
    const res = await callProd(IMPORT_PATH('apple_music'), user.cookie);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('NOT_CONNECTED');
  });

  it('429 once the per-user bulk-import limiter (max 5/min) is exceeded', async () => {
    // A dedicated user so earlier tests' hits don't count against this window.
    const burstUser = await signUpUser();
    await verifyUserEmail(burstUser.userId);
    const api = authed(burstUser.cookie);
    for (let i = 0; i < 5; i++) {
      const ok = await api(IMPORT_PATH('spotify'), { method: 'POST' });
      expect(ok.status).toBe(200);
    }
    const limited = await api(IMPORT_PATH('spotify'), { method: 'POST' });
    expect(limited.status).toBe(429);
    const body = (await limited.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('RATE_LIMITED');
  });
});
