import { describe, expect, it } from 'vitest';
import type { RunPayloadTrackEntry } from '@ritmofit/shared';
import type {
  MusicKitGlobal,
  MusicKitInstance,
  MusicKitPlaybackEvent,
  MusicKitSetQueueOptions,
} from '../musickit.js';
import { AppleMusicAdapter } from './apple-music-adapter.js';
import type { AdapterEvents } from './types.js';

function makeEntry(overrides?: { providerTrackId?: string; refs?: [] }): RunPayloadTrackEntry {
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
          provider: 'apple_music',
          providerTrackId: overrides?.providerTrackId ?? 'am-123',
          providerUri: null,
        },
      ] as RunPayloadTrackEntry['providerRefs']),
    cues: [],
    moves: [],
  };
}

const EVENTS = {
  playbackStateDidChange: 'playbackStateDidChange',
  mediaPlaybackError: 'mediaPlaybackError',
};
// Distinct numeric codes; only `completed`/`ended` should trigger onFinish.
const STATES = { playing: 2, paused: 3, ended: 5, completed: 10 };

/** A scriptable stand-in for the MusicKit page singleton. */
class FakeInstance implements MusicKitInstance {
  calls: string[] = [];
  isAuthorized: boolean;
  setQueueBehavior: () => Promise<unknown> = () => Promise.resolve();
  private listeners = new Map<string, Array<(event: MusicKitPlaybackEvent) => void>>();

  constructor(isAuthorized = true) {
    this.isAuthorized = isAuthorized;
  }
  authorize(): Promise<string> {
    this.calls.push('authorize');
    this.isAuthorized = true;
    return Promise.resolve('music-user-token');
  }
  setQueue(options: MusicKitSetQueueOptions): Promise<unknown> {
    this.calls.push(`setQueue:${options.startTime}`);
    return this.setQueueBehavior();
  }
  play(): Promise<void> {
    this.calls.push('play');
    return Promise.resolve();
  }
  pause(): Promise<void> {
    this.calls.push('pause');
    return Promise.resolve();
  }
  stop(): Promise<void> {
    this.calls.push('stop');
    return Promise.resolve();
  }
  seekToTime(seconds: number): Promise<void> {
    this.calls.push(`seekToTime:${seconds}`);
    return Promise.resolve();
  }
  addEventListener(name: string, handler: (event: MusicKitPlaybackEvent) => void): void {
    const bucket = this.listeners.get(name) ?? [];
    bucket.push(handler);
    this.listeners.set(name, bucket);
  }
  removeEventListener(name: string, handler: (event: MusicKitPlaybackEvent) => void): void {
    const bucket = (this.listeners.get(name) ?? []).filter((h) => h !== handler);
    this.listeners.set(name, bucket);
  }
  emit(name: string, event: MusicKitPlaybackEvent = {}): void {
    for (const handler of this.listeners.get(name) ?? []) handler(event);
  }
}

function makeMusicKit(instance: FakeInstance, opts?: { preconfigured?: boolean }) {
  let configured = opts?.preconfigured ?? false;
  const calls: string[] = [];
  const music: MusicKitGlobal = {
    configure() {
      calls.push('configure');
      configured = true;
      return Promise.resolve(instance);
    },
    getInstance() {
      return configured ? instance : null;
    },
    Events: EVENTS,
    PlaybackStates: STATES,
  };
  return { music, calls };
}

function makeAdapter(
  instance: FakeInstance,
  overrides?: { events?: AdapterEvents; preconfigured?: boolean; prepareTimeoutMs?: number },
) {
  const { music, calls } = makeMusicKit(instance, { preconfigured: overrides?.preconfigured });
  const configCalls: string[] = [];
  const adapter = new AppleMusicAdapter(overrides?.events ?? {}, {
    loadMusicKit: () => Promise.resolve(music),
    loadConfig: () => {
      configCalls.push('config');
      return Promise.resolve({ developerToken: 'dev-token', storefront: null });
    },
    prepareTimeoutMs: overrides?.prepareTimeoutMs,
  });
  return { adapter, music, musicCalls: calls, configCalls };
}

const WINDOW_ZERO = { startMs: 0, endMs: 180_000 };
const WINDOW_CLIPPED = { startMs: 15_000, endMs: 195_000 };

