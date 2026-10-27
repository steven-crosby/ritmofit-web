/**
 * Reviewer C audit repros for the provider adapters (synthetic fetch only).
 * Asserts CURRENT behaviour at 4e0b150: green = reproduced.
 */
import { describe, expect, it } from 'vitest';
import { fetchSpotifyPlaylistTracks } from './spotify.js';
import { fetchWithRetry } from './retry.js';
import type { FetchLike } from './provider.js';

type Res = Awaited<ReturnType<FetchLike>>;
function json(status: number, body: unknown, headers: Record<string, string> = {}): Res {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  } as Res;
}

describe('C-6 (REJECTED) Spotify playlist items: podcast episodes', () => {
  it('drops an episode item (no artists -> fails the shared contract)', async () => {
    const fetchImpl: FetchLike = async () =>
      json(200, {
        total: 2,
        items: [
          {
            item: {
              type: 'track',
              id: 'TRACK1',
              uri: 'spotify:track:TRACK1',
              name: 'Song',
              duration_ms: 200_000,
              artists: [{ name: 'A' }],
            },
          },
          {
            item: {
              type: 'episode',
              id: 'EP1',
              uri: 'spotify:episode:EP1',
              name: 'Podcast episode',
              duration_ms: 3_600_000,
            },
          },
        ],
      });
    const out = await fetchSpotifyPlaylistTracks({
      accessToken: 't',
      playlistId: 'p',
      fetchImpl,
    });
    expect(out.map((t) => t.providerUri)).toEqual(['spotify:track:TRACK1']);
  });
});

describe('C-9 Retry-After that crosses the preview deadline surfaces as a timeout', () => {
  it('throws AbortError instead of returning the 429 to the caller', async () => {
    let now = 0;
    const fetchImpl: FetchLike = async () =>
      json(429, { error: { status: 429 } }, { 'retry-after': '3' });
    const err = await fetchWithRetry(fetchImpl, 'https://api.spotify.com/v1/x', undefined, {
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      deadlineAt: 2_000,
    }).catch((e: unknown) => e);
    expect((err as Error).name).toBe('AbortError');
  });
});
