import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth-client.js', () => ({
  API_BASE_URL: 'http://api.test',
  authClient: { signOut: vi.fn() },
}));

import { ApiError, NETWORK_ERROR_MESSAGE, deleteClass, getClass, listLikesPage } from './api.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api response handling', () => {
  it('drains an empty 204 body so the request is not reported as aborted', async () => {
    const res = new Response(null, { status: 204 });
    const text = vi.spyOn(res, 'text');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));

    await expect(deleteClass('class-1')).resolves.toBeUndefined();
    expect(text).toHaveBeenCalledTimes(1);
  });

  it('still parses JSON bodies for other successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ id: 'class-1' }, { status: 200 })),
    );

    await expect(getClass('class-1')).resolves.toEqual({ id: 'class-1' });
  });

  it('turns a network failure into one plain sentence instead of "Failed to fetch"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await getClass('class-1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(
      "Can't reach Ritmo. Check your connection, then try again.",
    );
    expect((error as ApiError).message).toBe(NETWORK_ERROR_MESSAGE);
    expect((error as ApiError).code).toBe('NETWORK_ERROR');
  });

  it('lets an abort through unchanged', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));

    await expect(getClass('class-1')).rejects.toBe(abort);
  });
});

describe('listLikesPage (RF-132)', () => {
  const row = { provider: 'apple_music', providerTrackId: '1', title: 'A', artist: 'B' };

  it('reads the next cursor from the response header and keeps the array body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json([row], { headers: { 'X-RitmoFit-Next-Cursor': 'next-1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listLikesPage('apple_music')).resolves.toEqual({
      items: [row],
      nextCursor: 'next-1',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/api/v1/providers/apple_music/likes');
  });

  it('passes cursor and q as query parameters and reports the last page as null', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json([]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listLikesPage('soundcloud', { cursor: 'a+b/c' })).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    await listLikesPage('apple_music', { q: 'angel of mine' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'http://api.test/api/v1/providers/soundcloud/likes?cursor=a%2Bb%2Fc',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'http://api.test/api/v1/providers/apple_music/likes?q=angel+of+mine',
    );
  });
});
