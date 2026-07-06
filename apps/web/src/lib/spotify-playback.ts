/**
 * Spotify Web Playback SDK (`https://sdk.scdn.co/spotify-player.js`) loader +
 * page-singleton manager, plus the Connect Web API transport calls.
 *
 * Ritmo Studio owns the class timeline; Spotify owns the audio stream, the
 * subscriber authorization (Premium), and catalog availability (music-providers.md,
 * D19). Nothing here downloads, proxies, caches, decodes, or analyses audio, and
 * the access token is used ONLY to authorize the SDK + start/seek/pause a track —
 * never for catalog lookups or BPM.
 *
 * The SDK is loaded on demand (only when Spotify playback starts) so the
 * third-party script never runs for users who don't play Spotify. The SDK builds
 * ONE browser "device" (a `Spotify.Player`); every track's adapter reuses that
 * singleton, mirroring the MusicKit posture. The player's `getOAuthToken` callback
 * pulls a short-lived token from `GET /providers/spotify/playback-token`; the token
 * lives in memory only, never logged or persisted (AGENTS.md).
 *
 * RUNTIME-UNVERIFIED in CI: a real device + Premium subscriber is required, so the
 * live handshake is exercised by live verification, not the headless suite. The
 * adapter drives this behind host seams so its logic is unit-tested with a fake SDK.
 */
import type { SpotifyPlaybackToken } from '@ritmofit/shared';
import { getSpotifyPlaybackToken } from './api.js';

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js';
const PLAYER_NAME = 'Ritmo Studio';
const SPOTIFY_API = 'https://api.spotify.com/v1';

/** The Web Playback SDK player state slice the adapter reads (SDK ms units). */
export interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: { id: string | null; uri: string } | null };
}

export type SpotifyPlayerEvent =
  | 'ready'
  | 'not_ready'
  | 'player_state_changed'
  | 'initialization_error'
  | 'authentication_error'
  | 'account_error'
  | 'playback_error';

/** The slice of `Spotify.Player` Ritmo Studio drives (official SDK shape). */
export interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  addListener(event: 'ready' | 'not_ready', cb: (payload: { device_id: string }) => void): void;
  addListener(event: 'player_state_changed', cb: (state: SpotifyPlayerState | null) => void): void;
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
    cb: (payload: { message: string }) => void,
  ): void;
  /**
   * Remove a listener. A `cb` removes only that handler; omitting it removes all
   * for the event. The player is a page singleton shared across every track's
   * adapter, so teardown MUST pass the specific handler or it would silence the
   * other adapters' listeners too.
   */
  removeListener(event: SpotifyPlayerEvent, cb?: (payload?: unknown) => void): void;
}

export interface SpotifyPlayerConstructorOptions {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}

export interface SpotifyNamespace {
  Player: new (options: SpotifyPlayerConstructorOptions) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifyNamespace;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let sdkPromise: Promise<SpotifyNamespace> | null = null;

/**
 * Inject the Web Playback SDK script once per page and resolve when its global is
 * ready. The SDK signals readiness by invoking `window.onSpotifyWebPlaybackSDKReady`.
 * A load failure resets the cached promise so a flaky network can retry.
 */
export function loadSpotifySdk(): Promise<SpotifyNamespace> {
  if (window.Spotify) return Promise.resolve(window.Spotify);
  sdkPromise ??= new Promise<SpotifyNamespace>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      if (window.Spotify) resolve(window.Spotify);
      else {
        sdkPromise = null;
        reject(new Error('Spotify player script loaded without the Web Playback SDK.'));
      }
    };
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error('The Spotify player failed to load.'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** A connected Spotify device: the singleton player + the id the Web API targets. */
export interface SpotifyPlayback {
  player: SpotifyPlayer;
  deviceId: string;
}

/** Test seams: SDK loading, token fetch, the connect timeout, and Web API fetch. */
export interface SpotifyPlaybackHost {
  loadSdk?: () => Promise<SpotifyNamespace>;
  getToken?: () => Promise<SpotifyPlaybackToken>;
  fetchImpl?: typeof fetch;
  connectTimeoutMs?: number;
}

const DEFAULT_CONNECT_TIMEOUT_MS = 20_000;

let playbackPromise: Promise<SpotifyPlayback> | null = null;

/**
 * Build + connect the page-singleton Spotify device once, resolving with its
 * `device_id` when the SDK fires `ready`. Reused by every track's adapter. A
 * connect that never readies (bad token, non-Premium, blocked SDK) rejects after a
 * timeout so `prepare()` surfaces it instead of hanging the class. A failure resets
 * the cache so a later attempt (e.g. after a reconnect) can rebuild the device.
 */
export function getSpotifyPlayback(host: SpotifyPlaybackHost = {}): Promise<SpotifyPlayback> {
  if (playbackPromise) return playbackPromise;
  const getToken = host.getToken ?? getSpotifyPlaybackToken;
  playbackPromise = (async () => {
    const sdk = await (host.loadSdk ?? loadSpotifySdk)();
    const player = new sdk.Player({
      name: PLAYER_NAME,
      getOAuthToken: (cb) => {
        // The SDK calls this on connect and again near each token expiry.
        void getToken()
          .then((t) => cb(t.accessToken))
          .catch(() => {
            // Swallow: a token failure surfaces to the adapter as the SDK's
            // authentication_error, which maps to a reconnect-flavored onError.
          });
      },
    });

    const deviceId = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('The Spotify player timed out connecting.'));
      }, host.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS);
      player.addListener('ready', ({ device_id }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(device_id);
      });
      player.addListener('initialization_error', ({ message }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(message || 'Spotify player failed to initialize.'));
      });
      void player.connect().then((ok) => {
        if (!ok && !settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error('The Spotify player could not connect (Premium required).'));
        }
      });
    });

    return { player, deviceId };
  })();

  // Reset the cache on failure so the next prepare can rebuild the device.
  playbackPromise.catch(() => {
    playbackPromise = null;
  });
  return playbackPromise;
}

/** Drop the cached singleton device — used by tests and after a hard teardown. */
export function resetSpotifyPlayback(): void {
  playbackPromise = null;
}

/**
 * Start a specific catalog track on our device via the Connect Web API — the SDK
 * has no "load a track" method, so selection goes through
 * `PUT /me/player/play?device_id=…` with the track uri + clip position. Transport
 * after start (pause/resume/seek) uses the SDK player methods directly.
 */
export async function startSpotifyTrack(args: {
  deviceId: string;
  uri: string;
  positionMs: number;
  host?: SpotifyPlaybackHost;
}): Promise<void> {
  const getToken = args.host?.getToken ?? getSpotifyPlaybackToken;
  const fetchImpl = args.host?.fetchImpl ?? fetch;
  const { accessToken } = await getToken();
  const res = await fetchImpl(
    `${SPOTIFY_API}/me/player/play?device_id=${encodeURIComponent(args.deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [args.uri],
        position_ms: Math.max(0, Math.round(args.positionMs)),
      }),
    },
  );
  // 202/204 are the documented success codes; anything else is a real failure.
  if (!res.ok && res.status !== 202 && res.status !== 204) {
    throw new Error(`Spotify could not start the track (${res.status}).`);
  }
}
