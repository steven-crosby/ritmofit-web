/**
 * Dev-only mock-track seam (step 9) — a stand-in for M2's provider search/import
 * so the full builder flow runs with **zero provider credentials**. Gated by the
 * `MOCK_PROVIDERS` env: when it isn't 'true' (i.e. production) every route 404s,
 * so the seam can't leak into a real deployment.
 *
 * Imported tracks land in the caller's library exactly like a hand-entered track
 * (owner-scoped, manual BPM) plus the provider id from the catalog.
 */
import { Hono } from 'hono';
import { importMockTrackSchema, type TrackWithProviderIds } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { HttpError, isUniqueViolation } from '../lib/errors.js';
import { serializeTrack, serializeTrackProviderId } from '../lib/serialize.js';
import { searchMockCatalog, findMockCandidate } from '../lib/mock-catalog.js';
import { tracks, trackProviderIds } from '../db/schema.js';

export const mockRoutes = new Hono<AppEnv>();

// Gate: the seam exists only when explicitly enabled (local dev).
mockRoutes.use('*', async (c, next) => {
  if (c.env.MOCK_PROVIDERS !== 'true') {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, 404);
  }
  await next();
});
mockRoutes.use('*', requireSession);

/** GET /mock/track-search?q=&provider= — fake provider candidates from the catalog. */
mockRoutes.get('/mock/track-search', (c) => {
  const q = c.req.query('q') ?? '';
  const provider = c.req.query('provider');
  return c.json(searchMockCatalog(q, provider));
});

/** POST /mock/track-import — import a catalog candidate into the caller's library. */
mockRoutes.post('/mock/track-import', async (c) => {
  const db = createDb(c.env);
  const { provider, providerTrackId } = importMockTrackSchema.parse(await c.req.json());

  const candidate = findMockCandidate(provider, providerTrackId);
  if (!candidate) throw new HttpError(404, 'NOT_FOUND', 'No such track in the mock catalog.');

  const now = Date.now();
  const trackRow = {
    id: crypto.randomUUID(),
    ownerUserId: c.get('userId'),
    title: candidate.title,
    artist: candidate.artist,
    albumArtUrl: candidate.albumArtUrl,
    durationMs: candidate.durationMs,
    displayBpm: null, // manual in M1 — never imported from a provider
    isrc: null,
    createdAt: now,
    updatedAt: now,
  };
  const providerRow = {
    id: crypto.randomUUID(),
    trackId: trackRow.id,
    provider: candidate.provider,
    providerTrackId: candidate.providerTrackId,
    providerUri: candidate.providerUri,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.batch([db.insert(tracks).values(trackRow), db.insert(trackProviderIds).values(providerRow)]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new HttpError(409, 'CONFLICT', 'That provider track is already in a library.');
    }
    throw err;
  }

  const result: TrackWithProviderIds = {
    ...serializeTrack(trackRow),
    providerIds: [serializeTrackProviderId(providerRow)],
  };
  return c.json(result, 201);
});
