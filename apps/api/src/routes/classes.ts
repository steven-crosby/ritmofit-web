/**
 * Class routes — CRUD + the visible-classes union. Every handler is gated by the
 * centralized `requireAccess` (D1 has no RLS; a missing check is a security bug).
 */
import { Hono } from 'hono';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  CLASS_LIST_DEFAULT_LIMIT,
  CLASS_LIST_NEXT_CURSOR_HEADER,
  MAX_CLASS_COVER_BYTES,
  MAX_CLASS_TAGS,
  addClassTagSchema,
  classListQuerySchema,
  createClassSchema,
  updateClassSchema,
  copyClassSchema,
  type ClassWithAccess,
  type ClassListItem,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { createDb } from '../lib/db.js';
import { requireAccess, listVisibleClasses } from '../lib/authz.js';
import { HttpError } from '../lib/errors.js';
import { buildPatch } from '../lib/patch.js';
import { serializeClass } from '../lib/serialize.js';
import { assembleRunPayload } from '../lib/run-payload.js';
import { decodeClassListCursor, encodeClassListCursor } from '../lib/class-list-pagination.js';
import { resequence, seedFreeOffsets } from '../lib/sequencing.js';
import { deleteClassCover } from '../lib/class-cover.js';
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
  classSections,
  userMoves,
  classTags,
} from '../db/schema.js';

export const classRoutes = new Hono<AppEnv>();
classRoutes.use('*', requireSession);

// Cover upload streams a multipart body into R2 per call; cap it per user so the
// bucket can't be hammered with writes.
const coverLimiter = rateLimit({
  keyPrefix: 'class-cover',
  windowMs: 60_000,
  max: 10,
  key: (c) => c.get('userId'),
});

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
    timelineMode: body.timelineMode ?? 'sequential',
    targetDurationMs: body.targetDurationMs ?? null,
    featuredCategory: body.featuredCategory ?? null,
    coverImageUrl: null,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
  };
  await db.insert(classes).values(row);
  return c.json(serializeClass({ ...row, tags: [] }), 201);
});

/**
 * GET /classes — owned ∪ direct-share ∪ team-share, highest access wins.
 * `?limit=&cursor=` opts into bounded keyset pages; no params preserves the
 * legacy full-array response used by the current iOS cache.
 */
