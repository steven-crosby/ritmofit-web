// Lane C audit repro (2026-10-27) — cross-provider resolution. Not product code.
import { describe, it, expect } from 'vitest';
import type { Provider, TrackSearchResult } from '@ritmofit/shared';
import { providerTrackIdAliases } from '@ritmofit/music';
import { findSameSongMatch, makeMatchKey, normalizeForMatch } from './same-song.js';
import { resolveTrackProvider } from './resolve-provider.js';

const libraryTrack = {
  id: 'track-1',
  title: 'Levels',
  artist: 'Avicii',
  durationMs: 203_000,
  providers: ['spotify'] as Provider[],
};

function sc(over: Partial<TrackSearchResult>): TrackSearchResult {
  return {
    provider: 'soundcloud',
    providerTrackId: 'soundcloud:tracks:1',
    providerUri: null,
    title: 'Levels',
    artist: 'Avicii',
    albumArtUrl: null,
    durationMs: 203_000,
    ...over,
  };
}

describe('C-21 different recordings collapse to one match key', () => {
  it.each([
    'Levels (Instrumental)',
    'Levels (Live)',
    'Levels (Acoustic)',
    'Levels [Karaoke Version]',
    'Levels - Acoustic Version',
    'Levels - Live Edit',
    'Levels - Club Mix',
  ])('%s normalizes to the same key as the original', (title) => {
    expect(makeMatchKey(title, 'Avicii')).toBe(makeMatchKey('Levels', 'Avicii'));
  });

  it('auto-attaches an instrumental variant of equal duration via resolve-provider', async () => {
    const variant = sc({ title: 'Levels (Instrumental)', durationMs: 202_000 });
    const outcome = await resolveTrackProvider(libraryTrack, ['soundcloud'], async () => [
      variant,
    ]);
    expect(outcome).toEqual({ kind: 'match', provider: 'soundcloud', candidate: variant });
  });

  it('auto-attaches the first of several same-key results (no ambiguity check)', async () => {
    const live = sc({ providerTrackId: 'soundcloud:tracks:2', title: 'Levels (Live)', durationMs: 205_500 });
    const exact = sc({ providerTrackId: 'soundcloud:tracks:3' });
    const outcome = await resolveTrackProvider(libraryTrack, ['soundcloud'], async () => [
      live,
      exact,
    ]);
    expect(outcome).toMatchObject({ kind: 'match', candidate: { providerTrackId: 'soundcloud:tracks:2' } });
  });

  it('mixed-script titles collapse to their ASCII residue', () => {
    expect(normalizeForMatch('東京 Love')).toBe(normalizeForMatch('大阪 Love'));
    expect(
      findSameSongMatch(
        { provider: 'soundcloud', title: '大阪 Love', artist: 'Band', durationMs: 180_000 },
        [{ id: 'x', title: '東京 Love', artist: 'Band', durationMs: 181_000, providers: ['spotify'] }],
      ),
    ).toBe('x');
  });

  it('the unbounded feat/ft strip edits inside words', () => {
    expect(normalizeForMatch('Left Behind')).toBe('le behind');
    expect(normalizeForMatch('Defeated')).toBe('de ed');
  });
});

describe('C-22 duration tolerance (4 s) exceeds the runtime endpoint tolerance (1 s)', () => {
  it('merges a SoundCloud recording 3.5 s shorter than the saved Spotify duration', () => {
    expect(
      findSameSongMatch(
        { provider: 'soundcloud', title: 'Levels', artist: 'Avicii', durationMs: 199_500 },
        [libraryTrack],
      ),
    ).toBe('track-1');
  });
});

describe('C-23 resolve attach bypasses SoundCloud alias identity', () => {
  it('URN and legacy numeric forms are distinct strings for the unique index', () => {
    // importTrackFromCandidate checks both aliases; attachProviderId (used by
    // resolve-provider) inserts the literal id, which the unique index compares exactly.
    expect(providerTrackIdAliases('soundcloud', 'soundcloud:tracks:42')).toEqual([
      'soundcloud:tracks:42',
      '42',
    ]);
  });
});
