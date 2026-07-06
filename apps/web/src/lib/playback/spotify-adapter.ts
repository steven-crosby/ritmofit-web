/**
 * Spotify playback adapter — wraps the official Web Playback SDK behind the
 * `PlaybackAdapter` contract. Spotify owns the audio stream, the Premium
 * authorization, and catalog availability; this adapter only remote-controls the
 * page-singleton device (connect, start-a-track via the Connect Web API, pause,
 * resume, seek) and never touches audio bytes (music-providers.md, D19). No
 * download, proxy, cache, decode, analysis, or BPM.
 *
 * How it differs from the SoundCloud / Apple adapters and shapes this file:
 *   1. The SDK has no "cue without playing": selection goes through the Connect
 *      Web API (`PUT /me/player/play`) with the clip `position_ms`, so `prepare()`
 *      only readies the device and `play()` starts the track at the window start.
 *   2. The player is a page singleton shared by every track's adapter (like
 *      MusicKit), so transport ownership is tracked in a WeakMap — a superseded
 *      adapter must never stop or surface errors for the track a newer adapter now
 *      owns — and listeners are added/removed per-handler, never wholesale.
 *
 * The token comes from `GET /providers/spotify/playback-token`; it lives in memory
 * only, never logged or persisted, and is used solely to authorize the SDK + the
 * start/seek/pause transport. RUNTIME-UNVERIFIED in CI (needs a real device +
 * Premium subscriber); the logic here is unit-tested behind the host seams.
 */
import type { RunPayloadTrackEntry } from '@ritmofit/shared';
import {
  getSpotifyPlayback,
  startSpotifyTrack,
  type SpotifyPlayback,
  type SpotifyPlaybackHost,
  type SpotifyPlayer,
  type SpotifyPlayerState,
} from '../spotify-playback.js';
import { SpotifyPlaybackTokenError } from '../api.js';
import type {
  AdapterEvents,
  AdapterFactory,
  PlaybackAdapter,
  PlaybackReady,
  PlaybackWindow,
  RunPayloadProviderRef,
} from './types.js';

const DEFAULT_START_TIMEOUT_MS = 20_000;

/**
 * Which adapter currently owns each shared player's transport. Claimed in play();
 * only the owner may stop it or surface its runtime errors on teardown, so a
 * superseded adapter never silences (or reports errors for) the newer adapter's
 * track. Keyed by the player instance via a WeakMap so it never leaks.
 */
const transportOwners = new WeakMap<SpotifyPlayer, SpotifyAdapter>();

/** The Spotify track URI to play: prefer a stored `spotify:track:` uri, else build one. */
export function spotifyTrackUri(ref: RunPayloadProviderRef): string {
  const uri = ref.providerUri?.trim();
  if (uri && /^spotify:track:[A-Za-z0-9]+$/.test(uri)) return uri;
  return `spotify:track:${ref.providerTrackId}`;
}

/** Test seams: the singleton device, the Web-API start call, and the start timeout. */
export interface SpotifyAdapterHost extends SpotifyPlaybackHost {
  getPlayback?: (host?: SpotifyPlaybackHost) => Promise<SpotifyPlayback>;
  startTrack?: typeof startSpotifyTrack;
  startTimeoutMs?: number;
}

export class SpotifyAdapter implements PlaybackAdapter {
  readonly provider = 'spotify' as const;
  private player: SpotifyPlayer | null = null;
  private deviceId = '';
  private uri = '';
  private windowStartMs = 0;
  /** Position the next start() will seed via the Connect API; see seek(). */
  private cueMs = 0;
  private started = false;
  private destroyed = false;
  private trackTitle = '';
  /** Finish detection: a track ends by transitioning from playing → paused@0. */
  private wasPlaying = false;

  private readonly onStateChange = (state: SpotifyPlayerState | null): void => {
    if (!this.started || !state) return;
    if (!state.paused) {
      this.wasPlaying = true;
      return;
    }
    // Paused at position 0 after having played = the single-uri track ended (we
    // never queue a next track, so Spotify stops rather than advancing). Advisory:
    // the class clock stays master, this just yields the one early-silence finish.
    if (this.wasPlaying && state.position === 0) {
      this.wasPlaying = false;
      this.events.onFinish?.();
    }
  };
  private readonly onAuthError = (): void => {
    this.surfaceError('Spotify playback needs a reconnect — reconnect Spotify to keep playing.');
  };
  private readonly onAccountError = (): void => {
    this.surfaceError('Spotify playback requires an active Premium account.');
  };
  private readonly onPlaybackError = (): void => {
    this.surfaceError(`Spotify playback failed for "${this.trackTitle}".`);
  };

  constructor(
    private readonly events: AdapterEvents = {},
    private readonly host: SpotifyAdapterHost = {},
  ) {}

