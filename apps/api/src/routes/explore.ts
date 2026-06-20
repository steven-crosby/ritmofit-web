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

/** Page size bounds for the Explore feed — the feed grows with every user's
 * published classes, so it is paginated rather than returned whole. */
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

/** Clamp a query-string integer into `[min, max]`, falling back when absent/NaN. */
function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

/**
 * GET /explore?limit=&offset= — public classes, newest first, each with its owner's
 * display label and track count so a discovery card needs no follow-up fetch.
 * Paginated (limit ≤ 50, default 30) so the feed stays bounded as it grows; the
 * client pages with `offset` and stops when a short page comes back. Featured
 * curation is deferred (M4 decision); v1 is plain recency.
 */
exploreRoutes.get('/explore', async (c) => {
  const db = createDb(c.env);
  const limit = clampInt(c.req.query('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(c.req.query('offset'), 0, 0, Number.MAX_SAFE_INTEGER);
  const rows = await db
    .select({
      cls: classes,
      ownerName: users.displayName,
      ownerEmail: users.email,
      trackCount: sql<number>`count(${classTracks.id})`,
      tagsCsv: sql<string>`(select group_concat(tag, ',') from class_tags where class_id = ${classes.id})`,
    })
    .from(classes)
    .innerJoin(users, eq(users.id, classes.ownerUserId))
    .leftJoin(classTracks, eq(classTracks.classId, classes.id))
    .where(eq(classes.visibility, 'public'))
    .groupBy(classes.id)
    .orderBy(desc(classes.updatedAt))
    .limit(limit)
    .offset(offset)
    .all();

  const out: ExploreClass[] = rows.map((r) =>
    exploreClassSchema.parse({
      ...serializeClass({ ...r.cls, tags: r.tagsCsv ? String(r.tagsCsv).split(',') : [] }),
      ownerName: r.ownerName ?? r.ownerEmail,
      trackCount: Number(r.trackCount),
    }),
  );
  return c.json(out);
});
