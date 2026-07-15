/**
 * @ritmofit/music — provider adapters (M2).
 *
 * Pure provider→contract adapters behind one `MusicProvider` interface. The app
 * (`apps/api`) selects an adapter per request and owns persistence; this package
 * never touches the DB or app auth. SoundCloud is first (music-providers.md).
 */
export type { MusicProvider, FetchLike, PlaylistImportRef } from './provider.js';
export { providerTrackIdAliases } from './identity.js';
export { parsePlaylistUrl, type ParsedPlaylistUrl } from './playlist-url.js';
export { ProviderError } from './errors.js';
export {
  createSoundCloudProvider,
  fetchSoundCloudLikes,
  fetchSoundCloudPlaylists,
  fetchSoundCloudPlaylistTracks,
  SoundCloudUnauthorizedError,
  type SoundCloudConfig,
} from './soundcloud.js';
export {
  buildSoundCloudAuthorizeUrl,
  exchangeSoundCloudCode,
  refreshSoundCloudToken,
  type OAuthTokens,
} from './soundcloud-oauth.js';
export {
  createSpotifyProvider,
  fetchSpotifySavedTracks,
  fetchSpotifySavedPlaylists,
  fetchSpotifyPlaylistTracks,
  SpotifyUnauthorizedError,
  SpotifyForbiddenError,
  SpotifyPlaylistAccessDeniedError,
  type SpotifyConfig,
} from './spotify.js';
export {
  buildSpotifyAuthorizeUrl,
  exchangeSpotifyCode,
  refreshSpotifyToken,
  spotifyScopeHasPlayback,
  spotifyScopeHasSavedPlaylists,
  SPOTIFY_CONNECT_SCOPE,
} from './spotify-oauth.js';
export {
  createAppleMusicProvider,
  fetchAppleMusicLibrarySongs,
  fetchAppleMusicLibraryPlaylists,
  fetchAppleMusicLibraryPlaylistTracks,
  AppleMusicUnauthorizedError,
  type AppleMusicConfig,
} from './apple-music.js';
export {
  createGetSongBpmProvider,
  normalizeBpm,
  type BpmProvider,
  type BpmQuery,
  type GetSongBpmConfig,
} from './bpm.js';
export {
  fetchWithRetry,
  isTransientStatus,
  parseRetryAfterMs,
  type RetryOptions,
} from './retry.js';
