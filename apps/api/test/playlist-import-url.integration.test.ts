/**
 * URL playlist import (`POST /classes/:id/import-playlist`) — the paste-a-link
 * path, now provider-parity (Spotify + SoundCloud + Apple Music catalog).
 *
 * The suite-wide `MOCK_PROVIDERS='true'` mock adapter returns [] for any playlist,
 * so mounted-route tests cannot cross the upstream boundary. The shared
 * append/resequence/touch helper is exercised below against real Miniflare D1;
 * provider resolve/pagination/mapping stays covered by adapter unit tests and URL
 * classification by `packages/music/src/playlist-url.test.ts`. Here we also lock
 * wiring + the authz/validation/limiter error contract, including that a URL for
 * each shipped provider dispatches through the registry to an adapter.
 * The best-effort tally (a single racing per-track failure must not abort the
 * whole import) is likewise DB-free and locked in `import-playlist.test.ts`
 * (`partitionSettledImports`), since the happy path can't be reached here.
 */
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { ClassListItem } from '@ritmofit/shared';
import { createDb } from '../src/lib/db.js';
import { appendImportedClassTracks } from '../src/routes/playlist-import.js';
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

  it('moves the class to the recent boundary only after a non-empty D1 append', async () => {
    const user = await signUpUser();
    await verifyUserEmail(user.userId);
    const api = authed(user.cookie);
    const createClass = async (title: string) => {
      const res = await api('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      expect(res.status).toBe(201);
      return ((await res.json()) as { id: string }).id;
    };
    const olderId = await createClass('Older import target');
    const newerId = await createClass('Newer class');
    const trackId = crypto.randomUUID();

    await env.DB.batch([
      env.DB.prepare('update classes set updated_at = 100 where id = ?').bind(olderId),
      env.DB.prepare('update classes set updated_at = 200 where id = ?').bind(newerId),
      env.DB.prepare(
        `insert into tracks (
          id, owner_user_id, title, artist, duration_ms, created_at, updated_at
        ) values (?, ?, 'Imported song', 'Instructor', 180000, 1, 1)`,
      ).bind(trackId, user.userId),
    ]);

    const before = (await (await api('/api/v1/classes?limit=2')).json()) as ClassListItem[];
    expect(before.map((row) => row.id)).toEqual([newerId, olderId]);

    const imported = await appendImportedClassTracks(createDb(env), olderId, [
      { track: { id: trackId } },
    ]);
    expect(imported).toBe(1);
    const placed = await env.DB.prepare(
      'select position, start_offset_ms from class_tracks where class_id = ?',
    )
      .bind(olderId)
      .first<{ position: number; start_offset_ms: number | null }>();
    expect(placed).toEqual({ position: 0, start_offset_ms: 0 });

    const after = (await (await api('/api/v1/classes?limit=2')).json()) as ClassListItem[];
    expect(after.map((row) => row.id)).toEqual([olderId, newerId]);
    expect(after[0]!.updatedAt).toBeGreaterThan(200);

    await env.DB.batch([
      env.DB.prepare('update classes set updated_at = 100 where id = ?').bind(olderId),
      env.DB.prepare('update classes set updated_at = 200 where id = ?').bind(newerId),
    ]);
    expect(await appendImportedClassTracks(createDb(env), olderId, [])).toBe(0);
    const unchanged = await env.DB.prepare('select updated_at from classes where id = ?')
      .bind(olderId)
      .first<{ updated_at: number }>();
    expect(unchanged?.updated_at).toBe(100);
    const afterEmpty = (await (await api('/api/v1/classes?limit=2')).json()) as ClassListItem[];
    expect(afterEmpty.map((row) => row.id)).toEqual([newerId, olderId]);
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
