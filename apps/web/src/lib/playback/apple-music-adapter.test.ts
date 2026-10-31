// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  MUSICKIT_SAFARI_MODERN_EME_KEY,
  SAFARI_MODERN_ACCESS_TIMEOUT_MS,
  resetSafariModernAccessProbeForTests,
  safariModernAccessInFlight,
  type MusicKitGlobal,
  type MusicKitInstance,
  type MusicKitPlaybackEvent,
  type MusicKitSetQueueOptions,
} from '../musickit.js';
import {
  AppleMusicAdapter,
  appleMusicAuthorizationLostMessage,
  appleMusicPlayNotStartedMessage,
  appleMusicPlayRejectedMessage,
  appleMusicPlayStillFinishingMessage,
  appleMusicQueueStillFinishingMessage,
} from './apple-music-adapter.js';
import type { AdapterEvents } from './types.js';
import { PLAYBACK_TIMING_KEY, resetPlaybackTimingForTests } from './start-timing.js';
import { RuntimePlaybackCoordinator } from './runtime.js';

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
      baseDurationMs: 180_000,
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
const STATES = { playing: 2, paused: 3, stopped: 4, ended: 5, seeking: 6, completed: 10 };

/** A scriptable stand-in for the MusicKit page singleton. */
class FakeInstance implements MusicKitInstance {
  calls: string[] = [];
  isAuthorized: boolean;
  /** Transport status for liveness reads; undefined = MusicKit has not set it. */
  currentPlaybackTime: number | undefined = undefined;
  playbackState: number | undefined = undefined;
  currentPlaybackDuration: number | undefined = undefined;
  playBehavior: () => Promise<void> = () => Promise.resolve();
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
    return this.playBehavior();
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
    settleWaitMs?: number;
    playStartCapMs?: number;
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
    settleWaitMs: overrides?.settleWaitMs,
    playStartCapMs: overrides?.playStartCapMs,
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

  it('names a revoked browser authorization when a playback error follows it', async () => {
    const instance = new FakeInstance(true);
    const errors: string[] = [];
    const { adapter } = makeAdapter(instance, {
      preconfigured: true,
      events: { onError: ({ message }) => errors.push(message) },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    await adapter.play();

    instance.isAuthorized = false;
    instance.emit(EVENTS.mediaPlaybackError);
    expect(errors).toEqual([appleMusicAuthorizationLostMessage()]);
    expect(errors[0]).toMatch(/Manage music connection/);
  });

  it('turns a rejected play into a sentence with an action, not the raw MusicKit code', async () => {
    const instance = new FakeInstance(true);
    instance.playBehavior = () => Promise.reject(new Error('CONTENT_RESTRICTED'));
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);

    const rejection = adapter.play();
    await expect(rejection).rejects.toThrow(appleMusicPlayRejectedMessage('Baiana'));
    await expect(rejection).rejects.not.toThrow(/CONTENT_RESTRICTED/);
    await expect(rejection).rejects.toHaveProperty('cause.message', 'CONTENT_RESTRICTED');
  });

  it('names lost authorization when play is rejected after the browser was signed out', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    instance.isAuthorized = false;
    instance.playBehavior = () => Promise.reject(new Error('UNAUTHORIZED'));

    await expect(adapter.play()).rejects.toThrow(appleMusicAuthorizationLostMessage());
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

  it('a timed-out queue request does not block the next prepare (RF-123)', async () => {
    const instance = new FakeInstance(true);
    instance.setQueueBehavior = () => new Promise<never>(() => {}); // MusicKit never settles
    const first = makeAdapter(instance, { preconfigured: true, prepareTimeoutMs: 5 }).adapter;
    await expect(first.prepare(makeEntry(), WINDOW_ZERO)).rejects.toThrow(/timed out/i);
    first.destroy();

    instance.setQueueBehavior = () => Promise.resolve(undefined);
    const retry = makeAdapter(instance, { preconfigured: true, prepareTimeoutMs: 5 }).adapter;
    await expect(retry.prepare(makeEntry(), WINDOW_ZERO)).resolves.toMatchObject({
      provider: 'apple_music',
    });
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toHaveLength(2);
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

  it('waits for a cancelled queue request to settle, then queues (RF-108)', async () => {
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
    first.destroy(); // a timeline tap cancels the first start mid-setQueue

    instance.setQueueBehavior = () => Promise.resolve(undefined);
    const secondPrepare = second.prepare(
      makeEntry({ providerTrackId: 'am-second' }),
      WINDOW_CLIPPED,
    );
    for (let i = 0; i < 10; i++) await Promise.resolve();
    // Waiting, not failing, and not overlapping MusicKit's queue requests.
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toEqual(['setQueue:0']);

    firstQueue.resolve(undefined);
    await expect(firstPrepare).rejects.toThrow(/superseded|torn down/i);
    await expect(secondPrepare).resolves.toMatchObject({ provider: 'apple_music' });
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toEqual([
      'setQueue:0',
      'setQueue:15',
    ]);
  });

  it('fails with the Retry error once a previous queue request outlasts the bound, and Retry then queues (RF-108)', async () => {
    const instance = new FakeInstance(true);
    instance.setQueueBehavior = () => new Promise<never>(() => {}); // MusicKit never settles
    const first = makeAdapter(instance, { preconfigured: true, settleWaitMs: 20 }).adapter;
    void first.prepare(makeEntry(), WINDOW_ZERO).catch(() => {});
    await waitForSetQueueCalls(instance, 1);
    first.destroy();

    const second = makeAdapter(instance, { preconfigured: true, settleWaitMs: 20 }).adapter;
    await expect(second.prepare(makeEntry(), WINDOW_ZERO)).rejects.toThrow(
      appleMusicQueueStillFinishingMessage('Baiana'),
    );
    second.destroy();

    // Retry: the hung request no longer blocks, so this queues at once.
    instance.setQueueBehavior = () => Promise.resolve(undefined);
    const retry = makeAdapter(instance, { preconfigured: true, settleWaitMs: 20 }).adapter;
    await expect(retry.prepare(makeEntry(), WINDOW_ZERO)).resolves.toMatchObject({
      provider: 'apple_music',
    });
    await retry.play();
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toHaveLength(2);
  });

  it('counts the first playing state as started while play() is still pending (RF-108)', async () => {
    const instance = new FakeInstance(true);
    const pendingPlay = deferred<void>();
    instance.playBehavior = () => pendingPlay.promise;
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    const play = adapter.play();
    instance.playbackState = STATES.playing;
    instance.currentPlaybackTime = 0.5;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.playing });
    await expect(play).resolves.toBeUndefined();
    await expect(adapter.getTransport()).resolves.toEqual({ state: 'playing', positionMs: 500 });
    // MusicKit's play() is still pending, so whenIdle waits for it.
    const idle = adapter.whenIdle();
    expect(idle).not.toBeNull();
    let settled = false;
    void idle!.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    pendingPlay.resolve();
    await idle;
    expect(adapter.whenIdle()).toBeNull();
  });

  it("a later start waits for the previous track's still-pending play() (Next after start, RF-108)", async () => {
    const instance = new FakeInstance(true);
    const pendingPlay = deferred<void>();
    instance.playBehavior = () => pendingPlay.promise;
    const { music } = makeMusicKit(instance, { preconfigured: true });
    const host = { loadMusicKit: async () => music };
    const current = new AppleMusicAdapter({}, host);
    await current.prepare(makeEntry(), WINDOW_ZERO);
    const play = current.play();
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.playing });
    await play;
    await current.stop();
    current.destroy();

    instance.playBehavior = () => Promise.resolve();
    const next = new AppleMusicAdapter({}, host);
    const nextPrepare = next.prepare(makeEntry({ providerTrackId: 'am-next' }), WINDOW_CLIPPED);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toEqual(['setQueue:0']);
    pendingPlay.resolve();
    await nextPrepare;
    await next.play();
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toEqual([
      'setQueue:0',
      'setQueue:15',
    ]);
  });

