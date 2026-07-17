import { eq, inArray, sql } from 'drizzle-orm';
import { classes, classTrackMoves, classTracks } from '../db/schema.js';
import type { Db } from './db.js';

/** Keep the class-library recency key aligned with mutations to class material. */
export async function touchClassUpdatedAt(db: Db, classId: string): Promise<void> {
  const now = Date.now();
  await db
    .update(classes)
    .set({ updatedAt: sql`max(${classes.updatedAt} + 1, ${now})` })
    .where(eq(classes.id, classId));
}

/** Resolve a class_track parent and keep its class-library recency key current. */
export async function touchClassTrackParentUpdatedAt(db: Db, classTrackId: string): Promise<void> {
  const parent = await db
    .select({ classId: classTracks.classId })
    .from(classTracks)
    .where(eq(classTracks.id, classTrackId))
    .get();
  if (parent) await touchClassUpdatedAt(db, parent.classId);
}

/** Keep every class that resolves a custom move's live name at the recent boundary. */
export async function touchUserMoveParentClassesUpdatedAt(
  db: Db,
  userMoveId: string,
): Promise<void> {
  const parents = await db
    .selectDistinct({ classId: classTracks.classId })
    .from(classTrackMoves)
    .innerJoin(classTracks, eq(classTracks.id, classTrackMoves.classTrackId))
    .where(eq(classTrackMoves.userMoveId, userMoveId))
    .all();
  const classIds = parents.map((parent) => parent.classId);
  if (classIds.length === 0) return;

  const now = Date.now();
  await db
    .update(classes)
    .set({ updatedAt: sql`max(${classes.updatedAt} + 1, ${now})` })
    .where(inArray(classes.id, classIds));
}
