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

  /** Fetch tracks from a playlist. */
  getPlaylist(playlistId: string): Promise<TrackSearchResult[]>;
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
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;
