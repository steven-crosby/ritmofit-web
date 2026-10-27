// Lane C audit repro (2026-10-27) — C-22: a same-song merge accepted at 4 s
// tolerance fails the run at the 1 s endpoint tolerance. Not product code.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Provider, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { RuntimePlaybackCoordinator, type PlaybackRuntimeError } from './runtime.js';
import type {
  AdapterEvents,
  PlaybackAdapter,
  PlaybackReady,
  PlaybackWindow,
  TransportReading,
} from './types.js';

const NOW = 1_750_000_000_000;
const SAVED_SPOTIFY_DURATION = 203_000; // tracks.duration_ms from the first (Spotify) import
const SOUNDCLOUD_ACTUAL_END = 199_500; // attached recording, 3.5 s shorter (within 4 s)

function entry(): RunPayloadTrackEntry {
  return {
    classTrackId: 'ct-1',
    position: 0,
    displayBpm: null,
    displayRpm: null,
    holdCount: null,
    intensity: 'mod',
    startOffsetMs: 0,
    clipStartMs: 0,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: 'track-1',
      title: 'Levels',
      artist: 'Avicii',
      durationMs: SAVED_SPOTIFY_DURATION,
      baseDurationMs: SAVED_SPOTIFY_DURATION,
      albumArtUrl: null,
    },
    providerRefs: (['spotify', 'soundcloud'] as Provider[]).map((provider) => ({
      provider,
      providerTrackId: `${provider}-id`,
      providerUri: null,
    })),
    cues: [],
    moves: [],
  };
}

function payload(): RunPayload {
  return {
    schemaVersion: 1,
    class: {
      id: 'class-1',
      title: 'Class',
      template: null,
      targetDurationMs: null,
      timelineMode: 'sequential',
      totalDurationMs: SAVED_SPOTIFY_DURATION,
    },
    tracks: [entry()],
    sections: [],
  };
}

class Fake implements PlaybackAdapter {
  reading: TransportReading = { positionMs: 0, state: 'playing' };
  constructor(
    readonly provider: Provider,
    readonly events: AdapterEvents,
  ) {}
  prepare(e: RunPayloadTrackEntry, _w: PlaybackWindow): Promise<PlaybackReady> {
    return Promise.resolve({ provider: this.provider, classTrackId: e.classTrackId });
  }
  play = async () => {};
  pause = async () => {};
  seek = async () => {};
  stop = async () => {};
  destroy = () => {};
  getTransport = async () => this.reading;
}

describe('C-22 same-song duration drift vs runtime endpoint', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plays the merged SoundCloud ref and fails when it ends 3.5 s early', async () => {
    const created: Fake[] = [];
    const errors: PlaybackRuntimeError[] = [];
    const factory = (provider: Provider) => (events: AdapterEvents) => {
      const a = new Fake(provider, events);
      created.push(a);
      return a;
    };
    const coordinator = new RuntimePlaybackCoordinator(
      payload(),
      [
        { provider: 'spotify', expiresAt: NOW + 3_600_000, scope: 'streaming user-library-read' },
        { provider: 'soundcloud', expiresAt: NOW + 3_600_000, scope: null },
      ],
      {
        now: NOW,
        preferredProvider: null,
        adapters: { soundcloud: factory('soundcloud'), spotify: factory('spotify') },
        onError: (e) => errors.push(e),
        onPosition: () => {},
      },
    );
    await coordinator.start();
    expect(created.map((a) => a.provider)).toEqual(['soundcloud']); // PROVIDER_ORDER picks SoundCloud
    created[0]!.reading = { positionMs: SOUNDCLOUD_ACTUAL_END, state: 'ended' };
    created[0]!.events.onFinish?.();
    await vi.advanceTimersByTimeAsync(250);
    expect(coordinator.getStatus().kind).toBe('error');
    expect(JSON.stringify(errors)).toContain('Music ended before the saved playback window');
    coordinator.destroy();
  });
});
