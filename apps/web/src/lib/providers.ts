/**
 * Music-provider presentation helpers (design system `09`: SoundCloud is a
 * first-class provider, not an afterthought — so it's the default). The provider
 * *values* are the shared enum (`providerValues`); this only adds display labels
 * and the order/default the builder's search UI shows. No new contract.
 */
import {
  playbackRequiresConnection,
  providerValues,
  supportsUserAccount,
  type Provider,
} from '@ritmofit/shared';

/** Human label per provider (the enum values are snake/lowercase). */
export const PROVIDER_LABELS: Record<Provider, string> = {
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
};

/** SoundCloud first (09: "stronger SoundCloud support — a first-class provider"). */
export const PROVIDER_ORDER: Provider[] = ['soundcloud', 'spotify', 'apple_music'];

/** The provider the search box opens on. */
export const DEFAULT_PROVIDER: Provider = 'soundcloud';

/** Label for a provider, falling back to the raw value if ever unknown. */
export function providerLabel(provider: Provider): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/**
 * Return a provider handoff target only when it matches the URI shape that
 * provider supplies. Provider refs may include old/manual data, so Live mode
 * must not turn an arbitrary stored string into a clickable external link.
 */
export function providerHandoffHref(provider: Provider, providerUri: string | null): string | null {
  if (!providerUri) return null;
  const uri = providerUri.trim();
  if (!uri) return null;

  if (provider === 'spotify' && /^spotify:track:[A-Za-z0-9]+$/.test(uri)) {
    return uri;
  }

  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  if (provider === 'spotify') {
    return url.hostname === 'open.spotify.com' && /^\/track\/[A-Za-z0-9]+\/?$/.test(url.pathname)
      ? url.href
      : null;
  }
  if (provider === 'apple_music') {
    return url.hostname === 'music.apple.com' ? url.href : null;
  }
  return url.hostname === 'soundcloud.com' || url.hostname === 'www.soundcloud.com'
    ? url.href
    : null;
}

