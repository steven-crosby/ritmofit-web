/**
 * Music-independent deterministic scaffold block routes.
 *
 * Blocks are class-scoped. They carry the planned structure; real class_tracks
 * optionally point at one block for playback grouping.
 */
import { Hono } from 'hono';
import { and, eq, gte, sql } from 'drizzle-orm';
import {
  classPlanBlockGuidanceSchema,
  createClassPlanBlockSchema,
  reorderClassPlanBlocksSchema,
  updateClassPlanBlockSchema,
  type ClassPlanBlockGuidance,
  type ClassTemplate,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { requireAccess, requirePlanBlockAccess } from '../lib/authz.js';
import { HttpError } from '../lib/errors.js';
import { serializeClassPlanBlock } from '../lib/serialize.js';
import { classes, classPlanBlocks, classTracks } from '../db/schema.js';
import { touchClassUpdatedAt } from '../lib/class-recency.js';
import { resequence, timelineModeOf } from '../lib/sequencing.js';
import { isTrackPlanOrderValid, orderTrackIdsByPlan } from '../lib/plan-block-ordering.js';

export const classPlanBlockRoutes = new Hono<AppEnv>();
classPlanBlockRoutes.use('*', requireSession);

function guidanceMatchesTemplate(guidance: ClassPlanBlockGuidance, template: ClassTemplate | null) {
  return (
    (guidance.kind === 'cycle' && template === 'cycle') ||
    (guidance.kind === 'pilates' && template === 'sculpt') ||
    (guidance.kind === 'hiit' && template === 'hiit')
  );
}

async function requireMatchingGuidance(
  db: ReturnType<typeof createDb>,
  classId: string,
  guidance: ClassPlanBlockGuidance,
): Promise<void> {
  const cls = await db
    .select({ template: classes.template })
    .from(classes)
    .where(eq(classes.id, classId))
    .get();
  if (!cls || !guidanceMatchesTemplate(guidance, cls.template)) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'Plan-block guidance must match the class discipline.',
    );
  }
}

/** GET /classes/:id/plan-blocks — ordered planned structure (view access). */
classPlanBlockRoutes.get('/classes/:id/plan-blocks', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'view');
  const rows = await db
    .select()
    .from(classPlanBlocks)
    .where(eq(classPlanBlocks.classId, classId))
    .orderBy(classPlanBlocks.position)
    .all();
  return c.json(rows.map(serializeClassPlanBlock));
});

/** POST /classes/:id/plan-blocks — append one instructor-authored block. */
classPlanBlockRoutes.post('/classes/:id/plan-blocks', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'edit');
  const body = createClassPlanBlockSchema.parse(await c.req.json());
  await requireMatchingGuidance(db, classId, body.guidance);

  const current = await db
    .select({ position: classPlanBlocks.position })
    .from(classPlanBlocks)
    .where(eq(classPlanBlocks.classId, classId))
    .orderBy(classPlanBlocks.position)
    .all();
  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    classId,
    recipeBlockKey: null,
    position: current.length,
    segmentType: body.segmentType,
    label: body.label,
    targetDurationMs: body.targetDurationMs,
    intensity: body.intensity,
    teachingGoal: body.teachingGoal,
    movementFocus: body.movementFocus,
    guidanceKind: body.guidance.kind,
    guidanceJson: JSON.stringify(body.guidance),
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(classPlanBlocks).values(row);
  await touchClassUpdatedAt(db, classId);
  return c.json(serializeClassPlanBlock(row), 201);
});

/** PATCH /plan-blocks/:id — edit planned structure without touching music duration. */
classPlanBlockRoutes.patch('/plan-blocks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classId } = await requirePlanBlockAccess(db, c.get('userId'), id, 'edit');
  const body = updateClassPlanBlockSchema.parse(await c.req.json());
  const existing = await db.select().from(classPlanBlocks).where(eq(classPlanBlocks.id, id)).get();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Not found.');

  const guidance = body.guidance
    ? classPlanBlockGuidanceSchema.parse(body.guidance)
    : classPlanBlockGuidanceSchema.parse(JSON.parse(existing.guidanceJson));
  await requireMatchingGuidance(db, classId, guidance);
  const fields = {
    ...(body.segmentType !== undefined ? { segmentType: body.segmentType } : {}),
    ...(body.label !== undefined ? { label: body.label } : {}),
    ...(body.targetDurationMs !== undefined ? { targetDurationMs: body.targetDurationMs } : {}),
    ...(body.intensity !== undefined ? { intensity: body.intensity } : {}),
    ...(body.teachingGoal !== undefined ? { teachingGoal: body.teachingGoal } : {}),
    ...(body.movementFocus !== undefined ? { movementFocus: body.movementFocus } : {}),
  };
  await db
    .update(classPlanBlocks)
    .set({
      ...fields,
      ...(body.guidance
        ? { guidanceKind: body.guidance.kind, guidanceJson: JSON.stringify(body.guidance) }
        : {}),
      updatedAt: Date.now(),
    })
    .where(eq(classPlanBlocks.id, id));
  await touchClassUpdatedAt(db, classId);
  const row = await db.select().from(classPlanBlocks).where(eq(classPlanBlocks.id, id)).get();
  return c.json(serializeClassPlanBlock(row!));
});

