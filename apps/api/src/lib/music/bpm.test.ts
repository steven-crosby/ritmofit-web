import { describe, it, expect } from 'vitest';
import { createGetSongBpmProvider, normalizeBpm, type FetchLike } from '@ritmofit/music';
import { mockBpm, resolveBpm } from './bpm-lookup.js';
import { HttpError } from '../errors.js';
import type { Env } from '../types.js';

function fakeFetch(body: unknown, ok = true) {
  const calls: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    calls.push(url);
    return {
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { fetchImpl, calls };
}

describe('normalizeBpm', () => {
  it('rounds numeric and string tempos', () => {
    expect(normalizeBpm(128.4)).toBe(128);
    expect(normalizeBpm('122.7')).toBe(123);
  });
  it('rejects absent / non-finite / out-of-range', () => {
    expect(normalizeBpm(undefined)).toBeNull();
    expect(normalizeBpm('nope')).toBeNull();
    expect(normalizeBpm(10)).toBeNull();
    expect(normalizeBpm(500)).toBeNull();
  });
});

describe('createGetSongBpmProvider.lookup', () => {
  it('reads the tempo off the result whose title/artist matches the query', async () => {
    const { fetchImpl, calls } = fakeFetch({
      search: [
        { tempo: '99', song_title: 'Something Else', artist: { name: 'Nobody' } },
        { tempo: '124', song_title: 'Levels', artist: { name: 'Avicii' } },
      ],
    });
    const provider = createGetSongBpmProvider({
      apiKey: 'k',
      fetchImpl,
      apiBase: 'https://bpm.test',
    });
    // NOT the first row (99) — the matching one (124).
    expect(await provider.lookup({ title: 'Levels', artist: 'Avicii' })).toBe(124);
    expect(calls[0]).toContain('https://bpm.test/search/');
    expect(calls[0]).toContain('api_key=k');
  });

  it('returns null rather than a wrong-song tempo when no result matches the title', async () => {
    // A common failure mode: search returns a different song with a tempo. Picking
    // it would write a misleading BPM, so an unmatched title yields no BPM.
    const { fetchImpl } = fakeFetch({
      search: [{ tempo: '124', song_title: 'A Different Song', artist: { name: 'Someone' } }],
    });
    const provider = createGetSongBpmProvider({
      apiKey: 'k',
      fetchImpl,
      apiBase: 'https://bpm.test',
    });
    expect(await provider.lookup({ title: 'Levels', artist: 'Avicii' })).toBeNull();
  });

  it('accepts a unique title hit even when the artist differs', async () => {
    const { fetchImpl } = fakeFetch({
      search: [{ tempo: '124', song_title: 'Levels', artist: { name: 'Avici' } }],
    });
    const provider = createGetSongBpmProvider({
      apiKey: 'k',
      fetchImpl,
      apiBase: 'https://bpm.test',
    });
    expect(await provider.lookup({ title: 'Levels', artist: 'Avicii' })).toBe(124);
  });

  it('returns null when the service reports no result (error object)', async () => {
    const { fetchImpl } = fakeFetch({ search: { error: 'no result' } });
    const provider = createGetSongBpmProvider({
      apiKey: 'k',
      fetchImpl,
      apiBase: 'https://bpm.test',
    });
    expect(await provider.lookup({ title: 'x', artist: 'y' })).toBeNull();
  });

  it('throws on a non-ok response', async () => {
    const { fetchImpl } = fakeFetch({}, false);
    const provider = createGetSongBpmProvider({
      apiKey: 'k',
      fetchImpl,
      apiBase: 'https://bpm.test',
    });
    await expect(provider.lookup({ title: 'x', artist: 'y' })).rejects.toThrow();
  });
});

describe('mockBpm', () => {
  it('is deterministic and lands in the spin band 120–160', () => {
    const a = mockBpm({ title: 'Levels', artist: 'Avicii' });
    const b = mockBpm({ title: 'Levels', artist: 'Avicii' });
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(120);
    expect(a).toBeLessThanOrEqual(160);
  });
});

describe('resolveBpm', () => {
  const env = (o: Partial<Env>): Env => o as unknown as Env;

  it('serves the deterministic mock when MOCK_PROVIDERS=true', async () => {
    const bpm = await resolveBpm(env({ MOCK_PROVIDERS: 'true' }), { title: 'A', artist: 'B' });
    expect(bpm).toBe(mockBpm({ title: 'A', artist: 'B' }));
  });

  it('503s when no provider is configured', async () => {
    await expect(resolveBpm(env({}), { title: 'A', artist: 'B' })).rejects.toBeInstanceOf(
      HttpError,
    );
  });
});
