/**
 * Drizzle schema for Cloudflare D1 (SQLite) — the executable mirror of
 * `ritmofit_dev_plan/schema.md` (the human source of truth). If the two diverge,
 * reconcile `schema.md` first.
 *
 * D1/SQLite conventions:
 * - `id` is `TEXT` holding a UUIDv4 (except `users.id`, which is whatever Better
 *   Auth issues — a plain string, not assumed UUID).
 * - timestamps are `INTEGER` epoch **milliseconds** (`created_at`/`updated_at` on
 *   every table unless noted).
 * - enums are `TEXT` columns. Drizzle's `text({ enum: [...] })` enforces only at
 *   the TS layer — it does NOT emit a SQL CHECK — so each enum column also gets an
 *   explicit `check()` built from the SAME shared `*Values` tuple, keeping the DB
 *   constraint and the Zod schema from drifting (D1 has no other backstop).
 *
 * Enum value tuples are imported from `@ritmofit/shared` so the contract is
 * defined exactly once (CLAUDE.md: "the shared package is the contract").
 */
import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  check,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import {
  intensityValues,
  providerValues,
  teamRoleValues,
  classTemplateValues,
  classStatusValues,
  classVisibilityValues,
  sharePermissionValues,
  shareResourceTypeValues,
  segmentTypeValues,
} from '@ritmofit/shared';

/**
 * A SQL CHECK restricting a TEXT column to an enum's values. Nullable enum
 * columns pass automatically: `col in (...)` is NULL when `col` is NULL, and
 * SQLite treats a NULL-valued CHECK as satisfied.
 */
function enumCheck(name: string, column: AnySQLiteColumn, values: readonly string[]) {
  const list = sql.raw(values.map((v) => `'${v}'`).join(', '));
  return check(name, sql`${column} in (${list})`);
}

/** `created_at` / `updated_at` (epoch ms). Called per table — column builders aren't reusable. */
function timestamps() {
  return {
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  };
}

// ── Identity & teams ────────────────────────────────────────────────────────

