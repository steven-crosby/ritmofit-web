import { SpotifyAdapter } from './spotify-adapter.js';
import type { SpotifyPlayer } from '../spotify-playback.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Provider, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import type { ConnectionLike } from './coordinator.js';
import { LivenessObserver } from './liveness.js';
import {
  RuntimePlaybackCoordinator,
  segmentAt,
  type CoordinatorStatus,
  type PlaybackRuntimeError,
} from './runtime.js';
import type {
  AdapterEvents,
  LivenessReading,
  PlaybackAdapter,
  PlaybackReady,
  PlaybackWindow,
} from './types.js';

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
      baseDurationMs: overrides.durationMs === undefined ? 180_000 : overrides.durationMs,
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

function makePayload(tracks: RunPayloadTrackEntry[], totalDurationMs?: number): RunPayload {
  return {
    schemaVersion: 1,
    class: {
      id: 'class-1',
      title: 'Class',
      template: null,
      targetDurationMs: null,
      timelineMode: 'sequential',
      totalDurationMs:
        totalDurationMs ??
        tracks.reduce(
          (end, t) => Math.max(end, (t.startOffsetMs ?? 0) + (t.track.durationMs ?? 0)),
          0,
        ),
    },
    tracks,
    sections: [],
  };
}

function connections(...providers: Provider[]): ConnectionLike[] {
  return providers.map((provider) => ({
    provider,
    expiresAt: NOW + 3_600_000,
    scope: provider === 'spotify' ? 'user-library-read streaming' : null,
  }));
}

/**
 * A fully controllable fake adapter: records calls, resolves `prepare`
 * immediately unless the test holds it open via `deferPrepare`.
 */
class FakeAdapter implements PlaybackAdapter {
  calls: string[] = [];
  events: AdapterEvents;
  deferPrepare = false;
  deferPlay = false;
  failPrepare = false;
  private resolvePrepare: ((ready: PlaybackReady) => void) | null = null;
  private pendingReady: PlaybackReady | null = null;
  private resolvePlay: (() => void) | null = null;

  constructor(
    readonly provider: Provider,
    events: AdapterEvents,
  ) {
    this.events = events;
  }

  prepare(entry: RunPayloadTrackEntry, window: PlaybackWindow): Promise<PlaybackReady> {
    this.calls.push(`prepare:${entry.classTrackId}:${window.startMs}-${window.endMs}`);
    if (this.failPrepare) return Promise.reject(new Error('SDK exploded'));
    const ready: PlaybackReady = { provider: this.provider, classTrackId: entry.classTrackId };
    if (!this.deferPrepare) return Promise.resolve(ready);
    this.pendingReady = ready;
    return new Promise((resolve) => {
      this.resolvePrepare = resolve;
    });
  }

  finishPrepare(): void {
    this.resolvePrepare?.(this.pendingReady!);
    this.resolvePrepare = null;
  }

  play(): Promise<void> {
    this.calls.push('play');
    if (!this.deferPlay) return Promise.resolve();
    return new Promise((resolve) => {
      this.resolvePlay = resolve;
    });
  }
  finishPlay(): void {
    this.resolvePlay?.();
    this.resolvePlay = null;
  }
  async pause(): Promise<void> {
    this.calls.push('pause');
  }
  async seek(providerMs: number): Promise<void> {
    this.calls.push(`seek:${providerMs}`);
  }
  async stop(): Promise<void> {
    this.calls.push('stop');
  }
  destroy(): void {
    this.calls.push('destroy');
  }
}

/** A registry whose factories record every adapter they build, per provider. */
function makeHarness(
  payload: RunPayload,
  conns: ConnectionLike[],
  preferred?: Provider | null,
  options?: { deferPlayAt?: number[] },
) {
  const created: FakeAdapter[] = [];
  const statuses: CoordinatorStatus[] = [];
  const errors: PlaybackRuntimeError[] = [];
  const factoryFor = (provider: Provider) => (events: AdapterEvents) => {
    const adapter = new FakeAdapter(provider, events);
    adapter.deferPlay = options?.deferPlayAt?.includes(created.length) ?? false;
    created.push(adapter);
    return adapter;
  };
  const coordinator = new RuntimePlaybackCoordinator(payload, conns, {
    preferredProvider: preferred ?? null,
    now: NOW,
    adapters: {
      soundcloud: factoryFor('soundcloud'),
      apple_music: factoryFor('apple_music'),
    },
    onStatus: (s) => statuses.push(s),
    onError: (e) => errors.push(e),
  });
  return { coordinator, created, statuses, errors };
}

