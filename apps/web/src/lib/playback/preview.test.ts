import { describe, expect, it } from 'vitest';
import type { RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  PreviewPlaybackController,
  type PreviewControllerOptions,
  type PreviewStatus,
} from './preview.js';
import type { AdapterEvents, AdapterFactory, PlaybackAdapter } from './types.js';
import type { ConnectionLike } from './coordinator.js';

const NOW = 1_700_000_000_000;

function makeEntry(overrides?: Partial<RunPayloadTrackEntry>): RunPayloadTrackEntry {
  return {
    classTrackId: 'ct-1',
    position: 0,
    displayBpm: null,
    displayRpm: null,
    holdCount: null,
    intensity: 'mod',
    startOffsetMs: 0,
    clipStartMs: 30_000,
    beatAnchorMs: 0,
    notes: null,
    track: {
      id: 'track-1',
      title: 'Baiana',
      artist: 'Bakermat',
      durationMs: 120_000,
      albumArtUrl: null,
    },
    providerRefs: [{ provider: 'soundcloud', providerTrackId: '123', providerUri: null }],
    cues: [],
    moves: [],
    ...overrides,
  };
}

/** A scriptable stand-in for a real provider adapter. */
class FakeAdapter implements PlaybackAdapter {
  readonly provider = 'soundcloud' as const;
  calls: string[] = [];
  events: AdapterEvents;
  /** When set, prepare()/stop() awaits this so a test can resolve it mid-transition. */
  private prepareGate: Promise<void> | null;
  private releasePrepare: (() => void) | null = null;
  private stopGate: Promise<void> | null;
  private releaseStop: (() => void) | null = null;
  failPrepare = false;

  constructor(events: AdapterEvents, opts?: { gatePrepare?: boolean; gateStop?: boolean }) {
    this.events = events;
    this.prepareGate = opts?.gatePrepare
      ? new Promise<void>((resolve) => {
          this.releasePrepare = resolve;
        })
      : null;
    this.stopGate = opts?.gateStop
      ? new Promise<void>((resolve) => {
          this.releaseStop = resolve;
        })
      : null;
  }

  openGate(): void {
    this.releasePrepare?.();
  }

  openStopGate(): void {
    this.releaseStop?.();
  }

  async prepare(): Promise<{ provider: 'soundcloud'; classTrackId: string }> {
    this.calls.push('prepare');
    if (this.prepareGate) await this.prepareGate;
    if (this.failPrepare) throw new Error('prepare boom');
    return { provider: 'soundcloud', classTrackId: 'ct-1' };
  }
  async play(): Promise<void> {
    this.calls.push('play');
  }
  async pause(): Promise<void> {
    this.calls.push('pause');
  }
  async seek(): Promise<void> {
    this.calls.push('seek');
  }
  async stop(): Promise<void> {
    this.calls.push('stop');
    if (this.stopGate) await this.stopGate;
  }
  destroy(): void {
    this.calls.push('destroy');
  }
}

/** Build a controller whose registry hands out (and records) FakeAdapters. */
function harness(opts?: {
  connections?: ConnectionLike[];
  adapters?: PreviewControllerOptions['adapters'];
  gatePrepare?: boolean;
}) {
  const built: FakeAdapter[] = [];
  const statuses: PreviewStatus[] = [];
  const factory: AdapterFactory = (events) => {
    const a = new FakeAdapter(events, { gatePrepare: opts?.gatePrepare });
    built.push(a);
    return a;
  };
  const controller = new PreviewPlaybackController(
    opts?.connections ?? [{ provider: 'soundcloud', expiresAt: null, scope: null }],
    {
      now: () => NOW,
      adapters: opts?.adapters ?? { soundcloud: factory },
      onStatus: (s) => statuses.push(s),
    },
  );
  return { controller, built, statuses };
}

