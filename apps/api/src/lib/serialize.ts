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
  moveSchema,
  userMoveSchema,
  trackSchema,
  trackProviderIdSchema,
  type User,
  type Class,
  type ClassTrack,
  type Cue,
  type ClassTrackMove,
  type Move,
  type UserMove,
  type Track,
  type TrackProviderId,
} from '@ritmofit/shared';
import type {
  classes,
  classTracks,
  cues,
  classTrackMoves,
  moves,
  userMoves,
  tracks,
  trackProviderIds,
} from '../db/schema.js';

type ClassRow = typeof classes.$inferSelect;
type ClassTrackRow = typeof classTracks.$inferSelect;
type CueRow = typeof cues.$inferSelect;
type ClassTrackMoveRow = typeof classTrackMoves.$inferSelect;
type MoveRow = typeof moves.$inferSelect;
type UserMoveRow = typeof userMoves.$inferSelect;

/** Map a `classes` row to the shared `Class`. Timestamps are plain ms integers. */
export function serializeClass(row: ClassRow): Class {
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

/** Map a `moves` row to the shared `Move`. */
export function serializeMove(row: MoveRow): Move {
  return moveSchema.parse(row);
}

/** Map a `user_moves` row to the shared `UserMove`. */
export function serializeUserMove(row: UserMoveRow): UserMove {
  return userMoveSchema.parse(row);
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
