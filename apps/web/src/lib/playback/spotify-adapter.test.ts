import { describe, expect, it, vi } from 'vitest';
import type { RunPayloadTrackEntry } from '@ritmofit/shared';
import type { SpotifyPlayback, SpotifyPlayer, SpotifyPlayerState } from '../spotify-playback.js';
import {
  SpotifyAdapter,
  spotifyAdapterFactory,
  spotifyTrackUri,
  type SpotifyAdapterHost,
} from './spotify-adapter.js';
import { SpotifyPlaybackTokenError } from '../api.js';
import type { AdapterEvents } from './types.js';

function makeEntry(overrides?: {
  providerTrackId?: string;
  providerUri?: string | null;
  refs?: [];
}): RunPayloadTrackEntry {
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
      title: 'Baiana',
      artist: 'Bakermat',
      durationMs: 180_000,
      albumArtUrl: null,
    },
    providerRefs:
      overrides?.refs ??
      ([
        {
          provider: 'spotify',
          providerTrackId: overrides?.providerTrackId ?? 'sp-123',
          providerUri:
            overrides?.providerUri === undefined ? 'spotify:track:sp-123' : overrides.providerUri,
        },
      ] as RunPayloadTrackEntry['providerRefs']),
    cues: [],
    moves: [],
  };
}

type Listener = (payload: unknown) => void;

/** A scriptable stand-in for the singleton Spotify.Player (cast at the host seam). */
class FakePlayer {
  calls: string[] = [];
  private listeners = new Map<string, Listener[]>();

  connect(): Promise<boolean> {
    return Promise.resolve(true);
  }
  disconnect(): void {
    this.calls.push('disconnect');
  }
  pause(): Promise<void> {
    this.calls.push('pause');
    return Promise.resolve();
  }
  resume(): Promise<void> {
    this.calls.push('resume');
    return Promise.resolve();
  }
  seek(ms: number): Promise<void> {
    this.calls.push(`seek:${ms}`);
    return Promise.resolve();
  }
  addListener(event: string, cb: Listener): void {
    const bucket = this.listeners.get(event) ?? [];
    bucket.push(cb);
    this.listeners.set(event, bucket);
  }
  removeListener(event: string, cb?: Listener): void {
    if (!cb) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.set(
      event,
      (this.listeners.get(event) ?? []).filter((h) => h !== cb),
    );
  }
  emit(event: string, payload?: unknown): void {
    for (const cb of this.listeners.get(event) ?? []) cb(payload);
  }
  listenerCount(event: string): number {
    return (this.listeners.get(event) ?? []).length;
  }
}

function makeHost(player: FakePlayer, startTrack = vi.fn().mockResolvedValue(undefined)) {
  const asPlayer = player as unknown as SpotifyPlayer;
  return {
    player,
    startTrack,
    host: {
      getPlayback: (): Promise<SpotifyPlayback> =>
        Promise.resolve({ player: asPlayer, deviceId: 'dev-1' }),
      startTrack: startTrack as unknown as SpotifyAdapterHost['startTrack'],
    },
  };
}

const state = (over: Partial<SpotifyPlayerState>): SpotifyPlayerState => ({
  paused: false,
  position: 1000,
  duration: 180_000,
  track_window: { current_track: { id: 'sp-123', uri: 'spotify:track:sp-123' } },
  ...over,
});

describe('spotifyTrackUri', () => {
  it('prefers a stored spotify:track: uri', () => {
    expect(
      spotifyTrackUri({
        provider: 'spotify',
        providerTrackId: 'x',
        providerUri: 'spotify:track:abc',
      }),
    ).toBe('spotify:track:abc');
  });
  it('builds a uri from the track id when the stored uri is missing or not a track uri', () => {
    expect(
      spotifyTrackUri({ provider: 'spotify', providerTrackId: 'abc', providerUri: null }),
    ).toBe('spotify:track:abc');
    expect(
      spotifyTrackUri({
        provider: 'spotify',
        providerTrackId: 'abc',
        providerUri: 'https://open.spotify.com/track/abc',
      }),
    ).toBe('spotify:track:abc');
  });
});

