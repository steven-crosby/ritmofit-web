import { describe, it, expect } from 'vitest';
import type { Provider, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  selectProvider,
  playbackWindowFor,
  providerMsAt,
  preflightPayload,
  type ConnectionLike,
} from './coordinator.js';

const NOW = 1_750_000_000_000;

function makeEntry(overrides: {
  classTrackId?: string;
  position?: number;
  title?: string;
  durationMs?: number | null;
  startOffsetMs?: number | null;
  clipStartMs?: number;
  providers?: Provider[];
}): RunPayloadTrackEntry {
  const providers = overrides.providers ?? ['soundcloud'];
  return {
    classTrackId: overrides.classTrackId ?? 'ct-1',
    position: overrides.position ?? 0,
    displayBpm: null,
    displayRpm: null,
    holdCount: null,
    intensity: 'mod',
    startOffsetMs: overrides.startOffsetMs === undefined ? 0 : overrides.startOffsetMs,
    clipStartMs: overrides.clipStartMs ?? 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: 'track-1',
      title: overrides.title ?? 'Track',
      artist: 'Artist',
      durationMs: overrides.durationMs === undefined ? 180_000 : overrides.durationMs,
      albumArtUrl: null,
    },
    providerRefs: providers.map((provider) => ({
      provider,
      providerTrackId: `${provider}-id`,
      providerUri: null,
    })),
    cues: [],
    moves: [],
  };
}

function makePayload(tracks: RunPayloadTrackEntry[]): RunPayload {
  return {
    schemaVersion: 1,
    class: {
      id: 'class-1',
      title: 'Class',
      template: null,
      targetDurationMs: null,
      timelineMode: 'sequential',
      totalDurationMs: tracks.reduce((sum, t) => sum + (t.track.durationMs ?? 0), 0),
    },
    tracks,
    sections: [],
  };
}

/** A live (unexpired) connection for each provider. */
function connections(...providers: Provider[]): ConnectionLike[] {
  return providers.map((provider) => ({ provider, expiresAt: NOW + 3_600_000 }));
}

