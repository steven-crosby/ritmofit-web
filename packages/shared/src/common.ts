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

/** A relative offset/anchor in milliseconds into a track (decision D10). */
export const offsetMsSchema = z.int().nonnegative();

/**
 * `created_at` / `updated_at` present on every entity. Spread into an entity's
 * shape so the timestamp convention stays identical across the contract.
 */
export const timestampsShape = {
  createdAt: timestampMsSchema,
  updatedAt: timestampMsSchema,
} as const;