describe('SpotifyAdapter', () => {
  it('rejects prepare for a track with no Spotify ref', async () => {
    const adapter = new SpotifyAdapter({}, makeHost(new FakePlayer()).host);
    await expect(
      adapter.prepare(makeEntry({ refs: [] }), { startMs: 0, endMs: 1000 }),
    ).rejects.toThrow(/no Spotify reference/);
  });

  it('starts the track at the window position on first play, then resumes on the next', async () => {
    const player = new FakePlayer();
    const { startTrack, host } = makeHost(player);
    const adapter = new SpotifyAdapter({}, host);

    await adapter.prepare(makeEntry(), { startMs: 30_000, endMs: 60_000 });
    await adapter.play();
    expect(startTrack).toHaveBeenCalledTimes(1);
    expect(startTrack.mock.calls[0][0]).toMatchObject({
      deviceId: 'dev-1',
      uri: 'spotify:track:sp-123',
      positionMs: 30_000,
    });

    await adapter.pause();
    await adapter.play(); // resume — no second Connect-API start
    expect(startTrack).toHaveBeenCalledTimes(1);
    expect(player.calls).toContain('pause');
    expect(player.calls).toContain('resume');
  });

  it('defers a pre-play seek to the start position and seeks live after play', async () => {
    const player = new FakePlayer();
    const { startTrack, host } = makeHost(player);
    const adapter = new SpotifyAdapter({}, host);

    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 60_000 });
    await adapter.seek(12_345); // before play → seeds the start position
    await adapter.play();
    expect(startTrack.mock.calls[0][0].positionMs).toBe(12_345);
    expect(player.calls.filter((c) => c.startsWith('seek:'))).toHaveLength(0);

    await adapter.seek(20_000); // after play → live SDK seek
    expect(player.calls).toContain('seek:20000');
  });

  it('stop halts audio, releases ownership, and re-cues the window start for a later play', async () => {
    const player = new FakePlayer();
    const { startTrack, host } = makeHost(player);
    const adapter = new SpotifyAdapter({}, host);

    await adapter.prepare(makeEntry(), { startMs: 15_000, endMs: 45_000 });
    await adapter.play();
    await adapter.seek(40_000);
    await adapter.stop();
    expect(player.calls).toContain('pause');

    await adapter.play(); // re-play → Connect-API start again, at the window start
    expect(startTrack).toHaveBeenCalledTimes(2);
    expect(startTrack.mock.calls[1][0].positionMs).toBe(15_000);
  });

  it('emits onFinish when the single-uri track ends (playing → paused at 0)', async () => {
    const player = new FakePlayer();
    const onFinish = vi.fn();
    const adapter = new SpotifyAdapter({ onFinish }, makeHost(player).host);
    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await adapter.play();

    player.emit('player_state_changed', state({ paused: false, position: 100_000 }));
    expect(onFinish).not.toHaveBeenCalled();
    player.emit('player_state_changed', state({ paused: true, position: 0 }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('maps auth / account / playback errors to onError with distinct messages', async () => {
    const player = new FakePlayer();
    const onError = vi.fn();
    const adapter = new SpotifyAdapter({ onError }, makeHost(player).host);
    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 1000 });

    player.emit('authentication_error', { message: 'x' });
    player.emit('account_error', { message: 'x' });
    player.emit('playback_error', { message: 'x' });
    expect(onError).toHaveBeenCalledTimes(3);
    expect(onError.mock.calls[0][0].message).toMatch(/reconnect Spotify/i);
    expect(onError.mock.calls[1][0].message).toMatch(/Premium/i);
    expect(onError.mock.calls[2][0].message).toMatch(/Baiana/);
  });

  it('surfaces a reconnect message when the token endpoint needs playback re-auth', async () => {
    const player = new FakePlayer();
    const startTrack = vi
      .fn()
      .mockRejectedValue(new SpotifyPlaybackTokenError('nope', 'PLAYBACK_REAUTH_REQUIRED', 409));
    const adapter = new SpotifyAdapter({}, makeHost(player, startTrack).host);
    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 1000 });
    await expect(adapter.play()).rejects.toThrow(/Reconnect Spotify to enable in-app playback/i);
  });

  it('destroy removes this adapter listeners and pauses only if it owns transport; never disconnects', async () => {
    const player = new FakePlayer();
    const adapter = new SpotifyAdapter({}, makeHost(player).host);
    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 1000 });
    expect(player.listenerCount('player_state_changed')).toBe(1);
    await adapter.play();
    adapter.destroy();
    expect(player.listenerCount('player_state_changed')).toBe(0);
    expect(player.calls).toContain('pause');
    expect(player.calls).not.toContain('disconnect');
  });

  it('a superseded adapter does not stop the shared transport a newer adapter owns', async () => {
    const player = new FakePlayer();
    const first = new SpotifyAdapter({}, makeHost(player).host);
    const second = new SpotifyAdapter({}, makeHost(player).host);

    await first.prepare(makeEntry(), { startMs: 0, endMs: 1000 });
    await first.play(); // first owns transport
    await second.prepare(makeEntry({ providerTrackId: 'sp-999', providerUri: null }), {
      startMs: 0,
      endMs: 1000,
    });
    await second.play(); // ownership transfers to second
    const pausesBefore = player.calls.filter((c) => c === 'pause').length;

    first.destroy(); // superseded → must NOT pause the second's track
    expect(player.calls.filter((c) => c === 'pause').length).toBe(pausesBefore);
  });

  it('the factory builds an adapter wired to the coordinator events', () => {
    const events: AdapterEvents = {};
    expect(spotifyAdapterFactory(events)).toBeInstanceOf(SpotifyAdapter);
  });
});
