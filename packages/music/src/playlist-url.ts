/**
 * Classify a pasted playlist URL into a provider-specific import reference
 * (`POST /classes/:id/import-playlist`). Pure string → union, no network — the
 * adapters own the actual fetching. Verified against provider docs 2026-07-11:
 *
 * - Spotify: `open.spotify.com/playlist/{id}` — id passed straight to the API.
 * - SoundCloud: `soundcloud.com/{user}/sets/{slug}` playlist permalinks, plus
 *   opaque `on.soundcloud.com/{code}` short links. Both go through the API's
 *   `/resolve`, so the ref carries the permalink URL itself; short links can
 *   point at any resource kind, which the adapter checks after resolving.
 * - Apple Music: `music.apple.com/{storefront}/playlist/{slug}/pl.…` catalog
 *   playlists (including shared user playlists, `pl.u-…`) work with the
 *   developer token alone. `…/library/playlist/p.…` links are the owner's
 *   private library and need a Music-User-Token — recognized here as
 *   `apple_library` so the route can explain instead of failing opaquely.
 */
import type { PlaylistImportRef } from './provider.js';

// `URL` is available in the Workers runtime and Node ≥18 (vitest). Declared here
// so the package needs no DOM/Workers ambient lib (same pattern as `btoa` in
// app-token.ts). Only the members this module reads are declared.
declare const URL: new (input: string) => {
  protocol: string;
  hostname: string;
  pathname: string;
};

export type ParsedPlaylistUrl =
  | { kind: 'importable'; ref: PlaylistImportRef }
  | { kind: 'apple_library' }
  | { kind: 'unsupported' };

const UNSUPPORTED: ParsedPlaylistUrl = { kind: 'unsupported' };

function isHost(hostname: string, base: string): boolean {
  return hostname === base || hostname.endsWith(`.${base}`);
}

export function parsePlaylistUrl(url: string): ParsedPlaylistUrl {
  let parsed: InstanceType<typeof URL>;
  try {
    parsed = new URL(url);
  } catch {
    return UNSUPPORTED;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return UNSUPPORTED;
  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split('/').filter((s) => s !== '');

  if (isHost(host, 'spotify.com')) {
    const idx = segments.indexOf('playlist');
    const playlistId = idx !== -1 ? segments[idx + 1] : undefined;
    if (!playlistId) return UNSUPPORTED;
    return { kind: 'importable', ref: { provider: 'spotify', playlistId } };
  }

  if (host === 'on.soundcloud.com') {
    // Opaque short code — only /resolve can tell what it points at.
    if (segments.length === 0) return UNSUPPORTED;
    return { kind: 'importable', ref: { provider: 'soundcloud', permalinkUrl: url } };
  }

  if (isHost(host, 'soundcloud.com')) {
    // Playlist permalinks are /{user}/sets/{slug}; anything else (a track, a
    // profile) is rejected here so the user gets "unsupported", not "not found".
    if (segments.length < 3 || segments[1] !== 'sets') return UNSUPPORTED;
    return { kind: 'importable', ref: { provider: 'soundcloud', permalinkUrl: url } };
  }

  if (host === 'music.apple.com') {
    if (segments.includes('library')) return { kind: 'apple_library' };
    const idx = segments.indexOf('playlist');
    if (idx === -1) return UNSUPPORTED;
    // The id is the last segment: catalog `pl.…` (incl. shared-user `pl.u-…`);
    // a bare `p.…` id is a library playlist even without /library/ in the path.
    const id = segments[segments.length - 1];
    if (!id) return UNSUPPORTED;
    if (id.startsWith('p.')) return { kind: 'apple_library' };
    if (!id.startsWith('pl.')) return UNSUPPORTED;
    const first = segments[0];
    const storefront = idx > 0 && first && /^[a-z]{2}$/i.test(first) ? first.toLowerCase() : 'us';
    return { kind: 'importable', ref: { provider: 'apple_music', storefront, playlistId: id } };
  }

  return UNSUPPORTED;
}
