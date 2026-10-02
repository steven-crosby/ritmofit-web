import type { TransportReading } from './types.js';
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
  isSpotifyPlaybackActivated,
  invalidateSpotifyActivation,
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
  LivenessReading,
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
const pendingStarts = new WeakSet<SpotifyPlayer>();
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
  requireActivation?: boolean;
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
  private starting = false;
  private destroyed = false;
  private trackTitle = '';
  /** Finish detection: a track ends by transitioning from playing → paused@0. */
  private wasPlaying = false;
  private lastPlayingPosition = 0;
  private finishedPosition: number | null = null;
  private autoplayBlocked = false;

  private readonly onStateChange = (state: SpotifyPlayerState | null): void => {
    if (!this.started || !this.player || transportOwners.get(this.player) !== this) return;
    if (!state) {
      this.events.onTransportState?.('unknown');
      return;
    }
    if (state.track_window.current_track?.uri !== this.uri) {
      this.events.onTransportState?.('unknown');
      return;
    }
    this.events.onTransportState?.(state.paused ? 'paused' : 'playing');
    if (!state.paused) {
      this.finishedPosition = null;
      if (state.position > this.lastPlayingPosition) this.wasPlaying = true;
      this.lastPlayingPosition = state.position;
      return;
    }
    // Paused at position 0 after having played = the single-uri track ended (we
    // never queue a next track). Retain SDK duration because the playhead resets;
    // the coordinator compares this endpoint with the saved playback window.
    if (
      this.wasPlaying &&
      state.position === 0 &&
      Number.isFinite(state.duration) &&
      state.duration > 0 &&
      this.lastPlayingPosition >= state.duration - 1_000
    ) {
      this.wasPlaying = false;
      this.finishedPosition = state.duration;
      this.events.onFinish?.();
    }
  };
  private readonly onAuthError = (): void => {
    this.surfaceError('Spotify playback needs a reconnect — reconnect Spotify to keep playing.');
  };
  private readonly onAccountError = (): void => {
    this.surfaceError('Spotify playback requires an active Premium account.');
  };
  private readonly onAutoplayFailed = (): void => {
    this.autoplayBlocked = true;
    if (this.player) invalidateSpotifyActivation(this.player);
    this.surfaceError(
      'Spotify playback was blocked by this browser. Enable Spotify playback, then Retry.',
    );
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
    if (this.starting) throw new Error('Spotify is still finishing a previous start request.');
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
    this.lastPlayingPosition = window.startMs;
    this.finishedPosition = null;
    this.autoplayBlocked = false;

    const playback = await (this.host.getPlayback ?? getSpotifyPlayback)(this.host);
    if (this.destroyed) throw new Error('Spotify player was torn down while loading.');
    if (pendingStarts.has(playback.player))
      throw new Error(
        'Spotify is still finishing a cancelled start request. Retry after it finishes, or reload.',
      );
    if (this.host.requireActivation && !isSpotifyPlaybackActivated(playback.player))
      throw new Error('Enable Spotify playback in this browser before retrying.');
    this.player = playback.player;
    this.deviceId = playback.deviceId;

    this.player.addListener('player_state_changed', this.onStateChange);
    this.player.addListener('authentication_error', this.onAuthError);
    this.player.addListener('account_error', this.onAccountError);
    this.player.addListener('playback_error', this.onPlaybackError);
    this.player.addListener('autoplay_failed', this.onAutoplayFailed);

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
    if (pendingStarts.has(player))
      throw new Error('Spotify is still finishing a previous start request.');
    this.starting = true;
    pendingStarts.add(player);
    transportOwners.set(player, this);
    // Keep the lease until the underlying command settles, even if the UI times out.
    let command: Promise<void>;
    try {
      command = (this.host.startTrack ?? startSpotifyTrack)({
        deviceId: this.deviceId,
        uri: this.uri,
        positionMs: this.cueMs,
        host: this.host,
      });
    } catch (cause) {
      this.starting = false;
      pendingStarts.delete(player);
      if (transportOwners.get(player) === this) transportOwners.delete(player);
      throw cause;
    }
    const start = command.finally(async () => {
      if (this.destroyed && transportOwners.get(player) === this) {
        try {
          await player.pause();
        } catch {
          /* Provider teardown is best-effort. */
        }
        if (transportOwners.get(player) === this) transportOwners.delete(player);
      }
      pendingStarts.delete(player);
      this.starting = false;
    });
    try {
      await this.withTimeout(
        start,
        this.host.startTimeoutMs ?? DEFAULT_START_TIMEOUT_MS,
        `The Spotify player timed out starting "${this.trackTitle}".`,
      );
    } catch (err) {
      if (err instanceof SpotifyPlaybackTokenError && err.code === 'PLAYBACK_REAUTH_REQUIRED') {
        throw new Error('Reconnect Spotify to enable in-app playback.');
      }
      throw err;
    }
    // A fulfilled start request permits polling; it is not playback-progress evidence.
    if (this.destroyed) throw new Error('Spotify start was cancelled.');
    if (this.autoplayBlocked)
      throw new Error(
        'Spotify playback was blocked by this browser. Enable Spotify playback, then Retry.',
      );
    this.started = true;
  }

  async pause(): Promise<void> {
    await this.requirePlayer().pause();
  }

  /**
   * Read the SDK's current local transport state. `player_state_changed` is a
   * transition event, not a playhead timer, so its last payload becomes stale
   * during healthy playback and cannot support liveness polling.
   *
   * Silent while another adapter owns the shared transport — its state belongs
   * to the newer track, not this one. Once this adapter owns started playback,
   * a null state or a different current track means the local Web Playback SDK
   * device no longer owns the class audio (for example, another Spotify Connect
   * device took over). Reject so the observer records that as unresponsive
   * rather than exempting a real loss.
   */
  async getTransport(): Promise<TransportReading> {
    if (
      this.finishedPosition != null &&
      this.player &&
      transportOwners.get(this.player) === this &&
      !this.destroyed
    ) {
      return { positionMs: this.finishedPosition, state: 'ended' };
    }
    const reading = await this.getLiveness();
    return reading
      ? { positionMs: reading.positionMs, state: reading.playing ? 'playing' : 'paused' }
      : { positionMs: null, state: 'unknown' };
  }

  async getLiveness(): Promise<LivenessReading | null> {
    if (this.destroyed || !this.started || !this.player) return null;
    const player = this.player;
    const owner = transportOwners.get(player);
    if (owner && owner !== this) return null;
    const state = await player.getCurrentState();
    if (transportOwners.get(player) !== this) return null;
    if (!state) {
      throw new Error('Spotify Web Playback SDK device is no longer active.');
    }
    if (state.track_window.current_track?.uri !== this.uri) {
      throw new Error('Spotify Web Playback SDK is no longer playing the class track.');
    }
    if (!state.paused) {
      if (state.position > this.lastPlayingPosition) this.wasPlaying = true;
      this.lastPlayingPosition = state.position;
    }
    return { positionMs: state.position, playing: !state.paused };
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
        if (!pendingStarts.has(player)) transportOwners.delete(player);
        void player.pause().catch(() => {});
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
      player.removeListener('autoplay_failed', this.onAutoplayFailed as (p?: unknown) => void);
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
