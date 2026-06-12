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
  type User,
  type Class,
  type ClassTrack,
} from '@ritmofit/shared';
import type { classes, classTracks } from '../db/schema.js';

type ClassRow = typeof classes.$inferSelect;
type ClassTrackRow = typeof classTracks.$inferSelect;

/** Map a `classes` row to the shared `Class`. Timestamps are plain ms integers. */
export function serializeClass(row: ClassRow): Class {
  return classSchema.parse(row);
}

/** Map a `class_tracks` row to the shared `ClassTrack`. */
export function serializeClassTrack(row: ClassTrackRow): ClassTrack {
  return classTrackSchema.parse(row);
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
