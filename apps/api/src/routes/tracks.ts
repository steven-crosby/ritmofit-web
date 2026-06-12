/**
 * Track routes — the hand-entered, per-user track library (D4) and its provider
 * ids. M1 has no provider API calls (that's M2); BPM is manual.
 *
 * Tracks are **owner-scoped**: every read/write requires `track.owner_user_id ==
 * me`, a simple local check (NOT requireAccess — authorization.md §Non-class).
 * Unknown / not-owned tracks return 404 so a user can't probe another's library.
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import {
  createTrackSchema,
  updateTrackSchema,
  createTrackProviderIdSchema,
  type TrackWithProviderIds,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { HttpError, isUniqueViolation } from '../lib/errors.js';
import { serializeTrack, serializeTrackProviderId } from '../lib/serialize.js';
import { tracks, trackProviderIds } from '../db/schema.js';
import type { Db } from '../lib/db.js';

/** Load a track the caller owns, or throw 404 (existence hidden). */
async function requireOwnedTrack(db: Db, userId: string, trackId: string) {
  const row = await db.select().from(tracks).where(eq(tracks.id, trackId)).get();
  if (!row || row.ownerUserId !== userId) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  return row;
}

export const trackRoutes = new Hono<AppEnv>();
trackRoutes.use('*', requireSession);

/** POST /tracks — create a provider-agnostic track owned by the caller. */
trackRoutes.post('/tracks', async (c) => {
  const db = createDb(c.env);
  const body = createTrackSchema.parse(await c.req.json());
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    ownerUserId: c.get('userId'),
    title: body.title,
    artist: body.artist,
    albumArtUrl: body.albumArtUrl ?? null,
    durationMs: body.durationMs ?? null,
    displayBpm: body.displayBpm ?? null,
    isrc: body.isrc ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(tracks).values(row);
  return c.json(serializeTrack(row), 201);
});

/** GET /tracks/:id — a track with its provider ids (owner only). */
trackRoutes.get('/tracks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const track = await requireOwnedTrack(db, c.get('userId'), id);
  const providers = await db
    .select()
    .from(trackProviderIds)
    .where(eq(trackProviderIds.trackId, id))
    .all();
  const result: TrackWithProviderIds = {
    ...serializeTrack(track),
    providerIds: providers.map(serializeTrackProviderId),
  };
  return c.json(result);
});

/** PATCH /tracks/:id — update track fields, e.g. set/correct manual BPM (owner only). */
trackRoutes.patch('/tracks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireOwnedTrack(db, c.get('userId'), id);
  const body = updateTrackSchema.parse(await c.req.json());

  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if ('title' in body) patch.title = body.title;
  if ('artist' in body) patch.artist = body.artist;
  if ('albumArtUrl' in body) patch.albumArtUrl = body.albumArtUrl ?? null;
  if ('durationMs' in body) patch.durationMs = body.durationMs ?? null;
  if ('displayBpm' in body) patch.displayBpm = body.displayBpm ?? null;
  if ('isrc' in body) patch.isrc = body.isrc ?? null;

  await db.update(tracks).set(patch).where(eq(tracks.id, id));
  const row = await db.select().from(tracks).where(eq(tracks.id, id)).get();
  return c.json(serializeTrack(row!));
});

/** POST /tracks/:id/provider-ids — attach a provider id (owner only). 409 on duplicate. */
trackRoutes.post('/tracks/:id/provider-ids', async (c) => {
  const db = createDb(c.env);
  const trackId = c.req.param('id');
  await requireOwnedTrack(db, c.get('userId'), trackId);
  const body = createTrackProviderIdSchema.parse(await c.req.json());

  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    trackId,
    provider: body.provider,
    providerTrackId: body.providerTrackId,
    providerUri: body.providerUri ?? null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.insert(trackProviderIds).values(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'CONFLICT', 'That provider id is already registered.');
    }
    throw err;
  }
  return c.json(serializeTrackProviderId(row), 201);
});

/** DELETE /track-provider-ids/:id — remove a provider id (owner of the parent track only). */
trackRoutes.delete('/track-provider-ids/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const row = await db
    .select({ trackId: trackProviderIds.trackId })
    .from(trackProviderIds)
    .where(eq(trackProviderIds.id, id))
    .get();
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  await requireOwnedTrack(db, c.get('userId'), row.trackId);
  await db.delete(trackProviderIds).where(eq(trackProviderIds.id, id));
  return c.body(null, 204);
});
