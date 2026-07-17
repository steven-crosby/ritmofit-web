import { eq, sql } from 'drizzle-orm';
import { classes, classTracks } from '../db/schema.js';
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
