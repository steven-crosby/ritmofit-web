import { Hono } from 'hono';
import { z } from 'zod';
import { requireSession } from '../middleware/auth.js';
import { requireAccess } from '../lib/authz.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { getMusicProvider } from '../lib/music/registry.js';
import { importTrackFromCandidate } from '../lib/track-import.js';
import { classTracks } from '../db/schema.js';
import { resequence } from '../lib/sequencing.js';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../lib/types.js';

export const playlistImportRoutes = new Hono<AppEnv>();
playlistImportRoutes.use('*', requireSession);

const importSchema = z.object({ url: z.string().url() });

playlistImportRoutes.post('/classes/:id/import-playlist', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  const me = c.get('userId');
  await requireAccess(db, me, classId, 'edit');

  const { url } = importSchema.parse(await c.req.json());
  let provider: 'spotify' | null = null;
  let playlistId: string | null = null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('spotify.com')) {
      provider = 'spotify';
      // URL format: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
      const parts = parsedUrl.pathname.split('/');
      const idx = parts.indexOf('playlist');
      if (idx !== -1 && parts[idx + 1]) {
        playlistId = parts[idx + 1] ?? null;
      }
    } else if (parsedUrl.hostname.includes('soundcloud.com')) {
      // SoundCloud playlists require resolving the permalink URL to a numeric
      // id via /resolve before /playlists/{id} works. Not implemented yet —
      // reject explicitly rather than issue a request that always 404s.
      throw new HttpError(
        501,
        'NOT_IMPLEMENTED',
        'SoundCloud playlist import is not supported yet.',
      );
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, 'BAD_REQUEST', 'Invalid URL.');
  }

  if (!provider || !playlistId) {
    throw new HttpError(
      400,
      'BAD_REQUEST',
      'Unsupported playlist URL. Must be a Spotify playlist.',
    );
  }

  const adapter = getMusicProvider(provider, c.env);
  const candidates = await adapter.getPlaylist(playlistId);

  if (!candidates.length) {
    throw new HttpError(400, 'BAD_REQUEST', 'Playlist not found or is empty.');
  }

  const existing = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .all();

  let position = existing.length;
  const now = Date.now();
  const trackInserts = [];

  for (const candidate of candidates) {
    const { track } = await importTrackFromCandidate(db, me, candidate);
    trackInserts.push({
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
    });
  }

  if (trackInserts.length > 0) {
    await db.insert(classTracks).values(trackInserts);
    await resequence(db, classId);
  }

  return c.json({ imported: trackInserts.length }, 201);
});
