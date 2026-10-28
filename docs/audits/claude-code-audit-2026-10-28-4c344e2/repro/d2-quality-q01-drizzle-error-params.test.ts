// Q-01 repro: a Drizzle query error carries every bound parameter in `err.message`.
// Copy to apps/api/src/lib/ and run:
//   pnpm --filter @ritmofit/api exec vitest run src/lib/d2-quality-q01-drizzle-error-params.test.ts
import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import { musicConnections } from '../db/schema.js';
import { verifications as verification } from '../db/auth-schema.js';

/** A D1 binding whose every statement fails the way a transient D1 error does. */
function failingD1(): D1Database {
  const fail = () => Promise.reject(new Error('D1_ERROR: Network connection lost.'));
  const stmt = {
    bind: () => stmt,
    run: fail,
    all: fail,
    first: fail,
    raw: fail,
  };
  return { prepare: () => stmt, batch: fail, exec: fail } as unknown as D1Database;
}

describe('Q-01 Drizzle error messages embed bound params', () => {
  it('upsert of an encrypted provider token puts the ciphertext in err.message', async () => {
    const db = drizzle(failingD1(), { schema });
    const err = await db
      .insert(musicConnections)
      .values({
        id: 'c1',
        userId: 'user-1',
        provider: 'spotify',
        accessTokenEncrypted: 'CIPHERTEXT_ACCESS_SENTINEL',
        refreshTokenEncrypted: 'CIPHERTEXT_REFRESH_SENTINEL',
        providerUserId: null,
        scope: null,
        expiresAt: null,
        createdAt: 1,
        updatedAt: 1,
      })
      .run()
      .catch((e: unknown) => e as Error);
    // Same formatting provider-connections.ts describeOAuthConnectFailure() logs.
    const logged = `[provider-connect:spotify] ${err.name}: ${err.message}`;
    expect(logged).toContain('CIPHERTEXT_ACCESS_SENTINEL');
    expect(logged).toContain('CIPHERTEXT_REFRESH_SENTINEL');
  });

  it('a Better Auth style reset-token lookup puts the raw token in err.message', async () => {
    const db = drizzle(failingD1(), { schema });
    const err = await db
      .select()
      .from(verification)
      .where(eq(verification.identifier, 'reset-password:RAW_RESET_TOKEN_SENTINEL'))
      .all()
      .catch((e: unknown) => e as Error);
    expect(String(err)).toContain('RAW_RESET_TOKEN_SENTINEL');
  });
});
