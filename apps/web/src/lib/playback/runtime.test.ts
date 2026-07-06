import { describe, it, expect } from 'vitest';
import type { Provider, RunPayload, RunPayloadTrackEntry } from '@ritmofit/shared';
import type { ConnectionLike } from './coordinator.js';
import {
  RuntimePlaybackCoordinator,
  segmentAt,
  type CoordinatorStatus,
  type PlaybackRuntimeError,
} from './runtime.js';
import type { AdapterEvents, PlaybackAdapter, PlaybackReady, PlaybackWindow } from './types.js';

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
  failPrepare = false;
  private resolvePrepare: ((ready: PlaybackReady) => void) | null = null;
  private pendingReady: PlaybackReady | null = null;

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

  async play(): Promise<void> {
    this.calls.push('play');
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
function makeHarness(payload: RunPayload, conns: ConnectionLike[], preferred?: Provider | null) {
  const created: FakeAdapter[] = [];
  const statuses: CoordinatorStatus[] = [];
  const errors: PlaybackRuntimeError[] = [];
  const factoryFor = (provider: Provider) => (events: AdapterEvents) => {
    const adapter = new FakeAdapter(provider, events);
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
});
