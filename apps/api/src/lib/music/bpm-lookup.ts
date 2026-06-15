/**
 * BPM lookup orchestration (M2, optional) — resolve a track's tempo from a
 * dedicated third-party BPM service and persist it to `tracks.display_bpm`.
 *
 * Never from Spotify (music-providers.md). With `MOCK_PROVIDERS=true` a
 * deterministic spin-friendly BPM stands in so the flow runs with zero creds, like
 * the rest of M2; otherwise the live GetSongBPM adapter runs when its key is set,
 * else the provider reports unavailable. The pure adapter lives in
 * `@ritmofit/music`; this owns env selection + persistence.
 */
import { eq } from 'drizzle-orm';
import { createGetSongBpmProvider, type BpmQuery } from '@ritmofit/music';
import type { Db } from '../db.js';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { boundFetch } from '../fetch.js';
import { tracks } from '../../db/schema.js';

/**
 * Deterministic mock BPM in a spin-friendly band (120–160) derived from the
 * title+artist, so the same track always resolves the same tempo without a key.
 */
export function mockBpm(query: BpmQuery): number {
  const seed = [...`${query.title}|${query.artist}`].reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0,
    7,
  );
  return 120 + (seed % 41);
}

/** Resolve a tempo for a query: mock seam, else live provider, else 503. */
export async function resolveBpm(env: Env, query: BpmQuery): Promise<number | null> {
  if (env.MOCK_PROVIDERS === 'true') return mockBpm(query);
  if (!env.GETSONGBPM_API_KEY) {
    throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'BPM lookup is not configured.');
  }
  const provider = createGetSongBpmProvider({
    apiKey: env.GETSONGBPM_API_KEY,
    fetchImpl: boundFetch,
  });
  return provider.lookup(query);
}

/**
 * Look up and persist the BPM for a track the caller owns. Returns the resolved
 * BPM (and whether it was applied); a null result leaves `display_bpm` unchanged.
 */
export async function lookupAndApplyBpm(
  db: Db,
  env: Env,
  ownerUserId: string,
  trackId: string,
): Promise<{ displayBpm: number | null; applied: boolean }> {
  const track = await db.select().from(tracks).where(eq(tracks.id, trackId)).get();
  if (!track || track.ownerUserId !== ownerUserId) {
    throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  }
  const bpm = await resolveBpm(env, { title: track.title, artist: track.artist });
  if (bpm === null) return { displayBpm: track.displayBpm, applied: false };
  await db
    .update(tracks)
    .set({ displayBpm: bpm, updatedAt: Date.now() })
    .where(eq(tracks.id, trackId));
  return { displayBpm: bpm, applied: true };
}
