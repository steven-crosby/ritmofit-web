/**
 * The provider abstraction (M2). One interface every music provider implements,
 * returning the shared `TrackSearchResult` contract — the same shape the M1
 * dev-only mock seam emits, so a real provider drops in behind it unchanged.
 *
 * Providers are **pure adapters**: provider HTTP/SDK → contract DTO. They do not
 * touch the database, Hono, or app auth — `apps/api` owns persistence and routing.
 * The three music constraints still apply (music-providers.md): we surface
 * references + our own metadata, never audio, never provider-sourced BPM.
 */
import type { Provider, TrackSearchResult } from '@ritmofit/shared';

/**
 * Provider-specific reference to a **public** playlist, parsed from a pasted URL
 * (`parsePlaylistUrl`). Each provider needs different data to fetch it: Spotify a
 * playlist id, SoundCloud the permalink URL (resolved to a URN via `/resolve`),
 * Apple Music a catalog playlist id plus the storefront from the URL path.
 */
export type PlaylistImportRef =
  | { provider: 'spotify'; playlistId: string }
  | { provider: 'soundcloud'; permalinkUrl: string }
  | { provider: 'apple_music'; storefront: string; playlistId: string };

export interface MusicProvider {
  /** Which provider this adapter speaks for. */
  readonly provider: Provider;

  /** Free-text search → contract candidates. Empty/whitespace query may return []. */
  search(query: string): Promise<TrackSearchResult[]>;

  /**
   * Resolve a single candidate by its provider track id (for import). Returns
   * null when the provider has no such track (→ the route maps that to 404).
   */
  lookup(providerTrackId: string): Promise<TrackSearchResult | null>;

  /**
   * Fetch a public playlist's tracks with app-level credentials, from a parsed
   * playlist-URL reference. Returns [] when the playlist doesn't exist (or the
   * reference isn't a playlist) — the route maps that to a 400.
   */
  getPlaylist(ref: PlaylistImportRef): Promise<TrackSearchResult[]>;
}

/**
 * Minimal structural `fetch` so this package needs no DOM/Workers ambient types.
 * `apps/api` passes the Workers global `fetch`, which is assignable to this.
 */
export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    /** SoundCloud `/resolve` replies 302; `manual` lets the adapter read the
     *  `Location` and re-request it with auth (some fetch stacks strip the
     *  `Authorization` header when auto-following a redirect). */
    redirect?: 'follow' | 'manual';
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
  /** Present on a real `fetch` Response; optional so a test fake can omit it. Used
   *  by the retry helper to honor a `Retry-After` header on 429/503. */
  headers?: { get(name: string): string | null };
}>;