describe('AppleMusicAdapter', () => {
  it('configures, authorizes, and cues the window start (seconds) on prepare', async () => {
    const instance = new FakeInstance(false);
    const { adapter, musicCalls, configCalls } = makeAdapter(instance);

    await expect(adapter.prepare(makeEntry(), WINDOW_CLIPPED)).resolves.toEqual({
      provider: 'apple_music',
      classTrackId: 'ct-1',
    });
    expect(musicCalls).toEqual(['configure']);
    expect(configCalls).toEqual(['config']);
    // Not authorized → authorize, then cue at 15s (ms → seconds).
    expect(instance.calls).toEqual(['authorize', 'setQueue:15']);
  });

  it('skips authorize when the browser is already authorized', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance);
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    expect(instance.calls).toEqual(['setQueue:0']);
  });

  it('reuses the page singleton without re-configuring or re-fetching the token', async () => {
    const instance = new FakeInstance(true);
    const { adapter, musicCalls, configCalls } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    expect(musicCalls).toEqual([]); // getInstance() served it
    expect(configCalls).toEqual([]); // no developer-token fetch needed
  });

  it('delegates play/pause, a live seek converts ms → seconds, and stop halts', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_CLIPPED);

    await adapter.play();
    await adapter.seek(40_000);
    await adapter.pause();
    await adapter.stop();
    expect(instance.calls).toEqual(['setQueue:15', 'play', 'seekToTime:40', 'pause', 'stop']);
  });

  it('re-cues a pre-play seek via setQueue.startTime, never seekToTime', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_CLIPPED);

    // Mid-track entry: the runtime seeks before play().
    await adapter.seek(40_000);
    await adapter.play();
    expect(instance.calls).toEqual(['setQueue:15', 'setQueue:40', 'play']);
    expect(instance.calls.some((c) => c.startsWith('seekToTime'))).toBe(false);
  });

  it('routes completed and ended playback states to onFinish', async () => {
    const instance = new FakeInstance(true);
    let finished = 0;
    const { adapter } = makeAdapter(instance, {
      preconfigured: true,
      events: { onFinish: () => finished++ },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);

    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.playing });
    expect(finished).toBe(0); // playing is not a finish
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.completed });
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.ended });
    expect(finished).toBe(2);
  });

  it('routes post-ready playback errors to onError', async () => {
    const instance = new FakeInstance(true);
    const errors: string[] = [];
    const { adapter } = makeAdapter(instance, {
      preconfigured: true,
      events: { onError: ({ message }) => errors.push(message) },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);

    instance.emit(EVENTS.mediaPlaybackError);
    expect(errors).toEqual(['Apple Music playback failed for "Baiana".']);
  });

  it('rejects prepare when the track queue fails to load', async () => {
    const instance = new FakeInstance(true);
    instance.setQueueBehavior = () => Promise.reject(new Error('content unavailable'));
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await expect(adapter.prepare(makeEntry(), WINDOW_ZERO)).rejects.toThrow(/content unavailable/i);
  });

  it('rejects prepare after the queue-load timeout', async () => {
    const instance = new FakeInstance(true);
    instance.setQueueBehavior = () => new Promise<never>(() => {}); // never resolves
    const { adapter } = makeAdapter(instance, { preconfigured: true, prepareTimeoutMs: 5 });
    await expect(adapter.prepare(makeEntry(), WINDOW_ZERO)).rejects.toThrow(/timed out/i);
  });

  it('rejects prepare for a track without an Apple Music ref', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await expect(adapter.prepare(makeEntry({ refs: [] }), WINDOW_ZERO)).rejects.toThrow(
      /no Apple Music reference/i,
    );
  });

  it('throws on control calls before prepare or after destroy', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await expect(adapter.play()).rejects.toThrow(/not prepared/i);

    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    adapter.destroy();
    await expect(adapter.play()).rejects.toThrow(/not prepared/i);
  });

  it('destroy removes listeners and stops without tearing down the singleton', async () => {
    const instance = new FakeInstance(true);
    let finished = 0;
    const { adapter, music } = makeAdapter(instance, {
      preconfigured: true,
      events: { onFinish: () => finished++ },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);

    adapter.destroy();
    expect(instance.calls).toContain('stop');
    // Listener detached: a later finish must not fire.
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.completed });
    expect(finished).toBe(0);
    // The shared instance survives for the next track's adapter.
    expect(music.getInstance()).toBe(instance);
  });
});
