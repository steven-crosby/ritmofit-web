import { Hono } from 'hono';
import {
  importPlaylistSchema,
  PLAYLIST_URL_OCCURRENCE_LIMIT,
  playlistPreviewResponseSchema,
  type PlaylistPreviewOccurrence,
} from '@ritmofit/shared';
import { parsePlaylistUrl, PlaylistOverLimitError } from '@ritmofit/music';
import { requireSession } from '../middleware/auth.js';
import { requireAccess } from '../lib/authz.js';
import { rateLimit } from '../lib/rate-limit.js';
import { createDb } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { getMusicProvider } from '../lib/music/registry.js';
import { fetchSpotifyPlaylistPreview } from '../lib/music/user-playlists.js';
import {
  loadPlaylistPreview,
  PREVIEW_TIMEOUT_MESSAGE,
  PreviewTimeoutError,
} from '../lib/music/playlist-preview.js';
import type { AppEnv } from '../lib/types.js';

export const playlistImportRoutes = new Hono<AppEnv>();
playlistImportRoutes.use('*', requireSession);

// Playlist preview can page a provider, so cap it tightly per user.
const importLimiter = rateLimit({
  keyPrefix: 'playlist-import',
  windowMs: 60_000,
  max: 5,
  key: (c) => c.get('userId'),
});

function overLimitMessage(error: PlaylistOverLimitError): string {
  if (error.reportedTotal == null) {
    return `Playlist has more than ${error.limit} songs.`;
  }
  return `Playlist has ${error.reportedTotal} songs. The limit is ${error.limit}.`;
}

playlistImportRoutes.post('/classes/:id/import-playlist', importLimiter, async (c) => {
  const db = createDb(c.env);
  const classId = c.req.param('id');
  const me = c.get('userId');
  await requireAccess(db, me, classId, 'edit');

  const { url } = importPlaylistSchema.parse(await c.req.json());
  const parsed = parsePlaylistUrl(url);
  if (parsed.kind === 'apple_library') {
    // Library playlists need the owner's Music-User-Token, which a pasted link
    // can never carry — that case is served by saved-playlist browsing instead.
    throw new HttpError(
      400,
      'BAD_REQUEST',
      'Apple Music library playlist links can’t be imported by URL. ' +
        'Paste a public catalog playlist link, or use saved-playlist browsing.',
    );
  }
  if (parsed.kind !== 'importable') {
    throw new HttpError(
      400,
      'BAD_REQUEST',
      'Unsupported playlist URL. Paste a public Spotify, SoundCloud, or Apple Music playlist link.',
    );
  }

  let candidates;
  try {
    if (parsed.ref.provider === 'spotify' && c.env.MOCK_PROVIDERS !== 'true') {
      // Playlist items reject the app's client-credentials token with 401
      // "Valid user authentication required". Reminting that token would mask
      // the failure as PROVIDER_UNAVAILABLE, so there is no app-token fallback.
      // Apple catalog playlists still use the developer token. SoundCloud
      // public playlists still use the app token.
      const playlistId = parsed.ref.playlistId;
      candidates = await loadPlaylistPreview((opts) =>
        fetchSpotifyPlaylistPreview(db, c.env, me, playlistId, opts),
      );
    } else {
      const adapter = await getMusicProvider(parsed.ref.provider, c.env);
      candidates = await loadPlaylistPreview((opts) => adapter.getPlaylist(parsed.ref, opts));
    }
  } catch (err) {
    if (err instanceof PreviewTimeoutError) {
      throw new HttpError(504, 'PROVIDER_TIMEOUT', PREVIEW_TIMEOUT_MESSAGE);
    }
    if (err instanceof PlaylistOverLimitError) {
      throw new HttpError(422, 'VALIDATION_ERROR', overLimitMessage(err));
    }
    throw err;
  }

  if (!candidates.length) {
    throw new HttpError(400, 'BAD_REQUEST', 'Playlist not found or is empty.');
  }
  if (candidates.length > PLAYLIST_URL_OCCURRENCE_LIMIT) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      `Playlist has more than ${PLAYLIST_URL_OCCURRENCE_LIMIT} songs.`,
    );
  }

  const occurrences: PlaylistPreviewOccurrence[] = candidates.map((candidate, index) => ({
    index,
    title: candidate.title,
    artist: candidate.artist,
    durationMs:
      typeof candidate.durationMs === 'number' && candidate.durationMs > 0
        ? candidate.durationMs
        : null,
    provider: candidate.provider,
    providerTrackId: candidate.providerTrackId,
  }));

  return c.json(playlistPreviewResponseSchema.parse({ occurrences }), 200);
});