/** POST /classes/:id/plan-blocks/reorder — complete permutation. */
classPlanBlockRoutes.post('/classes/:id/plan-blocks/reorder', async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  await requireAccess(db, c.get('userId'), classId, 'edit');
  const { planBlockIds } = reorderClassPlanBlocksSchema.parse(await c.req.json());
  const current = await db
    .select({ id: classPlanBlocks.id, position: classPlanBlocks.position })
    .from(classPlanBlocks)
    .where(eq(classPlanBlocks.classId, classId))
    .all();
  const currentIds = new Set(current.map((row) => row.id));
  const requested = new Set(planBlockIds);
  if (
    planBlockIds.length !== currentIds.size ||
    requested.size !== planBlockIds.length ||
    planBlockIds.some((id) => !currentIds.has(id))
  ) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      "planBlockIds must be exactly this class's plan blocks, with no duplicates.",
    );
  }

  const trackRows = await db
    .select({
      id: classTracks.id,
      position: classTracks.position,
      planBlockId: classTracks.planBlockId,
    })
    .from(classTracks)
    .where(eq(classTracks.classId, classId))
    .orderBy(classTracks.position)
    .all();
  const requestedPositions = new Map(planBlockIds.map((id, position) => [id, position]));
  const mode = await timelineModeOf(db, classId);
  if (mode === 'free' && !isTrackPlanOrderValid(trackRows, requestedPositions)) {
    throw new HttpError(
      409,
      'CONFLICT',
      'Reordering these blocks would interleave their tracks on the free timeline.',
    );
  }

  const now = Date.now();
  const shift = current.length + 1;
  // Guard the read-then-write decision against assignments or another block edit
  // from a second tab. D1 batch commits the guard and block positions together.
  const blockSnapshot = JSON.stringify(
    [...current].sort((a, b) => a.id.localeCompare(b.id)).map((row) => [row.id, row.position]),
  );
  const trackSnapshot = JSON.stringify(
    [...trackRows]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((row) => [row.id, row.position, row.planBlockId]),
  );
  const statements = [
    db
      .update(classPlanBlocks)
      .set({ position: sql`${classPlanBlocks.position} + ${shift}`, updatedAt: now })
      .where(
        sql`${classPlanBlocks.classId} = ${classId}
        AND (SELECT COALESCE(json_group_array(json_array(id, position)), '[]')
          FROM (SELECT id, position FROM class_plan_blocks WHERE class_id = ${classId} ORDER BY id))
          = ${blockSnapshot}
        AND (SELECT COALESCE(json_group_array(json_array(id, position, plan_block_id)), '[]')
          FROM (SELECT id, position, plan_block_id FROM class_tracks WHERE class_id = ${classId} ORDER BY id))
          = ${trackSnapshot}
        AND (SELECT timeline_mode FROM classes WHERE id = ${classId}) = ${mode}`,
      )
      .returning({ id: classPlanBlocks.id }),
    ...planBlockIds.map((id, position) =>
      db
        .update(classPlanBlocks)
        .set({ position, updatedAt: now })
        .where(and(eq(classPlanBlocks.id, id), gte(classPlanBlocks.position, shift))),
    ),
  ];
  const [shifted] = await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  if (!Array.isArray(shifted) || shifted.length !== current.length) {
    throw new HttpError(409, 'CONFLICT', 'The plan changed. Refresh and try the move again.');
  }
  if (mode === 'sequential' && trackRows.length > 0) {
    const latestTracks = await db
      .select({
        id: classTracks.id,
        position: classTracks.position,
        planBlockId: classTracks.planBlockId,
      })
      .from(classTracks)
      .where(eq(classTracks.classId, classId))
      .orderBy(classTracks.position)
      .all();
    await resequence(db, classId, orderTrackIdsByPlan(latestTracks, requestedPositions));
  }
  await touchClassUpdatedAt(db, classId);
  const rows = await db
    .select()
    .from(classPlanBlocks)
    .where(eq(classPlanBlocks.classId, classId))
    .orderBy(classPlanBlocks.position)
    .all();
  return c.json(rows.map(serializeClassPlanBlock));
});

/** DELETE /plan-blocks/:id — only empty blocks can be removed implicitly. */
classPlanBlockRoutes.delete('/plan-blocks/:id', async (c) => {
  const db = createDb(c.env);
  const id = c.req.param('id');
  const { classId } = await requirePlanBlockAccess(db, c.get('userId'), id, 'edit');
  const assigned = await db
    .select({ id: classTracks.id })
    .from(classTracks)
    .where(eq(classTracks.planBlockId, id))
    .get();
  if (assigned) {
    throw new HttpError(
      409,
      'CONFLICT',
      'Move or remove this block’s tracks before deleting the block.',
    );
  }

  // Keep the empty-only rule in the DELETE statement: an assignment committed
  // after the read above must not be silently nulled by the FK's ON DELETE action.
  const deleted = await db
    .delete(classPlanBlocks)
    .where(
      sql`${classPlanBlocks.id} = ${id}
      AND NOT EXISTS (SELECT 1 FROM class_tracks WHERE plan_block_id = ${id})`,
    )
    .returning({ id: classPlanBlocks.id });
  if (deleted.length === 0) {
    throw new HttpError(
      409,
      'CONFLICT',
      'Move or remove this block’s tracks before deleting the block.',
    );
  }
  const remaining = await db
    .select({ id: classPlanBlocks.id })
    .from(classPlanBlocks)
    .where(eq(classPlanBlocks.classId, classId))
    .orderBy(classPlanBlocks.position)
    .all();
  if (remaining.length > 0) {
    const now = Date.now();
    await db.batch(
      remaining.map((row, position) =>
        db
          .update(classPlanBlocks)
          .set({ position, updatedAt: now })
          .where(eq(classPlanBlocks.id, row.id)),
      ) as unknown as Parameters<typeof db.batch>[0],
    );
  }
  await touchClassUpdatedAt(db, classId);
  return c.body(null, 204);
});
