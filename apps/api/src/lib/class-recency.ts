import { eq, sql } from 'drizzle-orm';
import { classes } from '../db/schema.js';
import type { Db } from './db.js';

/** Keep the class-library recency key aligned with mutations to class material. */
export async function touchClassUpdatedAt(db: Db, classId: string): Promise<void> {
  const now = Date.now();
  await db
    .update(classes)
    .set({ updatedAt: sql`max(${classes.updatedAt} + 1, ${now})` })
    .where(eq(classes.id, classId));
}