describe('segmentAt', () => {
  const payload = makePayload([
    makeEntry({ classTrackId: 'ct-1', startOffsetMs: 10_000, durationMs: 60_000 }),
    makeEntry({ classTrackId: 'ct-2', startOffsetMs: 90_000, durationMs: 60_000 }),
  ]);

  it('reports pre-roll silence before the first track', () => {
    expect(segmentAt(payload, 0)).toEqual({ kind: 'silence', nextIndex: 0, untilMs: 10_000 });
  });

  it('reports the track inside its window, inclusive start / exclusive end', () => {
    expect(segmentAt(payload, 10_000)).toEqual({ kind: 'track', index: 0 });
    expect(segmentAt(payload, 69_999)).toEqual({ kind: 'track', index: 0 });
    expect(segmentAt(payload, 70_000)).toEqual({ kind: 'silence', nextIndex: 1, untilMs: 90_000 });
  });

  it('reports ended at the class total', () => {
    expect(segmentAt(payload, 150_000)).toEqual({ kind: 'ended' });
  });

  it('reports trailing silence when the class total outlasts the last track', () => {
    const stretched = makePayload(payload.tracks, 200_000);
    expect(segmentAt(stretched, 160_000)).toEqual({
      kind: 'silence',
      nextIndex: null,
      untilMs: 200_000,
    });
  });

  it('treats an empty class as ended', () => {
    expect(segmentAt(makePayload([]), 0)).toEqual({ kind: 'ended' });
  });

  it('never matches a zero-width (missing-duration) track window', () => {
    const withGhost = makePayload(
      [makeEntry({ classTrackId: 'ct-1', startOffsetMs: 0, durationMs: null })],
      60_000,
    );
    expect(segmentAt(withGhost, 0)).toEqual({ kind: 'silence', nextIndex: null, untilMs: 60_000 });
  });
});