  it('fails a play that neither plays nor resolves within the cap with a Retry error (RF-108)', async () => {
    const instance = new FakeInstance(true);
    instance.playBehavior = () => new Promise<never>(() => {});
    const { adapter } = makeAdapter(instance, { preconfigured: true, playStartCapMs: 20 });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    await expect(adapter.play()).rejects.toThrow(appleMusicPlayNotStartedMessage('Baiana', 20));
    expect(appleMusicPlayNotStartedMessage('Baiana', 3_000)).toBe(
      'Apple Music did not start "Baiana" within 3 s. Retry playback.',
    );
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

describe('Apple Music FairPlay probe', () => {
  const webKitWindow = window as Window & { WebKitMediaKeys?: object };
  const IPHONE_SAFARI_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1';
  const DESKTOP_CHROME_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const audioOnly = [
    {
      initDataTypes: ['skd'],
      audioCapabilities: [{ contentType: 'audio/mp4;codecs="mp4a.40.2"', robustness: '' }],
      distinctiveIdentifier: 'not-allowed',
      persistentState: 'not-allowed',
      sessionTypes: ['temporary'],
    },
  ];
  const FAILED = 'Apple Music playback failed for "Baiana".';
  let request: ReturnType<typeof vi.fn>;
  let info: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetSafariModernAccessProbeForTests();
    request = vi.fn(async () => ({ createMediaKeys: vi.fn() }));
    Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {
      configurable: true,
      writable: true,
      value: request,
    });
    info = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    resetSafariModernAccessProbeForTests();
    delete webKitWindow.WebKitMediaKeys;
    Reflect.deleteProperty(navigator, 'requestMediaKeySystemAccess');
    localStorage.removeItem(MUSICKIT_SAFARI_MODERN_EME_KEY);
    info.mockRestore();
  });

  /** The banner waits for an in-flight probe; let that wait finish. */
  async function settleProbe(): Promise<void> {
    await safariModernAccessInFlight();
    await Promise.resolve();
  }

  async function prepared(playBehavior?: () => Promise<void>) {
    const instance = new FakeInstance(true);
    if (playBehavior) instance.playBehavior = playBehavior;
    const errors: string[] = [];
    const { adapter } = makeAdapter(instance, {
      preconfigured: true,
      events: { onError: ({ message }) => errors.push(message) },
    });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    return { adapter, instance, errors };
  }

  const infoLines = () => info.mock.calls.map((call: unknown[]) => String(call[0]));

  it('leaves the playback-failed sentence unchanged on desktop Chrome', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(DESKTOP_CHROME_UA);
    try {
      const { adapter, instance, errors } = await prepared();
      await adapter.play();
      instance.emit(EVENTS.mediaPlaybackError);
      await settleProbe();
      await settleProbe();
      expect(errors).toEqual([FAILED]);
      expect(request).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
    } finally {
      userAgent.mockRestore();
    }
  });

