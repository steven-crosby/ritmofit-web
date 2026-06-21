/**
 * Class-track routes — placing/editing/reordering/copying tracks within a class.
 * Add/list/reorder hang off `/classes/:id/...`; item ops off `/class-tracks/:id`.
 * Every handler resolves the parent class and gates via `requireAccess`.
 */
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  addClassTrackSchema,
  updateClassTrackSchema,
  reorderClassTracksSchema,
  copyClassTrackSchema,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb, type Db } from '../lib/db.js';
import { requireAccess, requireClassTrackAccess, AccessError } from '../lib/authz.js';
import { HttpError } from '../lib/errors.js';
import { serializeClassTrack } from '../lib/serialize.js';
import {
  resequence,
  freeAppendOffsetMs,
  wouldOverlap,
  timelineModeOf,
} from '../lib/sequencing.js';
import { buildPatch } from '../lib/patch.js';
import { makeMatchKey } from '../lib/same-song.js';
import {
  resolveCopiedTrack,
  refsToClone,
  providerRefKey,
  remapPlacedMoveForCaller,
} from '../lib/copy-class-track.js';
import {
  userMoves,
  classTracks,
  tracks,
  trackProviderIds,
  cues,
  classTrackMoves,
} from '../db/schema.js';
import { resolveClipWindow, effectiveDurationMs } from '../lib/duration.js';

export const classTrackRoutes = new Hono<AppEnv>();
classTrackRoutes.use('*', requireSession);

/**
 * POST /classes/:id/tracks — add a track to a class (edit access). Body either
 * references an existing track the caller owns, or inline-creates one (owner =
 * caller). Appends at the end; position/offset are server-derived via resequence.
 */
classTrackRoutes.post('/classes/:id/tracks', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  const me = c.get('userId');
  await requireAccess(db, me, classId, 'edit');
  const body = addClassTrackSchema.parse(await c.req.json());

  let trackId: string;
  if ('trackId' in body) {
    // Reference an existing track — must be in the caller's library (D4).
    const t = await db
      .select({ ownerUserId: tracks.ownerUserId })
      .from(tracks)
      .where(eq(tracks.id, body.trackId))
      .get();
    if (!t || t.ownerUserId !== me) {
      throw new AccessError(404, 'NOT_FOUND', 'Not found.');
    }
    trackId = body.trackId;
  } else {
    // Inline-create a track owned by the caller (same shape as POST /tracks, step 8).
    const now = Date.now();
    trackId = crypto.randomUUID();
    await db.insert(tracks).values({
      id: trackId,
      ownerUserId: me,
      title: body.track.title,
      artist: body.track.artist,
      albumArtUrl: body.track.albumArtUrl ?? null,
      durationMs: body.track.durationMs ?? null,
      displayBpm: body.track.displayBpm ?? null,
      isrc: body.track.isrc ?? null,
      // Keep parity with POST /tracks + import: without this the inline-created
      // track has a NULL match_key and is invisible to same-song resolution, so a
      // later provider import of the same song forges a duplicate track.
      matchKey: makeMatchKey(body.track.title, body.track.artist),
      createdAt: now,
      updatedAt: now,
    });
  }

  const existing = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .all();

  // Free mode authors offsets, so a new track lands right after the current material
  // (resequence won't set it); sequential leaves it null for resequence to derive.
  const mode = await timelineModeOf(db, classId);
  const startOffsetMs = mode === 'free' ? await freeAppendOffsetMs(db, classId) : null;

  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(classTracks).values({
    id,
    classId,
    trackId,
    position: existing.length,
    intensity: body.intensity ?? 'none',
    displayBpmOverride: body.displayBpmOverride ?? null,
    durationMsOverride: body.durationMsOverride ?? null,
    clipStartMs: body.clipStartMs ?? 0,
    clipEndMs: body.clipEndMs ?? null,
    beatAnchorMs: body.beatAnchorMs ?? 0,
    startOffsetMs,
    notes: body.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  await resequence(db, classId);

  const row = await db.select().from(classTracks).where(eq(classTracks.id, id)).get();
  return c.json(serializeClassTrack(row!), 201);
});

/** GET /classes/:id/tracks — class_tracks in position order (view access). */
classTrackRoutes.get('/classes/:id/tracks', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'view');
  const rows = await db
    .select()
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();
  return c.json(rows.map(serializeClassTrack));
});

