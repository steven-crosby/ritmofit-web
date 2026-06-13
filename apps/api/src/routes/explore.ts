/**
 * Explore routes (M4) — the public discovery feed.
 *
 * A class with `visibility = 'public'` is listed here for any authenticated user.
 * This is **not** `requireAccess`-gated: it's a public catalog, not a class-scoped
 * op (the visibility column IS the gate, and the `public` VIEW floor in
 * `lib/authz.ts` lets the same users then open the class / run-payload). It never
 * touches `listVisibleClasses` — discovery is deliberately separate from "my classes".
 */
import { Hono } from 'hono';
import { desc, eq, sql } from 'drizzle-orm';
import { exploreClassSchema, type ExploreClass } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { serializeClass } from '../lib/serialize.js';
import { classes, classTracks, users } from '../db/schema.js';

export const exploreRoutes = new Hono<AppEnv>();
exploreRoutes.use('*', requireSession);

/**
 * GET /explore — public classes, newest first, each with its owner's display label
 * and track count so a discovery card needs no follow-up fetch. Featured curation
 * is deferred (M4 decision); v1 is plain recency.
 */
exploreRoutes.get('/explore', async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select({
      cls: classes,
      ownerName: users.displayName,
      ownerEmail: users.email,
      trackCount: sql<number>`count(${classTracks.id})`,
    })
    .from(classes)
    .innerJoin(users, eq(users.id, classes.ownerUserId))
    .leftJoin(classTracks, eq(classTracks.classId, classes.id))
    .where(eq(classes.visibility, 'public'))
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .all();

  const out: ExploreClass[] = rows.map((r) =>
    exploreClassSchema.parse({
      ...serializeClass(r.cls),
      ownerName: r.ownerName ?? r.ownerEmail,
      trackCount: Number(r.trackCount),
    }),
  );
  return c.json(out);
});
