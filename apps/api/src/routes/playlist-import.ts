import { Hono } from 'hono';
import { importPlaylistSchema, MAX_PLAYLIST_IMPORT_TRACKS } from '@ritmofit/shared';
import { parsePlaylistUrl } from '@ritmofit/music';
import { requireSession } from '../middleware/auth.js';
import { requireAccess } from '../lib/authz.js';
import { rateLimit } from '../lib/rate-limit.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { getMusicProvider } from '../lib/music/registry.js';
import { partitionSettledImports } from '../lib/music/import-playlist.js';
import { importTrackFromCandidate } from '../lib/track-import.js';
import { makeMatchKey } from '../lib/same-song.js';
import { classTracks } from '../db/schema.js';
import { resequence } from '../lib/sequencing.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../lib/types.js';

export const playlistImportRoutes = new Hono<AppEnv>();
playlistImportRoutes.use('*', requireSession);

// Playlist import fans out one upstream lookup + import per distinct track, so it's
// the most expensive provider route — cap it tightly per user.
const importLimiter = rateLimit({
  keyPrefix: 'playlist-import',
  windowMs: 60_000,
  max: 5,
  key: (c) => c.get('userId'),
});

playlistImportRoutes.post('/classes/:id/import-playlist', importLimiter, async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  const me = c.get('userId');
  await requireAccess(db, me, classId, 'edit');

  const { url } = importPlaylistSchema.parse(await c.req.json());
  const parsed = parsePlaylistUrl(url);
  if (parsed.kind === 'apple_library') {
    // Library playlists need the owner's Music-User-Token, which a pasted link
    // can never carry — that case is served by saved-playlist browsing instead.
    throw new HttpError(
      400,
      'BAD_REQUEST',
      'Apple Music library playlist links can’t be imported by URL. ' +
        'Paste a public catalog playlist link, or use saved-playlist browsing.',
    );
  }
  if (parsed.kind !== 'importable') {
    throw new HttpError(
      400,
      'BAD_REQUEST',
      'Unsupported playlist URL. Paste a public Spotify, SoundCloud, or Apple Music playlist link.',
    );
  }

  const adapter = await getMusicProvider(parsed.ref.provider, c.env);
  const candidates = await adapter.getPlaylist(parsed.ref);

  if (!candidates.length) {
    throw new HttpError(400, 'BAD_REQUEST', 'Playlist not found or is empty.');
  }

  const existing = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .all();

  // Collapse same-song candidates by match key. importTrackFromCandidate already
  // merges same-song imports in the library, so duplicates would only add work (or
  // race when resolved concurrently); deduping first leaves distinct songs whose
  // per-library dedup touches disjoint match-key buckets and is safe in parallel.
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((cand) => {
    const key = makeMatchKey(cand.title, cand.artist);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Bound the per-request fan-out (upstream lookups + D1 writes). A playlist with
  // more distinct songs than the cap is rejected rather than silently truncated, so
  // the instructor knows the class wasn't fully imported.
  if (uniqueCandidates.length > MAX_PLAYLIST_IMPORT_TRACKS) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      `Playlist has too many tracks to import at once (limit ${MAX_PLAYLIST_IMPORT_TRACKS}).`,
    );
  }

  // Resolve with bounded concurrency rather than one sequential round-trip per track.
  // Best-effort per track: a single racing failure (e.g. a 409 from a concurrent
  // import of the same provider ref) must not abort the whole class import. Settle,
  // then keep the tracks that landed — mirrors the saved-playlist path
  // (`importUserPlaylist`), which counts a failed track as skipped, not fatal.
  const CONCURRENCY = 5;
  const resolved: Awaited<ReturnType<typeof importTrackFromCandidate>>[] = [];
  for (let i = 0; i < uniqueCandidates.length; i += CONCURRENCY) {
    const batch = uniqueCandidates.slice(i, i + CONCURRENCY);
    const { fulfilled } = partitionSettledImports(
      await Promise.allSettled(batch.map((cand) => importTrackFromCandidate(db, me, cand))),
    );
    resolved.push(...fulfilled);
  }

  const now = Date.now();
  let position = existing.length;
  const trackInserts = resolved.map(({ track }) => ({
    id: crypto.randomUUID(),
    classId,
    trackId: track.id,
    position: position++,
    intensity: 'none' as const,
    displayBpmOverride: null,
    durationMsOverride: null,
    startOffsetMs: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  }));

  if (trackInserts.length > 0) {
    await db.insert(classTracks).values(trackInserts);
    await resequence(db, classId);
  }

  return c.json({ imported: trackInserts.length }, 201);
});