  it('does not wait on the FairPlay probe in desktop Chrome', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(DESKTOP_CHROME_UA);
    request.mockImplementation(() => new Promise(() => {}));
    let played = false;
    try {
      const { adapter } = await prepared(async () => {
        played = true;
      });
      const playedInTime = adapter.play();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('play waited on the FairPlay probe')), 1000);
      });
      try {
        await Promise.race([playedInTime, timedOut]);
      } finally {
        clearTimeout(timer);
      }
      expect(played).toBe(true);
      expect(request).not.toHaveBeenCalled();
    } finally {
      userAgent.mockRestore();
    }
  });

  it('does not probe com.apple.fps on iOS Safari, and keeps the banner plain (RF-147)', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_SAFARI_UA);
    // Left over from an earlier Ritmo build that set it on iOS.
    localStorage.setItem(MUSICKIT_SAFARI_MODERN_EME_KEY, '1');
    try {
      const { adapter, instance, errors } = await prepared();
      await adapter.play();
      instance.emit(EVENTS.mediaPlaybackError);
      await settleProbe();
      expect(request).not.toHaveBeenCalled();
      expect(safariModernAccessInFlight()).toBeNull();
      // RF-124's per-call clear is unchanged.
      expect(localStorage.getItem(MUSICKIT_SAFARI_MODERN_EME_KEY)).toBeNull();
      expect(errors).toEqual([FAILED]);
    } finally {
      userAgent.mockRestore();
    }
  });

  it('on legacy WebKit, probes once after play and puts the word in the console, not the banner', async () => {
    webKitWindow.WebKitMediaKeys = {};
    localStorage.setItem(MUSICKIT_SAFARI_MODERN_EME_KEY, 'SECRETVALUE');
    const order: string[] = [];
    const createSession = vi.fn();
    const createMediaKeys = vi.fn(async () => ({ createSession }));
    request.mockImplementation(async () => {
      order.push('probe');
      return { createMediaKeys };
    });
    const { adapter, instance, errors } = await prepared(async () => {
      order.push('play');
    });
    await adapter.play();
    await adapter.stop();
    await adapter.play();
    instance.emit(EVENTS.mediaPlaybackError);
    await settleProbe();
    expect(order).toEqual(['play', 'probe', 'play']);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('com.apple.fps', audioOnly);
    expect(createMediaKeys).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
    expect(localStorage.getItem(MUSICKIT_SAFARI_MODERN_EME_KEY)).toBeNull();
    expect(infoLines()).toEqual([
      '[ritmo apple-music] mk-safari-modern-eme not-1',
      '[ritmo apple-music] playback-error modern-access ok',
    ]);
    expect(JSON.stringify(info.mock.calls)).not.toContain('SECRETVALUE');
    expect(JSON.stringify(info.mock.calls)).not.toContain('dev-token');
    expect(errors).toEqual([FAILED]);
  });

  it('calls MusicKit play before the probe and never waits on a hung probe', async () => {
    webKitWindow.WebKitMediaKeys = {};
    const order: string[] = [];
    request.mockImplementation(() => {
      order.push('probe');
      return new Promise(() => {});
    });
    const { adapter } = await prepared(async () => {
      order.push('play');
    });
    const playedInTime = adapter.play();
    // Synchronously, before any yield: play first, then the probe request.
    expect(order).toEqual(['play', 'probe']);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('play waited on the FairPlay probe')), 500);
    });
    try {
      await Promise.race([playedInTime, timedOut]);
    } finally {
      clearTimeout(timer);
    }
    expect(request).toHaveBeenCalledTimes(1);
    const configuration = request.mock.calls[0]?.[1]?.[0] as { videoCapabilities?: unknown };
    expect(configuration).not.toHaveProperty('videoCapabilities');
  });

  it('holds a playback error until the probe word arrives, then reports it', async () => {
    webKitWindow.WebKitMediaKeys = {};
    let resolveProbe: (value: object) => void = () => {};
    request.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const { adapter, instance, errors } = await prepared();
    await adapter.play();
    instance.emit(EVENTS.mediaPlaybackError);
    for (let i = 0; i < 5; i++) await Promise.resolve();
    expect(errors).toEqual([]);
    resolveProbe({ createMediaKeys: vi.fn() });
    await settleProbe();
    expect(errors).toEqual([FAILED]);
    expect(infoLines()).toContain('[ritmo apple-music] playback-error modern-access ok');
  });

  it('logs timeout when the probe never settles', async () => {
    vi.useFakeTimers();
    try {
      webKitWindow.WebKitMediaKeys = {};
      request.mockImplementation(() => new Promise(() => {}));
      const { adapter, instance, errors } = await prepared();
      await adapter.play();
      instance.emit(EVENTS.mediaPlaybackError);
      await vi.advanceTimersByTimeAsync(SAFARI_MODERN_ACCESS_TIMEOUT_MS - 1);
      expect(errors).toEqual([]);
      await vi.advanceTimersByTimeAsync(1);
      expect(errors).toEqual([FAILED]);
      expect(infoLines()).toContain('[ritmo apple-music] playback-error modern-access timeout');
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a held playback error when the adapter is destroyed before the probe settles', async () => {
    webKitWindow.WebKitMediaKeys = {};
    let resolveProbe: (value: object) => void = () => {};
    request.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const { adapter, instance, errors } = await prepared();
    await adapter.play();
    instance.emit(EVENTS.mediaPlaybackError);
    adapter.destroy();
    resolveProbe({ createMediaKeys: vi.fn() });
    await settleProbe();
    expect(errors).toEqual([]);
  });

  it('drops a held playback error after destroy then prepare (attempt token, RF-108)', async () => {
    webKitWindow.WebKitMediaKeys = {};
    let resolveProbe: (value: object) => void = () => {};
    request.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const { adapter, instance, errors } = await prepared();
    await adapter.play();
    instance.emit(EVENTS.mediaPlaybackError);
    adapter.destroy();
    await adapter.prepare(makeEntry(), WINDOW_ZERO); // a new attempt on the same adapter
    resolveProbe({ createMediaKeys: vi.fn() });
    await settleProbe();
    expect(errors).toEqual([]);
  });

  it('drops a held playback error after stop', async () => {
    webKitWindow.WebKitMediaKeys = {};
    let resolveProbe: (value: object) => void = () => {};
    request.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const { adapter, instance, errors } = await prepared();
    await adapter.play();
    instance.emit(EVENTS.mediaPlaybackError);
    await adapter.stop();
    resolveProbe({ createMediaKeys: vi.fn() });
    await settleProbe();
    expect(errors).toEqual([]);
  });

  it('on iOS Safari, destroy during play still finds MusicKit play pending and cancels it', async () => {
    const userAgent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_SAFARI_UA);
    request.mockImplementation(() => new Promise(() => {}));
    let releasePlay: () => void = () => {};
    try {
      const { adapter, instance } = await prepared(
        () =>
          new Promise<void>((resolve) => {
            releasePlay = resolve;
          }),
      );
      const play = adapter.play();
      const cancelled = expect(play).rejects.toThrow('cancelled');
      // No yield before MusicKit's play().
      expect(instance.calls).toContain('play');
      adapter.destroy();
      expect(instance.calls).toContain('stop');
      releasePlay();
      await cancelled;
      expect(instance.calls.filter((call) => call === 'stop')).toHaveLength(2);
    } finally {
      userAgent.mockRestore();
    }
  });

  it.each([
    {
      name: 'a DOMException name',
      error: () => new DOMException('music-user-token SECRETVALUE', 'NotSupportedError'),
      word: 'NotSupportedError',
    },
    {
      name: 'a built-in Error',
      error: () => new Error('developer-token SECRETVALUE'),
      word: 'Error',
    },
    { name: 'a TypeError', error: () => new TypeError('SECRETVALUE'), word: 'TypeError' },
    {
      name: 'a crafted name as other',
      error: () => {
        class CraftedError extends TypeError {
          override name = 'SECRETVALUE';
        }
        return new CraftedError('developer-token');
      },
      word: 'other',
    },
  ])(
    'logs $name, never a message, and keeps the banner plain',
    async ({ error, word }: { error: () => unknown; word: string }) => {
      webKitWindow.WebKitMediaKeys = {};
      request.mockRejectedValue(error());
      const { adapter, instance, errors } = await prepared();
      await adapter.play();
      instance.emit(EVENTS.mediaPlaybackError);
      await settleProbe();
      expect(errors).toEqual([FAILED]);
      expect(infoLines()).toContain(`[ritmo apple-music] playback-error modern-access ${word}`);
      expect(JSON.stringify(info.mock.calls)).not.toContain('SECRETVALUE');
      expect(JSON.stringify(info.mock.calls)).not.toContain('developer-token');
    },
  );

  it('keeps the authorization sentence free of the probe word', async () => {
    webKitWindow.WebKitMediaKeys = {};
    const { adapter, instance, errors } = await prepared();
    await adapter.play();
    instance.isAuthorized = false;
    instance.emit(EVENTS.mediaPlaybackError);
    await settleProbe();
    expect(errors).toEqual([appleMusicAuthorizationLostMessage()]);
    expect(errors[0]).not.toContain('modern-access');
  });

  it('logs not-1 when the flag write throws and does not log the thrown message', async () => {
    webKitWindow.WebKitMediaKeys = {};
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota SECRETVALUE');
    });
    try {
      const { adapter, instance, errors } = await prepared();
      await adapter.play();
      instance.emit(EVENTS.mediaPlaybackError);
      await settleProbe();
      await settleProbe();
      expect(infoLines()[0]).toBe('[ritmo apple-music] mk-safari-modern-eme not-1');
      expect(JSON.stringify(info.mock.calls)).not.toContain('SECRETVALUE');
      expect(errors).toEqual([FAILED]);
    } finally {
      setItem.mockRestore();
    }
  });
});

