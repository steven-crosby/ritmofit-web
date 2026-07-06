/**
 * Provider-authorized playback contracts (provider-playback-implementation.md).
 *
 * Ritmo Studio owns the class timeline, playback windows, and provider choice;
 * official provider SDKs/widgets own the actual audio stream, authorization,
 * subscription checks, and availability (music-providers.md, D13/D19). Nothing
 * in this layer may download, proxy, cache, re-host, remix, mix, crossfade,
 * beatmatch, decode, or analyze provider audio — adapters are remote controls
 * for provider-owned players, and "shortening" a track is only ever a saved
 * playback window over the untouched provider stream.
 */
import type { Provider, RunPayloadTrackEntry } from '@ritmofit/shared';

/** One track's provider ref as projected into the run-payload. */
export type RunPayloadProviderRef = RunPayloadTrackEntry['providerRefs'][number];

/**
 * The provider-time window a track plays inside: `startMs` is the clip start
 * and `endMs` is the clip start plus the effective (already clip-adjusted)
 * duration. Provider-relative milliseconds, not class-timeline milliseconds.
 */
export interface PlaybackWindow {
  startMs: number;
  endMs: number;
}

/** Resolution of `prepare()`: the adapter is cued at the window start. */
export interface PlaybackReady {
  provider: Provider;
  classTrackId: string;
}

/**
 * One provider-specific playback job. The coordinator drives adapters; adapters
 * wrap exactly one official SDK/widget (SoundCloud Widget API, MusicKit JS,
 * Spotify Web Playback SDK) and never touch audio bytes. `seek` takes
 * provider-relative milliseconds (see `providerMsAt`).
 */
export interface PlaybackAdapter {
  provider: Provider;
  prepare(entry: RunPayloadTrackEntry, window: PlaybackWindow): Promise<PlaybackReady>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(providerMs: number): Promise<void>;
  stop(): Promise<void>;
  destroy(): void;
}

/**
 * Events an adapter pushes back up to the coordinator. The class clock stays
 * the master timeline, so these are advisory: `finish` means the provider
 * stream ended before our window did (stale duration, region-shortened track),
 * which the coordinator treats as early silence — not as a timeline jump.
 */
export interface AdapterEvents {
  onFinish?(): void;
  onError?(error: { message: string }): void;
  /**
   * Provider authorization is pending on human consent — Apple Music's consent
   * sheet is open and `prepare()` is blocked on it. Advisory and provider-
   * agnostic: it lets the coordinator surface a distinct, cancellable
   * "waiting for authorization" state instead of a frozen `preparing`. Not an
   * error — the terminal outcome is still the adapter reaching `play()`
   * (→ playing) or rejecting (→ recoverable error, incl. the consent timeout).
   */
  onAwaitingAuthorization?(): void;
}

/**
 * Builds a fresh adapter wired to the coordinator's event handlers. A factory
 * per provider (not a singleton adapter) so every prepared track gets a clean
 * SDK/widget lifecycle and `destroy()` can be unconditional.
 */
export type AdapterFactory = (events: AdapterEvents) => PlaybackAdapter;

/**
 * The providers the runtime can actually drive. Partial on purpose: adapters
 * land one slice at a time (SoundCloud first), and a selected-but-unregistered
 * provider must fail loudly at runtime rather than silently skip a track.
 */
export type AdapterRegistry = Partial<Record<Provider, AdapterFactory>>;

/**
 * Why a track failed static preflight. Each maps to distinct instructor-facing
 * copy and recovery (add a provider ref / connect or reconnect a provider /
 * enter a duration), so they are separate reasons — never collapsed into one
 * generic failure.
 */
export type UnplayableReason =
  /** The track has no provider refs at all — nothing could ever play it. */
  | 'no_provider_ref'
  /** An in-app-playable provider is ref'd, but it needs a live connection and
   *  has none (e.g. Apple Music without an authorized user). Fixable by connecting. */
  | 'no_connected_provider'
  /** Refs exist, but ONLY for providers Ritmo can't play in-app yet (e.g. a
   *  Spotify-only track — no adapter). Fixable by cross-provider resolution
   *  (find the same song on a playable provider), not by connecting. */
  | 'provider_not_playable'
  /** No effective duration, so the playback window is empty and auto-advance
   *  has no end to stop at. Live Mode tolerates these as zero-width timeline
   *  entries; hands-free playback cannot. */
  | 'missing_duration';

/** The provider decision for one track: a concrete playable job, or why not. */
export type ProviderSelection =
  | { status: 'playable'; provider: Provider; ref: RunPayloadProviderRef }
  | { status: 'unplayable'; reason: UnplayableReason };

/**
 * Static preflight verdict for one track — connection/ref/duration checks only.
 * Runtime checks that need a live SDK (subscription level, region availability,
 * SDK load) come later in the adapter slices and layer on top of this.
 */
export interface PreflightTrackResult {
  classTrackId: string;
  /** 0-based class position + title so preflight UI can say exactly which track. */
  position: number;
  title: string;
  selection: ProviderSelection;
  window: PlaybackWindow;
}

/** Whole-class static preflight: playable only when every track is. */
export interface PreflightResult {
  ok: boolean;
  tracks: PreflightTrackResult[];
  /** The failing subset, in class order — what the preflight screen lists. */
  unplayable: PreflightTrackResult[];
}
