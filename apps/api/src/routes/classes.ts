/**
 * Class routes — CRUD + the visible-classes union. Every handler is gated by the
 * centralized `requireAccess` (D1 has no RLS; a missing check is a security bug).
 */
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import {
  createClassSchema,
  updateClassSchema,
  copyClassSchema,
  type ClassWithAccess,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireAccess, listVisibleClasses } from '../lib/authz.js';
import { HttpError } from '../lib/errors.js';
import { buildPatch } from '../lib/patch.js';
import { serializeClass } from '../lib/serialize.js';
import { assembleRunPayload } from '../lib/run-payload.js';
import { resequence } from '../lib/sequencing.js';
import {
  resolveTrackForClassCopy,
  refsToClone,
  providerRefKey,
  remapPlacedMoveForCaller,
} from '../lib/copy-class-track.js';
import {
  classes,
  shares,
  classTracks,
  tracks,
  trackProviderIds,
  cues,
  classTrackMoves,
  userMoves,
} from '../db/schema.js';

export const classRoutes = new Hono<AppEnv>();
classRoutes.use('*', requireSession);

/** POST /classes — create a class owned by the caller. */
classRoutes.post('/', async (c) => {
  const body = createClassSchema.parse(await c.req.json());
  const db = createDb(c.env);
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    ownerUserId: c.get('userId'),
    title: body.title,
    description: body.description ?? null,
    template: body.template ?? null,
    status: body.status ?? 'draft',
    visibility: body.visibility ?? 'private',
    targetDurationMs: body.targetDurationMs ?? null,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
  };
  await db.insert(classes).values(row);
  return c.json(serializeClass(row), 201);
});

/**
 * GET /classes — classes the caller can see: owned ∪ shared-directly ∪
 * shared-via-team, each tagged with its effective access level (highest wins).
 * The access union lives in `lib/authz.ts` (`listVisibleClasses`) so the access
 * model has one home; this route just fetches and shapes the rows.
 */
classRoutes.get('/', async (c) => {
  const db = createDb(c.env);
  const levelById = await listVisibleClasses(db, c.get('userId'));

  if (levelById.size === 0) return c.json([] as ClassWithAccess[]);

  const rows = await db
    .select()
    .from(classes)
    .where(inArray(classes.id, [...levelById.keys()]))
    .all();
  const out: ClassWithAccess[] = rows
    .map((row) => ({ ...serializeClass(row), accessLevel: levelById.get(row.id)! }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return c.json(out);
});

/**
 * GET /classes/:id/run-payload — the versioned single-fetch live contract (D12).
 * VIEW access; assembles class + ordered tracks + provider refs + cues + moves
 * with server-resolved displayBpm / move names (lib/run-payload.ts).
 */
classRoutes.get('/:id/run-payload', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'view');
  return c.json(await assembleRunPayload(db, id));
});

/**
 * POST /classes/:id/copy — "save a copy" of a class into the caller's library
 * (M4 slice 3b). VIEW access on the source, so a `public` class qualifies via the
 * public floor (Explore → save). The copy is a fresh `draft` / `private` class the
 * caller owns; it reuses the class_track copy's cross-user safety so it never
 * carries a live reference into another user's private library — foreign tracks
 * (and their not-already-owned provider ids) are cloned into the caller's library,
 * and private `user_move` references are snapshotted to `name_override`. A foreign
 * track shared by several tracks is cloned **once** (`resolveTrackForClassCopy`).
 */
