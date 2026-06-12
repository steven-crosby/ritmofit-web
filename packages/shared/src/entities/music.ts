/**
 * Music connections — `music_connections` (schema.md).
 *
 * **M2 placeholder, defined now** so M2 needs no migration touching existing
 * tables. Tokens are encrypted at rest (`ENCRYPTION_KEY`) and **never returned to
 * clients** — routes that serialize this entity must strip the `*Encrypted` fields.
 */
import { z } from 'zod';
import { uuidSchema, timestampMsSchema, timestampsShape } from '../common.js';
import { providerSchema } from '../enums.js';

/** Per-user provider OAuth connection. Unique on (userId, provider). */
export const musicConnectionSchema = z.object({
  id: uuidSchema,
  userId: z.string().min(1),
  provider: providerSchema,
  accessTokenEncrypted: z.string(),
  refreshTokenEncrypted: z.string().nullable(),
  providerUserId: z.string().nullable(),
  scope: z.string().nullable(),
  expiresAt: timestampMsSchema.nullable(),
  ...timestampsShape,
});
export type MusicConnection = z.infer<typeof musicConnectionSchema>;

/**
 * The client-safe view of a connection — the encrypted token blobs are dropped.
 * This is the ONLY connection shape a route may return to a client.
 */
export const musicConnectionViewSchema = musicConnectionSchema.omit({
  accessTokenEncrypted: true,
  refreshTokenEncrypted: true,
});
export type MusicConnectionView = z.infer<typeof musicConnectionViewSchema>;

/**
 * Response to starting a connection. In the live flow the client opens
 * `authorizeUrl`; the dev mock seam connects immediately (`connected: true`,
 * `authorizeUrl: null`).
 */
export const connectProviderResponseSchema = z.object({
  authorizeUrl: z.url().nullable(),
  connected: z.boolean(),
});
export type ConnectProviderResponse = z.infer<typeof connectProviderResponseSchema>;