describe('Apple Music debug timing (RF-128)', () => {
  let info: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.setItem(PLAYBACK_TIMING_KEY, '1');
    resetPlaybackTimingForTests();
    info = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    sessionStorage.removeItem(PLAYBACK_TIMING_KEY);
    resetPlaybackTimingForTests();
    info.mockRestore();
  });

  const timingLines = (): string[] =>
    info.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .filter((line: string) => line.includes(' timing '));

  it('logs each MusicKit call start and end with its outcome, and never a title, id or token', async () => {
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    await adapter.play();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    const lines = timingLines();
    const steps = lines.map((line) => line.replace(/^\[ritmo apple-music #\d+\] timing /, ''));
    expect(steps.map((step) => step.split(' ')[0])).toEqual([
      'prepare',
      'musickit-ready',
      'authorized',
      'set-queue-start',
      'set-queue-end',
      'play-start',
      'play-end',
      'started',
    ]);
    expect(lines.find((line) => line.includes(' started '))).toMatch(/ play-resolved$/);
    expect(lines.find((line) => line.includes('set-queue-end'))).toMatch(/ok took \d+ms$/);
    expect(lines.find((line) => line.includes('play-end'))).toMatch(/ok took \d+ms$/);
    const dumped = JSON.stringify(info.mock.calls);
    expect(dumped).not.toContain('Baiana');
    expect(dumped).not.toContain('am-123');
    expect(dumped).not.toContain('dev-token');
  });

  it('logs a cancelled adapter call that finishes after the next start, and the wait for it (RF-108)', async () => {
    const instance = new FakeInstance(true);
    const pending = deferred<void>();
    instance.playBehavior = () => pending.promise;
    const { music } = makeMusicKit(instance, { preconfigured: true });
    const host = { loadMusicKit: async () => music };
    const cancelled = new AppleMusicAdapter({}, host);
    await cancelled.prepare(makeEntry(), WINDOW_ZERO);
    const play = cancelled.play().catch(() => {});
    cancelled.destroy();
    const next = new AppleMusicAdapter({}, host);
    const nextPrepare = next.prepare(makeEntry(), WINDOW_ZERO);
    pending.resolve();
    await play;
    await nextPrepare;
    const lines = timingLines();
    expect(lines.some((line) => / timing cancelled \+\d+ms$/.test(line))).toBe(true);
    expect(lines.some((line) => / timing waited-for-previous-play \+\d+ms \d+ms$/.test(line))).toBe(
      true,
    );
    expect(
      lines.some((line) =>
        / timing play-end \+\d+ms ok took \d+ms \(cancelled adapter\)$/.test(line),
      ),
    ).toBe(true);
    expect(lines.some((line) => line.includes('still-finishing'))).toBe(false);
  });

  it('logs the still-finishing error with the time waited when the bound passes (RF-108)', async () => {
    const instance = new FakeInstance(true);
    instance.setQueueBehavior = () => new Promise<never>(() => {});
    const first = makeAdapter(instance, { preconfigured: true, settleWaitMs: 20 }).adapter;
    void first.prepare(makeEntry(), WINDOW_ZERO).catch(() => {});
    await waitForSetQueueCalls(instance, 1);
    first.destroy();
    const second = makeAdapter(instance, { preconfigured: true, settleWaitMs: 20 }).adapter;
    await expect(second.prepare(makeEntry(), WINDOW_ZERO)).rejects.toThrow('still finishing');
    expect(
      timingLines().some((line) =>
        / timing error \+\d+ms still-finishing-previous-queue after \d+ms wait$/.test(line),
      ),
    ).toBe(true);
  });

  it('marks the first playing state when MusicKit emits it before play() resolves (#668 fifth review, 1)', async () => {
    const instance = new FakeInstance(true);
    const pending = deferred<void>();
    instance.playBehavior = () => pending.promise;
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    // A 'playing' event before play() is issued does not count.
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.playing });
    const play = adapter.play();
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.playing });
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.playing });
    const marks = timingLines().filter((line) => line.includes('first-playing-state'));
    expect(marks).toHaveLength(1);
    expect(timingLines().some((l) => l.includes('play-end'))).toBe(false); // play() still pending
    pending.resolve();
    await play;
  });

  it('keeps a late call end on its original clock and tagged cancelled after the adapter is re-prepared (#668 fifth review, 2)', async () => {
    let clock = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const instance = new FakeInstance(true);
    const pendingQueue = deferred();
    instance.setQueueBehavior = () => pendingQueue.promise;
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    // Attempt A: clock starts at 1000; its setQueue stays pending.
    const first = adapter.prepare(makeEntry(), WINDOW_ZERO).catch(() => {});
    await waitForSetQueueCalls(instance, 1);
    adapter.destroy();
    clock = 5_000;
    // Attempt B on the same adapter: a new clock at 5000 (it waits for the queue).
    const second = adapter.prepare(makeEntry(), WINDOW_ZERO);
    clock = 6_000;
    pendingQueue.resolve(undefined);
    await first;
    await second;
    for (let i = 0; i < 5; i++) await Promise.resolve();
    const lateEnd = timingLines().find((line) => line.includes('set-queue-end'));
    // +5000ms on clock A (not +1000ms on clock B), and still tagged cancelled.
    expect(lateEnd).toMatch(/ timing set-queue-end \+5000ms ok took 5000ms \(cancelled adapter\)$/);
  });

  it('marks destroyed for a normal teardown and cancelled only with a call in flight (#668 fifth review, 3)', async () => {
    const instance = new FakeInstance(true);
    const idle = makeAdapter(instance, { preconfigured: true }).adapter;
    await idle.prepare(makeEntry(), WINDOW_ZERO);
    await idle.play();
    for (let i = 0; i < 5; i++) await Promise.resolve();
    idle.destroy();
    expect(timingLines().at(-1)).toMatch(/ timing destroyed \+\d+ms$/);

    const pending = deferred<void>();
    instance.playBehavior = () => pending.promise;
    const busy = makeAdapter(instance, { preconfigured: true }).adapter;
    await busy.prepare(makeEntry(), WINDOW_ZERO);
    const play = busy.play().catch(() => {});
    busy.destroy();
    expect(timingLines().at(-1)).toMatch(/ timing cancelled \+\d+ms$/);
    pending.resolve();
    await play;
  });

  it('logs nothing when timing is off', async () => {
    sessionStorage.removeItem(PLAYBACK_TIMING_KEY);
    resetPlaybackTimingForTests();
    const instance = new FakeInstance(true);
    const { adapter } = makeAdapter(instance, { preconfigured: true });
    await adapter.prepare(makeEntry(), WINDOW_ZERO);
    await adapter.play();
    expect(timingLines()).toEqual([]);
  });
});