describe('RuntimePlaybackCoordinator', () => {
  it('refuses to start when static preflight fails', async () => {
    const payload = makePayload([makeEntry({ providers: [] })]);
    const { coordinator, created, errors } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    expect(coordinator.getStatus()).toMatchObject({
      kind: 'error',
      error: { phase: 'preflight' },
    });
    expect(errors).toHaveLength(1);
    expect(created).toHaveLength(0);
  });

  it('starts the first track cued at its clip window and plays it', async () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', clipStartMs: 15_000, durationMs: 180_000 }),
    ]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    expect(created).toHaveLength(1);
    // providerStartMs = clipStartMs; providerEndMs = clipStartMs + durationMs.
    expect(created[0]!.calls).toEqual(['prepare:ct-1:15000-195000', 'play']);
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'soundcloud' });
  });

  it('does nothing on ticks inside the current track', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    await coordinator.tick(1_000);
    await coordinator.tick(2_000);
    expect(created).toHaveLength(1);
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play']);
  });

  it('auto-advances across providers at the track boundary', async () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', startOffsetMs: 0, durationMs: 60_000 }),
      makeEntry({
        classTrackId: 'ct-2',
        startOffsetMs: 60_000,
        durationMs: 60_000,
        providers: ['apple_music'],
      }),
    ]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud', 'apple_music'));
    await coordinator.start(0);
    await coordinator.tick(60_000);
    expect(created).toHaveLength(2);
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-60000', 'play', 'stop', 'destroy']);
    expect(created[1]!.provider).toBe('apple_music');
    expect(created[1]!.calls).toEqual(['prepare:ct-2:0-60000', 'play']);
    expect(coordinator.getStatus()).toEqual({
      kind: 'playing',
      index: 1,
      provider: 'apple_music',
    });
  });

  it('holds free-timeline gaps as silence, then plays the next track on schedule', async () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', startOffsetMs: 0, durationMs: 60_000 }),
      makeEntry({ classTrackId: 'ct-2', startOffsetMs: 90_000, durationMs: 60_000 }),
    ]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    await coordinator.tick(60_000); // into the gap
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-60000', 'play', 'stop', 'destroy']);
    expect(coordinator.getStatus()).toEqual({ kind: 'silence', nextIndex: 1, untilMs: 90_000 });
    await coordinator.tick(75_000); // still silent: no new adapter
    expect(created).toHaveLength(1);
    await coordinator.tick(90_000); // scheduled start
    expect(created).toHaveLength(2);
    expect(created[1]!.calls).toEqual(['prepare:ct-2:0-60000', 'play']);
  });

  it('ends the run and releases the adapter at the class end', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1', durationMs: 60_000 })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    await coordinator.tick(60_000);
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-60000', 'play', 'stop', 'destroy']);
    expect(coordinator.getStatus()).toEqual({ kind: 'ended' });
    // The run is over: further ticks are inert.
    await coordinator.tick(61_000);
    expect(created).toHaveLength(1);
  });

  it('enters mid-track on seek: prepares, seeks to provider time, plays', async () => {
    const payload = makePayload([
      makeEntry({
        classTrackId: 'ct-1',
        startOffsetMs: 60_000,
        clipStartMs: 15_000,
        durationMs: 120_000,
      }),
    ]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(60_000);
    expect(created[0]!.calls).toEqual(['prepare:ct-1:15000-135000', 'play']); // at window start: no seek
    await coordinator.seek(70_000);
    // 10s into the track = clipStart + 10s in provider time.
    expect(created[1]!.calls).toEqual(['prepare:ct-1:15000-135000', 'seek:25000', 'play']);
  });

  it('pauses provider audio and resumes with a fresh cue at the clock position', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1', durationMs: 180_000 })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    await coordinator.pause();
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play', 'pause']);
    expect(coordinator.getStatus()).toEqual({ kind: 'paused' });
    await coordinator.resume(30_000);
    expect(created[1]!.calls).toEqual(['prepare:ct-1:0-180000', 'seek:30000', 'play']);
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'soundcloud' });
  });

  it('surfaces a prepare failure as a recoverable error and destroys the adapter', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const created: FakeAdapter[] = [];
    const errors: PlaybackRuntimeError[] = [];
    const coordinator = new RuntimePlaybackCoordinator(payload, connections('soundcloud'), {
      now: NOW,
      adapters: {
        soundcloud: (events) => {
          const adapter = new FakeAdapter('soundcloud', events);
          adapter.failPrepare = true;
          created.push(adapter);
          return adapter;
        },
      },
      onError: (e) => errors.push(e),
    });
    await coordinator.start(0);
    expect(coordinator.getStatus()).toMatchObject({
      kind: 'error',
      error: {
        phase: 'prepare',
        provider: 'soundcloud',
        classTrackId: 'ct-1',
        message: 'SDK exploded',
      },
    });
    expect(errors).toHaveLength(1);
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'destroy']);
  });

  it('reports an unregistered provider as a prepare error, not a silent skip', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1', providers: ['spotify'] })]);
    const statuses: CoordinatorStatus[] = [];
    const errors: PlaybackRuntimeError[] = [];
    const coordinator = new RuntimePlaybackCoordinator(payload, connections('spotify'), {
      now: NOW,
      adapters: {}, // no spotify adapter registered yet
      onStatus: (s) => statuses.push(s),
      onError: (e) => errors.push(e),
    });
    await coordinator.start(0);
    expect(coordinator.getStatus()).toMatchObject({
      kind: 'error',
      error: { phase: 'prepare', provider: 'spotify', classTrackId: 'ct-1' },
    });
    expect(errors).toHaveLength(1);
  });

  it('halts on an adapter runtime error and recovers via resume', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1', durationMs: 180_000 })]);
    const { coordinator, created, errors } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    created[0]!.events.onError?.({ message: 'stream dropped' });
    expect(coordinator.getStatus()).toMatchObject({
      kind: 'error',
      error: { phase: 'adapter', provider: 'soundcloud', message: 'stream dropped' },
    });
    expect(errors).toHaveLength(1);
    expect(created[0]!.calls).toContain('destroy');
    // Retry: resume re-prepares at the clock position.
    await coordinator.resume(5_000);
    expect(created).toHaveLength(2);
    expect(created[1]!.calls).toEqual(['prepare:ct-1:0-180000', 'seek:5000', 'play']);
  });

  it('destroys the stale adapter when a seek lands during its prepare', async () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', startOffsetMs: 0, durationMs: 60_000 }),
      makeEntry({ classTrackId: 'ct-2', startOffsetMs: 60_000, durationMs: 60_000 }),
    ]);
    const created: FakeAdapter[] = [];
    let defer = true;
    const coordinator = new RuntimePlaybackCoordinator(payload, connections('soundcloud'), {
      now: NOW,
      adapters: {
        soundcloud: (events) => {
          const adapter = new FakeAdapter('soundcloud', events);
          adapter.deferPrepare = defer;
          defer = false; // only the first prepare hangs
          created.push(adapter);
          return adapter;
        },
      },
    });

    const startPromise = coordinator.start(0); // prepare for ct-1 hangs
    const seekPromise = coordinator.seek(60_000); // supersedes it → ct-2
    await seekPromise;
    expect(created).toHaveLength(2);
    expect(created[1]!.calls).toEqual(['prepare:ct-2:0-60000', 'play']);
    expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 1 });

    created[0]!.finishPrepare(); // the stale prepare finally resolves
    await startPromise;
    // The stale adapter must be destroyed, and the live one untouched.
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-60000', 'destroy']);
    expect(created[1]!.calls).toEqual(['prepare:ct-2:0-60000', 'play']);
    expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 1 });
  });

  it('surfaces awaiting_authorization while the adapter blocks on consent, then plays', async () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', durationMs: 180_000, providers: ['apple_music'] }),
    ]);
    const created: FakeAdapter[] = [];
    const statuses: CoordinatorStatus[] = [];
    const coordinator = new RuntimePlaybackCoordinator(payload, connections('apple_music'), {
      now: NOW,
      adapters: {
        apple_music: (events) => {
          const adapter = new FakeAdapter('apple_music', events);
          adapter.deferPrepare = true; // hold prepare open like a pending consent sheet
          created.push(adapter);
          return adapter;
        },
      },
      onStatus: (s) => statuses.push(s),
    });

    const startPromise = coordinator.start(0);
    // Mid-prepare, the adapter reports it is blocked on Apple's consent sheet.
    created[0]!.events.onAwaitingAuthorization?.();
    expect(coordinator.getStatus()).toEqual({
      kind: 'awaiting_authorization',
      index: 0,
      provider: 'apple_music',
    });

    created[0]!.finishPrepare();
    await startPromise;
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'apple_music' });
    expect(statuses.map((s) => s.kind)).toEqual(['preparing', 'awaiting_authorization', 'playing']);
  });

  it('ignores a superseded adapter’s late awaiting_authorization signal', async () => {
    const payload = makePayload([
      makeEntry({
        classTrackId: 'ct-1',
        startOffsetMs: 0,
        durationMs: 60_000,
        providers: ['apple_music'],
      }),
      makeEntry({ classTrackId: 'ct-2', startOffsetMs: 60_000, durationMs: 60_000 }),
    ]);
    const created: FakeAdapter[] = [];
    let defer = true;
    const coordinator = new RuntimePlaybackCoordinator(
      payload,
      connections('soundcloud', 'apple_music'),
      {
        now: NOW,
        adapters: {
          apple_music: (events) => {
            const adapter = new FakeAdapter('apple_music', events);
            adapter.deferPrepare = defer;
            defer = false;
            created.push(adapter);
            return adapter;
          },
          soundcloud: (events) => {
            const adapter = new FakeAdapter('soundcloud', events);
            created.push(adapter);
            return adapter;
          },
        },
      },
    );

    const startPromise = coordinator.start(0); // ct-1 (apple_music) prepare hangs
    await coordinator.seek(60_000); // supersede → ct-2 (soundcloud) plays
    expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 1 });
    // The stale apple_music adapter now signals consent-pending — must be ignored.
    created[0]!.events.onAwaitingAuthorization?.();
    expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 1 });
    created[0]!.finishPrepare();
    await startPromise;
  });

  it('stop() releases the active adapter and returns to idle', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    await coordinator.stop();
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play', 'stop', 'destroy']);
    expect(coordinator.getStatus()).toEqual({ kind: 'idle' });
  });

  it('destroy() tears down synchronously for unmount', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'));
    await coordinator.start(0);
    coordinator.destroy();
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play', 'destroy']);
    expect(coordinator.getStatus()).toEqual({ kind: 'idle' });
  });

  it('pause destroys an adapter still awaiting play acknowledgement', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'), null, {
      deferPlayAt: [0],
    });
    const starting = coordinator.start(0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play']);

    await coordinator.pause();
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play', 'destroy']);
    expect(coordinator.getStatus()).toEqual({ kind: 'paused' });

    created[0]!.finishPlay();
    await starting;
    expect(coordinator.getStatus()).toEqual({ kind: 'paused' });
  });

  it('stop destroys an adapter still awaiting play acknowledgement', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'), null, {
      deferPlayAt: [0],
    });
    const starting = coordinator.start(0);
    await new Promise((resolve) => setTimeout(resolve, 0));

    await coordinator.stop();
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play', 'destroy']);
    expect(coordinator.getStatus()).toEqual({ kind: 'idle' });

    created[0]!.finishPlay();
    await starting;
    expect(coordinator.getStatus()).toEqual({ kind: 'idle' });
  });

  it('a seek supersedes no-ack playback without clearing the next track adapter', async () => {
    const payload = makePayload([
      makeEntry({ classTrackId: 'ct-1', durationMs: 60_000, startOffsetMs: 0 }),
      makeEntry({ classTrackId: 'ct-2', durationMs: 60_000, startOffsetMs: 60_000 }),
    ]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'), null, {
      deferPlayAt: [0],
    });
    const starting = coordinator.start(0);
    await new Promise((resolve) => setTimeout(resolve, 0));

    await coordinator.seek(60_000);
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-60000', 'play', 'destroy']);
    expect(created[1]!.calls).toEqual(['prepare:ct-2:0-60000', 'play']);
    expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 1 });

    created[0]!.finishPlay();
    await starting;
    expect(coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 1 });
    expect(created[1]!.calls).toEqual(['prepare:ct-2:0-60000', 'play']);
  });

  it('destroy tears down an adapter still awaiting play acknowledgement', async () => {
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const { coordinator, created } = makeHarness(payload, connections('soundcloud'), null, {
      deferPlayAt: [0],
    });
    const starting = coordinator.start(0);
    await new Promise((resolve) => setTimeout(resolve, 0));

    coordinator.destroy();
    expect(created[0]!.calls).toEqual(['prepare:ct-1:0-180000', 'play', 'destroy']);
    expect(coordinator.getStatus()).toEqual({ kind: 'idle' });

    created[0]!.finishPlay();
    await starting;
    expect(coordinator.getStatus()).toEqual({ kind: 'idle' });
  });
});