classRoutes.get('/', async (c) => {
  const db = createDb(c.env);
  const rawQuery = c.req.query();
  const query = classListQuerySchema.parse(rawQuery);
  const paginated = rawQuery.limit !== undefined || rawQuery.cursor !== undefined;
  const page = await listVisibleClasses(db, c.get('userId'), {
    limit: paginated ? (query.limit ?? CLASS_LIST_DEFAULT_LIMIT) : undefined,
    cursor: query.cursor ? decodeClassListCursor(query.cursor) : undefined,
    tag: query.tag,
  });
  if (page.nextCursor) {
    c.header(CLASS_LIST_NEXT_CURSOR_HEADER, encodeClassListCursor(page.nextCursor));
  }
  return c.json(page.items satisfies ClassListItem[]);
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
 * The copy carries the source's `timeline_mode`, and for a free-mode source the
 * authored `start_offset_ms` layout (gaps intact) — valid by construction since
 * the source's no-overlap invariant transfers with the durations.
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

  // Fetch everything the copy needs up front (no per-track round-trips). Sections
  // anchor on the class (no class_track FK), so they're fetched by class id and in
  // start order — the copy must carry the instructor's segment/energy plan too.
  const [sourceCues, sourceMoves, sourceTracks, srcRefs, ownedKeyRows, sourceSections] =
    await Promise.all([
      ctIds.length ? db.select().from(cues).where(inArray(cues.classTrackId, ctIds)).all() : [],
      ctIds.length
        ? db
            .select()
            .from(classTrackMoves)
            .where(inArray(classTrackMoves.classTrackId, ctIds))
            .all()
        : [],
      trackIds.length ? db.select().from(tracks).where(inArray(tracks.id, trackIds)).all() : [],
      trackIds.length
        ? db
            .select()
            .from(trackProviderIds)
            .where(inArray(trackProviderIds.trackId, trackIds))
            .all()
        : [],
      db
        .select({
          provider: trackProviderIds.provider,
          providerTrackId: trackProviderIds.providerTrackId,
        })
        .from(trackProviderIds)
        .where(eq(trackProviderIds.ownerUserId, me))
        .all(),
      db
        .select()
        .from(classSections)
        .where(eq(classSections.classId, sourceClassId))
        .orderBy(classSections.startOffsetMs)
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
      timelineMode: sourceClass.timelineMode,
      targetDurationMs: sourceClass.targetDurationMs,
      featuredCategory: null,
      coverImageUrl: null,
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
        db.insert(tracks).values({
          ...srcTrack,
          id: resolvedTrackId,
          ownerUserId: me,
          createdAt: now,
          updatedAt: now,
        }),
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
        // Free mode: offsets are the instructor's authored layout — carry them so the
        // copy keeps its gaps (the trailing resequence never rewrites free offsets).
        // Sequential: leave null; resequence derives them, as before.
        startOffsetMs: sourceClass.timelineMode === 'free' ? ct.startOffsetMs : null,
        createdAt: now,
        updatedAt: now,
      }),
    );
    for (const cue of sourceCues.filter((q) => q.classTrackId === ct.id)) {
      statements.push(
        db.insert(cues).values({
          ...cue,
          id: crypto.randomUUID(),
          classTrackId: newCTId,
          createdAt: now,
          updatedAt: now,
        }),
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

  // Clone the source class's tags onto the copy (fresh ids, same tag values).
  const sourceTags = await db
    .select({ tag: classTags.tag })
    .from(classTags)
    .where(eq(classTags.classId, sourceClassId))
    .all();
  for (const { tag } of sourceTags) {
    statements.push(
      db.insert(classTags).values({
        id: crypto.randomUUID(),
        classId: newClassId,
        tag,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  // Sections only reference the class (FK already inserted as statements[0]), so they
  // can be appended in start order — fresh ids, same type + anchor.
  for (const section of sourceSections) {
    statements.push(
      db.insert(classSections).values({
        id: crypto.randomUUID(),
        classId: newClassId,
        type: section.type,
        startOffsetMs: section.startOffsetMs,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  await resequence(db, newClassId);

  const row = await db.select().from(classes).where(eq(classes.id, newClassId)).get();
  return c.json(serializeClass({ ...row!, tags: sourceTags.map((t) => t.tag) }), 201);
});

/** GET /classes/:id — fetch one class (any access); 404 when not visible. */
classRoutes.get('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const accessLevel = await requireAccess(db, c.get('userId'), id, 'view');
  const row = await db.select().from(classes).where(eq(classes.id, id)).get();
  const tagsRow = await db
    .select({ tag: classTags.tag })
    .from(classTags)
    .where(eq(classTags.classId, id))
    .all();
  const result: ClassWithAccess = {
    ...serializeClass({ ...row!, tags: tagsRow.map((t) => t.tag) }),
    accessLevel,
  };
  return c.json(result);
});

/** PATCH /classes/:id — update mutable fields (edit access). */
classRoutes.patch('/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'edit');
  const body = updateClassSchema.parse(await c.req.json());

  // Detect a timeline-mode switch so we can seed/repack offsets afterward.
  let modeSwitch: 'to_free' | 'to_sequential' | null = null;
  if ('timelineMode' in body && body.timelineMode != null) {
    const current = await db
      .select({ mode: classes.timelineMode })
      .from(classes)
      .where(eq(classes.id, id))
      .get();
    if (current && current.mode !== body.timelineMode) {
      modeSwitch = body.timelineMode === 'free' ? 'to_free' : 'to_sequential';
    }
  }

  await db.update(classes).set(buildPatch(body)).where(eq(classes.id, id));
  // Switching into free seeds authored offsets from the current sequential layout
  // (so the timeline looks identical, then tracks can be dragged apart); switching
  // back to sequential re-packs them back-to-back.
  if (modeSwitch === 'to_free') await seedFreeOffsets(db, id);
  else if (modeSwitch === 'to_sequential') await resequence(db, id);
  const row = await db.select().from(classes).where(eq(classes.id, id)).get();
  const tagsRow = await db
    .select({ tag: classTags.tag })
    .from(classTags)
    .where(eq(classTags.classId, id))
    .all();
  return c.json(serializeClass({ ...row!, tags: tagsRow.map((t) => t.tag) }));
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
  const existingClass = await db
    .select({ coverImageUrl: classes.coverImageUrl })
    .from(classes)
    .where(eq(classes.id, id))
    .get();
  await db.batch([
    db.delete(shares).where(and(eq(shares.resourceType, 'class'), eq(shares.resourceId, id))),
    db.delete(classes).where(eq(classes.id, id)),
  ]);
  await deleteClassCover(c.env.IMAGES_BUCKET, existingClass?.coverImageUrl ?? null);
  return c.body(null, 204);
});

/** POST /classes/:id/cover — upload a custom cover image to R2. Edit access required. */
classRoutes.post('/:id/cover', coverLimiter, async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'edit');

  if (!c.env.IMAGES_BUCKET) {
    throw new HttpError(500, 'INTERNAL_SERVER_ERROR', 'Images bucket not configured.');
  }

  const contentLength = Number(c.req.header('content-length'));
  const multipartOverheadBytes = 64 * 1024;
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_CLASS_COVER_BYTES + multipartOverheadBytes
  ) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Cover image must be 5 MiB or smaller.');
  }

  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) {
    throw new HttpError(400, 'BAD_REQUEST', 'Missing file.');
  }
  if (file.size > MAX_CLASS_COVER_BYTES) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Cover image must be 5 MiB or smaller.');
  }

  // Derive the extension from the (allowlisted) content type, never the
  // client-supplied filename — this keeps the served object an image and
  // prevents an attacker from storing e.g. text/html and getting it served back.
  const extByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extByType[file.type];
  if (!ext) {
    throw new HttpError(400, 'BAD_REQUEST', 'Cover must be a JPEG, PNG, or WebP image.');
  }
  const objectKey = `covers/${crypto.randomUUID()}.${ext}`;

  const existingClass = await db
    .select({ coverImageUrl: classes.coverImageUrl })
    .from(classes)
    .where(eq(classes.id, id))
    .get();

  await c.env.IMAGES_BUCKET.put(objectKey, file, {
    httpMetadata: { contentType: file.type },
  });

  // Store an absolute URL: the image is served by this Worker at
  // `/api/v1/uploads/...`, and the web app (a different origin) renders it
  // directly as an <img src>, so a root-relative path would resolve against
  // the wrong origin and also fail the classSchema url() check.
  const coverImageUrl = `${new URL(c.req.url).origin}/api/v1/uploads/${objectKey}`;

  try {
    await db.update(classes).set({ coverImageUrl }).where(eq(classes.id, id));
  } catch (error) {
    await deleteClassCover(c.env.IMAGES_BUCKET, coverImageUrl);
    throw error;
  }
  await deleteClassCover(c.env.IMAGES_BUCKET, existingClass?.coverImageUrl ?? null);

  const row = await db.select().from(classes).where(eq(classes.id, id)).get();
  const tagsRow = await db
    .select({ tag: classTags.tag })
    .from(classTags)
    .where(eq(classTags.classId, id))
    .all();
  return c.json(serializeClass({ ...row!, tags: tagsRow.map((t) => t.tag) }));
});

/** POST /classes/:id/tags — add a tag to the class. Edit access required. */
classRoutes.post('/:id/tags', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  await requireAccess(db, c.get('userId'), id, 'edit');
  const { tag } = addClassTagSchema.parse(await c.req.json());

  const now = Date.now();
  const inserted = await db
    .insert(classTags)
    .select(
      db
        .select({
          id: sql<string>`${crypto.randomUUID()}`.as('id'),
          classId: classes.id,
          tag: sql<string>`${tag}`.as('tag'),
          createdAt: sql<number>`${now}`.as('created_at'),
          updatedAt: sql<number>`${now}`.as('updated_at'),
        })
        .from(classes)
        .where(
          and(
            eq(classes.id, id),
            sql`(SELECT count(*) FROM ${classTags} WHERE ${classTags.classId} = ${id}) < ${MAX_CLASS_TAGS}`,
          ),
        ),
    )
    .onConflictDoNothing({ target: [classTags.classId, classTags.tag] })
    .returning({ id: classTags.id });

  if (inserted.length === 0) {
    const existing = await db
      .select({ id: classTags.id })
      .from(classTags)
      .where(and(eq(classTags.classId, id), eq(classTags.tag, tag)))
      .get();
    if (!existing) {
      throw new HttpError(
        422,
        'VALIDATION_ERROR',
        `A class can have at most ${MAX_CLASS_TAGS} tags.`,
      );
    }
  }

  return c.json({ success: true, tag }, 201);
});

/** DELETE /classes/:id/tags/:tag — remove a tag. Edit access required. */
classRoutes.delete('/:id/tags/:tag', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const tag = c.req.param('tag');
  await requireAccess(db, c.get('userId'), id, 'edit');

  await db
    .delete(classTags)
    .where(and(eq(classTags.classId, id), eq(classTags.tag, tag.toLowerCase())));
  return c.body(null, 204);
});