describe('AppleMusicAdapter getLiveness', () => {
  it('normalizes Apple pause and the source endpoint without treating reset position as progress', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackTime = 42;
    instance.playbackState = STATES.paused;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 42000, state: 'paused' });
    instance.currentPlaybackDuration = 180;
    // Observe the endpoint before MusicKit clears its queue.
    instance.currentPlaybackTime = 180;
    await adapter.getTransport();
    instance.currentPlaybackTime = 0;
    instance.playbackState = STATES.ended;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 180000, state: 'ended' });
    adapter.destroy();
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: null, state: 'unknown' });
  });
  async function playing(instance: FakeInstance) {
    const { adapter } = makeAdapter(instance);
    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 });
    await adapter.play();
    return adapter;
  }

  it('latches the observed endpoint through MusicKit natural queue teardown', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackDuration = 223;
    instance.currentPlaybackTime = 223;
    instance.playbackState = STATES.paused;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.paused });
    instance.currentPlaybackTime = 0;
    instance.playbackState = STATES.seeking;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.seeking });
    instance.currentPlaybackDuration = 0;
    instance.playbackState = STATES.ended;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.ended });
    instance.playbackState = STATES.stopped;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.stopped });
    instance.playbackState = STATES.completed;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.completed });
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 223_000, state: 'ended' });
    adapter.destroy();
  });

  it('retains the positive endpoint when MusicKit pauses at zero between seeking and ended', async () => {
    // Production 2026-10-04: paused(223) -> seeking(0) -> paused(0) -> ended(0).
    // The zero pause must not replace the playhead the runtime compares to the window.
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackDuration = 223;
    instance.currentPlaybackTime = 223;
    instance.playbackState = STATES.paused;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.paused });
    instance.currentPlaybackTime = 0;
    instance.playbackState = STATES.seeking;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.seeking });
    instance.playbackState = STATES.paused;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.paused });
    instance.currentPlaybackDuration = 0;
    instance.playbackState = STATES.ended;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.ended });
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 223_000, state: 'ended' });
    adapter.destroy();
  });

  it('does not let a paused-at-zero poll replace a positive playhead before ended', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackDuration = 223;
    instance.currentPlaybackTime = 223;
    instance.playbackState = STATES.paused;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 223_000, state: 'paused' });
    instance.currentPlaybackTime = 0;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 0, state: 'paused' });
    instance.currentPlaybackDuration = 0;
    instance.playbackState = STATES.ended;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 223_000, state: 'ended' });
    adapter.destroy();
  });

  it('reports a genuinely early playhead when the same zero pause precedes ended', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackDuration = 180;
    instance.currentPlaybackTime = 30;
    instance.playbackState = STATES.paused;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.paused });
    instance.currentPlaybackTime = 0;
    instance.playbackState = STATES.seeking;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.seeking });
    instance.playbackState = STATES.paused;
    instance.emit(EVENTS.playbackStateDidChange, { state: STATES.paused });
    instance.playbackState = STATES.ended;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 30_000, state: 'ended' });
    adapter.destroy();
  });

  it('does not substitute the full source duration for a genuinely early endpoint', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackDuration = 180;
    instance.currentPlaybackTime = 30;
    instance.playbackState = STATES.ended;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 30_000, state: 'ended' });
    adapter.destroy();
  });

  it('keeps a reset endpoint unknown when no playhead was observed', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackDuration = 180;
    instance.currentPlaybackTime = 0;
    instance.playbackState = STATES.ended;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: null, state: 'ended' });
    adapter.destroy();
  });

  it('clears endpoint evidence before a backward seek', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackTime = 179.9;
    instance.playbackState = STATES.playing;
    await adapter.getTransport();
    await adapter.seek(0);
    instance.currentPlaybackTime = 0;
    instance.currentPlaybackDuration = 180;
    instance.playbackState = STATES.ended;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: null, state: 'ended' });
    adapter.destroy();
  });

  it('uses the latest observed playhead rather than a high-water mark after a seek', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackTime = 179.9;
    instance.playbackState = STATES.playing;
    await adapter.getTransport();
    instance.currentPlaybackTime = 30;
    await adapter.getTransport();
    instance.currentPlaybackTime = 0;
    instance.playbackState = STATES.ended;
    instance.currentPlaybackDuration = 180;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: 30_000, state: 'ended' });
    adapter.destroy();
  });

  it('clears a completed snapshot when the adapter stops and replays', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackTime = 180;
    instance.playbackState = STATES.ended;
    await adapter.getTransport();
    await adapter.stop();
    await adapter.play();
    instance.currentPlaybackTime = 0;
    instance.playbackState = STATES.ended;
    await expect(adapter.getTransport()).resolves.toEqual({ positionMs: null, state: 'ended' });
    adapter.destroy();
  });

  it('converts MusicKit seconds to the millisecond contract', async () => {
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    instance.currentPlaybackTime = 42.5;
    instance.playbackState = STATES.playing;

    await expect(adapter.getLiveness()).resolves.toEqual({ positionMs: 42_500, playing: true });
  });

  it('reports the stall that this project actually shipped', async () => {
    // 2026-07-06: MusicKit authorized, loaded the track, set nowPlayingItem with
    // the full duration, logged zero errors, then stalled at readyState 0 under
    // background throttling. A human caught it. `playbackState` said so all
    // along; the adapter had never read it.
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    const STALLED = 8;
    instance.currentPlaybackTime = 12;
    instance.playbackState = STALLED;

    await expect(adapter.getLiveness()).resolves.toEqual({ positionMs: 12_000, playing: false });
  });

  it('is exempt rather than wrong when MusicKit has not set transport status', async () => {
    // Inventing a number the SDK never gave is the F-05 "0 tracks" failure.
    const instance = new FakeInstance();
    const adapter = await playing(instance);
    await expect(adapter.getLiveness()).resolves.toBeNull();

    instance.currentPlaybackTime = 5;
    await expect(adapter.getLiveness()).resolves.toBeNull();
  });

  it('stays silent while another adapter owns the shared singleton', async () => {
    const instance = new FakeInstance();
    instance.currentPlaybackTime = 5;
    instance.playbackState = STATES.playing;
    const first = await playing(instance);
    await expect(first.getLiveness()).resolves.not.toBeNull();

    const second = await playing(instance);
    await expect(first.getLiveness()).resolves.toBeNull();
    await expect(second.getLiveness()).resolves.not.toBeNull();
  });
});

