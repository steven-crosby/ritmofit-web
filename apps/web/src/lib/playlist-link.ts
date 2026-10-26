/**
 * Paste-a-link presentation. Catalog search still opens on SoundCloud
 * (`DEFAULT_PROVIDER`); the paste field does not. Import sends the raw URL and
 * the API classifies it, so the selected chip is only a hint.
 */
import type { Provider } from '@ritmofit/shared';

export const PLAYLIST_LINK_PLACEHOLDER =
  'Paste a Spotify, Apple Music, or SoundCloud playlist link';

function isHost(hostname: string, base: string): boolean {
  return hostname === base || hostname.endsWith(`.${base}`);
}

/**
 * Provider implied by a pasted playlist link, or null when the text is not a
 * recognizable Spotify, Apple Music, or SoundCloud URL. Host-only: the API
 * still decides whether the path is an importable playlist.
 */
export function playlistProviderFromUrl(value: string): Provider | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (isHost(host, 'spotify.com')) return 'spotify';
  if (host === 'music.apple.com') return 'apple_music';
  if (isHost(host, 'soundcloud.com')) return 'soundcloud';
  return null;
}

/**
 * Same sentence the import route returns for a link it will not send to a
 * provider (`BAD_REQUEST`). A wrong Spotify id shape is that case, caught
 * here so the paste never becomes a provider-outage response.
 */
export const UNSUPPORTED_PLAYLIST_URL =
  'Unsupported playlist URL. Paste a public Spotify, SoundCloud, or Apple Music playlist link.';

const SPOTIFY_BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SPOTIFY_ID_LIMIT = (1n << 128n) - 1n;

/**
 * Spotify resource ids are 22 base62 characters encoding a 128-bit value.
 * A 22-character alphanumeric string can still overflow that width.
 */
export function isSpotifyResourceId(id: string): boolean {
  if (id.length !== 22) return false;
  let value = 0n;
  for (const char of id) {
    const digit = SPOTIFY_BASE62.indexOf(char);
    if (digit < 0) return false;
    value = value * 62n + BigInt(digit);
    if (value > SPOTIFY_ID_LIMIT) return false;
  }
  return true;
}

/**
 * When a pasted Spotify playlist link has an id that cannot be a Spotify id,
 * return the unsupported-link sentence. Other text, including a well-shaped
 * Spotify id, returns null so the import request still decides.
 */
export function spotifyPlaylistLinkError(value: string): string | null {
  const trimmed = value.trim();
  if (playlistProviderFromUrl(trimmed) !== 'spotify') return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const segments = url.pathname.split('/').filter((segment) => segment !== '');
  const playlistAt = segments.indexOf('playlist');
  if (playlistAt === -1) return null;
  const id = segments[playlistAt + 1];
  if (id && isSpotifyResourceId(id)) return null;
  return UNSUPPORTED_PLAYLIST_URL;
}
