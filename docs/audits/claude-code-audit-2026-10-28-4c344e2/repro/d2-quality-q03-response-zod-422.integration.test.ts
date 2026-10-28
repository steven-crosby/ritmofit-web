// Q-03 repro: a response-serialization ZodError (stored row fails the shared read schema)
// is reported to the client as 422 "Request body failed validation." on a GET, and the
// Worker logs nothing. The row is planted directly in D1 to stand in for any drift
// between stored data and the shared schema.
// Copy to apps/api/test/ and run:
//   pnpm --filter @ritmofit/api exec vitest run --config vitest.integration.config.ts test/d2-quality-q03-response-zod-422.integration.test.ts
import { env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { createDb } from '../src/lib/db.js';
import { tracks } from '../src/db/schema.js';
import { authed, signUpUser } from './helpers.js';

describe('Q-03 response-side ZodError maps to a silent 422', () => {
  it('GET /tracks/:id with a stored row the read schema rejects', async () => {
    const user = await signUpUser();
    const api = authed(user.cookie);
    const now = Date.now();
    const id = crypto.randomUUID();
    await createDb(env).insert(tracks).values({
      id,
      ownerUserId: user.userId,
      title: 'Song',
      artist: '', // trackSchema requires min(1); D1 has no length CHECK
      albumArtUrl: null,
      durationMs: 180000,
      displayBpm: null,
      isrc: null,
      matchKey: 'song::',
      createdAt: now,
      updatedAt: now,
    });
    const errorSpy = vi.spyOn(console, 'error');
    const warnSpy = vi.spyOn(console, 'warn');
    const res = await api(`/api/v1/tracks/${id}`);
    const body = (await res.json()) as { error: { code: string; message: string } };
    console.log(
      `Q-03 status=${res.status} code=${body.error.code} message="${body.error.message}"`,
    );
    expect(res.status).toBe(422);
    expect(body.error.message).toBe('Request body failed validation.');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
