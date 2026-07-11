import { describe, it, expect } from 'vitest';
import type { TrackSearchResult } from '@ritmofit/shared';
import { dedupeByMatchKey, partitionSettledImports } from './import-playlist.js';

function candidate(overrides: Partial<TrackSearchResult> = {}): TrackSearchResult {
  return {
    provider: 'spotify',
    providerTrackId: 'p1',
    providerUri: null,
    title: 'Levels',
    artist: 'Avicii',
    albumArtUrl: null,
    durationMs: 200_000,
    ...overrides,
  };
}

describe('dedupeByMatchKey', () => {
  it('collapses cosmetically-different same songs to the first occurrence', () => {
    const first = candidate({
      providerTrackId: 'a',
      title: 'Levels (Radio Edit)',
      artist: 'AVICII',
    });
    const dupe = candidate({ providerTrackId: 'b', title: 'Levels', artist: 'avicii' });
    const out = dedupeByMatchKey([first, dupe]);
    expect(out).toHaveLength(1);
    expect(out[0]?.providerTrackId).toBe('a');
  });

  it('keeps distinct songs', () => {
    const a = candidate({ providerTrackId: 'a', title: 'Levels', artist: 'Avicii' });
    const b = candidate({ providerTrackId: 'b', title: 'Wake Me Up', artist: 'Avicii' });
    expect(dedupeByMatchKey([a, b])).toHaveLength(2);
  });

  it('dedups across providers by match key (same song, different provider)', () => {
    const spotify = candidate({ provider: 'spotify', providerTrackId: 's', title: 'Levels' });
    const soundcloud = candidate({ provider: 'soundcloud', providerTrackId: 'c', title: 'Levels' });
    const out = dedupeByMatchKey([spotify, soundcloud]);
    expect(out).toHaveLength(1);
    expect(out[0]?.provider).toBe('spotify');
  });

  it('preserves order and returns empty for empty input', () => {
    expect(dedupeByMatchKey([])).toEqual([]);
    const a = candidate({ providerTrackId: 'a', title: 'One', artist: 'X' });
    const b = candidate({ providerTrackId: 'b', title: 'Two', artist: 'X' });
    const c = candidate({ providerTrackId: 'c', title: 'Three', artist: 'X' });
    expect(dedupeByMatchKey([a, b, c]).map((t) => t.providerTrackId)).toEqual(['a', 'b', 'c']);
  });
});

describe('partitionSettledImports', () => {
  const ok = <T>(value: T): PromiseSettledResult<T> => ({ status: 'fulfilled', value });
  const fail = <T>(reason: unknown): PromiseSettledResult<T> => ({ status: 'rejected', reason });

  it('keeps every fulfilled value, in order, when nothing fails', () => {
    const settled = [ok('a'), ok('b'), ok('c')];
    expect(partitionSettledImports(settled)).toEqual({ fulfilled: ['a', 'b', 'c'], skipped: 0 });
  });

  it('drops a single racing failure instead of aborting the batch', () => {
    // The exact regression the URL-import + saved-playlist paths must survive: one
    // track throws (e.g. a raced 409 from track-import.ts) and the rest still land.
    const settled = [ok('a'), fail(new Error('CONFLICT')), ok('c')];
    expect(partitionSettledImports(settled)).toEqual({ fulfilled: ['a', 'c'], skipped: 1 });
  });

  it('tallies every failure and reports zero fulfilled when all reject', () => {
    const settled = [fail('x'), fail('y')];
    expect(partitionSettledImports(settled)).toEqual({ fulfilled: [], skipped: 2 });
  });

  it('returns an empty partition for empty input', () => {
    expect(partitionSettledImports([])).toEqual({ fulfilled: [], skipped: 0 });
  });
});