describe('PreviewPlaybackController', () => {
  it('prepares and plays the selected track, reporting playing', async () => {
    const { controller, built, statuses } = harness();
    await controller.play(makeEntry());
    expect(built).toHaveLength(1);
    expect(built[0]!.calls).toEqual(['prepare', 'play']);
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-1',
      provider: 'soundcloud',
    });
    expect(statuses.map((s) => s.kind)).toEqual(['preparing', 'playing']);
  });

  it('errors (select phase) when no connected provider can play the track', async () => {
    // Apple Music needs an authorized user, so with no connection it can't play
    // (SoundCloud, by contrast, plays via the public Widget with no connection).
    const { controller, built } = harness({ connections: [] });
    await controller.play(
      makeEntry({
        providerRefs: [{ provider: 'apple_music', providerTrackId: 'am1', providerUri: null }],
      }),
    );
    expect(built).toHaveLength(0);
    const status = controller.getStatus();
    expect(status.kind).toBe('error');
    if (status.kind === 'error') expect(status.error.phase).toBe('select');
  });

  it('previews a SoundCloud track with no connection (public Widget needs no auth)', async () => {
    const { controller, built } = harness({ connections: [] });
    await controller.play(makeEntry({ classTrackId: 'ct-1' }));
    expect(built).toHaveLength(1);
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-1',
      provider: 'soundcloud',
    });
  });

  it('errors (prepare phase) when the selected provider has no adapter in this build', async () => {
    // Connected to apple_music, but only a soundcloud adapter is registered.
    const { controller } = harness({
      connections: [{ provider: 'apple_music', expiresAt: null, scope: null }],
      adapters: { soundcloud: (e) => new FakeAdapter(e) },
    });
    await controller.play(
      makeEntry({
        providerRefs: [{ provider: 'apple_music', providerTrackId: 'am1', providerUri: null }],
      }),
    );
    const status = controller.getStatus();
    expect(status.kind).toBe('error');
    if (status.kind === 'error') {
      expect(status.error.phase).toBe('prepare');
      expect(status.error.provider).toBe('apple_music');
    }
  });

  it('surfaces a prepare failure as a recoverable error and destroys the adapter', async () => {
    const built: FakeAdapter[] = [];
    const controller = new PreviewPlaybackController(
      [{ provider: 'soundcloud', expiresAt: null, scope: null }],
      {
        now: () => NOW,
        adapters: {
          soundcloud: (e) => {
            const a = new FakeAdapter(e);
            a.failPrepare = true;
            built.push(a);
            return a;
          },
        },
      },
    );
    await controller.play(makeEntry());
    expect(built[0]!.calls).toContain('destroy');
    const status = controller.getStatus();
    expect(status.kind).toBe('error');
    if (status.kind === 'error') expect(status.error.message).toBe('prepare boom');
  });

  it('stops preview at the clip-window end when the host clock reaches it', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry()); // durationMs 120_000
    await controller.tick(60_000);
    expect(controller.getStatus().kind).toBe('playing');
    await controller.tick(120_000);
    expect(built[0]!.calls).toEqual(['prepare', 'play', 'stop', 'destroy']);
    expect(controller.getStatus()).toEqual({ kind: 'ended', classTrackId: 'ct-1' });
  });

  it('previews open-ended when the track has no known duration', async () => {
    const { controller } = harness();
    await controller.play(
      makeEntry({
        track: { id: 't', title: 'x', artist: 'y', durationMs: null, albumArtUrl: null },
      }),
    );
    await controller.tick(10_000_000);
    expect(controller.getStatus().kind).toBe('playing');
  });

  it('pauses and resumes the active track', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry());
    await controller.pause();
    expect(controller.getStatus().kind).toBe('paused');
    await controller.resume();
    expect(controller.getStatus().kind).toBe('playing');
    expect(built[0]!.calls).toEqual(['prepare', 'play', 'pause', 'play']);
  });

  it('does not auto-stop while paused even past the window end', async () => {
    const { controller } = harness();
    await controller.play(makeEntry());
    await controller.pause();
    await controller.tick(999_999); // ticks are ignored unless playing
    expect(controller.getStatus().kind).toBe('paused');
  });

  it('ends on the provider finish event', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry());
    built[0]!.events.onFinish?.();
    // let the async endActive settle
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.getStatus()).toEqual({ kind: 'ended', classTrackId: 'ct-1' });
  });

  it('does not clobber a superseding preview when a prior track ends mid-release', async () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));
    const built: FakeAdapter[] = [];
    // Only the first track's adapter gates its stop, so track A's end-of-window
    // release is still in flight when track B takes over.
    const factory: AdapterFactory = (events) => {
      const a = new FakeAdapter(events, { gateStop: built.length === 0 });
      built.push(a);
      return a;
    };
    const controller = new PreviewPlaybackController(
      [{ provider: 'soundcloud', expiresAt: null, scope: null }],
      {
        now: () => NOW,
        adapters: { soundcloud: factory },
      },
    );

    await controller.play(makeEntry({ classTrackId: 'ct-A' }));
    // A hits its window end → endActive begins, awaiting A's (gated) stop.
    const ending = controller.tick(120_000);
    await flush();
    expect(controller.getStatus().kind).toBe('playing'); // release not done yet

    // B supersedes A while A's release is still awaiting.
    await controller.play(makeEntry({ classTrackId: 'ct-B' }));
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-B',
      provider: 'soundcloud',
    });

    // A's stop finally resolves — endActive must NOT overwrite B with `ended`.
    built[0]!.openStopGate();
    await ending;
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-B',
      provider: 'soundcloud',
    });
  });

  it('releases the previous track when a different one is previewed', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry({ classTrackId: 'ct-1' }));
    await controller.play(makeEntry({ classTrackId: 'ct-2' }));
    expect(built).toHaveLength(2);
    expect(built[0]!.calls).toEqual(['prepare', 'play', 'stop', 'destroy']);
    expect(built[1]!.calls).toEqual(['prepare', 'play']);
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-2',
      provider: 'soundcloud',
    });
  });

  it('abandons a superseded prepare and never resurrects its audio', async () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));
    const { controller, built } = harness({ gatePrepare: true });
    const first = controller.play(makeEntry({ classTrackId: 'ct-1' }));
    // Let ct-1 build its adapter and suspend at the gated prepare.
    await flush();
    expect(built).toHaveLength(1);
    // Now a second play supersedes ct-1 while its prepare is still in flight.
    const second = controller.play(makeEntry({ classTrackId: 'ct-2' }));
    await flush();
    expect(built).toHaveLength(2);
    built[0]!.openGate(); // ct-1's prepare resolves — but it has been superseded.
    built[1]!.openGate();
    await Promise.all([first, second]);
    // The abandoned first adapter is destroyed and never played.
    expect(built[0]!.calls).toContain('destroy');
    expect(built[0]!.calls).not.toContain('play');
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-2',
      provider: 'soundcloud',
    });
  });

  it('ignores late errors from a superseded adapter', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry({ classTrackId: 'ct-1' }));
    await controller.play(makeEntry({ classTrackId: 'ct-2' }));
    // The first (released) adapter fires a late error — must not clobber ct-2.
    built[0]!.events.onError?.({ message: 'late boom' });
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-2',
      provider: 'soundcloud',
    });
  });

  it('surfaces awaiting_authorization while prepare blocks on consent, then plays', async () => {
    const flush = () => new Promise((r) => setTimeout(r, 0));
    const { controller, built, statuses } = harness({ gatePrepare: true });
    const playing = controller.play(makeEntry({ classTrackId: 'ct-1' }));
    await flush();
    expect(built).toHaveLength(1);
    // The adapter is blocked on the consent sheet and reports it.
    built[0]!.events.onAwaitingAuthorization?.();
    expect(controller.getStatus()).toEqual({
      kind: 'awaiting_authorization',
      classTrackId: 'ct-1',
      provider: 'soundcloud',
    });
    built[0]!.openGate();
    await playing;
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-1',
      provider: 'soundcloud',
    });
    expect(statuses.map((s) => s.kind)).toEqual(['preparing', 'awaiting_authorization', 'playing']);
  });

  it('ignores a superseded adapter awaiting_authorization signal', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry({ classTrackId: 'ct-1' }));
    await controller.play(makeEntry({ classTrackId: 'ct-2' }));
    // The released first adapter signals consent-pending — must not clobber ct-2.
    built[0]!.events.onAwaitingAuthorization?.();
    expect(controller.getStatus()).toEqual({
      kind: 'playing',
      classTrackId: 'ct-2',
      provider: 'soundcloud',
    });
  });

  it('stop() releases the adapter and returns to idle', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry());
    await controller.stop();
    expect(built[0]!.calls).toEqual(['prepare', 'play', 'stop', 'destroy']);
    expect(controller.getStatus()).toEqual({ kind: 'idle' });
  });

  it('destroy() tears down the active adapter synchronously', async () => {
    const { controller, built } = harness();
    await controller.play(makeEntry());
    controller.destroy();
    expect(built[0]!.calls).toContain('destroy');
    expect(controller.getStatus()).toEqual({ kind: 'idle' });
  });
});
