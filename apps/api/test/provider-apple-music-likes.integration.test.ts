/**
 * Apple Music "search my library" error contract (integration) — drives the real
 * worker's `GET /providers/apple_music/likes` with the mock seam DISABLED
 * (`MOCK_PROVIDERS` unset, like production) plus a static developer token, so the
 * request actually reaches `fetchAppleMusicLikes` rather than the mock catalog.
 *
 * The suite-wide `MOCK_PROVIDERS='true'` short-circuits `fetchUserLikes` to the
 * mock catalog before the apple_music branch ever runs, so the prod-facing error
 * contract is otherwise unverified. This covers the no-connection branch: a user
 * who has not linked Apple Music gets `409 NOT_CONNECTED`, proving the `userLikes`
 * capability flip routes to the real Apple path (not a `501 NOT_IMPLEMENTED`) and
 * that the error contract holds. The authorized happy path and the 401→REAUTH
 * mapping are exercised at the adapter unit level (`apple-music.test.ts`), since
 * the integration suite does not stub outbound provider HTTP.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import worker from '../src/index.js';
import { signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

// Same bindings as the suite, but with the mock seam off (prod-like) and a static
// Apple Music developer token present so `appleMusicCreds` resolves.
const prodEnv = { ...env, MOCK_PROVIDERS: undefined, APPLE_MUSIC_DEVELOPER_TOKEN: 'devtok-test' };

/** Authenticated fetch against the real worker using the production-like env. */
async function callProd(path: string, cookie: string): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(`https://test.ritmofit.studio${path}`, {
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.20', cookie },
    }),
    prodEnv,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

describe('Apple Music likes error contract (integration)', () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await signUpUser();
    await verifyUserEmail(user.userId);
  });

  it('returns 409 NOT_CONNECTED when Apple Music is not linked (real path, not mock or 501)', async () => {
    const res = await callProd('/api/v1/providers/apple_music/likes', user.cookie);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('NOT_CONNECTED');
  });
});
