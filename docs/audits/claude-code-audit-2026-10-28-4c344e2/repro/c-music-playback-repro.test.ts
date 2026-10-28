// @vitest-environment jsdom
/**
 * Lane c-music repro (audit at 4c344e2). Copy to apps/web/src/lib/playback/ and run:
 *   pnpm --filter @ritmofit/web exec vitest run src/lib/playback/c-music-playback-repro.test.ts
 * Fake SDKs only; no provider network calls.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { RunPayload, RunPayloadTrackEntry, Provider } from '@ritmofit/shared';
import {
  probeSafariModernFairPlayAccess,
  resetSafariModernAccessProbeForTests,
  type MusicKitGlobal,
  type MusicKitInstance,
} from '../musickit.js';
import type { SpotifyPlayback, SpotifyPlayer } from '../spotify-playback.js';
import { AppleMusicAdapter } from './apple-music-adapter.js';
import { SpotifyAdapter } from './spotify-adapter.js';
import { RuntimePlaybackCoordinator, type CoordinatorStatus } from './runtime.js';
import type { ConnectionLike } from './coordinator.js';

const NOW = Date.now();

function entry(provider: Provider): RunPayloadTrackEntry {
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
      title: 'Track',
      artist: 'Artist',
      durationMs: 180_000,
      baseDurationMs: 180_000,
      albumArtUrl: null,
    },
    providerRefs: [
      {
        provider,
        providerTrackId: provider === 'spotify' ? 'abc' : 'am-1',
        providerUri: provider === 'spotify' ? 'spotify:track:abc' : null,
      },
    ],
    cues: [],
    moves: [],
  };
}

function payload(e: RunPayloadTrackEntry): RunPayload {
  return {
    schemaVersion: 1,
    class: {
      id: 'c',
      title: 'C',
      template: null,
      targetDurationMs: null,
      timelineMode: 'sequential',
      totalDurationMs: 180_000,
    },
    tracks: [e],
    sections: [],
  };
}

const conns = (provider: Provider): ConnectionLike[] => [
  {
    provider,
    expiresAt: NOW + 3_600_000,
    scope: provider === 'spotify' ? 'user-library-read streaming' : null,
  },
];

async function flush(n = 40): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve();
}

class FakeSpotifyPlayer {
  calls: string[] = [];
  connect = async () => true;
  disconnect() {}
  getCurrentState = async () => null;
  pause = async () => {
    this.calls.push('pause');
  };
  resume = async () => {};
  seek = async () => {};
  addListener() {}
  removeListener() {}
  activateElement = async () => {};
}

describe('CM-01: a Live seek while a Spotify/Apple start is in flight fails the class', () => {
  it('Spotify: second seek during the Connect-API start lands in the error state', async () => {
    const player = new FakeSpotifyPlayer() as unknown as SpotifyPlayer;
    const pendingStarts: Array<() => void> = [];
    const statuses: CoordinatorStatus[] = [];
    const coordinator = new RuntimePlaybackCoordinator(payload(entry('spotify')), conns('spotify'), {
      now: NOW,
      onPosition: () => {},
      onStatus: (s) => statuses.push(s),
      adapters: {
        spotify: (events) =>
          new SpotifyAdapter(events, {
            getPlayback: async (): Promise<SpotifyPlayback> => ({ player, deviceId: 'dev' }),
            // The real start = playback-token fetch + PUT /me/player/play (hundreds of ms).
            startTrack: () =>
              new Promise<void>((resolve) => {
                pendingStarts.push(resolve);
              }),
          }),
      },
    });
    try {
      void coordinator.start(0);
      await flush();
      expect(pendingStarts).toHaveLength(1); // first start in flight
      // Instructor drags/taps the timeline (LiveMode commits seeks every 200 ms).
      await coordinator.seek(60_000);
      await flush();
      const status = coordinator.getStatus();
      expect(status.kind).toBe('error');
      expect(status.kind === 'error' && status.error.message).toMatch(
        /still finishing a cancelled start request/,
      );
      // The superseded start later settles; nothing retries on its own.
      pendingStarts[0]!();
      await flush();
      expect(coordinator.getStatus().kind).toBe('error');
    } finally {
      coordinator.destroy();
    }
  });

  it('Apple Music: pause then immediate resume during an in-flight setQueue lands in error', async () => {
    let releaseQueue!: () => void;
    const queueGate = new Promise<void>((r) => {
      releaseQueue = r;
    });
    let queueCalls = 0;
    const instance = {
      isAuthorized: true,
      authorize: async () => 'mut',
      setQueue: async () => {
        queueCalls += 1;
        if (queueCalls === 1) await queueGate; // MusicKit queue load still in flight
      },
      play: async () => {},
      pause: async () => {},
      stop: async () => {},
      seekToTime: async () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as MusicKitInstance;
    const music = {
      configure: async () => instance,
      getInstance: () => instance,
      Events: { playbackStateDidChange: 'a', mediaPlaybackError: 'b' },
      PlaybackStates: { completed: 10, ended: 5, playing: 2, paused: 3, stopped: 4 },
    } satisfies MusicKitGlobal;
    const coordinator = new RuntimePlaybackCoordinator(
      payload(entry('apple_music')),
      conns('apple_music'),
      {
        now: NOW,
        onPosition: () => {},
        adapters: {
          apple_music: (events) =>
            new AppleMusicAdapter(events, {
              loadMusicKit: async () => music,
              requirePreauthorization: true,
            }),
        },
      },
    );
    try {
      void coordinator.start(0);
      await flush();
      expect(queueCalls).toBe(1);
      await coordinator.pause();
      await coordinator.resume(0); // a quick pause/resume toggle, or a seek
      await flush();
      const status = coordinator.getStatus();
      expect(status.kind).toBe('error');
      expect(status.kind === 'error' && status.error.message).toMatch(
        /still finishing a previous queue request/,
      );
      releaseQueue();
    } finally {
      coordinator.destroy();
    }
  });
});

describe('CM-02: the FairPlay probe calls requestMediaKeySystemAccess unbound', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1';
  let restoreUa: (() => void) | null = null;

  afterEach(() => {
    resetSafariModernAccessProbeForTests();
    Reflect.deleteProperty(navigator, 'requestMediaKeySystemAccess');
    restoreUa?.();
  });

  it('jsdom (webidl2js) itself rejects an unbound Navigator method: same WebIDL brand check', () => {
    const unbound = navigator.javaEnabled;
    // jsdom's TypeError is from another realm, so match the message.
    expect(() => unbound()).toThrow(/not a valid instance of Navigator/);
  });

  it('a brand-checked requestMediaKeySystemAccess (as in WebKit/Blink) makes the probe resolve null, not "ok"', async () => {
    const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent');
    Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => ua });
    restoreUa = () => {
      Reflect.deleteProperty(navigator, 'userAgent');
      if (desc) Object.defineProperty(Navigator.prototype, 'userAgent', desc);
    };
    let calls = 0;
    Object.defineProperty(navigator, 'requestMediaKeySystemAccess', {
      configurable: true,
      writable: true,
      // WebIDL operation semantics: `this` must be a Navigator, else TypeError
      // ("Illegal invocation" in Blink, "Can only call ... on instances of Navigator" in WebKit).
      value: function (this: unknown) {
        if (!(this instanceof Navigator)) throw new TypeError('Illegal invocation');
        calls += 1;
        return Promise.resolve({});
      },
    });
    const probe = probeSafariModernFairPlayAccess();
    expect(probe).not.toBeNull(); // iOS Safari path selected
    await expect(probe).resolves.toBeNull(); // TypeError is not a DOMException -> null
    expect(calls).toBe(0); // the key system was never actually requested

    // Control: the same stub called with the right receiver resolves.
    await expect(
      (
        navigator as Navigator & { requestMediaKeySystemAccess: (...a: unknown[]) => unknown }
      ).requestMediaKeySystemAccess('com.apple.fps', []),
    ).resolves.toEqual({});
  });
});
