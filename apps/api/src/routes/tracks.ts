/**
 * Track routes — the hand-entered, per-user track library (D4) and its provider
 * ids. M1 has no provider API calls (that's M2); BPM is manual.
 *
 * Tracks are **owner-scoped**: every read/write requires `track.owner_user_id ==
 * me`, a simple local check (NOT requireAccess — authorization.md §Non-class).
 * Unknown / not-owned tracks return 404 so a user can't probe another's library.
 */
import { Hono } from 'hono';
import { and, eq, gte, isNull } from 'drizzle-orm';
import {
  createTrackSchema,
  updateTrackSchema,
  createTrackProviderIdSchema,
  resolveProviderRequestSchema,
  type TrackWithProviderIds,
  type ResolveProviderResult,
  type Provider,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { HttpError, isUniqueViolation } from '../lib/errors.js';
import { serializeTrack, serializeTrackProviderId } from '../lib/serialize.js';
import { buildPatch } from '../lib/patch.js';
import { lookupAndApplyBpm } from '../lib/music/bpm-lookup.js';
import { getMusicProvider } from '../lib/music/registry.js';
import { makeMatchKey, type MatchableTrack } from '../lib/same-song.js';
import { resolveTrackProvider } from '../lib/resolve-provider.js';
import { attachProviderId } from '../lib/track-import.js';
import { classTracks, tracks, trackProviderIds } from '../db/schema.js';
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
    matchKey: makeMatchKey(body.title, body.artist),
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
  const existing = await requireOwnedTrack(db, c.get('userId'), id);
  const body = updateTrackSchema.parse(await c.req.json());

  // Placements without a class-specific duration override inherit this library
  // duration. Do not let a correction shrink their resolved base to/below an
  // existing clip start: that collapses the effective duration to zero and makes
  // the entire class run-payload fail response validation.
  if ('durationMs' in body && body.durationMs != null) {
    const collapsedPlacement = await db
      .select({ id: classTracks.id })
      .from(classTracks)
      .where(
        and(
          eq(classTracks.trackId, id),
          isNull(classTracks.durationMsOverride),
          gte(classTracks.clipStartMs, body.durationMs),
        ),
      )
      .get();
    if (collapsedPlacement) {
      throw new HttpError(
        422,
        'VALIDATION_ERROR',
        'Track duration must stay after the clip start of every clipped class placement.',
      );
    }
  }

  const patch = buildPatch(body) as ReturnType<typeof buildPatch<typeof body>> & {
    matchKey?: string;
  };
  // Keep the same-song match key in sync when title/artist change.
  if ('title' in body || 'artist' in body) {
    patch.matchKey = makeMatchKey(body.title ?? existing.title, body.artist ?? existing.artist);
  }

  await db.update(tracks).set(patch).where(eq(tracks.id, id));
  const row = await db.select().from(tracks).where(eq(tracks.id, id)).get();
  return c.json(serializeTrack(row!));
});

/**
 * POST /tracks/:id/bpm-lookup — fill `display_bpm` from a third-party BPM provider
 * (M2, optional; never Spotify). Owner only. A confident match is persisted; no
 * match leaves the existing BPM untouched. 503 when no BPM provider is configured.
 */
trackRoutes.post('/tracks/:id/bpm-lookup', async (c) => {
  const db = createDb(c.env);
  const result = await lookupAndApplyBpm(db, c.env, c.get('userId'), c.req.param('id'));
  const row = await db
    .select()
    .from(tracks)
    .where(eq(tracks.id, c.req.param('id')))
    .get();
  return c.json({ ...serializeTrack(row!), bpmApplied: result.applied });
});

/** POST /tracks/:id/provider-ids — attach a provider id (owner only). 409 on duplicate. */
trackRoutes.post('/tracks/:id/provider-ids', async (c) => {
  const db = createDb(c.env);
  const trackId = c.req.param('id');
  const me = c.get('userId');
  await requireOwnedTrack(db, me, trackId);
  const body = createTrackProviderIdSchema.parse(await c.req.json());

  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    trackId,
    ownerUserId: me, // == the track's owner (requireOwnedTrack enforced it)
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

/**
 * POST /tracks/:id/resolve-provider — cross-provider resolution. Search each
 * requested playable provider the track lacks for the same song; attach a strong
 * same-song match (normalized title+artist + duration tolerance) automatically,
 * else return the candidates so the caller can confirm one. Owner only. Lets a
 * track added from a provider Ritmo can't play in-app (e.g. Spotify) gain a
 * playable provider ref instead of reading as a dead end.
 */
trackRoutes.post('/tracks/:id/resolve-provider', async (c) => {
  const db = createDb(c.env);
  const trackId = c.req.param('id');
  const me = c.get('userId');
  const track = await requireOwnedTrack(db, me, trackId);
  const { providers } = resolveProviderRequestSchema.parse(await c.req.json());

  const existing = await db
    .select({ provider: trackProviderIds.provider })
    .from(trackProviderIds)
    .where(eq(trackProviderIds.trackId, trackId))
    .all();
  const have = new Set(existing.map((r) => r.provider as Provider));
  const matchable: MatchableTrack = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    durationMs: track.durationMs,
    providers: [...have],
  };

  const outcome = await resolveTrackProvider(matchable, providers, (provider, query) =>
    getMusicProvider(provider, c.env).then((adapter) => adapter.search(query)),
  );
  if (outcome.kind === 'match') {
    const attached = await attachProviderId(db, me, track.id, outcome.candidate);
    if (attached) {
      return c.json({
        resolved: true,
        provider: outcome.provider,
        track: attached,
      } satisfies ResolveProviderResult);
    }
    // The track vanished mid-flight (deleted between match and attach) — fall
    // through to an empty confirm list rather than a 500.
  }
  const candidates = outcome.kind === 'candidates' ? outcome.candidates : [];
  return c.json({ resolved: false, candidates } satisfies ResolveProviderResult);
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
