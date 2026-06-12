/**
 * Third-party BPM provider (M2, optional) — populate `tracks.display_bpm` from a
 * dedicated BPM service, NOT from a streaming provider.
 *
 * Hard constraint (music-providers.md): **never read BPM from Spotify** (tempo
 * endpoint deprecated for new apps, Nov 2024). A purpose-built BPM database is the
 * allowed path. This adapter targets GetSongBPM (getsongbpm.com), which exposes a
 * free song/tempo lookup; the provider is pluggable so a different verified service
 * can drop in behind the same `BpmProvider` interface.
 *
 * Pure adapter: provider HTTP → a plain BPM integer (or null when unknown). Network
 * is injectable (`fetchImpl`) so the mapping is unit-tested with no live calls.
 * `apps/api` owns persistence (writing display_bpm) and the mock fallback. Re-verify
 * the endpoint/terms before enabling against real credentials.
 */
import { z } from 'zod';
import type { FetchLike } from './provider.js';

// GetSongBPM's documented API host (getsongbpm.com/api). `type=both` with a
// `lookup=song:… artist:…` term is the combined song+artist search.
const DEFAULT_API_BASE = 'https://api.getsong.co';

export interface BpmQuery {
  title: string;
  artist: string;
}

/** One BPM lookup → an integer tempo, or null when the service has no confident match. */
export interface BpmProvider {
  lookup(query: BpmQuery): Promise<number | null>;
}

export interface GetSongBpmConfig {
  apiKey: string;
  fetchImpl: FetchLike;
  apiBase?: string;
}

/** GetSongBPM search response (permissive — we read only tempo off the best match). */
const responseSchema = z.object({
  search: z
    .union([
      z.array(z.object({ tempo: z.union([z.string(), z.number()]).optional() })),
      z.object({ error: z.string() }), // "no result" comes back as an object
    ])
    .optional(),
});

export function createGetSongBpmProvider(config: GetSongBpmConfig): BpmProvider {
  const apiBase = config.apiBase ?? DEFAULT_API_BASE;
  return {
    async lookup({ title, artist }) {
      const term = `song:${title} artist:${artist}`;
      const url = `${apiBase}/search/?api_key=${encodeURIComponent(config.apiKey)}&type=both&lookup=${encodeURIComponent(term)}`;
      const res = await config.fetchImpl(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`BPM lookup failed: ${res.status}`);
      const parsed = responseSchema.safeParse(await res.json());
      if (!parsed.success) return null;
      const search = parsed.data.search;
      if (!Array.isArray(search)) return null; // error object → no match
      const tempo = search.find((s) => s.tempo != null)?.tempo;
      return normalizeBpm(tempo);
    },
  };
}

/** Coerce a provider tempo to a sane integer BPM, or null if implausible/absent. */
export function normalizeBpm(raw: string | number | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (!Number.isFinite(n)) return null;
  const bpm = Math.round(n);
  // Spin tracks live well inside this range; reject obvious garbage.
  return bpm >= 30 && bpm <= 300 ? bpm : null;
}
