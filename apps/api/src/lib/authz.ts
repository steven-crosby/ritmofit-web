/**
 * Centralized class authorization — the single gate for every class-scoped route.
 *
 * **D1 has no row-level security**, so this application-level helper is the *only*
 * thing standing between a user and a class they shouldn't see. A missing
 * `requireAccess` call on a class-scoped route is a security bug, not a style nit
 * (see `authorization.md`).
 *
 * Effective access for a (user, class) pair is the highest of: owner, edit-share,
 * view-share, none — where a share grants the user either directly
 * (`target_user_id`) or via a team they belong to (`target_team_id`). This module
 * is structured so the resolution logic is pure and unit-testable against a fake
 * store; the Drizzle-backed store does the real one-query lookups.
 *
 * Scope: **class-scoped resources only**. Owner-scoped resources (`tracks`,
 * `user_moves`) get their own small ownership checks in their routes — keeping
 * this helper's contract narrow and unambiguous (`authorization.md` §Non-class).
 */
import { and, eq, or, sql } from 'drizzle-orm';
import {
  accessLevelValues,
  type AccessLevel,
  type ClassListCursor,
  type ClassWithAccess,
  type SharePermission,
  type ClassVisibility,
} from '@ritmofit/shared';
import {
  classes,
  classTracks,
  cues,
  classTrackMoves,
  classSections,
  shares,
  teamMemberships,
} from '../db/schema.js';
import { HttpError } from './errors.js';
import type { Db } from './db.js';
import { serializeClass } from './serialize.js';

/** Minimum access an operation needs; `'none'` is never a valid requirement. */
export type MinAccessLevel = Exclude<AccessLevel, 'none'>;

/**
 * Thrown when access is insufficient. `404` when the user has NO access at all
 * (hide the resource's existence); `403` when they can see it but lack the level
 * the operation needs (`conventions.md`, `api.md`).
 */
export class AccessError extends HttpError {
  constructor(status: 403 | 404, code: 'FORBIDDEN' | 'NOT_FOUND', message: string) {
    super(status, code, message);
    this.name = 'AccessError';
  }
}

/**
 * The data `resolveAccess` needs, behind an interface so it can be faked in tests.
 * Both lookups are single queries against indexed columns.
 */
export interface AuthzStore {
  /**
   * The class's owner id + discovery visibility, or `null` if the class does not
   * exist. Visibility lets a `public` class grant a VIEW floor to anyone (M4),
   * fetched in the same lookup as the owner so the common path stays one query.
   */
  getClassMeta(
    classId: string,
  ): Promise<{ ownerUserId: string; visibility: ClassVisibility } | null>;
  /**
   * The highest share permission granting `userId` access to `classId` — directly
   * or via team membership — or `null` if no share applies.
   */
  getEffectiveShare(classId: string, userId: string): Promise<SharePermission | null>;
}

/** Rank of an access level (ascending); higher rank ⇒ more access. */
export function accessRank(level: AccessLevel): number {
  return accessLevelValues.indexOf(level);
}

/**
 * Resolve the effective access level for a (user, class) pair. Pure given a store
 * — owner wins, then the highest applicable share, then a `public` VIEW floor
 * (M4), then none (also none when the class is missing, so it's indistinguishable
 * from "no access"). The public floor sits **below** shares so owner/edit still win
 * higher, and never raises access above VIEW.
 */
export async function resolveAccess(
  store: AuthzStore,
  userId: string,
  classId: string,
): Promise<AccessLevel> {
  const meta = await store.getClassMeta(classId);
  if (meta === null) return 'none';
  if (meta.ownerUserId === userId) return 'owner';

  const share = await store.getEffectiveShare(classId, userId);
  if (share === 'edit') return 'edit';
  if (share === 'view') return 'view';
  if (meta.visibility === 'public') return 'view';
  return 'none';
}

/**
 * Enforce a minimum access level, returning the resolved level when satisfied.
 * Throws `404` for NONE (don't reveal existence) and `403` for "visible but
 * insufficient". Pure — unit-tested directly.
 */