  /**
   * Ready the singleton device and cue this track's uri + window start, WITHOUT
   * starting audio (the Connect API start happens in play()). Resolves once the
   * device is connected; a connect failure (bad token, non-Premium, blocked SDK)
   * rejects so preflight/start surfaces it instead of hanging the class.
   */
  async prepare(entry: RunPayloadTrackEntry, window: PlaybackWindow): Promise<PlaybackReady> {
    const ref = entry.providerRefs.find((candidate) => candidate.provider === 'spotify');
    if (!ref) {
      throw new Error(`"${entry.track.title}" has no Spotify reference.`);
    }
    this.teardownListeners(); // re-prepare = fresh listeners, never doubled
    this.destroyed = false;
    this.started = false;
    this.wasPlaying = false;
    this.trackTitle = entry.track.title;
    this.uri = spotifyTrackUri(ref);
    this.windowStartMs = window.startMs;
    this.cueMs = window.startMs;

    const playback = await (this.host.getPlayback ?? getSpotifyPlayback)(this.host);
    if (this.destroyed) throw new Error('Spotify player was torn down while loading.');
    this.player = playback.player;
    this.deviceId = playback.deviceId;

    this.player.addListener('player_state_changed', this.onStateChange);
    this.player.addListener('authentication_error', this.onAuthError);
    this.player.addListener('account_error', this.onAccountError);
    this.player.addListener('playback_error', this.onPlaybackError);

    return { provider: 'spotify', classTrackId: entry.classTrackId };
  }

  async play(): Promise<void> {
    const player = this.requirePlayer();
    if (this.started) {
      // Resume after a pause — the track is already loaded on the device.
      await player.resume();
      return;
    }
    // First play: select the track on our device at the clip position via the
    // Connect Web API (the SDK has no load-a-track method).
    try {
      await this.withTimeout(
        (this.host.startTrack ?? startSpotifyTrack)({
          deviceId: this.deviceId,
          uri: this.uri,
          positionMs: this.cueMs,
          host: this.host,
        }),
        this.host.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS,
        `The Spotify player timed out starting "${this.trackTitle}".`,
      );
    } catch (err) {
      if (err instanceof SpotifyPlaybackTokenError && err.code === 'PLAYBACK_REAUTH_REQUIRED') {
        throw new Error('Reconnect Spotify to enable in-app playback.');
      }
      throw err;
    }
    // Claim the shared transport: only this adapter may now stop it or report its
    // runtime errors, until stop/teardown.
    transportOwners.set(player, this);
    this.started = true;
    this.wasPlaying = true;
  }

  async pause(): Promise<void> {
    await this.requirePlayer().pause();
  }

  async seek(providerMs: number): Promise<void> {
    const player = this.requirePlayer();
    if (this.started) {
      await player.seek(Math.max(0, Math.round(providerMs)));
    } else {
      // Not started yet — the next play() seeds this as the Connect-API position.
      this.cueMs = providerMs;
    }
  }

  /** Halt audio and re-cue the window start (stop ≠ destroy: re-playable). */
  async stop(): Promise<void> {
    const player = this.requirePlayer();
    this.started = false;
    this.wasPlaying = false;
    if (transportOwners.get(player) === this) transportOwners.delete(player);
    await player.pause();
    // A later play() re-selects the track at the window start via the Connect API.
    this.cueMs = this.windowStartMs;
  }

  destroy(): void {
    this.destroyed = true;
    this.started = false;
    const player = this.player;
    if (player) {
      this.teardownListeners();
      // Only halt audio if we still own the shared transport — a superseded
      // adapter must not stop the newer adapter's track. Never disconnect the
      // singleton device; the next track reuses it.
      if (transportOwners.get(player) === this) {
        transportOwners.delete(player);
        void player.pause();
      }
    }
    this.player = null;
  }

  private requirePlayer(): SpotifyPlayer {
    if (!this.player || this.destroyed) {
      throw new Error('Spotify player is not prepared.');
    }
    return this.player;
  }

  /**
   * Surface a runtime error only from the adapter that owns the transport (or one
   * still preparing, before any owner is claimed). A superseded, un-destroyed
   * adapter listening on the shared singleton stays silent so it can't report the
   * newer track's errors as its own.
   */
  private surfaceError(message: string): void {
    if (this.destroyed || !this.player) return;
    const owner = transportOwners.get(this.player);
    if (owner && owner !== this) return;
    this.events.onError?.({ message });
  }

  private teardownListeners(): void {
    const player = this.player;
    if (!player) return;
    try {
      player.removeListener('player_state_changed', this.onStateChange as (p?: unknown) => void);
      player.removeListener('authentication_error', this.onAuthError as (p?: unknown) => void);
      player.removeListener('account_error', this.onAccountError as (p?: unknown) => void);
      player.removeListener('playback_error', this.onPlaybackError as (p?: unknown) => void);
    } catch {
      // Best-effort — a superseding start/prepare overrides any stray listener.
    }
  }

  private async withTimeout<T>(work: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Registry entry for the runtime coordinator. */
export const spotifyAdapterFactory: AdapterFactory = (events) => new SpotifyAdapter(events);
