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
import { and, eq, or } from 'drizzle-orm';
import {
  accessLevelValues,
  type AccessLevel,
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

/**
 * The visible-classes union for a user: owned ∪ shared-directly ∪ shared-via-team
 * (authorization.md), reduced to the **highest** effective access level per class.
 * The list counterpart to `resolveAccess` — both live here so the access model has
 * a single home (a class never appears with level `'none'`). Returns a Map of
 * classId → level; callers fetch and shape the class rows themselves.
 */
export async function listVisibleClasses(
  db: Db,
  userId: string,
): Promise<Map<string, AccessLevel>> {
  // The three union arms are independent — run them in one round-trip wave.
  const [owned, direct, viaTeam] = await Promise.all([
    db.select({ id: classes.id }).from(classes).where(eq(classes.ownerUserId, userId)).all(),
    db
      .select({ id: shares.resourceId, permission: shares.permission })
      .from(shares)
      .where(and(eq(shares.resourceType, 'class'), eq(shares.targetUserId, userId)))
      .all(),
    db
      .select({ id: shares.resourceId, permission: shares.permission })
      .from(shares)
      .innerJoin(teamMemberships, eq(teamMemberships.teamId, shares.targetTeamId))
      .where(and(eq(shares.resourceType, 'class'), eq(teamMemberships.userId, userId)))
      .all(),
  ]);

  const levelById = new Map<string, AccessLevel>();
  const bump = (id: string, level: AccessLevel) => {
    const current = levelById.get(id);
    if (!current || accessRank(level) > accessRank(current)) levelById.set(id, level);
  };
  owned.forEach((r) => bump(r.id, 'owner'));
  [...direct, ...viaTeam].forEach((r) => bump(r.id, r.permission));
  return levelById;
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
