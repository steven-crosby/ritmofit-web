/**
 * Common schema primitives shared by every entity.
 *
 * Conventions (`schema.md`, `conventions.md`):
 * - ids are UUIDv4 `TEXT` (except `users.id`, which is whatever Better Auth issues — see identity.ts).
 * - timestamps are `INTEGER` epoch **milliseconds**.
 * - every entity carries `createdAt` / `updatedAt` unless noted.
 */
import { z } from 'zod';

/** A UUIDv4 primary/foreign key. */
export const uuidSchema = z.uuid();

/** Epoch milliseconds — a non-negative integer (decision D10). */
export const timestampMsSchema = z.int().nonnegative();

/**
 * Upper bound (ms) for any track-relative duration/anchor or class-timeline offset
 * a client may submit — 24 hours. Generous enough never to reject a real track or
 * class, tight enough to reject pathological values (e.g. near `MAX_SAFE_INTEGER`)
 * that would bloat the free-mode timeline total or skew downstream beat-grid math.
 * Does NOT apply to epoch-ms timestamps, which are far larger.
 */
export const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

/** A relative offset/anchor in milliseconds into a track (decision D10). */
export const offsetMsSchema = z.int().nonnegative().max(MAX_DURATION_MS);

/**
 * `created_at` / `updated_at` present on every entity. Spread into an entity's
 * shape so the timestamp convention stays identical across the contract.
 */
export const timestampsShape = {
  createdAt: timestampMsSchema,
  updatedAt: timestampMsSchema,
} as const;