/**
 * Canonical user record. Better Auth's D1 adapter creates the row on first
 * sign-in; we own these extra columns. `id` is Better Auth's id (not re-keyed).
 * Better Auth's own session/account/verification tables are added in step 4.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  // Better Auth maps its `name` / `image` fields onto these columns (see lib/auth.ts),
  // so the shared `userSchema` contract (displayName / imageUrl) is untouched.
  displayName: text('display_name'),
  imageUrl: text('image_url'),
  // The one Better Auth user column beyond schema.md's set; Better Auth-managed.
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  // timestamp_ms mode: Better Auth writes/reads `Date`s, stored as epoch ms (D10).
  // Same `integer` SQL as the other tables — no migration diff, just a TS-level mode.
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => users.id),
  ...timestamps(),
});

export const teamMemberships = sqliteTable(
  'team_memberships',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    // teams CASCADE → memberships.
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    role: text('role', { enum: teamRoleValues }).notNull(),
    joinedAt: integer('joined_at').notNull(),
  },
  (t) => [
    enumCheck('team_memberships_role_check', t.role, teamRoleValues),
    uniqueIndex('team_memberships_user_team_unique').on(t.userId, t.teamId),
  ],
);

// ── Classes & music ─────────────────────────────────────────────────────────

export const classes = sqliteTable(
  'classes',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    template: text('template', { enum: classTemplateValues }),
    status: text('status', { enum: classStatusValues }).notNull().default('draft'),
    // Discovery visibility (M4), orthogonal to lifecycle `status`. Default private
    // so every existing/new class stays owner+shares-only until explicitly published.
    visibility: text('visibility', { enum: classVisibilityValues }).notNull().default('private'),
    featuredCategory: text('featured_category'),
    coverImageUrl: text('cover_image_url'),
    targetDurationMs: integer('target_duration_ms'),
    ...timestamps(),
    lastOpenedAt: integer('last_opened_at'),
  },
  (t) => [
    enumCheck('classes_template_check', t.template, classTemplateValues),
    enumCheck('classes_status_check', t.status, classStatusValues),
    enumCheck('classes_visibility_check', t.visibility, classVisibilityValues),
    index('classes_visibility_idx').on(t.visibility),
    // Cover the owned arm and its stable library ordering boundary.
    index('classes_owner_updated_id_idx').on(t.ownerUserId, t.updatedAt, t.id),
  ],
);

export const tracks = sqliteTable(
  'tracks',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id),
    title: text('title').notNull(),
    artist: text('artist').notNull(),
    albumArtUrl: text('album_art_url'),
    durationMs: integer('duration_ms'),
    displayBpm: integer('display_bpm'),
    isrc: text('isrc'),
    // Normalized (title, artist) key for same-song matching — `makeMatchKey`
    // (lib/same-song.ts). Indexed so import resolves candidates without scanning the
    // owner's whole library. Nullable: hand-entered tracks may predate it.
    matchKey: text('match_key'),
    ...timestamps(),
  },
  (t) => [index('tracks_owner_match_key_idx').on(t.ownerUserId, t.matchKey)],
);

export const trackProviderIds = sqliteTable(
  'track_provider_ids',
  {
    id: text('id').primaryKey(),
    // tracks CASCADE → their provider ids.
    trackId: text('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    // Denormalized owner (== the parent track's owner) so provider-id uniqueness
    // can be scoped PER USER. Tracks are a per-user library (D4): the same provider
    // track may legitimately exist in many users' libraries, so a global unique on
    // (provider, provider_track_id) would 409 the second importer of any song.
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider', { enum: providerValues }).notNull(),
    providerTrackId: text('provider_track_id').notNull(),
    providerUri: text('provider_uri'),
    ...timestamps(),
  },
  (t) => [
    enumCheck('track_provider_ids_provider_check', t.provider, providerValues),
    uniqueIndex('track_provider_ids_owner_provider_id_unique').on(
      t.ownerUserId,
      t.provider,
      t.providerTrackId,
    ),
    // Track-scoped lookups (`WHERE track_id = ?`) run on every import and purge
    // sweep; the unique index above is owner/provider-first and can't serve them.
    index('track_provider_ids_track_id_idx').on(t.trackId),
  ],
);

export const classTracks = sqliteTable(
  'class_tracks',
  {
    id: text('id').primaryKey(),
    // classes CASCADE → class_tracks.
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    // tracks RESTRICT while referenced — a track in use can't vanish under a class.
    trackId: text('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    intensity: text('intensity', { enum: intensityValues }).notNull().default('none'),
    displayBpmOverride: integer('display_bpm_override'),
    durationMsOverride: integer('duration_ms_override'),
    // Per-class playback window into the track (trimming). clip_start_ms trims the
    // intro (default 0); clip_end_ms trims the tail (null = to the effective end).
    // Window-only — the audio file is untouched (the three music constraints stand).
    clipStartMs: integer('clip_start_ms').notNull().default(0),
    clipEndMs: integer('clip_end_ms'),
    // Downbeat offset for beat-snapping: track-relative ms where beat 1 of bar 1
    // lands. Default 0 (grid starts at the track/clip start until the instructor
    // marks the first beat). 4/4 is assumed; tempo comes from the resolved BPM.
    beatAnchorMs: integer('beat_anchor_ms').notNull().default(0),
    startOffsetMs: integer('start_offset_ms'),
    notes: text('notes'),
    ...timestamps(),
  },
  (t) => [
    enumCheck('class_tracks_intensity_check', t.intensity, intensityValues),
    check(
      'class_tracks_duration_ms_override_check',
      sql`${t.durationMsOverride} is null or ${t.durationMsOverride} > 0`,
    ),
    check(
      'class_tracks_clip_window_check',
      sql`${t.clipStartMs} >= 0 and (${t.clipEndMs} is null or ${t.clipEndMs} > ${t.clipStartMs})`,
    ),
    // Hot path: every class-detail load / run-payload assembly fetches a class's
    // tracks by class_id.
    index('class_tracks_class_id_idx').on(t.classId),
  ],
);

export const classTags = sqliteTable(
  'class_tags',
  {
    id: text('id').primaryKey(),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('class_tags_class_id_tag_unq').on(t.classId, t.tag),
    index('class_tags_tag_idx').on(t.tag),
  ],
);

// ── Moves library ───────────────────────────────────────────────────────────

/** Global, seeded movement library (see `seed.sql`). */
export const moves = sqliteTable(
  'moves',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    template: text('template', { enum: classTemplateValues }),
    ...timestamps(),
  },
  (t) => [enumCheck('moves_template_check', t.template, classTemplateValues)],
);

