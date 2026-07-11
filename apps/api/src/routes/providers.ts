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
  type ProviderPlaylistSummary,
  type TrackSearchResult,
} from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { getMusicProvider } from '../lib/music/registry.js';
import { fetchUserLikes } from '../lib/music/user-likes.js';
import { fetchUserPlaylistTracks, fetchUserPlaylists } from '../lib/music/user-playlists.js';
import { importUserPlaylist } from '../lib/music/import-playlist.js';
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

// /likes spends the caller's own OAuth token; /track-import spends the shared app
// token. Both proxy upstream provider calls, so cap them per user like search.
const likesLimiter = rateLimit({
  keyPrefix: 'provider-likes',
  windowMs: 60_000,
  max: 20,
  key: (c) => c.get('userId'),
});
const playlistsLimiter = rateLimit({
  keyPrefix: 'provider-playlists',
  windowMs: 60_000,
  max: 20,
  key: (c) => c.get('userId'),
});
const importLimiter = rateLimit({
  keyPrefix: 'provider-track-import',
  windowMs: 60_000,
  max: 30,
  key: (c) => c.get('userId'),
});
// Bulk playlist import fans out one upstream lookup + import per distinct track, so
// it's one expensive bulk op — cap it tightly per user (parity with the class-scoped
// `playlist-import` limiter), not per-track like `provider-track-import`.
const playlistImportLimiter = rateLimit({
  keyPrefix: 'provider-playlist-import',
  windowMs: 60_000,
  max: 5,
  key: (c) => c.get('userId'),
});

/** GET /providers/:provider/search?q= — provider search candidates (contract DTOs). */
providerRoutes.get('/providers/:provider/search', searchLimiter, async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const q = (c.req.query('q') ?? '').slice(0, MAX_QUERY_LEN);
  const adapter = await getMusicProvider(provider, c.env);
  const results: TrackSearchResult[] = await adapter.search(q);
  return c.json(results);
});

/** GET /providers/:provider/likes — the caller's liked tracks (spends their token). */
providerRoutes.get('/providers/:provider/likes', likesLimiter, async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const db = createDb(c.env);
  const results: TrackSearchResult[] = await fetchUserLikes(db, c.env, c.get('userId'), provider);
  return c.json(results);
});

/** GET /providers/:provider/playlists — caller's saved playlists (if integrated). */
providerRoutes.get('/providers/:provider/playlists', playlistsLimiter, async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const db = createDb(c.env);
  const results: ProviderPlaylistSummary[] = await fetchUserPlaylists(
    db,
    c.env,
    c.get('userId'),
    provider,
  );
  return c.json(results);
});

/** GET /providers/:provider/playlists/:playlistId/tracks — drill into one playlist. */
providerRoutes.get(
  '/providers/:provider/playlists/:playlistId/tracks',
  playlistsLimiter,
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const playlistId = c.req.param('playlistId');
    const db = createDb(c.env);
    const results: TrackSearchResult[] = await fetchUserPlaylistTracks(
      db,
      c.env,
      c.get('userId'),
      provider,
      playlistId,
    );
    return c.json(results);
  },
);

/**
 * POST /providers/:provider/playlists/:playlistId/import — bulk-import a saved
 * playlist's tracks as references in one call (D21). Deduped by same-song match key,
 * best-effort per track, capped as one bulk op. Works for all three providers from
 * the browse surface with no class required — unlike the class-scoped, paste-a-URL
 * `/classes/:id/import-playlist`. 201 when any new track was created; 200 when every
 * song already existed. Imports store references only — no audio/derived data.
 */
providerRoutes.post(
  '/providers/:provider/playlists/:playlistId/import',
  playlistImportLimiter,
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const playlistId = c.req.param('playlistId');
    const db = createDb(c.env);
    const summary = await importUserPlaylist(db, c.env, c.get('userId'), provider, playlistId);
    return c.json(summary, summary.created > 0 ? 201 : 200);
  },
);

/**
 * POST /providers/track-import — import a candidate by provider reference. 201 when
 * a new track was created; 200 when it resolved to an existing track (idempotent
 * re-import, or a same-song attach onto a track already in the library).
 */
providerRoutes.post('/providers/track-import', importLimiter, async (c) => {
  const { provider, providerTrackId } = importProviderTrackSchema.parse(await c.req.json());
  const adapter = await getMusicProvider(provider, c.env);
  const candidate = await adapter.lookup(providerTrackId);
  if (!candidate) {
    throw new HttpError(404, 'NOT_FOUND', 'No such track at the provider.');
  }
  const db = createDb(c.env);
  const { track, created } = await importTrackFromCandidate(db, c.get('userId'), candidate);
  return c.json(track, created ? 201 : 200);
});
