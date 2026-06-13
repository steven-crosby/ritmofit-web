/**
 * Music-provider routes (M2) — search a provider and import a result into the
 * caller's library. Provider-agnostic surface backed by the registry, which
 * serves the live adapter (SoundCloud first) or the dev mock catalog.
 *
 * These are **authed but not class-scoped**, so they use `requireSession` only
 * (no `requireAccess` — that gate is for class resources). Imported tracks are
 * owner-scoped, exactly like hand-entered ones.
 *
 * Public search/import here use a server-side **app token** held inside the
 * adapter. The `/likes` route instead spends the caller's **per-user** OAuth token
 * from `music_connections` (refreshed on demand) — "search my SoundCloud".
 */
import { Hono } from 'hono';
import {
  providerSchema,
  importProviderTrackSchema,
  type TrackSearchResult,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { getMusicProvider } from '../lib/music/registry.js';
import { fetchUserLikes } from '../lib/music/user-likes.js';
import { importTrackFromCandidate } from '../lib/track-import.js';

export const providerRoutes = new Hono<AppEnv>();
providerRoutes.use('*', requireSession);

/** Parse a `:provider` path segment, or 400 if it isn't a known provider. */
function parseProvider(raw: string) {
  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', `Unknown provider '${raw}'.`);
  }
  return parsed.data;
}

/** Upstream-quota guard: cap proxied search calls per user (B4) + clamp `q` (G1). */
const MAX_QUERY_LEN = 200;
const searchLimiter = rateLimit({
  keyPrefix: 'provider-search',
  windowMs: 60_000,
  max: 30,
  key: (c) => c.get('userId'),
});

/** GET /providers/:provider/search?q= — provider search candidates (contract DTOs). */
providerRoutes.get('/providers/:provider/search', searchLimiter, async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const q = (c.req.query('q') ?? '').slice(0, MAX_QUERY_LEN);
  const adapter = getMusicProvider(provider, c.env);
  const results: TrackSearchResult[] = await adapter.search(q);
  return c.json(results);
});

/** GET /providers/:provider/likes — the caller's liked tracks (spends their token). */
providerRoutes.get('/providers/:provider/likes', async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const db = createDb(c.env);
  const results: TrackSearchResult[] = await fetchUserLikes(db, c.env, c.get('userId'), provider);
  return c.json(results);
});

/**
 * POST /providers/track-import — import a candidate by provider reference. 201 when
 * a new track was created; 200 when it resolved to an existing track (idempotent
 * re-import, or a same-song attach onto a track already in the library).
 */
providerRoutes.post('/providers/track-import', async (c) => {
  const { provider, providerTrackId } = importProviderTrackSchema.parse(await c.req.json());
  const adapter = getMusicProvider(provider, c.env);
  const candidate = await adapter.lookup(providerTrackId);
  if (!candidate) {
    throw new HttpError(404, 'NOT_FOUND', 'No such track at the provider.');
  }
  const db = createDb(c.env);
  const { track, created } = await importTrackFromCandidate(db, c.get('userId'), candidate);
  return c.json(track, created ? 201 : 200);
});
