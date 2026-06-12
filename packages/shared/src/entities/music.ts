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