export const userMoves = sqliteTable(
  'user_moves',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    // moves SET NULL → user_moves.base_move_id (the optional library link).
    baseMoveId: text('base_move_id').references(() => moves.id, { onDelete: 'set null' }),
    template: text('template', { enum: classTemplateValues }),
    ...timestamps(),
  },
  (t) => [
    enumCheck('user_moves_template_check', t.template, classTemplateValues),
    // Hot path: the moves picker lists a user's custom moves by user_id.
    index('user_moves_user_id_idx').on(t.userId),
  ],
);

// ── Choreography (anchored to a class_track) ────────────────────────────────

export const cues = sqliteTable(
  'cues',
  {
    id: text('id').primaryKey(),
    // class_tracks CASCADE → cues.
    classTrackId: text('class_track_id')
      .notNull()
      .references(() => classTracks.id, { onDelete: 'cascade' }),
    anchorMs: integer('anchor_ms').notNull(),
    beat: integer('beat'),
    bar: integer('bar'),
    text: text('text').notNull(),
    color: text('color'),
    ...timestamps(),
  },
  (t) => [
    // Hot path: cues are fetched per class_track when assembling the run-payload.
    index('cues_class_track_id_idx').on(t.classTrackId),
  ],
);

export const classTrackMoves = sqliteTable(
  'class_track_moves',
  {
    id: text('id').primaryKey(),
    // class_tracks CASCADE → class_track_moves.
    classTrackId: text('class_track_id')
      .notNull()
      .references(() => classTracks.id, { onDelete: 'cascade' }),
    anchorMs: integer('anchor_ms').notNull(),
    // moves / user_moves SET NULL — the placement survives via name_override.
    moveId: text('move_id').references(() => moves.id, { onDelete: 'set null' }),
    userMoveId: text('user_move_id').references(() => userMoves.id, { onDelete: 'set null' }),
    nameOverride: text('name_override'),
    intensity: text('intensity', { enum: intensityValues }),
    ...timestamps(),
  },
  (t) => [
    enumCheck('class_track_moves_intensity_check', t.intensity, intensityValues),
    // At most one library reference, and at least one of (move | user_move | name).
    check(
      'class_track_moves_reference_check',
      sql`((${t.moveId} is not null) + (${t.userMoveId} is not null)) <= 1
        and (${t.moveId} is not null or ${t.userMoveId} is not null or ${t.nameOverride} is not null)`,
    ),
    // Hot path: placed moves are fetched per class_track when assembling the run-payload.
    index('class_track_moves_class_track_id_idx').on(t.classTrackId),
  ],
);

// ── Sections (energy-arc segment bands) ─────────────────────────────────────

/**
 * Time-anchored segment bands under the timeline (09, 10 §4). A section begins at
 * `start_offset_ms` and runs to the next section's start (or class end). `type` is
 * a fixed enum; free anchors (no contiguity/overlap constraint — render orders by
 * start). classes CASCADE → sections.
 */