/**
 * Liveness observation is instrumentation: it watches and records, and nothing
 * it sees reaches `fail()` or the status. These tests pin that inertness.
 *
 * One thing they deliberately do NOT assert is that the runtime *should* ignore
 * a dead player. It should not — silent death is a real gap
 * (`playback-liveness-investigation.md` §2), and the owner's 2026-08-02 decision
 * was to gather evidence before wiring an alert whose thresholds cannot be tuned
 * against the local mock seam. Pinning the silence as correct is the F-05 trap,
 * where a green `apple-music.test.ts` case was evidence *for* the "0 tracks" bug.
 */
describe('RuntimePlaybackCoordinator liveness observation', () => {
  class LivenessAdapter extends FakeAdapter {
    reading: LivenessReading | null | 'reject' = { positionMs: 1_000, playing: true };
    livenessCalls = 0;
    async getLiveness(): Promise<LivenessReading | null> {
      this.livenessCalls++;
      if (this.reading === 'reject') throw new Error('the widget stopped answering');
      return this.reading;
    }
  }

  const INTERVAL = 2_500;

  function makeLivenessHarness(options: { withGetLiveness?: boolean; observe?: boolean } = {}) {
    const { withGetLiveness = true, observe = true } = options;
    const payload = makePayload([makeEntry({ classTrackId: 'ct-1' })]);
    const created: FakeAdapter[] = [];
    const statuses: CoordinatorStatus[] = [];
    const errors: PlaybackRuntimeError[] = [];
    const observer = new LivenessObserver({ now: () => 0, log: () => {} });
    const coordinator = new RuntimePlaybackCoordinator(payload, connections('soundcloud'), {
      now: NOW,
      adapters: {
        soundcloud: (events: AdapterEvents) => {
          const adapter = withGetLiveness
            ? new LivenessAdapter('soundcloud', events)
            : new FakeAdapter('soundcloud', events);
          created.push(adapter);
          return adapter;
        },
      },
      onStatus: (s) => statuses.push(s),
      onError: (e) => errors.push(e),
      ...(observe ? { liveness: observer, livenessIntervalMs: INTERVAL } : {}),
    });
    return { coordinator, created, statuses, errors, observer };
  }

  /** One probe cycle, with host frames in between so the rAF loop looks alive. */
  async function advanceOneProbe(coordinator: RuntimePlaybackCoordinator): Promise<void> {
    await coordinator.tick(1_000);
    await coordinator.tick(1_100);
    await vi.advanceTimersByTimeAsync(INTERVAL);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('samples the provider while playing', async () => {
    const { coordinator, created, observer } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;

    adapter.reading = { positionMs: 1_000, playing: true };
    await advanceOneProbe(coordinator);
    adapter.reading = { positionMs: 3_500, playing: true };
    await advanceOneProbe(coordinator);

    expect(adapter.livenessCalls).toBe(2);
    expect(observer.samples().map((s) => s.verdict)).toEqual(['advancing', 'advancing']);
    coordinator.destroy();
  });

  it('records a frozen playhead without touching playback', async () => {
    const { coordinator, created, statuses, errors, observer } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;
    const statusCount = statuses.length;

    // The provider insists it is playing while its playhead never moves.
    adapter.reading = { positionMs: 8_000, playing: true };
    await advanceOneProbe(coordinator);
    await advanceOneProbe(coordinator);
    await advanceOneProbe(coordinator);

    expect(observer.samples().map((s) => s.verdict)).toEqual([
      'advancing',
      'not_advancing',
      'not_advancing',
    ]);
    expect(observer.summary().peakConsecutiveMisses).toBe(2);
    // The whole point of instrument-only: nothing above changed the run.
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'soundcloud' });
    expect(statuses).toHaveLength(statusCount);
    expect(errors).toEqual([]);
    expect(adapter.calls).not.toContain('destroy');
    coordinator.destroy();
  });

  it('records a provider that stops answering as unresponsive, and keeps running', async () => {
    const { coordinator, created, errors, observer } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;

    adapter.reading = 'reject';
    await advanceOneProbe(coordinator);

    expect(observer.samples().at(-1)!.verdict).toBe('unresponsive');
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'soundcloud' });
    expect(errors).toEqual([]);
    coordinator.destroy();
  });

  it('exempts an adapter that cannot answer rather than calling it dead', async () => {
    const { coordinator, observer } = makeLivenessHarness({ withGetLiveness: false });
    await coordinator.start(0);
    await advanceOneProbe(coordinator);

    expect(observer.samples().map((s) => s.verdict)).toEqual(['exempt']);
    coordinator.destroy();
  });

  it('lets an advancing provider win while the host rAF loop is stalled', async () => {
    const { coordinator, created, errors, observer } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;

    // Hidden tab / occluded window: no rAF frames between probes.
    adapter.reading = { positionMs: 1_000, playing: true };
    await vi.advanceTimersByTimeAsync(INTERVAL);
    adapter.reading = { positionMs: 3_500, playing: true };
    await vi.advanceTimersByTimeAsync(INTERVAL);

    const samples = observer.samples();
    expect(samples.map((s) => s.verdict)).toEqual(['advancing', 'advancing']);
    expect(samples.every((s) => s.hostTicks === 0)).toBe(true);
    expect(observer.summary().peakConsecutiveMisses).toBe(0);
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'soundcloud' });
    expect(errors).toEqual([]);
    expect(adapter.calls).not.toContain('destroy');
    coordinator.destroy();
  });

  it('counts a frozen playing:true reading while the host is stalled, without failing', async () => {
    const { coordinator, created, statuses, errors, observer } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;
    const statusCount = statuses.length;

    adapter.reading = { positionMs: 8_000, playing: true };
    await vi.advanceTimersByTimeAsync(INTERVAL);
    await vi.advanceTimersByTimeAsync(INTERVAL);

    const samples = observer.samples();
    expect(samples.map((s) => s.verdict)).toEqual(['advancing', 'not_advancing']);
    expect(samples[1]!.hostTicks).toBe(0);
    expect(observer.summary().peakConsecutiveMisses).toBe(1);
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'soundcloud' });
    expect(statuses).toHaveLength(statusCount);
    expect(errors).toEqual([]);
    expect(adapter.calls).not.toContain('destroy');
    coordinator.destroy();
  });

  it('still records unresponsive and increments misses when the host recorded no ticks', async () => {
    const { coordinator, created, errors, observer } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;

    adapter.reading = 'reject';
    await vi.advanceTimersByTimeAsync(INTERVAL);

    const sample = observer.samples().at(-1)!;
    expect(sample.verdict).toBe('unresponsive');
    expect(sample.hostTicks).toBe(0);
    expect(sample.consecutiveMisses).toBe(1);
    expect(coordinator.getStatus()).toEqual({ kind: 'playing', index: 0, provider: 'soundcloud' });
    expect(errors).toEqual([]);
    coordinator.destroy();
  });

  it('stops probing once playback is paused', async () => {
    const { coordinator, created } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;
    await advanceOneProbe(coordinator);
    const callsWhilePlaying = adapter.livenessCalls;

    await coordinator.pause();
    await vi.advanceTimersByTimeAsync(INTERVAL * 4);

    expect(adapter.livenessCalls).toBe(callsWhilePlaying);
    coordinator.destroy();
  });

  it('stops probing after destroy, so the timer cannot outlive the run', async () => {
    const { coordinator, created } = makeLivenessHarness();
    await coordinator.start(0);
    const adapter = created[0] as LivenessAdapter;
    await advanceOneProbe(coordinator);
    const callsWhilePlaying = adapter.livenessCalls;

    coordinator.destroy();
    await vi.advanceTimersByTimeAsync(INTERVAL * 4);

    expect(adapter.livenessCalls).toBe(callsWhilePlaying);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not observe at all when no observer is supplied', async () => {
    const { coordinator, created } = makeLivenessHarness({ observe: false });
    await coordinator.start(0);
    await advanceOneProbe(coordinator);

    expect((created[0] as LivenessAdapter).livenessCalls).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    coordinator.destroy();
  });
});

