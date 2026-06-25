/**
 * Dev-only mock-track seam (step 9) — a stand-in for M2's provider search/import
 * so the full builder flow runs with **zero provider credentials**. Gated by the
 * `MOCK_PROVIDERS` env: when it isn't 'true' (i.e. production) every route 404s,
 * so the seam can't leak into a real deployment.
 *
 * The M2 `/providers/*` surface (routes/providers.ts) is the forward-facing API;
 * this seam stays as the explicit `/mock/*` path. Both import via the shared
 * `importTrackFromCandidate` helper, so an imported track is identical either way.
 */
import { Hono } from 'hono';
import { importProviderTrackSchema } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { searchMockCatalog, findMockCandidate } from '../lib/mock-catalog.js';
import { importTrackFromCandidate } from '../lib/track-import.js';

export const mockRoutes = new Hono<AppEnv>();

// Gate: the seam exists only when explicitly enabled (local dev). Scope the
// middleware to `/mock/*`, NOT `*`: this router is mounted at the api root
// (`api.route('/', mockRoutes)`), so a `*` matcher leaks to every route
// registered after it in the chain — in production (`MOCK_PROVIDERS !== 'true'`)
// the gate then 404s teams/shares/explore/uploads/playlist-import before their
// handlers run. Matching only `/mock/*` keeps the seam self-contained.
mockRoutes.use('/mock/*', async (c, next) => {
  if (c.env.MOCK_PROVIDERS !== 'true') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404);
  }
  await next();
});
mockRoutes.use('/mock/*', requireSession);

/** GET /mock/track-search?q=&provider= — fake provider candidates from the catalog. */
mockRoutes.get('/mock/track-search', (c) => {
  const q = c.req.query('q') ?? '';
  const provider = c.req.query('provider');
  return c.json(searchMockCatalog(q, provider));
});

/** POST /mock/track-import — import a catalog candidate into the caller's library. */
mockRoutes.post('/mock/track-import', async (c) => {
  const { provider, providerTrackId } = importProviderTrackSchema.parse(await c.req.json());

  const candidate = findMockCandidate(provider, providerTrackId);
  if (!candidate) throw new HttpError(404, 'NOT_FOUND', 'No such track in the mock catalog.');

  const db = createDb(c.env);
  const { track, created } = await importTrackFromCandidate(db, c.get('userId'), candidate);
  return c.json(track, created ? 201 : 200);
});