export const classSections = sqliteTable(
  'class_sections',
  {
    id: text('id').primaryKey(),
    classId: text('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    type: text('type', { enum: segmentTypeValues }).notNull(),
    startOffsetMs: integer('start_offset_ms').notNull(),
    ...timestamps(),
  },
  (t) => [
    enumCheck('class_sections_type_check', t.type, segmentTypeValues),
    index('class_sections_class_idx').on(t.classId),
  ],
);

// ── Sharing (Google Drive model) ────────────────────────────────────────────

/**
 * `resource_id` is polymorphic (a class id in M1) so it carries NO foreign key.
 * The classes → shares cascade in `schema.md` is therefore enforced in
 * application code (the class-delete route deletes matching shares), not by D1.
 */
export const shares = sqliteTable(
  'shares',
  {
    id: text('id').primaryKey(),
    resourceType: text('resource_type', { enum: shareResourceTypeValues }).notNull(),
    resourceId: text('resource_id').notNull(),
    sharedByUserId: text('shared_by_user_id')
      .notNull()
      .references(() => users.id),
    targetUserId: text('target_user_id').references(() => users.id),
    // teams CASCADE → shares targeting the team.
    targetTeamId: text('target_team_id').references(() => teams.id, { onDelete: 'cascade' }),
    permission: text('permission', { enum: sharePermissionValues }).notNull(),
    ...timestamps(),
  },
  (t) => [
    enumCheck('shares_resource_type_check', t.resourceType, shareResourceTypeValues),
    enumCheck('shares_permission_check', t.permission, sharePermissionValues),
    // Exactly one target (user XOR team).
    check(
      'shares_one_target_check',
      sql`(${t.targetUserId} is null) <> (${t.targetTeamId} is null)`,
    ),
    // At most one share per (resource, target) — two partial uniques.
    uniqueIndex('shares_resource_target_user_unique')
      .on(t.resourceType, t.resourceId, t.targetUserId)
      .where(sql`${t.targetUserId} is not null`),
    uniqueIndex('shares_resource_target_team_unique')
      .on(t.resourceType, t.resourceId, t.targetTeamId)
      .where(sql`${t.targetTeamId} is not null`),
    index('shares_target_user_resource_idx').on(t.resourceType, t.targetUserId, t.resourceId),
    index('shares_target_team_resource_idx').on(t.resourceType, t.targetTeamId, t.resourceId),
  ],
);

// ── Music connections (M2 placeholder) ──────────────────────────────────────

/** Per-user provider OAuth connection. Tokens are encrypted at rest; never sent to clients. */
export const musicConnections = sqliteTable(
  'music_connections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider', { enum: providerValues }).notNull(),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    providerUserId: text('provider_user_id'),
    scope: text('scope'),
    expiresAt: integer('expires_at'),
    ...timestamps(),
  },
  (t) => [
    enumCheck('music_connections_provider_check', t.provider, providerValues),
    uniqueIndex('music_connections_user_provider_unique').on(t.userId, t.provider),
  ],
);

/**
 * Disconnect leaves a 7-day duty to purge that provider's derived metadata
 * (provider IDs/URIs, album art) from the user's tracks. The DELETE on
 * `music_connections` forgets the tokens immediately (security); this queue
 * defers the heavier metadata sweep so it runs out-of-band, durably, on a daily
 * Cron Trigger (see `lib/music/purge.ts`). Rows are dropped once the purge for a
 * (user, provider) succeeds. No FK to `music_connections` — the connection is
 * already gone by the time we enqueue.
 */
export const providerPurgeQueue = sqliteTable(
  'provider_purge_queue',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    provider: text('provider', { enum: providerValues }).notNull(),
    requestedAt: integer('requested_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    // Exhausted duties remain durable and visible for operator recovery.
    failedAt: integer('failed_at'),
  },
  (t) => [
    enumCheck('provider_purge_queue_provider_check', t.provider, providerValues),
    index('provider_purge_queue_active_requested_idx').on(t.failedAt, t.requestedAt),
  ],
);

/**
 * Fixed-window rate-limit counters (B4). Better Auth's `rateLimit:
 * { storage: 'database' }` keeps its per-key state here (one row per key); our
 * own provider-search limiter (`lib/rate-limit.ts`) reuses the same table with a
 * namespaced key prefix and the same fixed-window semantics. Columns match what
 * Better Auth's adapter expects (`key` / `count` / `lastRequest`).
 */
export const rateLimits = sqliteTable(
  'rate_limit',
  {
    id: text('id').primaryKey(),
    key: text('key'),
    count: integer('count'),
    lastRequest: integer('last_request'),
  },
  (t) => [
    uniqueIndex('rate_limit_key_unq').on(t.key),
    // The daily Cron prunes stale rows by `WHERE last_request < ?`; without this
    // the delete scans the whole counter table as auth/search traffic grows.
    index('rate_limit_last_request_idx').on(t.lastRequest),
  ],
);

// ── Better Auth-managed tables ──────────────────────────────────────────────
// Re-exported here so the Drizzle client and drizzle-kit see one combined schema.
// `users` (above) is ours, extended for Better Auth; these three are managed by it.
export { sessions, accounts, verifications } from './auth-schema.js';
