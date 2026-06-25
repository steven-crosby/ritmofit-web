/**
 * End-to-end regression for the mock-seam middleware leak (found 2026-06-24).
 *
 * The integration suite normally runs with `MOCK_PROVIDERS='true'`, which makes the
 * dev-only mock gate transparent — so the production bug (a `use('*')` gate mounted
 * at the api root 404ing every route registered after `mockRoutes`: teams, shares,
 * explore, uploads, playlist-import) was invisible to CI. This test drives the
 * *real* mounted worker with `MOCK_PROVIDERS` unset (i.e. production), proving those
 * siblings are reachable while the mock seam itself stays gated.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import worker from '../src/index.js';
import { signUpUser, verifyUserEmail, type TestUser } from './helpers.js';

// Same bindings as the suite, but with the mock seam DISABLED, exactly like prod.
const prodEnv = { ...env, MOCK_PROVIDERS: undefined };

/** Authenticated fetch against the real worker using the production-like env. */
async function callProd(path: string, cookie: string): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await worker.fetch(
    new Request(`https://test.ritmofit.studio${path}`, {
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.10', cookie },
    }),
    prodEnv,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return res;
}

describe('mock seam does not shadow sibling routes in production', () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await signUpUser();
    await verifyUserEmail(user.userId);
  });

  it('GET /explore is reachable (200, not the mock 404) with MOCK_PROVIDERS unset', async () => {
    const res = await callProd('/api/v1/explore?limit=30&offset=0', user.cookie);
    expect(res.status).toBe(200);
  });

  it('GET /teams is reachable (200, not the mock 404) with MOCK_PROVIDERS unset', async () => {
    const res = await callProd('/api/v1/teams', user.cookie);
    expect(res.status).toBe(200);
  });

  it('the /mock/* seam itself stays gated (404) in production', async () => {
    const res = await callProd('/api/v1/mock/track-search?q=x', user.cookie);
    expect(res.status).toBe(404);
  });
});
