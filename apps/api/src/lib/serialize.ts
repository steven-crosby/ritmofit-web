/**
 * Boundary serializers: map Better Auth / Drizzle row shapes to the shared contract.
 *
 * Each serializer validates with the shared schema (`.parse`) so a drift between
 * the DB and the contract fails loudly at the boundary rather than leaking out.
 */
import {
  userSchema,
  classSchema,
  classTrackSchema,
  cueSchema,
  classTrackMoveSchema,
  classSectionSchema,
  moveSchema,
  userMoveSchema,
  songByMoveSchema,
  trackSchema,
  trackProviderIdSchema,
  teamSchema,
  teamMembershipSchema,
  teamMemberViewSchema,
  shareSchema,
  shareViewSchema,
  type User,
  type Team,
  type TeamMembership,
  type TeamMemberView,
  type Share,
  type ShareView,
  type Class,
  type ClassTrack,
  type Cue,
  type ClassTrackMove,
  type ClassSection,
  type Move,
  type UserMove,
  type SongByMove,
  type SongByMovePlacement,
  type Track,
  type TrackProviderId,
} from '@ritmofit/shared';
import type {
  classes,
  classTracks,
  cues,
  classTrackMoves,
  classSections,
  moves,
  userMoves,
  tracks,
  trackProviderIds,
  teams,
  shares,
} from '../db/schema.js';

type ClassRow = typeof classes.$inferSelect;
type ClassTrackRow = typeof classTracks.$inferSelect;
type CueRow = typeof cues.$inferSelect;
type ClassTrackMoveRow = typeof classTrackMoves.$inferSelect;
type ClassSectionRow = typeof classSections.$inferSelect;
type MoveRow = typeof moves.$inferSelect;
type UserMoveRow = typeof userMoves.$inferSelect;

/** Map a `classes` row to the shared `Class`. Timestamps are plain ms integers. */
export function serializeClass(row: ClassRow & { tags?: string[] }): Class {
  return classSchema.parse(row);
}

/** Map a `class_tracks` row to the shared `ClassTrack`. */
export function serializeClassTrack(row: ClassTrackRow): ClassTrack {
  return classTrackSchema.parse(row);
}

/** Map a `cues` row to the shared `Cue`. */
export function serializeCue(row: CueRow): Cue {
  return cueSchema.parse(row);
}

/** Map a `class_track_moves` row to the shared `ClassTrackMove`. */
export function serializeClassTrackMove(row: ClassTrackMoveRow): ClassTrackMove {
  return classTrackMoveSchema.parse(row);
}

/** Map a `class_sections` row to the shared `ClassSection`. */
export function serializeClassSection(row: ClassSectionRow): ClassSection {
  return classSectionSchema.parse(row);
}

/** Map a `moves` row to the shared `Move`. */
export function serializeMove(row: MoveRow): Move {
  return moveSchema.parse(row);
}

/** Map a `user_moves` row to the shared `UserMove`. */
export function serializeUserMove(row: UserMoveRow): UserMove {
  return userMoveSchema.parse(row);
}

/**
 * Validate a "songs by move" group — a track plus its placements across the
 * caller's classes — against the shared contract (the reverse-search response).
 */
export function serializeSongByMove(
  track: TrackRow,
  placements: SongByMovePlacement[],
): SongByMove {
  return songByMoveSchema.parse({ track, placements });
}

type TrackRow = typeof tracks.$inferSelect;
type TrackProviderIdRow = typeof trackProviderIds.$inferSelect;

/** Map a `tracks` row to the shared `Track`. */
export function serializeTrack(row: TrackRow): Track {
  return trackSchema.parse(row);
}

/** Map a `track_provider_ids` row to the shared `TrackProviderId`. */
export function serializeTrackProviderId(row: TrackProviderIdRow): TrackProviderId {
  return trackProviderIdSchema.parse(row);
}

type TeamRow = typeof teams.$inferSelect;
type ShareRow = typeof shares.$inferSelect;

/** Map a `teams` row to the shared `Team`. */
export function serializeTeam(row: TeamRow): Team {
  return teamSchema.parse(row);
}

/** Map a `team_memberships` row to the shared `TeamMembership`. */
export function serializeTeamMembership(row: TeamMembership): TeamMembership {
  return teamMembershipSchema.parse(row);
}

/** Validate a joined member-with-profile row against the `TeamMemberView` contract. */
export function serializeTeamMemberView(row: TeamMemberView): TeamMemberView {
  return teamMemberViewSchema.parse(row);
}

/** Map a `shares` row to the shared `Share`. */
export function serializeShare(row: ShareRow): Share {
  return shareSchema.parse(row);
}

/**
 * Map a `shares` row plus its joined target display fields to the `ShareView`
 * contract. `target` carries the left-joined user/team columns (null on the side
 * that doesn't match the share's target kind).
 */
export function serializeShareView(
  row: ShareRow,
  target: { email: string | null; displayName: string | null; teamName: string | null },
): ShareView {
  return shareViewSchema.parse({
    ...row,
    targetEmail: target.email,
    targetDisplayName: target.displayName,
    targetTeamName: target.teamName,
  });
}

/** Better Auth returns `Date`s (timestamp_ms columns); the wire format is epoch ms. */
function toMs(value: Date | number): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * The subset of a Better Auth user object we read. `name` / `image` are Better
 * Auth's field names, populated from our `display_name` / `image_url` columns.
 */
interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  createdAt: Date | number;
  updatedAt: Date | number;
}

/** Map a Better Auth user to the canonical `User`, validated against the contract. */
export function serializeUser(u: AuthUser): User {
  return userSchema.parse({
    id: u.id,
    email: u.email,
    displayName: u.name ?? null,
    imageUrl: u.image ?? null,
    createdAt: toMs(u.createdAt),
    updatedAt: toMs(u.updatedAt),
  });
}