describe('Live preauthorization', () => {
  it('fails closed without opening consent or queuing audio when browser authorization expires', async () => {
    const instance = new FakeInstance(false);
    const music = { getInstance: () => instance } as unknown as MusicKitGlobal;
    const adapter = new AppleMusicAdapter(
      {},
      {
        loadMusicKit: async () => music,
        requirePreauthorization: true,
      },
    );
    await expect(adapter.prepare(makeEntry(), { startMs: 0, endMs: 180_000 })).rejects.toThrow(
      'needs browser authorization',
    );
    expect(instance.calls).toEqual([]);
  });
});

describe('adversarial Apple play cancellation', () => {
  it('stops a cancelled late play and holds a replacement until it settles (RF-108)', async () => {
    const instance = new FakeInstance();
    const pending = deferred<void>();
    instance.playBehavior = () => pending.promise;
    const { music } = makeMusicKit(instance, { preconfigured: true });
    const host = { loadMusicKit: async () => music };
    const adapter = new AppleMusicAdapter({}, host);
    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 180000 });
    const play = adapter.play();
    const cancelled = expect(play).rejects.toThrow('cancelled');
    adapter.destroy();
    expect(instance.calls).toContain('stop');
    const replacement = new AppleMusicAdapter({}, host);
    const replacementPrepare = replacement.prepare(makeEntry(), { startMs: 0, endMs: 180000 });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    // No second queue or play while the cancelled play is still pending.
    expect(instance.calls.filter((call) => call.startsWith('setQueue:'))).toHaveLength(1);
    pending.resolve();
    await cancelled;
    await replacementPrepare;
    expect(instance.calls.filter((call) => call === 'stop')).toHaveLength(2);
    instance.playBehavior = async () => {};
    await replacement.play();
    expect(instance.calls.filter((call) => call === 'play')).toHaveLength(2);
    replacement.destroy();
  });

  it('fails with the Retry error when a cancelled play outlasts the bound, and Retry then plays (RF-108)', async () => {
    const instance = new FakeInstance();
    instance.playBehavior = () => new Promise<never>(() => {});
    const { music } = makeMusicKit(instance, { preconfigured: true });
    const host = { loadMusicKit: async () => music, settleWaitMs: 20, playStartCapMs: 10_000 };
    const adapter = new AppleMusicAdapter({}, host);
    await adapter.prepare(makeEntry(), { startMs: 0, endMs: 180000 });
    void adapter.play().catch(() => {});
    adapter.destroy();
    const replacement = new AppleMusicAdapter({}, host);
    await expect(replacement.prepare(makeEntry(), { startMs: 0, endMs: 180000 })).rejects.toThrow(
      appleMusicPlayStillFinishingMessage(),
    );
    replacement.destroy();
    instance.playBehavior = async () => {};
    const retry = new AppleMusicAdapter({}, host);
    await retry.prepare(makeEntry(), { startMs: 0, endMs: 180000 });
    await retry.play();
    expect(instance.calls.filter((call) => call === 'play')).toHaveLength(2);
  });
});

