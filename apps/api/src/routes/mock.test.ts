/**
 * Regression: the dev-only mock seam's gate must stay scoped to `/mock/*`.
 *
 * `mockRoutes` is mounted at the api root in `index.ts` (`api.route('/', mockRoutes)`),
 * so a `*` matcher on its middleware leaked the production "not enabled" 404 onto
 * every sibling route registered *after* it in the chain — teams, shares, explore,
 * uploads, and playlist-import all returned `{code: NOT_FOUND}` in production while
 * passing CI (integration tests run with `MOCK_PROVIDERS='true'`, which makes the
 * gate transparent). These plain-Hono tests run in the node unit config with
 * `MOCK_PROVIDERS` unset, reproducing production, and pin the scoping so the gate
 * can never shadow a sibling again. (Found 2026-06-24: explore + teams 404 on prod.)
 */
import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { mockRoutes } from './mock.js';
import type { AppEnv } from '../lib/types.js';

/** Mirror index.ts: mock mounted at the root, a sibling route registered AFTER it. */
function appWithSiblingAfterMock() {
  const app = new Hono<AppEnv>();
  app.route('/', mockRoutes);
  // Stands in for exploreRoutes / teamRoutes / shareRoutes, all mounted after mock.
  app.get('/explore', (c) => c.json({ ok: true }));
  return app;
}

// Pass only the field the gate reads; the rest of AppEnv's bindings are unused here.
const prodEnv = { MOCK_PROVIDERS: undefined } as unknown as AppEnv['Bindings'];
const mockEnv = { MOCK_PROVIDERS: 'true' } as unknown as AppEnv['Bindings'];

describe('mock seam gate scoping', () => {
  it('does NOT shadow a sibling route in production (MOCK_PROVIDERS unset)', async () => {
    const res = await appWithSiblingAfterMock().request('/explore', {}, prodEnv);
    // Pre-fix this was 404 (the `*` mock gate short-circuited); the sibling must run.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('still 404s its own /mock/* routes in production (gate intact)', async () => {
    const res = await appWithSiblingAfterMock().request('/mock/track-search?q=x', {}, prodEnv);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  });

  it('passes its own /mock/* routes through to auth when MOCK_PROVIDERS=true', async () => {
    // Gate calls next() → requireSession runs → no session → 401 (NOT the gate's 404).
    const res = await appWithSiblingAfterMock().request('/mock/track-search?q=x', {}, mockEnv);
    expect(res.status).toBe(401);
  });
});