classRoutes.post('/:id/copy', async (c) => {
  const db = createDb(c.env);
  const sourceClassId = c.req.param('id');
  const me = c.get('userId');
  await requireAccess(db, me, sourceClassId, 'view');
  const body = copyClassSchema.parse(await c.req.json().catch(() => ({})));

  const sourceClass = await db.select().from(classes).where(eq(classes.id, sourceClassId)).get();
  if (!sourceClass) throw new HttpError(404, 'NOT_FOUND', 'Not found.');

  const sourceCTs = await db
    .select()
    .from(classTracks)
    .where(eq(classTracks.classId, sourceClassId))
    .orderBy(classTracks.position)
    .all();
  const ctIds = sourceCTs.map((ct) => ct.id);
  const trackIds = [...new Set(sourceCTs.map((ct) => ct.trackId))];

  // Fetch everything the copy needs up front (no per-track round-trips).
  const [sourceCues, sourceMoves, sourceTracks, srcRefs, ownedKeyRows] = await Promise.all([
    ctIds.length ? db.select().from(cues).where(inArray(cues.classTrackId, ctIds)).all() : [],
    ctIds.length ? db.select().from(classTrackMoves).where(inArray(classTrackMoves.classTrackId, ctIds)).all() : [],
    trackIds.length ? db.select().from(tracks).where(inArray(tracks.id, trackIds)).all() : [],
    trackIds.length ? db.select().from(trackProviderIds).where(inArray(trackProviderIds.trackId, trackIds)).all() : [],
    db
      .select({ provider: trackProviderIds.provider, providerTrackId: trackProviderIds.providerTrackId })
      .from(trackProviderIds)
      .where(eq(trackProviderIds.ownerUserId, me))
      .all(),
  ]);

  const trackById = new Map(sourceTracks.map((t) => [t.id, t]));
  const refsByTrack = new Map<string, typeof srcRefs>();
  for (const r of srcRefs) {
    const list = refsByTrack.get(r.trackId) ?? [];
    list.push(r);
    refsByTrack.set(r.trackId, list);
  }
  // Mutable: seeded with the caller's owned refs, then augmented as we clone, so a
  // ref shared by two source tracks is cloned once (owner-scoped unique index).
  const ownedKeys = new Set(ownedKeyRows.map((r) => providerRefKey(r.provider, r.providerTrackId)));

  const userMoveIds = [...new Set(sourceMoves.map((m) => m.userMoveId).filter((id): id is string => id != null))];
  const userMoveById = new Map<string, { userId: string; name: string }>();
  if (userMoveIds.length > 0) {
    const rows = await db
      .select({ id: userMoves.id, userId: userMoves.userId, name: userMoves.name })
      .from(userMoves)
      .where(inArray(userMoves.id, userMoveIds))
      .all();
    rows.forEach((r) => userMoveById.set(r.id, { userId: r.userId, name: r.name }));
  }

  const now = Date.now();
  const newClassId = crypto.randomUUID();
  // Order matters: the class precedes its class_tracks (FK), and a cloned track
  // precedes the class_track that references it. A single interleaved pass keeps
  // that ordering correct for the batched transaction.
  const statements: unknown[] = [
    db.insert(classes).values({
      id: newClassId,
      ownerUserId: me,
      title: body.title ?? `Copy of ${sourceClass.title}`,
      description: sourceClass.description,
      template: sourceClass.template,
      status: 'draft',
      visibility: 'private',
      targetDurationMs: sourceClass.targetDurationMs,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
    }),
  ];

  const trackMemo = new Map<string, string>();
  sourceCTs.forEach((ct, index) => {
    const srcTrack = trackById.get(ct.trackId);
    const { trackId: resolvedTrackId, cloneTrack } = resolveTrackForClassCopy({
      sourceTrackId: ct.trackId,
      sourceTrackOwnerId: srcTrack?.ownerUserId ?? null,
      callerId: me,
      newTrackId: crypto.randomUUID(),
      memo: trackMemo,
    });
    if (cloneTrack && srcTrack) {
      statements.push(
        db.insert(tracks).values({ ...srcTrack, id: resolvedTrackId, ownerUserId: me, createdAt: now, updatedAt: now }),
      );
      for (const ref of refsToClone(refsByTrack.get(ct.trackId) ?? [], ownedKeys)) {
        statements.push(
          db.insert(trackProviderIds).values({
            ...ref,
            id: crypto.randomUUID(),
            trackId: resolvedTrackId,
            ownerUserId: me,
            createdAt: now,
            updatedAt: now,
          }),
        );
        ownedKeys.add(providerRefKey(ref.provider, ref.providerTrackId));
      }
    }

    const newCTId = crypto.randomUUID();
    statements.push(
      db.insert(classTracks).values({
        ...ct,
        id: newCTId,
        classId: newClassId,
        trackId: resolvedTrackId,
        position: index,
        startOffsetMs: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
    for (const cue of sourceCues.filter((q) => q.classTrackId === ct.id)) {
      statements.push(
        db.insert(cues).values({ ...cue, id: crypto.randomUUID(), classTrackId: newCTId, createdAt: now, updatedAt: now }),
      );
    }
    for (const move of sourceMoves.filter((m) => m.classTrackId === ct.id)) {
      statements.push(
        db.insert(classTrackMoves).values({
          ...move,
          ...remapPlacedMoveForCaller(move, me, userMoveById),
          id: crypto.randomUUID(),
          classTrackId: newCTId,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
  });

  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  await resequence(db, newClassId);

  const row = await db.select().from(classes).where(eq(classes.id, newClassId)).get();
  return c.json(serializeClass(row!), 201);
});

/** GET /classes/:id — fetch one class (any access); 404 when not visible. */
classRoutes.get('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const accessLevel = await requireAccess(db, c.get('userId'), id, 'view');
  const row = await db.select().from(classes).where(eq(classes.id, id)).get();
  const result: ClassWithAccess = { ...serializeClass(row!), accessLevel };
  return c.json(result);
});

/** PATCH /classes/:id — update mutable fields (edit access). */
classRoutes.patch('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'edit');
  const body = updateClassSchema.parse(await c.req.json());

  await db.update(classes).set(buildPatch(body)).where(eq(classes.id, id));
  const row = await db.select().from(classes).where(eq(classes.id, id)).get();
  return c.json(serializeClass(row!));
});

/**
 * DELETE /classes/:id — owner only. FK cascade removes class_tracks → cues/moves;
 * the class's polymorphic `shares` are deleted at the app level (resource_id has
 * no FK — flagged in step 3).
 */
classRoutes.delete('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'owner');
  await db.batch([
    db.delete(shares).where(and(eq(shares.resourceType, 'class'), eq(shares.resourceId, id))),
    db.delete(classes).where(eq(classes.id, id)),
  ]);
  return c.body(null, 204);
});
