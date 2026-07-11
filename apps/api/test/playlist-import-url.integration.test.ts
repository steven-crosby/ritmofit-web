/**
 * URL playlist import (`POST /classes/:id/import-playlist`) — the paste-a-link
 * path, now provider-parity (Spotify + SoundCloud + Apple Music catalog).
 *
 * Coverage caveat (same posture as `provider-playlist-import`): the suite-wide
 * `MOCK_PROVIDERS='true'` mock adapter returns [] for any playlist, so the
 * DB-touching happy path is NOT reachable in-suite — the suite never stubs
 * outbound provider HTTP. Resolve/pagination/mapping per provider is covered by
 * the adapter unit tests (`src/lib/music/{soundcloud,apple-music,spotify}.test.ts`)
 * and URL classification by `packages/music/src/playlist-url.test.ts`; here we
 * lock wiring + the authz/validation/limiter error contract, including that a
 * URL for each shipped provider dispatches through the registry to an adapter.
 */
import { describe, expect, it } from 'vitest';
import { authed, signUpUser, verifyUserEmail, call, type TestUser } from './helpers.js';

const SPOTIFY_URL = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
const SOUNDCLOUD_URL = 'https://soundcloud.com/some-artist/sets/summer-mix';
const APPLE_CATALOG_URL =
  'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb';

async function newUserWithClass(): Promise<{ user: TestUser; classId: string }> {
  const user = await signUpUser();
  await verifyUserEmail(user.userId);
  const res = await authed(user.cookie)('/api/v1/classes', {
    method: 'POST',
    body: JSON.stringify({ title: 'Import target' }),
  });
  expect(res.status).toBe(201);
  return { user, classId: ((await res.json()) as { id: string }).id };
}

function importUrl(cookie: string, classId: string, url: string): Promise<Response> {
  return authed(cookie)(`/api/v1/classes/${classId}/import-playlist`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

async function errorOf(res: Response): Promise<{ code?: string; message?: string }> {
  return ((await res.json()) as { error?: { code?: string; message?: string } }).error ?? {};
}

describe('POST /classes/:id/import-playlist (integration)', () => {
  it('401 when unauthenticated', async () => {
    const res = await call('/api/v1/classes/some-id/import-playlist', { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('404 for a class the caller cannot edit (hidden resource)', async () => {
    const owner = await newUserWithClass();
    const stranger = await signUpUser();
    await verifyUserEmail(stranger.userId);
    const res = await importUrl(stranger.cookie, owner.classId, SPOTIFY_URL);
    expect(res.status).toBe(404);
  });

  it('400 for a URL on an unsupported host', async () => {
    const { user, classId } = await newUserWithClass();
    const res = await importUrl(user.cookie, classId, 'https://example.com/playlist/abc');
    expect(res.status).toBe(400);
    const err = await errorOf(res);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toContain('Unsupported playlist URL');
  });

  it('400 with a pointer to saved-playlist browsing for an Apple Music library link', async () => {
    const { user, classId } = await newUserWithClass();
    const res = await importUrl(
      user.cookie,
      classId,
      'https://music.apple.com/library/playlist/p.ldvAAZ3C3Qmop9',
    );
    expect(res.status).toBe(400);
    const err = await errorOf(res);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toContain('library playlist');
  });

  it('400 (unsupported) for a SoundCloud track permalink — playlists only', async () => {
    const { user, classId } = await newUserWithClass();
    const res = await importUrl(user.cookie, classId, 'https://soundcloud.com/bakermat/baiana');
    expect(res.status).toBe(400);
    expect((await errorOf(res)).message).toContain('Unsupported playlist URL');
  });

  it('dispatches a playlist URL for each shipped provider through the registry (mock seam)', async () => {
    // The mock adapter answers every provider with an empty playlist, so reaching
    // "Playlist not found or is empty." (vs "Unsupported playlist URL") proves the
    // URL classified, the registry served that provider, and its adapter was hit.
    const { user, classId } = await newUserWithClass();
    for (const url of [SPOTIFY_URL, SOUNDCLOUD_URL, APPLE_CATALOG_URL]) {
      const res = await importUrl(user.cookie, classId, url);
      expect(res.status).toBe(400);
      expect((await errorOf(res)).message).toBe('Playlist not found or is empty.');
    }
  });

  it('429 once the per-user import limiter (max 5/min) is exceeded', async () => {
    // A dedicated user so earlier tests' hits don't count against this window.
    const { user, classId } = await newUserWithClass();
    for (let i = 0; i < 5; i++) {
      const res = await importUrl(user.cookie, classId, SPOTIFY_URL);
      expect(res.status).toBe(400); // mock seam: empty playlist
    }
    const limited = await importUrl(user.cookie, classId, SPOTIFY_URL);
    expect(limited.status).toBe(429);
    expect((await errorOf(limited)).code).toBe('RATE_LIMITED');
  });
});
