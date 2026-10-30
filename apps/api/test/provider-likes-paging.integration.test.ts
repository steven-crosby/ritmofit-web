/**
 * `/providers/:provider/likes` paging and library-search contract (RF-132),
 * driven through the mounted worker with the suite's mock seam on. The body stays
 * a bare `TrackSearchResult[]`; the next-page cursor rides in
 * `X-RitmoFit-Next-Cursor` (absent on the last page). Provider continuations and
 * real upstream paging are covered at the adapter and `fetchUserLikes` unit level.
 */
import { env } from 'cloudflare:test';
import { CLASS_LIST_NEXT_CURSOR_HEADER } from '@ritmofit/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { authed, signUpUser, verifyUserEmail, type TestUser } from './helpers.js';
import { encodeLikesCursor } from '../src/lib/music/likes-cursor.js';

describe('GET /providers/:provider/likes paging (integration, mock seam)', () => {
  let user: TestUser;
  let get: ReturnType<typeof authed>;
  beforeAll(async () => {
    expect(env.MOCK_PROVIDERS).toBe('true');
    user = await signUpUser();
    await verifyUserEmail(user.userId);
    get = authed(user.cookie);
  });

  it('keeps the bare-array body and omits the cursor header on the last page', async () => {
    const res = await get('/api/v1/providers/soundcloud/likes');
    expect(res.status).toBe(200);
    expect(res.headers.get(CLASS_LIST_NEXT_CURSOR_HEADER)).toBeNull();
    const body = (await res.json()) as { provider: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((row) => row.provider === 'soundcloud')).toBe(true);
  });

  it('serves the page a cursor points at', async () => {
    const res = await get(
      `/api/v1/providers/soundcloud/likes?cursor=${encodeLikesCursor('soundcloud', '1')}`,
    );
    expect(res.status).toBe(200);
    const all = (await (await get('/api/v1/providers/soundcloud/likes')).json()) as unknown[];
    const rest = (await res.json()) as unknown[];
    expect(rest).toEqual(all.slice(1));
  });

  it('rejects a malformed cursor with 422', async () => {
    const res = await get('/api/v1/providers/spotify/likes?cursor=%7Bnot-a-cursor');
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('VALIDATION_ERROR');
  });

  it("rejects another provider's cursor with 422", async () => {
    const cursor = encodeLikesCursor('apple_music', '/v1/me/library/songs?offset=200');
    const res = await get(`/api/v1/providers/spotify/likes?cursor=${cursor}`);
    expect(res.status).toBe(422);
  });

  it('answers ?q= for Apple Music with matching library songs', async () => {
    const res = await get('/api/v1/providers/apple_music/likes?q=clarity');
    expect(res.status).toBe(200);
    expect(res.headers.get(CLASS_LIST_NEXT_CURSOR_HEADER)).toBeNull();
    const body = (await res.json()) as { title: string }[];
    expect(body.map((row) => row.title)).toEqual(['Clarity']);
  });

  it('rejects ?q= for a provider with no library search', async () => {
    const res = await get('/api/v1/providers/soundcloud/likes?q=levels');
    expect(res.status).toBe(422);
  });
});