/**
 * POST /classes/:id/tracks/reorder — set the complete new ordering (edit access).
 * The id list must be exactly the class's current class_tracks (a permutation).
 */
classTrackRoutes.post('/classes/:id/tracks/reorder', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'edit');
  // In free mode, order is derived from each track's offset — reposition by dragging
  // the track on the timeline (set its offset), not by reordering the list.
  if ((await timelineModeOf(db, classId)) === 'free') {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'Reordering is unavailable in free-placement mode; drag a track to change its start time.',
    );
  }
  const { classTrackIds } = reorderClassTracksSchema.parse(await c.req.json());

  const current = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .all();
  const currentIds = new Set(current.map((r) => r.id));
  const requested = new Set(classTrackIds);
  const isPermutation =
    classTrackIds.length === currentIds.size &&
    requested.size === classTrackIds.length &&
    classTrackIds.every((id) => currentIds.has(id));
  if (!isPermutation) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      "classTrackIds must be exactly this class's class_tracks, with no duplicates.",
    );
  }

  await resequence(db, classId, classTrackIds);
  const rows = await db
    .select()
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();
  return c.json(rows.map(serializeClassTrack));
});

/** PATCH /class-tracks/:id — intensity / bpm override / clip window / notes (edit access). */
classTrackRoutes.patch('/class-tracks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classId } = await requireClassTrackAccess(db, c.get('userId'), id, 'edit');
  const body = updateClassTrackSchema.parse(await c.req.json());

  // The duration override and the clip window change the timeline length; the offset
  // moves the track on the timeline. Any of them re-validates and re-derives layout.
  const touchesWindow =
    'durationMsOverride' in body || 'clipStartMs' in body || 'clipEndMs' in body;
  const touchesOffset = 'startOffsetMs' in body;
  const mode = touchesOffset || touchesWindow ? await timelineModeOf(db, classId) : 'sequential';

  if (touchesOffset && mode !== 'free') {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'Switch the class to free placement before setting a track start time.',
    );
  }

  if (touchesWindow || touchesOffset) {
    const [existing, anchors] = await Promise.all([
      db
        .select({
          trackDurationMs: tracks.durationMs,
          durationMsOverride: classTracks.durationMsOverride,
          clipStartMs: classTracks.clipStartMs,
          clipEndMs: classTracks.clipEndMs,
          startOffsetMs: classTracks.startOffsetMs,
        })
        .from(classTracks)
        .innerJoin(tracks, eq(tracks.id, classTracks.trackId))
        .where(eq(classTracks.id, id))
        .get(),
      anchorBounds(db, id),
    ]);

    // Merge the patch over the persisted row (absent field keeps its value; explicit
    // null resets it) to get the resulting window + offset.
    const durationMsOverride =
      'durationMsOverride' in body
        ? (body.durationMsOverride ?? null)
        : (existing?.durationMsOverride ?? null);
    const clipStartMs =
      'clipStartMs' in body ? (body.clipStartMs ?? 0) : (existing?.clipStartMs ?? 0);
    const clipEndMs = 'clipEndMs' in body ? (body.clipEndMs ?? null) : (existing?.clipEndMs ?? null);

    const { startMs, endMs } = resolveClipWindow(
      existing?.trackDurationMs ?? null,
      durationMsOverride,
      clipStartMs,
      clipEndMs,
    );
    if (touchesWindow && anchors) {
      if (anchors.minMs < startMs) {
        throw new HttpError(
          422,
          'VALIDATION_ERROR',
          `Clip start must be at or before the earliest cue or move at ${anchors.minMs}ms.`,
        );
      }
      if (endMs != null && endMs < anchors.maxMs) {
        throw new HttpError(
          422,
          'VALIDATION_ERROR',
          `Clip end must reach the latest cue or move at ${anchors.maxMs}ms.`,
        );
      }
    }

    // Free mode: the resulting window must not overlap a sibling (gaps are fine).
    if (mode === 'free') {
      const mergedOffset = touchesOffset
        ? (body.startOffsetMs ?? 0)
        : (existing?.startOffsetMs ?? 0);
      const mergedDuration = effectiveDurationMs(
        existing?.trackDurationMs ?? null,
        durationMsOverride,
        clipStartMs,
        clipEndMs,
      );
      if (await wouldOverlap(db, classId, id, mergedOffset, mergedDuration)) {
        throw new HttpError(
          422,
          'VALIDATION_ERROR',
          'That start time would overlap another track. Leave a gap or move the other track.',
        );
      }
    }
  }

  // `clip_start_ms` / `beat_anchor_ms` are NOT NULL — a null in the patch means
  // "reset to 0". `start_offset_ms` is nullable but we keep free offsets concrete.
  const { clipStartMs, beatAnchorMs, startOffsetMs, ...rest } = buildPatch(body);
  const patch = {
    ...rest,
    ...('clipStartMs' in body ? { clipStartMs: clipStartMs ?? 0 } : {}),
    ...('beatAnchorMs' in body ? { beatAnchorMs: beatAnchorMs ?? 0 } : {}),
    ...(touchesOffset ? { startOffsetMs: startOffsetMs ?? 0 } : {}),
  };

  await db.update(classTracks).set(patch).where(eq(classTracks.id, id));
  if (touchesWindow || touchesOffset) await resequence(db, classId);
  const row = await db.select().from(classTracks).where(eq(classTracks.id, id)).get();
  return c.json(serializeClassTrack(row!));
});