// RF-108: the runtime driving real Apple adapters over one shared MusicKit
// instance, the way quick timeline taps on iPhone Safari did on 2026-10-31.
describe('Apple Music runtime: a cancelled start is waited for, not failed (RF-108)', () => {
  function threeTracks(): RunPayload {
    const tracks = [0, 1, 2].map((i) => {
      const entry = makeEntry({ providerTrackId: `am-${i + 1}` });
      entry.classTrackId = `ct-${i + 1}`;
      entry.position = i;
      entry.startOffsetMs = i * 180_000;
      entry.track = { ...entry.track, id: `track-${i + 1}`, title: `Song ${i + 1}` };
      return entry;
    });
    return {
      schemaVersion: 1,
      class: {
        id: 'rf-108-fixture',
        title: 'Quick taps',
        template: null,
        targetDurationMs: null,
        timelineMode: 'sequential',
        totalDurationMs: 540_000,
      },
      tracks,
      sections: [],
    };
  }

  /** setQueue answers in call order; a call past the script resolves at once. */
  function scriptQueues(instance: FakeInstance, script: Array<Promise<unknown>>) {
    let n = 0;
    instance.setQueueBehavior = () => script[n++] ?? Promise.resolve(undefined);
  }

  function coordinatorFor(
    instance: FakeInstance,
    options: { settleWaitMs?: number } = {},
    errors: string[] = [],
  ) {
    return new RuntimePlaybackCoordinator(
      threeTracks(),
      [{ provider: 'apple_music', expiresAt: null, scope: null }],
      {
        now: Date.now(),
        adapters: {
          apple_music: (events) =>
            makeAdapter(instance, { events, preconfigured: true, ...options }).adapter,
        },
        onError: (error) => errors.push(error.message),
      },
    );
  }

  const queueCalls = (instance: FakeInstance) =>
    instance.calls.filter((call) => call.startsWith('setQueue:'));

  it('taps to tracks 2 and 3 during a pending start end playing track 3 with no lock error', async () => {
    const instance = new FakeInstance(true);
    const track2Queue = deferred();
    scriptQueues(instance, [Promise.resolve(undefined), track2Queue.promise]);
    const errors: string[] = [];
    const coordinator = coordinatorFor(instance, {}, errors);
    try {
      await coordinator.start(0);
      expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 0 });

      const tap2 = coordinator.seek(180_000);
      await waitForSetQueueCalls(instance, 2); // track 2's setQueue is in flight
      const tap3 = coordinator.seek(360_000); // cancels track 2 mid-setQueue
      for (let i = 0; i < 10; i++) await Promise.resolve();
      // Track 3 waits for the cancelled request instead of overlapping it.
      expect(queueCalls(instance)).toHaveLength(2);
      track2Queue.resolve(undefined); // MusicKit finishes the cancelled request
      await Promise.all([tap2, tap3]);

      expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 2 });
      expect(errors).toEqual([]);
      expect(queueCalls(instance)).toHaveLength(3);
      expect(instance.calls.filter((call) => call === 'play')).toHaveLength(2);
    } finally {
      coordinator.destroy();
    }
  });

  it('pause then resume during an in-flight start ends playing at the resumed position', async () => {
    const instance = new FakeInstance(true);
    const firstQueue = deferred();
    scriptQueues(instance, [firstQueue.promise]);
    const errors: string[] = [];
    const coordinator = coordinatorFor(instance, {}, errors);
    try {
      const start = coordinator.start(0);
      await waitForSetQueueCalls(instance, 1);
      await coordinator.pause();
      const resume = coordinator.resume(200_000);
      for (let i = 0; i < 10; i++) await Promise.resolve();
      expect(queueCalls(instance)).toHaveLength(1);
      firstQueue.resolve(undefined);
      await Promise.all([start, resume]);
      expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 1 });
      expect(errors).toEqual([]);
      // Track 2 cued at its window start, then re-cued at the resumed position (20 s in).
      expect(queueCalls(instance)).toEqual(['setQueue:0', 'setQueue:0', 'setQueue:20']);
    } finally {
      coordinator.destroy();
    }
  });

  it('a cancelled setQueue that never settles fails clearly after the bound, and Retry recovers without a reload', async () => {
    const instance = new FakeInstance(true);
    scriptQueues(instance, [Promise.resolve(undefined), new Promise<never>(() => {})]);
    const errors: string[] = [];
    const coordinator = coordinatorFor(instance, { settleWaitMs: 50 }, errors);
    try {
      await coordinator.start(0);
      const tap2 = coordinator.seek(180_000);
      await waitForSetQueueCalls(instance, 2); // track 2's setQueue hangs
      await coordinator.seek(360_000);
      await tap2;
      const status = coordinator.getStatus();
      expect(status.kind).toBe('error');
      expect(errors).toEqual([appleMusicQueueStillFinishingMessage('Song 3')]);
      expect(queueCalls(instance)).toHaveLength(2);
    } finally {
      coordinator.destroy();
    }

    // Retry builds a new coordinator at the held position, as Live does.
    const retryErrors: string[] = [];
    const retry = coordinatorFor(instance, { settleWaitMs: 50 }, retryErrors);
    try {
      await retry.resume(360_000);
      expect(retry.getStatus()).toMatchObject({ kind: 'playing', index: 2 });
      expect(retryErrors).toEqual([]);
      expect(queueCalls(instance)).toHaveLength(3);
    } finally {
      retry.destroy();
    }
  });
});

