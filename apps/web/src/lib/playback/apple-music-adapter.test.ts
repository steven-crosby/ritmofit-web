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
  authorizeBehavior: () => Promise<string> = () => Promise.resolve('music-user-token');
  private listeners = new Map<string, Array<(event: MusicKitPlaybackEvent) => void>>();

  constructor(isAuthorized = true) {
    this.isAuthorized = isAuthorized;
  }
  authorize(): Promise<string> {
    this.calls.push('authorize');
    this.isAuthorized = true;
    return this.authorizeBehavior();
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

function deferred<T = unknown>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function waitForSetQueueCalls(instance: FakeInstance, count: number): Promise<void> {
  for (let i = 0; i < 20; i++) {
    if (instance.calls.filter((call) => call.startsWith('setQueue:')).length >= count) return;
    await Promise.resolve();
  }
  expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toHaveLength(count);
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
  overrides?: {
    events?: AdapterEvents;
    preconfigured?: boolean;
    prepareTimeoutMs?: number;
    authorizeTimeoutMs?: number;
  },
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
    authorizeTimeoutMs: overrides?.authorizeTimeoutMs,
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

  it('signals onAwaitingAuthorization before prompting an unauthorized browser', async () => {
    const instance = new FakeInstance(false);
    const events: string[] = [];
    const { adapter } = makeAdapter(instance, {
      events: { onAwaitingAuthorization: () => events.push('awaiting') },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    expect(events).toEqual(['awaiting']);
    // Signalled around the consent prompt, then the cue proceeds normally.
    expect(instance.calls).toEqual(['authorize', 'setQueue:0']);
  });

  it('does not signal onAwaitingAuthorization when already authorized', async () => {
    const instance = new FakeInstance(true);
    const events: string[] = [];
    const { adapter } = makeAdapter(instance, {
      events: { onAwaitingAuthorization: () => events.push('awaiting') },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    expect(events).toEqual([]);
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

  it('routes completed and ended playback states to onFinish while playing', async () => {
    const instance = new FakeInstance(true);
    let finished = 0;
    const { adapter } = makeAdapter(instance, {
      preconfigured: true,
      events: { onFinish: () => finished++ },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    await adapter.play();

    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.playing });
    expect(finished).toBe(0); // playing is not a finish
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.completed });
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.ended });
    expect(finished).toBe(2);
  });

  it('does not misfire onFinish for the completed/ended state emitted on stop', async () => {
    const instance = new FakeInstance(true);
    let finished = 0;
    // A single-song queue reports completed/ended when we stop it; started is
    // cleared first, so onFinish must stay silent.
    instance.stop = () => {
      instance.emit(EVENTS.playbackStateDidChange, { state: STATES.completed });
      return Promise.resolve();
    };
    const { adapter } = makeAdapter(instance, {
      preconfigured: true,
      events: { onFinish: () => finished++ },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    await adapter.play();
    await adapter.stop();
    expect(finished).toBe(0);
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

  it('rejects prepare after the authorization (consent) timeout', async () => {
    const instance = new FakeInstance(false);
    instance.authorizeBehavior = () => new Promise<never>(() => {}); // consent never returns
    const { adapter } = makeAdapter(instance, { preconfigured: true, authorizeTimeoutMs: 5 });
    // Never cues: it fails at the consent step, before setQueue.
    await expect(adapter.prepare(makeEntry(), WINDOW_ZERO)).rejects.toThrow(
      /authorization didn.t complete/i,
    );
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toEqual([]);
  });

  it('rejects an overlapping queue request while an older one is still pending', async () => {
    const instance = new FakeInstance(true);
    const { music } = makeMusicKit(instance, { preconfigured: true });
    const firstQueue = deferred();
    instance.setQueueBehavior = () => firstQueue.promise;
    const build = () =>
      new AppleMusicAdapter(
        {},
        {
          loadMusicKit: () => Promise.resolve(music),
          loadConfig: () => Promise.resolve({ developerToken: 'dev-token', storefront: null }),
        },
      );
    const first = build();
    const second = build();

    const firstPrepare = first.prepare(makeEntry({ providerTrackId: 'am-first' }), WINDOW_ZERO);
    await waitForSetQueueCalls(instance, 1);

    await expect(
      second.prepare(makeEntry({ providerTrackId: 'am-second' }), WINDOW_CLIPPED),
    ).rejects.toThrow(/still finishing a previous queue request/i);
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toEqual(['setQueue:0']);

    first.destroy();
    firstQueue.resolve(undefined);
    await expect(firstPrepare).rejects.toThrow(/superseded/i);
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

  it('destroy detaches listeners and leaves the shared singleton intact', async () => {
    const instance = new FakeInstance(true);
    let finished = 0;
    const { adapter, music } = makeAdapter(instance, {
      preconfigured: true,
      events: { onFinish: () => finished++ },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    await adapter.play();

    adapter.destroy();
    // Owner at teardown → halts its own audio.
    expect(instance.calls).toContain('stop');
    // Listener detached: a later finish must not fire.
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.completed });
    expect(finished).toBe(0);
    // The shared instance survives for the next track's adapter.
    expect(music.getInstance()).toBe(instance);
  });

  it('destroy of a never-played adapter does not stop the shared transport', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO); // prepared, never played → not owner
    adapter.destroy();
    expect(instance.calls).not.toContain('stop');
  });

  it('a superseded adapter destroy never stops the owner that already started', async () => {
    // Two adapters share ONE MusicKit instance (the page singleton), so a
    // stale destroy() must not silence the track a newer adapter is playing.
    const instance = new FakeInstance(true);
    const { music } = makeMusicKit(instance, { preconfigured: true });
    const build = () =>
      new AppleMusicAdapter(
        {},
        {
          loadMusicKit: () => Promise.resolve(music),
          loadConfig: () => Promise.resolve({ developerToken: 'dev-token', storefront: null }),
        },
      );
    const owner = build();
    const superseded = build();

    await owner.prepare(makeEntry(), WINDOW_ZERO);
    await owner.play(); // owner claims + starts the shared transport
    await superseded.prepare(makeEntry(), WINDOW_ZERO); // prepared, never played

    superseded.destroy(); // must NOT stop the owner
    expect(instance.calls.filter((c) => c === 'stop')).toEqual([]);
    // The owner is still in control and can stop its own audio.
    await owner.stop();
    expect(instance.calls.filter((c) => c === 'stop')).toEqual(['stop']);
  });
});