export function assertAccess(level: AccessLevel, minLevel: MinAccessLevel): AccessLevel {
  if (accessRank(level) >= accessRank(minLevel)) return level;
  if (level === 'none') {
    throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  }
  throw new AccessError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
}

/** Drizzle-backed store: the real one-query lookups against D1. */
export function createDrizzleAuthzStore(db: Db): AuthzStore {
  return {
    async getClassMeta(classId) {
      const row = await db
        .select({ ownerUserId: classes.ownerUserId, visibility: classes.visibility })
        .from(classes)
        .where(eq(classes.id, classId))
        .get();
      return row ?? null;
    },

    async getEffectiveShare(classId, userId) {
      // One query: class shares granting this user directly OR via a team they're
      // in. Left-join memberships so a team share only matches when the user is a
      // member. Reduce to the highest permission in code (a tiny result set).
      const rows = await db
        .select({ permission: shares.permission })
        .from(shares)
        .leftJoin(
          teamMemberships,
          and(eq(teamMemberships.teamId, shares.targetTeamId), eq(teamMemberships.userId, userId)),
        )
        .where(
          and(
            eq(shares.resourceType, 'class'),
            eq(shares.resourceId, classId),
            or(eq(shares.targetUserId, userId), eq(teamMemberships.userId, userId)),
          ),
        )
        .all();

      if (rows.some((r) => r.permission === 'edit')) return 'edit';
      if (rows.some((r) => r.permission === 'view')) return 'view';
      return null;
    },
  };
}

interface VisibleClassRow {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  template: 'cycle' | 'hiit' | 'sculpt' | 'tread' | null;
  status: 'draft' | 'ready' | 'archived';
  visibility: 'private' | 'public';
  targetDurationMs: number | null;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
  accessLevel: Exclude<AccessLevel, 'none'>;
}

export interface VisibleClassPage {
  items: ClassWithAccess[];
  nextCursor: ClassListCursor | null;
}

/**
 * List owned ∪ directly shared ∪ team-shared classes in D1, reducing duplicate
 * paths to the highest access level before applying deterministic keyset order.
 * With no `limit`, this preserves the legacy full-array behavior used by iOS.
 */
export async function listVisibleClasses(
  db: Db,
  userId: string,
  options: { limit?: number; cursor?: ClassListCursor } = {},
): Promise<VisibleClassPage> {
  const cursorFilter = options.cursor
    ? sql`and (
        c.updated_at < ${options.cursor.updatedAt}
        or (c.updated_at = ${options.cursor.updatedAt} and c.id < ${options.cursor.id})
      )`
    : sql``;
  const limitClause = options.limit == null ? sql`` : sql`limit ${options.limit + 1}`;

  const rows = await db.all<VisibleClassRow>(sql`
    with access_candidates(class_id, access_rank) as (
      select id, 3
      from classes
      where owner_user_id = ${userId}

      union all

      select resource_id, case permission when 'edit' then 2 else 1 end
      from shares
      where resource_type = 'class' and target_user_id = ${userId}

      union all

      select s.resource_id, case s.permission when 'edit' then 2 else 1 end
      from team_memberships tm
      cross join shares s on s.target_team_id = tm.team_id
      where tm.user_id = ${userId} and s.resource_type = 'class'
    ),
    visible(class_id, access_rank) as (
      select class_id, max(access_rank)
      from access_candidates
      group by class_id
    )
    select
      c.id,
      c.owner_user_id as ownerUserId,
      c.title,
      c.description,
      c.template,
      c.status,
      c.visibility,
      c.target_duration_ms as targetDurationMs,
      c.created_at as createdAt,
      c.updated_at as updatedAt,
      c.last_opened_at as lastOpenedAt,
      case visible.access_rank
        when 3 then 'owner'
        when 2 then 'edit'
        else 'view'
      end as accessLevel
    from visible
    inner join classes c on c.id = visible.class_id
    where 1 = 1
    ${cursorFilter}
    order by c.updated_at desc, c.id desc
    ${limitClause}
  `);

  const hasMore = options.limit != null && rows.length > options.limit;
  const pageRows = hasMore ? rows.slice(0, options.limit) : rows;
  const items = pageRows.map((row) => ({
    ...serializeClass(row),
    accessLevel: row.accessLevel,
  }));
  const last = hasMore ? items.at(-1) : undefined;
  return {
    items,
    nextCursor: last ? { updatedAt: last.updatedAt, id: last.id } : null,
  };
}