/**
 * The min/max cue|move anchor across a class_track's choreography, or null when it
 * has none. Used to keep a clip window from orphaning an anchor (trimming below the
 * earliest, or above the latest).
 */
async function anchorBounds(
  db: Db,
  classTrackId: string,
): Promise<{ minMs: number; maxMs: number } | null> {
  const [cueAgg, moveAgg] = await Promise.all([
    db
      .select({
        min: sql<number | null>`min(${cues.anchorMs})`,
        max: sql<number | null>`max(${cues.anchorMs})`,
      })
      .from(cues)
      .where(eq(cues.classTrackId, classTrackId))
      .get(),
    db
      .select({
        min: sql<number | null>`min(${classTrackMoves.anchorMs})`,
        max: sql<number | null>`max(${classTrackMoves.anchorMs})`,
      })
      .from(classTrackMoves)
      .where(eq(classTrackMoves.classTrackId, classTrackId))
      .get(),
  ]);
  const mins = [cueAgg?.min, moveAgg?.min].filter((n): n is number => n != null);
  const maxs = [cueAgg?.max, moveAgg?.max].filter((n): n is number => n != null);
  if (mins.length === 0) return null;
  return { minMs: Math.min(...mins), maxMs: Math.max(...maxs) };
}

/** DELETE /class-tracks/:id — remove from the class (edit access); cues/moves cascade. */
classTrackRoutes.delete('/class-tracks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classId } = await requireClassTrackAccess(db, c.get('userId'), id, 'edit');
  await db.delete(classTracks).where(eq(classTracks.id, id));
  await resequence(db, classId);
  return c.body(null, 204);
});

/**
 * POST /class-tracks/:id/copy — duplicate this class_track, with its cues and
 * placed moves, into a target class (D7). Requires edit on both source and target.
 */
