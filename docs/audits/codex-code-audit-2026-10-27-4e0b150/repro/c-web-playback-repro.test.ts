/**
 * Reviewer C audit repros (synthetic SDK fakes only; no provider network).
 * Each test asserts the CURRENT (defective) behaviour at 4e0b150 so a green run
 * means "reproduced".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import { preflightPayload, selectProvider } from './coordinator.js';
import { providerCapabilityTruth } from '../providers.js';
import { SpotifyAdapter, spotifyTrackUri } from './spotify-adapter.js';
import { RuntimePlaybackCoordinator, type CoordinatorStatus } from './runtime.js';
import {
  getSpotifyPlayback,
  resetSpotifyPlayback,
  type SpotifyNamespace,
  type SpotifyPlayer,
  type SpotifyPlayerState,
} from '../spotify-playback.js';

const NOW = 1_800_000_000_000;

function entry(overrides: Partial<RunPayloadTrackEntry> = {}): RunPayloadTrackEntry {
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
      id: 't-1',
      title: 'Relinked Song',
      artist: 'Artist',
      durationMs: 180_000,
      baseDurationMs: 180_000,
      albumArtUrl: null,
    },
    providerRefs: [
      { provider: 'spotify', providerTrackId: 'ORIGINAL', providerUri: 'spotify:track:ORIGINAL' },
    ] as RunPayloadTrackEntry['providerRefs'],
    cues: [],
    moves: [],
    ...overrides,
  };
}

function payload(tracks: RunPayloadTrackEntry[]): RunPayload {
  return {
    class: { totalDurationMs: 180_000 },
    tracks,
  } as unknown as RunPayload;
}

type Listener = (p: unknown) => void;
class FakePlayer {
  listeners = new Map<string, Listener[]>();
  state: SpotifyPlayerState | null = null;
  connect() {
    return Promise.resolve(true);
  }
  activateElement() {
    return Promise.resolve();
  }
  disconnect() {}
  getCurrentState() {
    return Promise.resolve(this.state);
  }
  pause() {
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
  seek() {
    return Promise.resolve();
  }
  addListener(event: string, cb: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), cb]);
  }
  removeListener(event: string, cb?: Listener) {
    this.listeners.set(event, cb ? (this.listeners.get(event) ?? []).filter((l) => l !== cb) : []);
  }
  emit(event: string, payload: unknown) {
    for (const l of this.listeners.get(event) ?? []) l(payload);
  }
}

describe('C-1 Spotify playback gated on the ~1h ACCESS-token expiry', () => {
  // Shape the API returns from GET /providers/connections: `expiresAt` is the
  // stored access-token expiry (provider-connections.ts toConnectionView), while
  // the refresh token (server-only) can still mint a fresh one on demand.
  const staleAccessToken = {
    provider: 'spotify' as const,
    expiresAt: NOW - 1, // access token lapsed 1 ms ago; grant is still alive
    scope: 'user-library-read streaming user-read-email user-read-private',
  };

  it('marks a Spotify-only track unplayable as "no_connected_provider"', () => {
    const selection = selectProvider(entry(), [staleAccessToken], {
      now: NOW,
      availableProviders: ['soundcloud', 'apple_music', 'spotify'],
    });
    expect(selection).toEqual({ status: 'unplayable', reason: 'no_connected_provider' });
  });

  it('fails Live preflight for the whole class', () => {
    const result = preflightPayload(payload([entry()]), [staleAccessToken], {
      now: NOW,
      availableProviders: ['soundcloud', 'apple_music', 'spotify'],
    });
    expect(result.ok).toBe(false);
  });

  it('labels playback "Reconnect for playback" although no reconnect is needed', () => {
    const truth = providerCapabilityTruth('spotify', staleAccessToken, NOW);
    expect(truth.connectionState).toBe('expired');
    expect(truth.playback).toEqual({ state: 'action-required', label: 'Reconnect for playback' });
  });
});

describe('C-3 Spotify track relinking reads as a dead device', () => {
  it('getTransport rejects when the SDK plays the relinked uri', async () => {
    const player = new FakePlayer();
    const adapter = new SpotifyAdapter(
      {},
      {
        getPlayback: async () => ({
          player: player as unknown as SpotifyPlayer,
          deviceId: 'dev-1',
        }),
        startTrack: async () => {},
      },
    );
    await adapter.prepare(entry(), { startMs: 0, endMs: 180_000 });
    await adapter.play();
    // Spotify relinked the requested track to the market's instance.
    player.state = {
      paused: false,
      position: 5_000,
      duration: 180_000,
      track_window: {
        current_track: {
          id: 'RELINKED',
          uri: 'spotify:track:RELINKED',
          // Real WebPlaybackTrack objects also carry linked_from: { uri: 'spotify:track:ORIGINAL' }
        } as never,
      },
    };
    await expect(adapter.getTransport()).rejects.toThrow(
      'Spotify Web Playback SDK is no longer playing the class track.',
    );
  });

  it('the music-led runtime turns that into an adapter error that halts the class', async () => {
    vi.useFakeTimers();
    const player = new FakePlayer();
    const statuses: CoordinatorStatus[] = [];
    const coordinator = new RuntimePlaybackCoordinator(
      payload([entry()]),
      [{ provider: 'spotify', expiresAt: NOW + 3_600_000, scope: 'streaming' }],
      {
        now: NOW,
        availableProviders: ['spotify'],
        adapters: {
          spotify: (events) =>
            new SpotifyAdapter(events, {
              getPlayback: async () => ({
                player: player as unknown as SpotifyPlayer,
                deviceId: 'dev-1',
              }),
              startTrack: async () => {
                player.state = {
                  paused: false,
                  position: 1_000,
                  duration: 180_000,
                  track_window: {
                    current_track: { id: 'RELINKED', uri: 'spotify:track:RELINKED' },
                  },
                };
              },
            }),
        },
        onStatus: (s) => statuses.push(s),
        onPosition: () => {},
      },
    );
    await coordinator.start(0);
    await vi.advanceTimersByTimeAsync(300);
    const last = statuses.at(-1);
    expect(last?.kind).toBe('error');
    expect(last && last.kind === 'error' ? last.error.message : '').toBe(
      'Spotify Web Playback SDK is no longer playing the class track.',
    );
    coordinator.destroy();
    vi.useRealTimers();
  });
});

describe('C-3b one transient null Spotify state fails the class at once (no stall budget)', () => {
  it('a single null getCurrentState -> error within one 250 ms sample', async () => {
    vi.useFakeTimers();
    const player = new FakePlayer();
    const statuses: CoordinatorStatus[] = [];
    const playing = (position: number): SpotifyPlayerState => ({
      paused: false,
      position,
      duration: 180_000,
      track_window: { current_track: { id: 'ORIGINAL', uri: 'spotify:track:ORIGINAL' } },
    });
    const coordinator = new RuntimePlaybackCoordinator(
      payload([entry()]),
      [{ provider: 'spotify', expiresAt: NOW + 3_600_000, scope: 'streaming' }],
      {
        now: NOW,
        availableProviders: ['spotify'],
        adapters: {
          spotify: (events) =>
            new SpotifyAdapter(events, {
              getPlayback: async () => ({
                player: player as unknown as SpotifyPlayer,
                deviceId: 'dev-1',
              }),
              startTrack: async () => {
                player.state = playing(1_000);
              },
            }),
        },
        onStatus: (s) => statuses.push(s),
        onPosition: () => {},
      },
    );
    await coordinator.start(0);
    await vi.advanceTimersByTimeAsync(260);
    player.state = playing(1_300);
    await vi.advanceTimersByTimeAsync(260);
    expect(statuses.at(-1)?.kind).toBe('playing');
    player.state = null; // e.g. SDK briefly reconnecting
    await vi.advanceTimersByTimeAsync(260);
    const last = statuses.at(-1);
    expect(last?.kind).toBe('error');
    expect(last && last.kind === 'error' ? last.error.message : '').toBe(
      'Spotify Web Playback SDK device is no longer active.',
    );
    coordinator.destroy();
    vi.useRealTimers();
  });
});

describe('C-4 Spotify page-singleton device is never rebuilt after it goes offline', () => {
  afterEach(() => resetSpotifyPlayback());

  it('keeps serving the first device_id after not_ready + a new ready', async () => {
    let created: FakePlayer | null = null;
    const sdk: SpotifyNamespace = {
      Player: class {
        constructor() {
          created = new FakePlayer();
          return created as never;
        }
      } as never,
    };
    const first = getSpotifyPlayback({
      loadSdk: async () => sdk,
      getToken: async () => ({ accessToken: 'tok', expiresInMs: 1 }),
    });
    await Promise.resolve();
    await Promise.resolve();
    created!.emit('ready', { device_id: 'device-A' });
    expect((await first).deviceId).toBe('device-A');

    // Network drop: the SDK reports the device offline, then re-registers.
    created!.emit('not_ready', { device_id: 'device-A' });
    created!.emit('ready', { device_id: 'device-B' });

    const later = await getSpotifyPlayback();
    expect(later.deviceId).toBe('device-A'); // stale id used by PUT /me/player/play
    // Nobody listens to not_ready at all.
    expect(created!.listeners.get('not_ready') ?? []).toHaveLength(0);
  });
});

describe('C-6 (REJECTED upstream: episodes never import) uri builder fallback', () => {
  it('turns a non-track uri into spotify:track:<id> (only reachable via manual/legacy refs)', () => {
    expect(
      spotifyTrackUri({
        provider: 'spotify',
        providerTrackId: 'EPISODE123',
        providerUri: 'spotify:episode:EPISODE123',
      } as never),
    ).toBe('spotify:track:EPISODE123');
  });
});