/** Validate provider-owned playlist permalinks before rendering attribution links. */
export function providerPlaylistHref(
  provider: Provider,
  providerUri: string | null | undefined,
): string | null {
  if (!providerUri) return null;
  let url: URL;
  try {
    url = new URL(providerUri.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (provider === 'spotify') {
    return url.hostname === 'open.spotify.com' && /^\/playlist\/[A-Za-z0-9]+\/?$/.test(url.pathname)
      ? url.href
      : null;
  }
  if (provider === 'apple_music') return url.hostname === 'music.apple.com' ? url.href : null;
  return url.hostname === 'soundcloud.com' || url.hostname === 'www.soundcloud.com'
    ? url.href
    : null;
}

/** Defensive: every shared provider value has a label + a place in the order. */
export const ALL_PROVIDERS_LABELLED = providerValues.every((p) => p in PROVIDER_LABELS);

/**
 * Provider connection state for the explicit, never-color-only status indicator
 * (design system 05/11). The canonical model has six states; only these four are
 * derivable from `MusicConnectionView` (provider + `expiresAt`), so the others
 * (`reconnecting` — a transient UI state during the connect flow — plus
 * `permission` and `provider-error`) are surfaced by the component or left as
 * documented TODOs rather than invented from data we don't have.
 */
export type ProviderConnectionState = 'connected' | 'expired' | 'disconnected' | 'catalog-only';

/**
 * Derive the connection state. `catalog-only` providers have no per-user account
 * integration; a connection whose `expiresAt` has passed is `expired` (re-auth
 * needed); a present, unexpired connection is `connected`; everything else is
 * `disconnected`. `now` is injected so the mapping is pure and unit-testable.
 */
export function providerConnectionState(
  provider: Provider,
  connection: { expiresAt: number | null } | undefined,
  now: number,
): ProviderConnectionState {
  if (!supportsUserAccount(provider)) return 'catalog-only';
  if (!connection) return 'disconnected';
  if (connection.expiresAt != null && connection.expiresAt <= now) return 'expired';
  return 'connected';
}

/**
 * Spotify connections created before playback launched only granted
 * `user-library-read`. Playback needs `streaming`, so the web selector can
 * distinguish "reconnect Spotify for playback" from "connect Spotify".
 */
export function spotifyScopeHasPlayback(scope: string | null | undefined): boolean {
  if (!scope) return false;
  const scopes = scope.split(/\s+/).filter(Boolean);
  return scopes.includes('streaming') || scopes.includes('mock');
}

/** Whether this live connection is authorized for in-app playback. */
export function connectionHasPlaybackScope(
  provider: Provider,
  connection: { scope: string | null } | undefined,
): boolean {
  if (provider !== 'spotify') return true;
  return spotifyScopeHasPlayback(connection?.scope);
}

/**
 * Spotify connections created before saved-playlist browse launched only granted
 * the pre-expansion scope set, without `playlist-read-private`. The dev mock seam
 * stores `scope: 'mock'`, which is always browse-capable.
 */
export function spotifyScopeHasSavedPlaylists(scope: string | null | undefined): boolean {
  if (!scope) return false;
  const scopes = scope.split(/\s+/).filter(Boolean);
  return scopes.includes('playlist-read-private') || scopes.includes('mock');
}

/** Whether this live connection is authorized to browse saved playlists. */
export function connectionHasSavedPlaylistScope(
  provider: Provider,
  connection: { scope: string | null } | undefined,
): boolean {
  if (provider !== 'spotify') return true;
  return spotifyScopeHasSavedPlaylists(connection?.scope);
}

export type ProviderCapabilityState =
  | 'ready'
  | 'partial'
  | 'action-required'
  | 'checking'
  | 'unverified';

export type ProviderCapabilityFreshness = 'verified' | 'checking' | 'unverified';

export interface ProviderCapabilityView {
  state: ProviderCapabilityState;
  label: string;
}

export interface ProviderCapabilityTruth {
  connectionState: ProviderConnectionState;
  freshness: ProviderCapabilityFreshness;
  catalog: ProviderCapabilityView;
  library: ProviderCapabilityView;
  playback: ProviderCapabilityView;
}

/**
 * Translate provider/auth data into the three capabilities instructors actually
 * use. A failed status refresh never becomes a fake disconnect: account-backed
 * capabilities are marked unverified while catalog search (and SoundCloud's
 * public widget playback) retain their independently known availability.
 */
export function providerCapabilityTruth(
  provider: Provider,
  connection: { expiresAt: number | null; scope: string | null } | undefined,
  now: number,
  freshness: ProviderCapabilityFreshness = 'verified',
): ProviderCapabilityTruth {
  const connectionState = providerConnectionState(provider, connection, now);
  const catalog: ProviderCapabilityView = { state: 'ready', label: 'Browse catalog' };

  let library: ProviderCapabilityView;
  if (freshness === 'checking') {
    library = { state: 'checking', label: 'Checking account' };
  } else if (freshness === 'unverified') {
    library = {
      state: 'unverified',
      label: connection ? 'Last known linked' : 'Status unavailable',
    };
  } else if (connectionState === 'connected') {
    library = connectionHasSavedPlaylistScope(provider, connection)
      ? { state: 'ready', label: 'Likes & playlists ready' }
      : { state: 'partial', label: 'Likes ready · reconnect playlists' };
  } else if (connectionState === 'expired') {
    library = { state: 'action-required', label: 'Reconnect account' };
  } else {
    library = { state: 'action-required', label: 'Connect account' };
  }

  let playback: ProviderCapabilityView;
  if (!playbackRequiresConnection(provider)) {
    playback = { state: 'ready', label: 'Public widget ready' };
  } else if (freshness === 'checking') {
    playback = { state: 'checking', label: 'Checking authorization' };
  } else if (freshness === 'unverified') {
    playback = {
      state: 'unverified',
      label: connection ? 'Authorization unverified' : 'Status unavailable',
    };
  } else if (connectionState === 'connected' && connectionHasPlaybackScope(provider, connection)) {
    playback = { state: 'ready', label: 'Authorized' };
  } else if (connectionState === 'connected' || connectionState === 'expired') {
    playback = { state: 'action-required', label: 'Reconnect for playback' };
  } else {
    playback = { state: 'action-required', label: 'Connect account' };
  }

  return { connectionState, freshness, catalog, library, playback };
}
