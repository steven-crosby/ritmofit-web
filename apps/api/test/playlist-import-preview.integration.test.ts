/**
 * Paste-a-link preview (`POST /classes/:id/import-playlist`) against the mounted
 * worker with the mock seam off. Global fetch is stubbed so paging, the
 * occurrence ceiling, and the 8s deadline are observable without a live provider.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index.js';
import { createDb } from '../src/lib/db.js';
import { musicConnections } from '../src/db/schema.js';
import { encryptSecret } from '../src/lib/crypto.js';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

const SPOTIFY_URL = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
const SPOTIFY_ID = '37i9dQZF1DXcBWIGoYBM5M';
const APPLE_URL =
  'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb';
const APPLE_ID = 'pl.f4d106fed2bd41149aaacabb233eb5eb';
const SOUNDCLOUD_URL = 'https://soundcloud.com/some-artist/sets/summer-mix';
const SOUNDCLOUD_URN = 'soundcloud:playlists:987';

const calls: string[] = [];
const requests: { url: string; authorization?: string; body?: string }[] = [];

function headerValue(init: RequestInit | undefined, name: string): string | undefined {
  const headers = init?.headers;
  if (!headers) return undefined;
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return found?.[1];
  }
  const record = headers as Record<string, string>;
  return record[name] ?? record[name.toLowerCase()];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function spotifyTrack(index: number, title = `Song ${index + 1}`) {
  return {
    id: `sp-${index}`,
    uri: `spotify:track:sp-${index}`,
    name: title,
    duration_ms: 180_000,
    artists: [{ name: 'QA' }],
    album: { images: [{ url: 'https://i.scdn.co/image/art.jpg' }] },
  };
}

function installFetch(handler: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  calls.length = 0;
  requests.length = 0;
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    requests.push({
      url,
      authorization: headerValue(init, 'Authorization'),
      body: typeof init?.body === 'string' ? init.body : undefined,
    });
    return handler(url, init);
  });
}

async function seedSpotify(
  userId: string,
  opts: { accessToken?: string; refreshToken?: string | null; expiresAt?: number | null } = {},
): Promise<void> {
  const now = Date.now();
  await createDb(env)
    .insert(musicConnections)
    .values({
      id: crypto.randomUUID(),
      userId,
      provider: 'spotify',
      accessTokenEncrypted: await encryptSecret(
        opts.accessToken ?? 'user-access',
        env.ENCRYPTION_KEY!,
      ),
      refreshTokenEncrypted:
        opts.refreshToken === null
          ? null
          : await encryptSecret(opts.refreshToken ?? 'user-refresh', env.ENCRYPTION_KEY!),
      providerUserId: null,
      scope: 'playlist-read-private',
      expiresAt: opts.expiresAt === undefined ? now + 30 * 60_000 : opts.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function preview(
  cookie: string,
  classId: string,
  url: string,
  creds: Record<string, string | undefined>,
): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(`https://test.ritmofit.studio/api/v1/classes/${classId}/import-playlist`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie,
        'cf-connecting-ip': `203.0.113.${Math.floor(Math.random() * 200) + 20}`,
      },
      body: JSON.stringify({ url }),
    }),
    { ...env, MOCK_PROVIDERS: undefined, ...creds },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

async function counts(classId: string, userId: string) {
  const tracks = await env.DB.prepare('select count(*) as n from class_tracks where class_id = ?')
    .bind(classId)
    .first<{ n: number }>();
  const blocks = await env.DB.prepare(
    'select count(*) as n from class_plan_blocks where class_id = ?',
  )
    .bind(classId)
    .first<{ n: number }>();
  const library = await env.DB.prepare('select count(*) as n from tracks where owner_user_id = ?')
    .bind(userId)
    .first<{ n: number }>();
  return { tracks: tracks?.n ?? 0, blocks: blocks?.n ?? 0, library: library?.n ?? 0 };
}

describe('paste-a-link playlist preview', () => {
  async function userWithClass(): Promise<{ user: TestUser; classId: string }> {
    const user = await signUpUser();
    await verifyUserEmail(user.userId);
    const res = await authed(user.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Preview target' }),
    });
    expect(res.status).toBe(201);
    return { user, classId: ((await res.json()) as { id: string }).id };
  }

  it('returns 16 ordered occurrences, including a repeated title, and writes nothing', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId);
    const before = await counts(classId, user.userId);
    installFetch(async (url) => {
      if (url.startsWith('https://accounts.spotify.com/api/token')) {
        return json({ error: 'app token must not be used' }, 500);
      }
      if (url.includes(`/playlists/${SPOTIFY_ID}/items`)) {
        const items = Array.from({ length: 16 }, (_, index) => ({
          item: spotifyTrack(index, index === 4 ? 'Repeated' : `Song ${index + 1}`),
        }));
        items[15] = { item: spotifyTrack(15, 'Repeated') };
        return json({ items, total: 16 });
      }
      return json({ error: 'unexpected' }, 500);
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      occurrences: { index: number; title: string; providerTrackId: string }[];
    };
    expect(body.occurrences).toHaveLength(16);
    expect(body.occurrences.map((row) => row.index)).toEqual(body.occurrences.map((_, i) => i));
    expect(body.occurrences.filter((row) => row.title === 'Repeated')).toHaveLength(2);
    expect(body.occurrences[0]?.providerTrackId).toBe('sp-0');
    expect(body.occurrences[15]?.providerTrackId).toBe('sp-15');
    expect(
      requests.filter((row) => row.url.includes('/items')).map((row) => row.authorization),
    ).toEqual(['Bearer user-access']);
    expect(calls.some((url) => url.startsWith('https://accounts.spotify.com/'))).toBe(false);
    expect(await counts(classId, user.userId)).toEqual(before);
  });

  it('omits a non-positive duration and keeps a missing duration as null', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId);
    installFetch(async (url) => {
      if (url.startsWith('https://accounts.spotify.com/api/token')) {
        return json({ error: 'app token must not be used' }, 500);
      }
      if (url.includes(`/playlists/${SPOTIFY_ID}/items`)) {
        return json({
          items: [
            { item: { ...spotifyTrack(0, 'Zero'), duration_ms: 0 } },
            { item: { ...spotifyTrack(1, 'Missing'), duration_ms: undefined } },
            { item: { ...spotifyTrack(2, 'Negative'), duration_ms: -5 } },
            { item: spotifyTrack(3, 'Kept') },
          ],
          total: 4,
        });
      }
      return json({ error: 'unexpected' }, 500);
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      occurrences: { title: string; durationMs: number | null }[];
    };
    expect(body.occurrences.map((row) => [row.title, row.durationMs])).toEqual([
      ['Missing', null],
      ['Kept', 180_000],
    ]);
  });

  it('returns 100 songs from exactly two playlist pages in under 2 seconds', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId);
    installFetch(async (url) => {
      if (url.startsWith('https://accounts.spotify.com/api/token')) {
        return json({ error: 'app token must not be used' }, 500);
      }
      if (url.includes('offset=0')) {
        return json({
          items: Array.from({ length: 50 }, (_, index) => ({ item: spotifyTrack(index) })),
          total: 100,
        });
      }
      if (url.includes('offset=50')) {
        return json({
          items: Array.from({ length: 50 }, (_, index) => ({ item: spotifyTrack(50 + index) })),
          total: 100,
        });
      }
      return json({ error: 'unexpected' }, 500);
    });

    const started = Date.now();
    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { occurrences: { providerTrackId: string }[] };
    expect(body.occurrences).toHaveLength(100);
    expect(body.occurrences[0]?.providerTrackId).toBe('sp-0');
    expect(body.occurrences[99]?.providerTrackId).toBe('sp-99');
    const playlistCalls = calls.filter((url) => url.includes('/items'));
    expect(playlistCalls).toHaveLength(2);
    expect(
      requests.filter((row) => row.url.includes('/items')).map((row) => row.authorization),
    ).toEqual(['Bearer user-access', 'Bearer user-access']);
    expect(calls.some((url) => url.startsWith('https://accounts.spotify.com/'))).toBe(false);
    expect(await counts(classId, user.userId)).toEqual({ tracks: 0, blocks: 0, library: 0 });
  });

  it('rejects a Spotify total over 100 after one playlist request', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId);
    const before = await counts(classId, user.userId);
    installFetch(async (url) => {
      if (url.startsWith('https://accounts.spotify.com/api/token')) {
        return json({ error: 'app token must not be used' }, 500);
      }
      return json({
        items: Array.from({ length: 50 }, (_, index) => ({ item: spotifyTrack(index) })),
        total: 101,
      });
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('101');
    expect(body.error.message).toBe('Playlist has 101 songs. The limit is 100.');
    expect(calls.filter((url) => url.includes('/items'))).toHaveLength(1);
    expect(requests.find((row) => row.url.includes('/items'))?.authorization).toBe(
      'Bearer user-access',
    );
    expect(calls.some((url) => url.startsWith('https://accounts.spotify.com/'))).toBe(false);
    expect(await counts(classId, user.userId)).toEqual(before);
  });

  it('rejects an Apple catalog page of 100 songs that still has a next cursor', async () => {
    const { user, classId } = await userWithClass();
    const before = await counts(classId, user.userId);
    installFetch(async (url) => {
      if (!url.includes('/tracks')) return json({ error: 'unexpected' }, 500);
      return json({
        data: Array.from({ length: 100 }, (_, index) => ({
          id: `am-${index}`,
          type: 'songs',
          attributes: { name: `Song ${index + 1}`, artistName: 'QA', durationInMillis: 180_000 },
        })),
        next: `/v1/catalog/us/playlists/${APPLE_ID}/tracks?offset=100`,
      });
    });

    const res = await preview(user.cookie, classId, APPLE_URL, {
      APPLE_MUSIC_DEVELOPER_TOKEN: `dev-${crypto.randomUUID()}`,
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Playlist has more than 100 songs.');
    const trackCalls = calls.filter((url) => url.includes('/tracks'));
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]).toContain('limit=100');
    expect(trackCalls[0]).not.toContain('offset=100');
    expect(await counts(classId, user.userId)).toEqual(before);
  });

  it('rejects a SoundCloud page of 100 songs that still has a next href', async () => {
    const { user, classId } = await userWithClass();
    const before = await counts(classId, user.userId);
    installFetch(async (url) => {
      if (url.startsWith('https://secure.soundcloud.com/oauth/token')) {
        return json({ access_token: 'tok', expires_in: 3600 });
      }
      if (url.includes('/resolve')) {
        return new Response(null, {
          status: 302,
          headers: {
            location: `https://api.soundcloud.com/playlists/${encodeURIComponent(SOUNDCLOUD_URN)}`,
          },
        });
      }
      if (url.includes('/tracks') && !url.includes('page2')) {
        return json({
          collection: Array.from({ length: 100 }, (_, index) => ({
            id: 1000 + index,
            title: `Song ${index + 1}`,
            duration: 180_000,
            user: { username: 'QA' },
          })),
          next_href: `https://api.soundcloud.com/playlists/${encodeURIComponent(SOUNDCLOUD_URN)}/tracks?page2=1`,
        });
      }
      return json({ error: 'unexpected next page' }, 500);
    });

    const res = await preview(user.cookie, classId, SOUNDCLOUD_URL, {
      SOUNDCLOUD_CLIENT_ID: `sc-${crypto.randomUUID()}`,
      SOUNDCLOUD_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.message).toBe('Playlist has more than 100 songs.');
    const trackCalls = calls.filter((url) => url.includes('/tracks'));
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0]).toContain('limit=100');
    expect(calls.some((url) => url.includes('page2'))).toBe(false);
    expect(await counts(classId, user.userId)).toEqual(before);
  });

  it('returns 409 NOT_CONNECTED when the instructor has no Spotify connection', async () => {
    const { user, classId } = await userWithClass();
    installFetch(async () => json({ error: 'should not be called' }, 500));

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error).toEqual({
      code: 'NOT_CONNECTED',
      message: 'Connect Spotify to import this playlist.',
    });
    expect(calls).toEqual([]);
  });

  it('maps a user-token 401 to REAUTH_REQUIRED and does not mint an app token', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId, { accessToken: 'stale-user', refreshToken: null });
    installFetch(async (url) => {
      if (url.startsWith('https://accounts.spotify.com/api/token')) {
        return json({ error: 'app token must not be used' }, 500);
      }
      if (url.includes('/items')) {
        return json({ error: { status: 401, message: 'The access token expired' } }, 401);
      }
      return json({ error: 'unexpected' }, 500);
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error).toEqual({
      code: 'REAUTH_REQUIRED',
      message: 'Reconnect Spotify to import this playlist.',
    });
    expect(requests.find((row) => row.url.includes('/items'))?.authorization).toBe(
      'Bearer stale-user',
    );
    expect(calls.some((url) => url.startsWith('https://accounts.spotify.com/'))).toBe(false);
  });

  it('refreshes an expired Spotify user token and previews with the new token', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId, {
      accessToken: 'expired-access',
      refreshToken: 'refresh-1',
      expiresAt: Date.now() - 120_000,
    });
    installFetch(async (url, init) => {
      if (url.startsWith('https://accounts.spotify.com/api/token')) {
        const body = typeof init?.body === 'string' ? init.body : '';
        if (body.includes('client_credentials')) {
          return json({ error: 'app token must not be used' }, 500);
        }
        return json({
          access_token: 'access-new',
          refresh_token: 'refresh-2',
          expires_in: 3600,
          token_type: 'Bearer',
        });
      }
      if (url.includes('/items')) return json({ items: [{ item: spotifyTrack(0) }], total: 1 });
      return json({ error: 'unexpected' }, 500);
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(200);
    const tokenCalls = requests.filter((row) =>
      row.url.startsWith('https://accounts.spotify.com/api/token'),
    );
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0]?.body).toContain('grant_type=refresh_token');
    expect(tokenCalls[0]?.body).not.toContain('client_credentials');
    expect(
      requests.filter((row) => row.url.includes('/items')).map((row) => row.authorization),
    ).toEqual(['Bearer access-new']);
  });

  it('refreshes after a 401 and retries the playlist read with the new user token', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId, { accessToken: 'stale-user', refreshToken: 'refresh-1' });
    let playlistHits = 0;
    installFetch(async (url, init) => {
      if (url.startsWith('https://accounts.spotify.com/api/token')) {
        const body = typeof init?.body === 'string' ? init.body : '';
        if (!body.includes('grant_type=refresh_token') || body.includes('client_credentials')) {
          return json({ error: 'app token must not be used' }, 500);
        }
        return json({ access_token: 'access-new', expires_in: 3600, token_type: 'Bearer' });
      }
      if (url.includes('/items')) {
        playlistHits += 1;
        if (playlistHits === 1) {
          return json({ error: { status: 401, message: 'The access token expired' } }, 401);
        }
        return json({ items: [{ item: spotifyTrack(0) }], total: 1 });
      }
      return json({ error: 'unexpected' }, 500);
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(200);
    expect(
      requests.filter((row) => row.url.includes('/items')).map((row) => row.authorization),
    ).toEqual(['Bearer stale-user', 'Bearer access-new']);
    expect(
      requests.filter((row) => row.url.startsWith('https://accounts.spotify.com/api/token')),
    ).toHaveLength(1);
  });

  it('returns 504 PROVIDER_TIMEOUT when the playlist never responds, with no writes', async () => {
    const { user, classId } = await userWithClass();
    await seedSpotify(user.userId);
    const before = await counts(classId, user.userId);
    installFetch(
      (url) =>
        new Promise((resolve) => {
          if (url.startsWith('https://accounts.spotify.com/api/token')) {
            resolve(json({ access_token: 'tok', expires_in: 3600 }));
            return;
          }
          // Never resolve the playlist page.
        }),
    );

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(504);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('PROVIDER_TIMEOUT');
    expect(body.error.message).toBe('The playlist took too long to load. Try again.');
    expect(await counts(classId, user.userId)).toEqual(before);
  }, 15_000);
});

describe('paste-a-link Spotify limits', () => {
  async function connectedUserWithClass(): Promise<{ user: TestUser; classId: string }> {
    const user = await signUpUser();
    await verifyUserEmail(user.userId);
    const res = await authed(user.cookie)('/api/v1/classes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Limit target' }),
    });
    expect(res.status).toBe(201);
    await seedSpotify(user.userId);
    return { user, classId: ((await res.json()) as { id: string }).id };
  }

  it('maps a 429 QUOTA_EXCEEDED to PROVIDER_QUOTA_EXCEEDED after one request', async () => {
    const { user, classId } = await connectedUserWithClass();
    installFetch(async (url) => {
      if (url.includes(`/playlists/${SPOTIFY_ID}/items`)) {
        return json(
          { error: { status: 429, message: 'Too many requests', reason: 'QUOTA_EXCEEDED' } },
          429,
        );
      }
      return json({ error: 'unexpected' }, 500);
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: {
        code: 'PROVIDER_QUOTA_EXCEEDED',
        message: "Spotify's usage limit for Ritmo is used up. Try again later.",
      },
    });
    expect(calls.filter((url) => url.includes('/items'))).toHaveLength(1);
  });

  it('maps a 404 for a playlist the user cannot read to the not-owned message', async () => {
    const { user, classId } = await connectedUserWithClass();
    installFetch(async (url) => {
      if (url.includes(`/playlists/${SPOTIFY_ID}/items`)) {
        return json({ error: { status: 404, message: 'Resource not found' } }, 404);
      }
      return json({ error: 'unexpected' }, 500);
    });

    const res = await preview(user.cookie, classId, SPOTIFY_URL, {
      SPOTIFY_CLIENT_ID: `cid-${crypto.randomUUID()}`,
      SPOTIFY_CLIENT_SECRET: 'secret',
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: {
        code: 'PROVIDER_FORBIDDEN',
        message: 'Spotify only lets Ritmo read playlists you own or collaborate on.',
      },
    });
  });
});