describe('selectProvider', () => {
  it('prefers the preferred connected provider when the track has its ref', () => {
    const entry = makeEntry({ providers: ['soundcloud', 'apple_music'] });
    const selection = selectProvider(entry, connections('soundcloud', 'apple_music'), {
      preferredProvider: 'apple_music',
      now: NOW,
    });
    expect(selection).toEqual({
      status: 'playable',
      provider: 'apple_music',
      ref: { provider: 'apple_music', providerTrackId: 'apple_music-id', providerUri: null },
    });
  });

  it('falls back to the best connected provider in PROVIDER_ORDER when the preferred provider has no ref', () => {
    const entry = makeEntry({ providers: ['spotify', 'apple_music'] });
    const selection = selectProvider(entry, connections('soundcloud', 'spotify', 'apple_music'), {
      preferredProvider: 'soundcloud',
      now: NOW,
    });
    // PROVIDER_ORDER is soundcloud → spotify → apple_music; soundcloud has no ref.
    expect(selection).toMatchObject({ status: 'playable', provider: 'spotify' });
  });

  it('falls back when the preferred provider is not connected', () => {
    const entry = makeEntry({ providers: ['spotify', 'apple_music'] });
    const selection = selectProvider(entry, connections('apple_music'), {
      preferredProvider: 'spotify',
      now: NOW,
    });
    expect(selection).toMatchObject({ status: 'playable', provider: 'apple_music' });
  });

  it('is deterministic without a preference: first connected ref in PROVIDER_ORDER', () => {
    const entry = makeEntry({ providers: ['spotify', 'soundcloud', 'apple_music'] });
    const selection = selectProvider(entry, connections('spotify', 'soundcloud', 'apple_music'), {
      now: NOW,
    });
    expect(selection).toMatchObject({ status: 'playable', provider: 'soundcloud' });
  });

  it('treats an expired connection as not connected', () => {
    const entry = makeEntry({ providers: ['spotify'] });
    const selection = selectProvider(entry, [{ provider: 'spotify', expiresAt: NOW - 1 }], {
      now: NOW,
    });
    expect(selection).toEqual({ status: 'unplayable', reason: 'no_connected_provider' });
  });

  it('reports a track with no provider refs as unplayable', () => {
    const entry = makeEntry({ providers: [] });
    const selection = selectProvider(entry, connections('soundcloud'), { now: NOW });
    expect(selection).toEqual({ status: 'unplayable', reason: 'no_provider_ref' });
  });

  it('reports refs without any connected provider as unplayable', () => {
    const entry = makeEntry({ providers: ['apple_music'] });
    const selection = selectProvider(entry, connections('soundcloud'), { now: NOW });
    expect(selection).toEqual({ status: 'unplayable', reason: 'no_connected_provider' });
  });

  it('plays SoundCloud with no connection at all (public Widget needs no token)', () => {
    const entry = makeEntry({ providers: ['soundcloud'] });
    expect(selectProvider(entry, [], { now: NOW })).toMatchObject({
      status: 'playable',
      provider: 'soundcloud',
    });
  });

  it('plays SoundCloud even when its connection has expired', () => {
    const entry = makeEntry({ providers: ['soundcloud'] });
    const selection = selectProvider(entry, [{ provider: 'soundcloud', expiresAt: NOW - 1 }], {
      now: NOW,
    });
    expect(selection).toMatchObject({ status: 'playable', provider: 'soundcloud' });
  });

  it('still requires a live connection for Apple Music (MusicKit authorizes the user)', () => {
    const entry = makeEntry({ providers: ['apple_music'] });
    expect(selectProvider(entry, [], { now: NOW })).toEqual({
      status: 'unplayable',
      reason: 'no_connected_provider',
    });
    expect(selectProvider(entry, connections('apple_music'), { now: NOW })).toMatchObject({
      status: 'playable',
      provider: 'apple_music',
    });
  });

  it('treats a provider with no registered adapter as unplayable (provider_not_playable), even if connected', () => {
    const entry = makeEntry({ providers: ['soundcloud'] });
    // availableProviders excludes soundcloud → its only ref has no adapter here,
    // so connecting can't help — it's provider_not_playable, not no_connected_provider.
    const selection = selectProvider(entry, connections('soundcloud'), {
      now: NOW,
      availableProviders: ['apple_music'],
    });
    expect(selection).toEqual({ status: 'unplayable', reason: 'provider_not_playable' });
  });

  it('distinguishes needs-connection from no-adapter for the two dead ends', () => {
    // Apple Music has an adapter but needs a connection → no_connected_provider.
    expect(
      selectProvider(makeEntry({ providers: ['apple_music'] }), [], {
        now: NOW,
        availableProviders: ['soundcloud', 'apple_music'],
      }),
    ).toEqual({ status: 'unplayable', reason: 'no_connected_provider' });
    // Spotify has no adapter → provider_not_playable (connecting won't help).
    expect(
      selectProvider(makeEntry({ providers: ['spotify'] }), connections('spotify'), {
        now: NOW,
        availableProviders: ['soundcloud', 'apple_music'],
      }),
    ).toEqual({ status: 'unplayable', reason: 'provider_not_playable' });
  });

  it('skips a ref whose provider is unavailable and falls back to an available one', () => {
    const entry = makeEntry({ providers: ['spotify', 'soundcloud'] });
    // Spotify has no adapter yet; SoundCloud does and needs no connection.
    const selection = selectProvider(entry, [], {
      now: NOW,
      availableProviders: ['soundcloud', 'apple_music'],
    });
    expect(selection).toMatchObject({ status: 'playable', provider: 'soundcloud' });
  });
});

describe('playbackWindowFor', () => {
  it('starts at the clip start and ends at clip start + effective duration', () => {
    const entry = makeEntry({ clipStartMs: 15_000, durationMs: 180_000 });
    expect(playbackWindowFor(entry)).toEqual({ startMs: 15_000, endMs: 195_000 });
  });

  it('yields the full track window for an untrimmed track', () => {
    const entry = makeEntry({ clipStartMs: 0, durationMs: 200_000 });
    expect(playbackWindowFor(entry)).toEqual({ startMs: 0, endMs: 200_000 });
  });

  it('collapses to a zero-width window without a duration', () => {
    const entry = makeEntry({ clipStartMs: 30_000, durationMs: null });
    expect(playbackWindowFor(entry)).toEqual({ startMs: 30_000, endMs: 30_000 });
  });
});