// Replays the real 2026-10-04 MusicKit queue teardown through the actual adapter
// and coordinator, so the runtime precision guard and job lifecycle are covered together.
describe('Apple Music natural-boundary runtime regression', () => {
  it.each([
    { name: 'next track', endpoint: 223, hasNext: true, expected: 'buffering' },
    { name: 'final track', endpoint: 223, hasNext: false, expected: 'ended' },
    { name: 'genuinely early stream', endpoint: 30, hasNext: true, expected: 'error' },
    { name: 'full-second mismatch', endpoint: 222.398, hasNext: true, expected: 'error' },
    {
      name: 'next track after the production zero pause',
      endpoint: 223,
      hasNext: true,
      expected: 'buffering',
      pauseAtZero: true,
    },
    {
      name: 'final track after the production zero pause',
      endpoint: 223,
      hasNext: false,
      expected: 'ended',
      pauseAtZero: true,
    },
  ])(
    'handles $name without substituting source duration',
    async ({
      endpoint,
      hasNext,
      expected,
      pauseAtZero,
    }: {
      endpoint: number;
      hasNext: boolean;
      expected: string;
      pauseAtZero?: boolean;
    }) => {
      vi.useFakeTimers();
      const instance = new FakeInstance();
      const first = makeEntry();
      first.track.durationMs = first.track.baseDurationMs = 223_398;
      const next = makeEntry({ providerTrackId: 'am-next' });
      next.classTrackId = 'ct-next';
      next.startOffsetMs = 223_398;
      next.position = 1;
      const payload: RunPayload = {
        schemaVersion: 1,
        class: {
          id: 'boundary-fixture',
          title: 'Boundary regression',
          template: null,
          targetDurationMs: null,
          timelineMode: 'sequential',
          totalDurationMs: 223_398 + (hasNext ? 180_000 : 0),
        },
        tracks: hasNext ? [first, next] : [first],
        sections: [],
      };
      const positions: number[] = [];
      const created: AppleMusicAdapter[] = [];
      const coordinator = new RuntimePlaybackCoordinator(
        payload,
        [{ provider: 'apple_music', expiresAt: null, scope: null }],
        {
          now: Date.now(),
          adapters: {
            apple_music: (events) => {
              const { adapter } = makeAdapter(instance, { events });
              created.push(adapter);
              return adapter;
            },
          },
          onPosition: (value) => positions.push(value),
        },
      );
      try {
        await coordinator.start();
        instance.currentPlaybackDuration = 223;
        instance.currentPlaybackTime = endpoint;
        instance.playbackState = STATES.playing;
        await vi.advanceTimersByTimeAsync(250);
        instance.playbackState = STATES.paused;
        instance.emit(EVENTS.playbackStateDidChange, { state: STATES.paused });
        instance.currentPlaybackTime = 0;
        instance.playbackState = STATES.seeking;
        instance.emit(EVENTS.playbackStateDidChange, { state: STATES.seeking });
        if (pauseAtZero) {
          // Production ordering, plus the transport poll that also reads the reset.
          instance.playbackState = STATES.paused;
          instance.emit(EVENTS.playbackStateDidChange, { state: STATES.paused });
          await vi.advanceTimersByTimeAsync(250);
        }
        instance.currentPlaybackDuration = 0;
        instance.playbackState = STATES.ended;
        instance.emit(EVENTS.playbackStateDidChange, { state: STATES.ended });
        instance.playbackState = STATES.stopped;
        instance.emit(EVENTS.playbackStateDidChange, { state: STATES.stopped });
        instance.playbackState = STATES.completed;
        instance.emit(EVENTS.playbackStateDidChange, { state: STATES.completed });
        await vi.advanceTimersByTimeAsync(250);
        expect(coordinator.getStatus().kind).toBe(expected);
        expect(created).toHaveLength(hasNext && expected !== 'error' ? 2 : 1);
        expect(positions.at(-1)).toBe(expected === 'error' ? Math.round(endpoint * 1000) : 223_398);
        if (hasNext && expected !== 'error') {
          // Playback resolution/reset telemetry cannot move teaching into the next song.
          expect(coordinator.getStatus()).toMatchObject({ index: 1 });
          instance.currentPlaybackTime = 2;
          instance.playbackState = STATES.playing;
          await vi.advanceTimersByTimeAsync(250);
          expect(positions.at(-1)).toBe(225_398);
        }
      } finally {
        coordinator.destroy();
        vi.useRealTimers();
      }
    },
  );
});
