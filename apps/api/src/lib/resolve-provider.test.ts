import { describe, it, expect } from 'vitest';
import type { Provider, TrackSearchResult } from '@ritmofit/shared';
import {
  resolveTrackProvider,
  MAX_CANDIDATES_PER_PROVIDER,
  type ProviderSearch,
} from './resolve-provider.js';
import type { MatchableTrack } from './same-song.js';

const track: MatchableTrack = {
  id: 'track-1',
  title: 'Levels',
  artist: 'Avicii',
  durationMs: 203_000,
  providers: ['spotify'],
};

function candidate(provider: Provider, over?: Partial<TrackSearchResult>): TrackSearchResult {
  return {
    provider,
    providerTrackId: `${provider}-id`,
    providerUri: null,
    title: 'Levels',
    artist: 'Avicii',
    albumArtUrl: null,
    durationMs: 203_000,
    ...over,
  };
}

/** A search that returns fixed results per provider. */
function searchFrom(byProvider: Partial<Record<Provider, TrackSearchResult[]>>): ProviderSearch {
  return (provider) => Promise.resolve(byProvider[provider] ?? []);
}

describe('resolveTrackProvider', () => {
  it('auto-attaches a strong same-song match', async () => {
    const outcome = await resolveTrackProvider(
      track,
      ['soundcloud', 'apple_music'],
      searchFrom({ soundcloud: [candidate('soundcloud')] }),
    );
    expect(outcome).toEqual({
      kind: 'match',
      provider: 'soundcloud',
      candidate: candidate('soundcloud'),
    });
  });

  it('returns candidates when nothing matches strongly (duration beyond tolerance)', async () => {
    const weak = candidate('soundcloud', { durationMs: 203_000 + 10_000 });
    const outcome = await resolveTrackProvider(
      track,
      ['soundcloud'],
      searchFrom({ soundcloud: [weak] }),
    );
    expect(outcome).toEqual({ kind: 'candidates', candidates: [weak] });
  });

  it('never searches a provider the track already carries', async () => {
    const searched: Provider[] = [];
    const outcome = await resolveTrackProvider(track, ['spotify', 'soundcloud'], (provider) => {
      searched.push(provider);
      return Promise.resolve(provider === 'soundcloud' ? [candidate('soundcloud')] : []);
    });
    expect(searched).toEqual(['soundcloud']); // spotify (already carried) is skipped
    expect(outcome).toMatchObject({ kind: 'match', provider: 'soundcloud' });
  });

  it('tries providers in order and returns the first strong match', async () => {
    const outcome = await resolveTrackProvider(
      track,
      ['soundcloud', 'apple_music'],
      searchFrom({
        soundcloud: [candidate('soundcloud')],
        apple_music: [candidate('apple_music')],
      }),
    );
    expect(outcome).toMatchObject({ kind: 'match', provider: 'soundcloud' });
  });

  it('skips a provider whose search throws, without failing the whole resolve', async () => {
    const outcome = await resolveTrackProvider(track, ['soundcloud', 'apple_music'], (provider) =>
      provider === 'soundcloud'
        ? Promise.reject(new Error('unconfigured'))
        : Promise.resolve([candidate('apple_music')]),
    );
    expect(outcome).toMatchObject({ kind: 'match', provider: 'apple_music' });
  });

  it('ignores results whose provider does not match the searched provider', async () => {
    // A misbehaving adapter returns a spotify result for a soundcloud search.
    const outcome = await resolveTrackProvider(
      track,
      ['soundcloud'],
      searchFrom({ soundcloud: [candidate('spotify')] }),
    );
    expect(outcome).toEqual({ kind: 'candidates', candidates: [] });
  });

  it('caps candidates per provider', async () => {
    const many = Array.from({ length: MAX_CANDIDATES_PER_PROVIDER + 3 }, (_, i) =>
      candidate('soundcloud', { providerTrackId: `sc-${i}`, durationMs: 203_000 + 10_000 }),
    );
    const outcome = await resolveTrackProvider(
      track,
      ['soundcloud'],
      searchFrom({ soundcloud: many }),
    );
    expect(outcome.kind).toBe('candidates');
    if (outcome.kind === 'candidates') {
      expect(outcome.candidates).toHaveLength(MAX_CANDIDATES_PER_PROVIDER);
    }
  });
});