describe('providerMsAt', () => {
  it('translates class elapsed time to provider time through the clip offset', () => {
    const entry = makeEntry({ startOffsetMs: 60_000, clipStartMs: 15_000 });
    // 10s into this track on the class timeline = clipStart + 10s in provider time.
    expect(providerMsAt(entry, 70_000)).toBe(25_000);
  });

  it('lands on the window start at the entry start, treating a null offset as 0', () => {
    const entry = makeEntry({ startOffsetMs: null, clipStartMs: 5_000 });
    expect(providerMsAt(entry, 0)).toBe(5_000);
  });
});

describe('preflightPayload', () => {
  it('passes a mixed-provider class, resolving each track independently', () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', position: 0, providers: ['soundcloud'] }),
      makeEntry({ classTrackId: 'ct-2', position: 1, providers: ['apple_music'] }),
      makeEntry({ classTrackId: 'ct-3', position: 2, providers: ['spotify', 'soundcloud'] }),
    ]);
    const result = preflightPayload(payload, connections('soundcloud', 'spotify', 'apple_music'), {
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.unplayable).toEqual([]);
    expect(result.tracks.map((t) => t.selection)).toMatchObject([
      { status: 'playable', provider: 'soundcloud' },
      { status: 'playable', provider: 'apple_music' },
      { status: 'playable', provider: 'soundcloud' }, // deterministic order, not spotify
    ]);
  });

  it('applies the preferred provider across a mixed-provider class', () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', position: 0, providers: ['soundcloud', 'spotify'] }),
      makeEntry({ classTrackId: 'ct-2', position: 1, providers: ['apple_music'] }),
    ]);
    const result = preflightPayload(payload, connections('soundcloud', 'spotify', 'apple_music'), {
      preferredProvider: 'spotify',
      now: NOW,
    });
    expect(result.ok).toBe(true);
    expect(result.tracks.map((t) => t.selection)).toMatchObject([
      { status: 'playable', provider: 'spotify' }, // preferred wins where ref'd
      { status: 'playable', provider: 'apple_music' }, // falls back where not
    ]);
  });

  it('fails preflight naming exactly the unplayable track', () => {
    const payload = makePayload([
      makeEntry({
        classTrackId: 'ct-1',
        position: 0,
        title: 'Playable',
        providers: ['soundcloud'],
      }),
      makeEntry({ classTrackId: 'ct-2', position: 1, title: 'Orphan', providers: [] }),
    ]);
    const result = preflightPayload(payload, connections('soundcloud'), { now: NOW });
    expect(result.ok).toBe(false);
    expect(result.unplayable).toHaveLength(1);
    expect(result.unplayable[0]).toMatchObject({
      classTrackId: 'ct-2',
      position: 1,
      title: 'Orphan',
      selection: { status: 'unplayable', reason: 'no_provider_ref' },
    });
  });

  it('fails a connected track that has no effective duration (no end to stop at)', () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', position: 0, durationMs: null, providers: ['soundcloud'] }),
    ]);
    const result = preflightPayload(payload, connections('soundcloud'), { now: NOW });
    expect(result.ok).toBe(false);
    expect(result.unplayable[0]!.selection).toEqual({
      status: 'unplayable',
      reason: 'missing_duration',
    });
  });

  it('passes an empty class (nothing to play, nothing unplayable)', () => {
    const result = preflightPayload(makePayload([]), connections('soundcloud'), { now: NOW });
    expect(result).toEqual({ ok: true, tracks: [], unplayable: [] });
  });

  it('passes an all-SoundCloud class with no provider connections at all', () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', position: 0, providers: ['soundcloud'] }),
      makeEntry({ classTrackId: 'ct-2', position: 1, providers: ['soundcloud'] }),
    ]);
    const result = preflightPayload(payload, [], {
      now: NOW,
      availableProviders: ['soundcloud', 'apple_music'],
    });
    expect(result.ok).toBe(true);
    expect(result.unplayable).toEqual([]);
  });

  it('marks a Spotify-only track unplayable when Spotify has no adapter yet', () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', position: 0, providers: ['spotify'] }),
    ]);
    const result = preflightPayload(payload, connections('spotify'), {
      now: NOW,
      availableProviders: ['soundcloud', 'apple_music'],
    });
    expect(result.ok).toBe(false);
    expect(result.unplayable[0]!.selection).toEqual({
      status: 'unplayable',
      reason: 'provider_not_playable',
    });
  });
});