describe('music-led runtime authority', () => {
  const owned: RuntimePlaybackCoordinator[] = [];
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    owned.splice(0).forEach((coordinator) => coordinator.destroy());
    vi.useRealTimers();
  });
  function musicRun(entries = [makeEntry({})]) {
    const created: FakeAdapter[] = [];
    const positions: number[] = [];
    let reading: import('./types.js').TransportReading = { positionMs: 0, state: 'playing' };
    const read = vi.fn(async () => reading);
    const coordinator = new RuntimePlaybackCoordinator(
      makePayload(entries),
      connections('soundcloud', 'apple_music'),
      {
        now: NOW,
        adapters: {
          apple_music: (events) => {
            const adapter = new FakeAdapter('apple_music', events);
            Object.assign(adapter, { getTransport: read });
            created.push(adapter);
            return adapter;
          },
          soundcloud: (events) => {
            const adapter = new FakeAdapter('soundcloud', events);
            Object.assign(adapter, { getTransport: read });
            created.push(adapter);
            return adapter;
          },
        },
        onPosition: (ms) => positions.push(ms),
      },
    );
    owned.push(coordinator);
    return {
      coordinator,
      created,
      positions,
      read,
      report: (value: typeof reading) => {
        reading = value;
      },
    };
  }
  it('does not advance from play resolution, host ticks, or unchanged provider position', async () => {
    const run = musicRun();
    await run.coordinator.start();
    await run.coordinator.tick(80_000);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run.positions).toEqual([]);
    expect(run.coordinator.getStatus().kind).toBe('buffering');
    run.report({ positionMs: 2_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([2_000]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run.positions).toEqual([2_000]);
  });
  it('holds on unexpected pause, then reconciles actual position without host wall time', async () => {
    const run = musicRun();
    await run.coordinator.start();
    run.report({ positionMs: 5_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    run.report({ positionMs: 15_000, state: 'paused' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([5_000]);
    expect(run.coordinator.getStatus().kind).toBe('buffering');
    vi.setSystemTime(Date.now() + 60_000);
    run.report({ positionMs: 6_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([5_000, 6_000]);
    expect(run.coordinator.getStatus().kind).toBe('playing');
  });
  it('waits out the first post-gap read and publishes its newer position', async () => {
    const run = musicRun();
    await run.coordinator.start();
    run.report({ positionMs: 5_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([5_000]);
    vi.setSystemTime(Date.now() + 60_000);
    let finish!: (reading: import('./types.js').TransportReading) => void;
    run.read.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250);
    expect(run.coordinator.getStatus().kind).not.toBe('error');
    expect(run.created[0]!.calls).not.toContain('destroy');
    finish({ positionMs: 8_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(0);
    expect(run.positions).toEqual([5_000, 8_000]);
    expect(run.coordinator.getStatus().kind).toBe('playing');
    expect(run.created[0]!.calls).not.toContain('destroy');
  });
  it('fails a post-gap read that returns with no newer position', async () => {
    const run = musicRun();
    await run.coordinator.start();
    run.report({ positionMs: 5_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    vi.setSystemTime(Date.now() + 60_000);
    let finish!: (reading: import('./types.js').TransportReading) => void;
    run.read.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250);
    expect(run.coordinator.getStatus().kind).not.toBe('error');
    finish({ positionMs: 5_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(0);
    expect(run.positions).toEqual([5_000]);
    expect(run.coordinator.getStatus()).toMatchObject({
      kind: 'error',
      error: { message: 'Music is paused, stalled, or its position cannot be verified.' },
    });
  });
  it('uses clip-relative positions and stops at the saved window before a deliberate gap', async () => {
    const run = musicRun([
      makeEntry({ durationMs: 10_000, clipStartMs: 30_000 }),
      makeEntry({ classTrackId: 'next', startOffsetMs: 15_000 }),
    ]);
    await run.coordinator.start();
    run.report({ positionMs: 32_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([2_000]);
    run.report({ positionMs: 41_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions.at(-1)).toBe(10_000);
    expect(run.coordinator.getStatus()).toEqual({ kind: 'silence', nextIndex: 1, untilMs: 15_000 });
    expect(run.created[0]!.calls).toContain('stop');
    await run.coordinator.tick(15_000);
    expect(run.created).toHaveLength(2);
    expect(run.coordinator.getStatus().kind).toBe('buffering');
  });
  it('holds a SoundCloud to Apple Music transition until the next provider confirms progress', async () => {
    const run = musicRun([
      makeEntry({ durationMs: 10000 }),
      makeEntry({ classTrackId: 'apple', providers: ['apple_music'], startOffsetMs: 10000 }),
    ]);
    await run.coordinator.start();
    run.report({ positionMs: 10000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.created[0]!.calls).toContain('stop');
    expect(run.created[1]!.provider).toBe('apple_music');
    expect(run.coordinator.getStatus()).toMatchObject({
      kind: 'buffering',
      provider: 'apple_music',
    });
    expect(run.positions).toEqual([10000]);
    run.report({ positionMs: 5000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([10000, 15000]);
  });
  it('holds unknown telemetry and surfaces a recoverable timeout', async () => {
    const run = musicRun();
    run.report({ positionMs: null, state: 'unknown' });
    await run.coordinator.start();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run.positions).toEqual([]);
    expect(run.coordinator.getStatus().kind).toBe('error');
    expect(run.created[0]!.calls).toContain('destroy');
  });
  it('keeps one position read in flight and rejects late data after a hung read', async () => {
    const run = musicRun();
    let finish!: (reading: import('./types.js').TransportReading) => void;
    run.read.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await run.coordinator.start();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(run.read).toHaveBeenCalledTimes(1);
    expect(run.coordinator.getStatus().kind).toBe('error');
    finish({ positionMs: 90_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(0);
    expect(run.positions).toEqual([]);
  });
  it('a newer provider Pause event wins over an in-flight playing snapshot', async () => {
    const run = musicRun();
    let finish!: (reading: import('./types.js').TransportReading) => void;
    run.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await run.coordinator.start();
    await vi.advanceTimersByTimeAsync(250);
    run.created[0]!.events.onTransportState?.('paused');
    finish({ positionMs: 8000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(0);
    expect(run.positions).toEqual([]);
    expect(run.coordinator.getStatus().kind).toBe('buffering');
  });
  it('holds early finish as a duration mismatch instead of running in silence', async () => {
    const run = musicRun();
    await run.coordinator.start();
    run.report({ positionMs: 30_000, state: 'ended' });
    run.created[0]!.events.onFinish?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.coordinator.getStatus().kind).toBe('error');
    expect(run.positions).toEqual([]);
  });
  it('finishes from the provider endpoint even when the host loop did not tick', async () => {
    const run = musicRun([makeEntry({ durationMs: 10_000 })]);
    await run.coordinator.start();
    run.report({ positionMs: 10_000, state: 'ended' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([10_000]);
    expect(run.coordinator.getStatus().kind).toBe('ended');
  });
  // Production 2026-10-03: saved Apple catalog duration 223,398 ms, while
  // MusicKit reported its ended endpoint as a whole 223 seconds.
  it('advances when the provider endpoint is a subsecond short of the saved window', async () => {
    const run = musicRun([
      makeEntry({ durationMs: 223_398, providers: ['apple_music'] }),
      makeEntry({ classTrackId: 'next', providers: ['apple_music'], startOffsetMs: 223_398 }),
    ]);
    await run.coordinator.start();
    run.report({ positionMs: 223_000, state: 'ended' });
    run.created[0]!.events.onFinish?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.positions).toEqual([223_398]);
    expect(run.created).toHaveLength(2);
    expect(run.coordinator.getStatus()).toMatchObject({ kind: 'buffering', index: 1 });
    // The next track still waits for its own provider progress.
    run.report({ positionMs: 0, state: 'playing' });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run.positions).toEqual([223_398]);
    run.report({ positionMs: 2_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([223_398, 225_398]);
  });
  it('ends the class when the final track ends a subsecond short of the saved window', async () => {
    const run = musicRun([makeEntry({ durationMs: 223_398 })]);
    await run.coordinator.start();
    run.report({ positionMs: 223_000, state: 'ended' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([223_398]);
    expect(run.coordinator.getStatus().kind).toBe('ended');
  });
  it('accepts a subsecond-short endpoint against a clipped window', async () => {
    const run = musicRun([makeEntry({ durationMs: 10_400, clipStartMs: 30_000 })]);
    await run.coordinator.start();
    run.report({ positionMs: 40_000, state: 'ended' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([10_400]);
    expect(run.coordinator.getStatus().kind).toBe('ended');
  });
  it('still holds an endpoint a full second short of the saved window', async () => {
    const run = musicRun([
      makeEntry({ durationMs: 223_398 }),
      makeEntry({ classTrackId: 'next', startOffsetMs: 223_398 }),
    ]);
    await run.coordinator.start();
    run.report({ positionMs: 222_398, state: 'ended' });
    run.created[0]!.events.onFinish?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.coordinator.getStatus().kind).toBe('error');
    expect(run.positions).toEqual([]);
    expect(run.created).toHaveLength(1);
  });
  it('does not round a still-playing position up to the window end', async () => {
    const run = musicRun([
      makeEntry({ durationMs: 223_398 }),
      makeEntry({ classTrackId: 'next', startOffsetMs: 223_398 }),
    ]);
    await run.coordinator.start();
    run.report({ positionMs: 223_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.positions).toEqual([223_000]);
    expect(run.created).toHaveLength(1);
    expect(run.coordinator.getStatus()).toMatchObject({ kind: 'playing', index: 0 });
  });
  it('holds again when a retry meets the same genuinely early end', async () => {
    const run = musicRun([makeEntry({ durationMs: 223_398 })]);
    await run.coordinator.start();
    run.report({ positionMs: 30_000, state: 'ended' });
    await vi.advanceTimersByTimeAsync(250);
    expect(run.coordinator.getStatus().kind).toBe('error');
    await run.coordinator.resume(0);
    await vi.advanceTimersByTimeAsync(250);
    expect(run.coordinator.getStatus().kind).toBe('error');
    expect(run.positions).toEqual([]);
  });
  it('ignores superseded reads and events after seeking to a new track', async () => {
    const run = musicRun([
      makeEntry({ durationMs: 10_000 }),
      makeEntry({ classTrackId: 'next', startOffsetMs: 10_000 }),
    ]);
    let finish!: (reading: import('./types.js').TransportReading) => void;
    run.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await run.coordinator.start();
    await vi.advanceTimersByTimeAsync(250);
    const old = run.created[0]!;
    await run.coordinator.seek(10_000);
    finish({ positionMs: 9_000, state: 'playing' });
    old.events.onFinish?.();
    old.events.onError?.({ message: 'stale error' });
    await vi.advanceTimersByTimeAsync(0);
    expect(run.positions).toEqual([]);
    expect(run.coordinator.getStatus()).toMatchObject({ kind: 'buffering', index: 1 });
  });
  it('manual Pause blocks late progress and resume waits for fresh confirmation at the held position', async () => {
    const run = musicRun();
    await run.coordinator.start();
    run.report({ positionMs: 5_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(250);
    await run.coordinator.pause();
    run.report({ positionMs: 90_000, state: 'playing' });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(run.positions).toEqual([5_000]);
    await run.coordinator.resume(5_000);
    expect(run.created[1]!.calls).toContain('seek:5000');
    expect(run.coordinator.getStatus().kind).toBe('buffering');
  });
  it('bounds preparation and destroys an adapter whose prepare never settles', async () => {
    let adapter!: FakeAdapter;
    const positions = vi.fn();
    const coordinator = new RuntimePlaybackCoordinator(makePayload([makeEntry({})]), [], {
      now: NOW,
      adapters: {
        soundcloud: (events) => {
          adapter = new FakeAdapter('soundcloud', events);
          adapter.deferPrepare = true;
          return adapter;
        },
      },
      onPosition: positions,
    });
    owned.push(coordinator);
    const started = coordinator.start();
    await vi.advanceTimersByTimeAsync(20_000);
    await started;
    expect(coordinator.getStatus().kind).toBe('error');
    expect(adapter.calls).toContain('destroy');
    adapter.finishPrepare();
    await vi.advanceTimersByTimeAsync(0);
    expect(adapter.calls).not.toContain('play');
    expect(positions).not.toHaveBeenCalled();
  });
});

describe('real adapter boundary regression', () => {
  it('holds the teaching clock when Spotify starts paused at zero without any progress', async () => {
    vi.useFakeTimers();
    let stateChanged!: (value: unknown) => void;
    const snapshot = {
      paused: true,
      position: 0,
      duration: 180000,
      track_window: { current_track: { uri: 'spotify:track:spotify-id' } },
    };
    const player = {
      addListener: (name: string, cb: (value: unknown) => void) => {
        if (name === 'player_state_changed') stateChanged = cb;
      },
      removeListener: () => {},
      pause: async () => {},
      getCurrentState: async () => snapshot,
    } as unknown as SpotifyPlayer;
    const positions = vi.fn();
    const coordinator = new RuntimePlaybackCoordinator(
      makePayload([makeEntry({ providers: ['spotify'] })]),
      connections('spotify'),
      {
        now: NOW,
        onPosition: positions,
        adapters: {
          spotify: (events) =>
            new SpotifyAdapter(events, {
              getPlayback: async () => ({ player, deviceId: 'qa' }),
              startTrack: async () => {},
            }),
        },
      },
    );
    try {
      await coordinator.start();
      stateChanged(snapshot);
      await vi.advanceTimersByTimeAsync(250);
      expect(positions).not.toHaveBeenCalled();
      expect(coordinator.getStatus().kind).toBe('buffering');
      await vi.advanceTimersByTimeAsync(10000);
      expect(positions).not.toHaveBeenCalled();
      expect(coordinator.getStatus().kind).toBe('error');
    } finally {
      coordinator.destroy();
      vi.useRealTimers();
    }
  });
});
