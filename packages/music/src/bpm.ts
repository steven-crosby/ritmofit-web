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
import { readJson } from './errors.js';

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

/**
 * GetSongBPM search response (permissive). We capture the title/artist alongside
 * the tempo so a result can be confirmed to be the song we asked for — search can
 * return many songs for a common title, and the first row is often a cover/remix.
 */
const resultSchema = z.object({
  tempo: z.union([z.string(), z.number()]).optional(),
  song_title: z.string().optional(),
  // GetSongBPM nests the artist as an object; tolerate a bare string too.
  artist: z.union([z.object({ name: z.string().optional() }), z.string()]).optional(),
});
type BpmResult = z.infer<typeof resultSchema>;
const responseSchema = z.object({
  search: z
    .union([
      z.array(resultSchema),
      z.object({ error: z.string() }), // "no result" comes back as an object
    ])
    .optional(),
});

/** Lowercase + alphanumeric-only, for a tolerant title/artist comparison. */
function loosely(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resultArtist(r: BpmResult): string {
  if (r.artist == null) return '';
  return typeof r.artist === 'string' ? r.artist : (r.artist.name ?? '');
}

export function createGetSongBpmProvider(config: GetSongBpmConfig): BpmProvider {
  const apiBase = config.apiBase ?? DEFAULT_API_BASE;
  return {
    async lookup({ title, artist }) {
      const term = `song:${title} artist:${artist}`;
      const url = `${apiBase}/search/?api_key=${encodeURIComponent(config.apiKey)}&type=both&lookup=${encodeURIComponent(term)}`;
      const res = await config.fetchImpl(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`BPM lookup failed: ${res.status}`);
      const parsed = responseSchema.safeParse(await readJson(res, 'getsongbpm'));
      if (!parsed.success) return null;
      const search = parsed.data.search;
      if (!Array.isArray(search)) return null; // error object → no match

      // Only trust a result whose title actually matches what we searched for —
      // a wrong-song tempo is worse than no tempo (it misleads the choreography).
      const wantTitle = loosely(title);
      const wantArtist = loosely(artist);
      const titleMatches = search.filter((s) => s.song_title && loosely(s.song_title) === wantTitle);
      if (titleMatches.length === 0) return null;
      // Prefer a row whose artist also matches; otherwise accept a unique title hit.
      const best =
        titleMatches.find((s) => loosely(resultArtist(s)) === wantArtist) ??
        (titleMatches.length === 1 ? titleMatches[0] : undefined);
      return best ? normalizeBpm(best.tempo) : null;
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