/**
 * The route-facing gate. Resolves effective access for the caller against the
 * class and enforces `minLevel`, throwing `AccessError` (mapped to the JSON error
 * envelope by the app's `onError`). Returns the resolved level for routes that
 * want to branch on it. **Call this on every class-scoped route.**
 */
export async function requireAccess(
  db: Db,
  userId: string,
  classId: string,
  minLevel: MinAccessLevel,
): Promise<AccessLevel> {
  const level = await resolveAccess(createDrizzleAuthzStore(db), userId, classId);
  return assertAccess(level, minLevel);
}

/**
 * Resolve the `class_track → class` parent chain and enforce access on that class
 * (authorization.md: choreography/class_track resources carry no ACL of their own).
 * 404s when the class_track doesn't exist — indistinguishable from "no access".
 * Returns the parent class id so callers needn't re-query it.
 */
export async function requireClassTrackAccess(
  db: Db,
  userId: string,
  classTrackId: string,
  minLevel: MinAccessLevel,
): Promise<{ classId: string; level: AccessLevel }> {
  const row = await db
    .select({ classId: classTracks.classId })
    .from(classTracks)
    .where(eq(classTracks.id, classTrackId))
    .get();
  if (!row) throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  const level = await requireAccess(db, userId, row.classId, minLevel);
  return { classId: row.classId, level };
}

/**
 * Resolve `cue → class_track → class` and enforce access. 404s when the cue is
 * missing. Returns the parent class_track id so callers needn't re-query it.
 */
export async function requireCueAccess(
  db: Db,
  userId: string,
  cueId: string,
  minLevel: MinAccessLevel,
): Promise<{ classTrackId: string; level: AccessLevel }> {
  const row = await db
    .select({ classTrackId: cues.classTrackId })
    .from(cues)
    .where(eq(cues.id, cueId))
    .get();
  if (!row) throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  const { level } = await requireClassTrackAccess(db, userId, row.classTrackId, minLevel);
  return { classTrackId: row.classTrackId, level };
}

/**
 * Resolve `class_track_move → class_track → class` and enforce access. 404s when
 * the placement is missing. Returns the parent class_track id.
 */
export async function requireClassTrackMoveAccess(
  db: Db,
  userId: string,
  classTrackMoveId: string,
  minLevel: MinAccessLevel,
): Promise<{ classTrackId: string; level: AccessLevel }> {
  const row = await db
    .select({ classTrackId: classTrackMoves.classTrackId })
    .from(classTrackMoves)
    .where(eq(classTrackMoves.id, classTrackMoveId))
    .get();
  if (!row) throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  const { level } = await requireClassTrackAccess(db, userId, row.classTrackId, minLevel);
  return { classTrackId: row.classTrackId, level };
}

/**
 * Resolve `class_section → class` and enforce access. Sections are class-scoped
 * (no ACL of their own). 404s when the section is missing. Returns the class id.
 */
export async function requireSectionAccess(
  db: Db,
  userId: string,
  sectionId: string,
  minLevel: MinAccessLevel,
): Promise<{ classId: string; level: AccessLevel }> {
  const row = await db
    .select({ classId: classSections.classId })
    .from(classSections)
    .where(eq(classSections.id, sectionId))
    .get();
  if (!row) throw new AccessError(404, 'NOT_FOUND', 'Not found.');
  const level = await requireAccess(db, userId, row.classId, minLevel);
  return { classId: row.classId, level };
}
