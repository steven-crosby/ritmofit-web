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