classTrackRoutes.post('/class-tracks/:id/copy', async (c) => {
  const db = createDb(c.env);
  const sourceId = c.req.param('id');
  const me = c.get('userId');
  await requireClassTrackAccess(db, me, sourceId, 'edit');
  const { targetClassId } = copyClassTrackSchema.parse(await c.req.json());
  await requireAccess(db, me, targetClassId, 'edit');

  const source = await db.select().from(classTracks).where(eq(classTracks.id, sourceId)).get();
  if (!source) throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  const sourceCues = await db.select().from(cues).where(eq(cues.classTrackId, sourceId)).all();
  const sourceMoves = await db
    .select()
    .from(classTrackMoves)
    .where(eq(classTrackMoves.classTrackId, sourceId))
    .all();
  const targetExisting = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.classId, targetClassId))
    .all();
  // A free-mode target authors offsets, so the copy lands after the current material
  // (resequence won't place it); sequential leaves it null for resequence to derive.
  const targetMode = await timelineModeOf(db, targetClassId);
  const copyStartOffsetMs =
    targetMode === 'free' ? await freeAppendOffsetMs(db, targetClassId) : null;

  const now = Date.now();
  const newId = crypto.randomUUID();

  // A copy must never carry references into ANOTHER user's private library: a
  // foreign trackId / userMoveId would survive the source class being unshared,
  // letting the copier keep reading the owner's private track + move metadata. So
  // when the source track / a placed user_move isn't the caller's, clone the track
  // (with its provider ids) into the caller's library and snapshot foreign move
  // names into `name_override`, dropping the private ref. Refs the caller already
  // owns are preserved as-is.
  const clones: unknown[] = [];

  // ── Resolve the track ──────────────────────────────────────────────────────
  const sourceTrack = await db.select().from(tracks).where(eq(tracks.id, source.trackId)).get();
  const { trackId: resolvedTrackId, cloneTrack } = resolveCopiedTrack({
    sourceTrackId: source.trackId,
    sourceTrackOwnerId: sourceTrack?.ownerUserId ?? null,
    callerId: me,
    newTrackId: crypto.randomUUID(),
  });
  if (cloneTrack && sourceTrack) {
    clones.push(
      db.insert(tracks).values({
        ...sourceTrack,
        id: resolvedTrackId,
        ownerUserId: me,
        createdAt: now,
        updatedAt: now,
      }),
    );
    const [srcRefs, ownedKeys] = await Promise.all([
      db.select().from(trackProviderIds).where(eq(trackProviderIds.trackId, source.trackId)).all(),
      db
        .select({
          provider: trackProviderIds.provider,
          providerTrackId: trackProviderIds.providerTrackId,
        })
        .from(trackProviderIds)
        .where(eq(trackProviderIds.ownerUserId, me))
        .all(),
    ]);
    const owned = new Set(ownedKeys.map((r) => providerRefKey(r.provider, r.providerTrackId)));
    for (const ref of refsToClone(srcRefs, owned)) {
      clones.push(
        db.insert(trackProviderIds).values({
          ...ref,
          id: crypto.randomUUID(),
          trackId: resolvedTrackId,
          ownerUserId: me,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
  }

  // ── Resolve placed-move user_move refs ─────────────────────────────────────
  const userMoveIds = [
    ...new Set(sourceMoves.map((m) => m.userMoveId).filter((id): id is string => id != null)),
  ];
  const userMoveById = new Map<string, { userId: string; name: string }>();
  if (userMoveIds.length > 0) {
    const rows = await db
      .select({ id: userMoves.id, userId: userMoves.userId, name: userMoves.name })
      .from(userMoves)
      .where(inArray(userMoves.id, userMoveIds))
      .all();
    rows.forEach((r) => userMoveById.set(r.id, { userId: r.userId, name: r.name }));
  }
  const remapMove = (move: (typeof sourceMoves)[number]) => ({
    ...move,
    ...remapPlacedMoveForCaller(move, me, userMoveById),
    id: crypto.randomUUID(),
    classTrackId: newId,
    createdAt: now,
    updatedAt: now,
  });

  const statements = [
    ...clones,
    db.insert(classTracks).values({
      ...source,
      id: newId,
      classId: targetClassId,
      trackId: resolvedTrackId,
      position: targetExisting.length,
      startOffsetMs: copyStartOffsetMs,
      createdAt: now,
      updatedAt: now,
    }),
    ...sourceCues.map((cue) =>
      db.insert(cues).values({
        ...cue,
        id: crypto.randomUUID(),
        classTrackId: newId,
        createdAt: now,
        updatedAt: now,
      }),
    ),
    ...sourceMoves.map((move) => db.insert(classTrackMoves).values(remapMove(move))),
  ];
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  await resequence(db, targetClassId);

  const row = await db.select().from(classTracks).where(eq(classTracks.id, newId)).get();
  return c.json(serializeClassTrack(row!), 201);
});
