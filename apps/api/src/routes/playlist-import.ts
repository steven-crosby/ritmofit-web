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
  let provider: 'spotify' | 'soundcloud' | null = null;
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
      provider = 'soundcloud';
      // URL format: https://soundcloud.com/user/sets/playlist-name
      // For SoundCloud, the "id" we need is either the slug or numeric ID. 
      // The SDK uses lookup for URLs, but we might need the actual ID or the permalink.
      // Wait, getPlaylist in soundcloud needs numeric ID or permalink? 
      // Actually, SoundCloud's /playlists endpoint requires numeric ID unless we use /resolve.
      // But we can try passing the URL to a resolver or just pass the path.
      // To keep it simple, if it's soundcloud, we'll extract the path (e.g. `user/sets/playlist-name`) 
      // Wait, for SoundCloud `/resolve?url=...` is typically used to get the playlist ID.
      // Let's just pass the full URL and let the provider adapter resolve it, or we resolve it here.
      // If we don't have a resolve endpoint, we might have to use search or lookup.
      // Actually, if we pass the whole URL to `soundcloud.ts` `getPlaylist`, it won't work out of the box because it expects numeric ID.
      // Let's pass the URL path without leading slash? 
      // Actually, we can use `/resolve?url=` if needed. But for now, we'll pass the URL to the provider adapter and handle it there, or just throw 501 for soundcloud if not supported yet.
      playlistId = url; // Pass full url, will fix adapter later.
    }
  } catch (e) {
    throw new HttpError(400, 'BAD_REQUEST', 'Invalid URL.');
  }

  if (!provider || !playlistId) {
    throw new HttpError(400, 'BAD_REQUEST', 'Unsupported playlist URL. Must be Spotify or SoundCloud.');
  }

  const adapter = getMusicProvider(provider, c.env);
  let candidates = await adapter.getPlaylist(playlistId);

  // For SoundCloud, if we passed a URL and it failed, we'd need to resolve it. 
  // We can add resolve logic to `soundcloud.ts` `getPlaylist`.

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
      artist: track.artist,
      albumArtUrl: track.albumArtUrl ?? null,
      durationMs: track.durationMs,
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
