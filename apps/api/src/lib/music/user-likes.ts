/**
 * Consume a user's provider OAuth token (M2) — the read that spends the per-user
 * `music_connections` token rather than the app-level client token: "search my
 * SoundCloud / Spotify".
 *
 * This module owns everything the pure `@ritmofit/music` adapters deliberately
 * don't: loading the caller's connection, decrypting the access token, proactive
 * + reactive **token refresh**, and persisting the rotated tokens back (encrypted).
 * The adapters just map provider JSON → contract DTOs and raise a provider-specific
 * `*UnauthorizedError` on a 401 so we can refresh once and retry. The per-provider
 * details live in `LIKES_ADAPTERS`; the refresh/retry/persist machinery is shared.
 *
 * Tokens are never logged or returned to clients (conventions.md). With
 * `MOCK_PROVIDERS=true` this serves the mock catalog so the flow runs with zero
 * credentials, like the rest of M2.
 *
 * Paging (RF-132): each call returns one bounded page (`LIKES_PAGE_TARGET` songs,
 * whole provider pages) plus an opaque cursor wrapping the provider's own
 * continuation. Nothing is cached: the next page is read live when asked for.
 * Apple Music also answers `q` with a server-side search of the user's library.
 */
import { and, eq } from 'drizzle-orm';
import {
  fetchSoundCloudLikesPage,
  refreshSoundCloudToken,
  SoundCloudUnauthorizedError,
  fetchSpotifySavedTracksPage,
  refreshSpotifyToken,
  SpotifyUnauthorizedError,
  fetchAppleMusicLibrarySongsPage,
  searchAppleMusicLibrarySongs,
  AppleMusicUnauthorizedError,
  InvalidProviderCursorError,
  type OAuthTokens,
  type ProviderTrackPage,
} from '@ritmofit/music';
import { providerCapabilities, type Provider, type TrackSearchResult } from '@ritmofit/shared';
import type { Db } from '../db.js';
import type { Env } from '../types.js';
import { HttpError } from '../errors.js';
import { boundFetch } from '../fetch.js';
import { encryptSecret, decryptSecret } from '../crypto.js';
import {
  requireEncryptionKey,
  soundcloudCreds,
  spotifyCreds,
  appleMusicCreds,
} from './provider-config.js';
import { throwIfSpotifyDevelopmentMode } from './spotify-development-mode.js';
import { searchMockCatalog } from '../mock-catalog.js';
import { musicConnections } from '../../db/schema.js';
import { decodeLikesCursor, encodeLikesCursor, invalidLikesCursor } from './likes-cursor.js';

// Refresh a little early so a token that expires mid-request doesn't 401.
const EXPIRY_SKEW_MS = 60_000;

type Creds = { clientId: string; clientSecret: string };

/** Songs per `/likes` page: the first provider page boundary at or past this. */
export const LIKES_PAGE_TARGET = 200;
/** Upstream pages one `/likes` call may read, so a page can't fan out unbounded. */
const LIKES_PAGE_MAX_PROVIDER_PAGES = 8;

/** One `/likes` page: songs plus the opaque cursor for the next page, or null. */
export interface LikesPage {
  tracks: TrackSearchResult[];
  nextCursor: string | null;
}

/** `cursor` continues a previous page; `q` (Apple Music only) searches the library. */
export interface LikesRequest {
  cursor?: string;
  q?: string;
}

/** Per-provider wiring behind the `userLikes` capability flag. */
interface LikesAdapter {
  label: string;
  creds(env: Env): Creds;
  fetchLikes(cfg: {
    accessToken: string;
    fetchImpl: typeof boundFetch;
    cursor: string | null;
    targetTracks: number;
    maxPages: number;
  }): Promise<ProviderTrackPage>;
  refreshToken(cfg: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    fetchImpl: typeof boundFetch;
  }): Promise<OAuthTokens>;
  isUnauthorized(err: unknown): boolean;
}

const LIKES_ADAPTERS: Partial<Record<Provider, LikesAdapter>> = {
  soundcloud: {
    label: 'SoundCloud',
    creds: soundcloudCreds,
    fetchLikes: fetchSoundCloudLikesPage,
    refreshToken: refreshSoundCloudToken,
    isUnauthorized: (err) => err instanceof SoundCloudUnauthorizedError,
  },
  spotify: {
    label: 'Spotify',
    creds: spotifyCreds,
    fetchLikes: fetchSpotifySavedTracksPage,
    refreshToken: refreshSpotifyToken,
    isUnauthorized: (err) => err instanceof SpotifyUnauthorizedError,
  },
};

/**
 * Return one page of the caller's liked tracks at `provider`, mapped to the shared
 * contract, with the cursor for the next page. With `q` (Apple Music only) return
 * the library-search matches instead, unpaged.
 */
export async function fetchUserLikes(
  db: Db,
  env: Env,
  userId: string,
  provider: Provider,
  request: LikesRequest = {},
): Promise<LikesPage> {
  const q = request.q?.trim() ?? '';
  if (q && provider !== 'apple_music') {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'Library search is only available for Apple Music.',
    );
  }
  if (q && request.cursor) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Use either q or cursor, not both.');
  }
  // Decode before any DB read or provider call: a bad cursor is a client error.
  const continuation = request.cursor ? decodeLikesCursor(provider, request.cursor) : null;

  // Dev seam: the provider's catalog stands in for the user's likes.
  if (env.MOCK_PROVIDERS === 'true') {
    return mockLikesPage(provider, q, continuation);
  }
  if (!providerCapabilities[provider].userLikes) {
    throw new HttpError(501, 'NOT_IMPLEMENTED', `Provider '${provider}' is not yet integrated.`);
  }
  // Apple Music's user flow has no OAuth refresh (the Music-User-Token is re-minted
  // by MusicKit in the browser, not refreshed server-side), so it takes its own path
  // rather than the OAuth-shaped adapter below.
  if (provider === 'apple_music') {
    return fetchAppleMusicLikes(db, env, userId, { q, continuation });
  }
  const adapter = LIKES_ADAPTERS[provider];
  if (!adapter) {
    throw new HttpError(501, 'NOT_IMPLEMENTED', `Provider '${provider}' is not yet integrated.`);
  }

  const key = requireEncryptionKey(env);
  const creds = adapter.creds(env);
  const conn = await db
    .select()
    .from(musicConnections)
    .where(and(eq(musicConnections.userId, userId), eq(musicConnections.provider, provider)))
    .get();
  if (!conn) {
    throw new HttpError(409, 'NOT_CONNECTED', `Connect your ${adapter.label} account first.`);
  }

  const read = async (accessToken: string): Promise<LikesPage> =>
    toLikesPage(
      provider,
      await adapter.fetchLikes({
        accessToken,
        fetchImpl: boundFetch,
        cursor: continuation,
        targetTracks: LIKES_PAGE_TARGET,
        maxPages: LIKES_PAGE_MAX_PROVIDER_PAGES,
      }),
    );

  // Proactively refresh an access token that's expired (or about to).
  const expired = conn.expiresAt !== null && Date.now() > conn.expiresAt - EXPIRY_SKEW_MS;
  let refreshed = expired;
  let accessToken = expired
    ? await refreshAndPersist(db, key, adapter, creds, conn)
    : await decryptSecret(conn.accessTokenEncrypted, key);

  try {
    return await read(accessToken);
  } catch (err) {
    throwIfInvalidCursor(err);
    throwIfSpotifyDevelopmentMode(err);
    if (!adapter.isUnauthorized(err)) throw err;
    // The provider rejected the token. If we already refreshed once this request,
    // the grant is dead (and `conn` now holds a SPENT refresh token — re-refreshing
    // would replay it) → ask the user to reconnect. Otherwise refresh once and retry.
    if (refreshed || !conn.refreshTokenEncrypted) {
      throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${adapter.label} account.`);
    }
    refreshed = true;
    accessToken = await refreshAndPersist(db, key, adapter, creds, conn);
    try {
      return await read(accessToken);
    } catch (retryErr) {
      // A 401 on the freshly-refreshed token means the grant is dead — reconnect,
      // don't leak the raw provider error as a 500/502. Anything else propagates.
      throwIfInvalidCursor(retryErr);
      throwIfSpotifyDevelopmentMode(retryErr);
      if (!adapter.isUnauthorized(retryErr)) throw retryErr;
      throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${adapter.label} account.`);
    }
  }
}

/** Wrap the provider's own continuation in the opaque, provider-bound cursor. */
function toLikesPage(provider: Provider, page: ProviderTrackPage): LikesPage {
  return {
    tracks: page.tracks,
    nextCursor: page.next ? encodeLikesCursor(provider, page.next) : null,
  };
}

/** An adapter refused a continuation (wrong host/path): a client error, not a 502. */
function throwIfInvalidCursor(err: unknown): void {
  if (err instanceof InvalidProviderCursorError) throw invalidLikesCursor();
}

/**
 * Mock seam: the provider's mock catalog, paged by offset like a real provider
 * (`LIKES_PAGE_TARGET` per page) so the cursor contract runs with no credentials.
 */
function mockLikesPage(provider: Provider, q: string, continuation: string | null): LikesPage {
  if (q) return { tracks: searchMockCatalog(q, provider), nextCursor: null };
  if (continuation !== null && !/^\d{1,7}$/.test(continuation)) throw invalidLikesCursor();
  const offset = continuation === null ? 0 : Number(continuation);
  const all = searchMockCatalog('', provider);
  const end = offset + LIKES_PAGE_TARGET;
  return {
    tracks: all.slice(offset, end),
    nextCursor: end < all.length ? encodeLikesCursor(provider, String(end)) : null,
  };
}

/**
 * Exchange the stored refresh token for a fresh access token, persist the rotated
 * pair (encrypted) with the new expiry, and return the new access token.
 */
async function refreshAndPersist(
  db: Db,
  key: string,
  adapter: LikesAdapter,
  creds: Creds,
  conn: typeof musicConnections.$inferSelect,
): Promise<string> {
  if (!conn.refreshTokenEncrypted) {
    throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${adapter.label} account.`);
  }

  let tokens;
  try {
    const refreshToken = await decryptSecret(conn.refreshTokenEncrypted, key);
    tokens = await adapter.refreshToken({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      refreshToken,
      fetchImpl: boundFetch,
    });
  } catch {
    // A failed refresh means the grant is dead — surface a reconnect, not detail.
    throw new HttpError(409, 'REAUTH_REQUIRED', `Reconnect your ${adapter.label} account.`);
  }

  await db
    .update(musicConnections)
    .set({
      accessTokenEncrypted: await encryptSecret(tokens.accessToken, key),
      // The provider may rotate the refresh token; keep the old one if it didn't.
      refreshTokenEncrypted: tokens.refreshToken
        ? await encryptSecret(tokens.refreshToken, key)
        : conn.refreshTokenEncrypted,
      scope: tokens.scope ?? conn.scope,
      expiresAt: tokens.expiresInSec ? Date.now() + tokens.expiresInSec * 1000 : null,
      updatedAt: Date.now(),
    })
    .where(eq(musicConnections.id, conn.id));

  return tokens.accessToken;
}

/**
 * Apple Music likes: read the connected user's **library** songs with the app's
 * developer token (Bearer) + the stored Music-User-Token, one page at a time, or
 * search the library server-side when `q` is set. No refresh — a rejected token
 * means the user must reconnect via MusicKit (409 REAUTH_REQUIRED).
 */
async function fetchAppleMusicLikes(
  db: Db,
  env: Env,
  userId: string,
  request: { q: string; continuation: string | null },
): Promise<LikesPage> {
  const key = requireEncryptionKey(env);
  const { developerToken } = await appleMusicCreds(env);
  const conn = await db
    .select()
    .from(musicConnections)
    .where(and(eq(musicConnections.userId, userId), eq(musicConnections.provider, 'apple_music')))
    .get();
  if (!conn) {
    throw new HttpError(409, 'NOT_CONNECTED', 'Connect your Apple Music account first.');
  }
  const musicUserToken = await decryptSecret(conn.accessTokenEncrypted, key);
  try {
    if (request.q) {
      const tracks = await searchAppleMusicLibrarySongs({
        developerToken,
        musicUserToken,
        fetchImpl: boundFetch,
        query: request.q,
      });
      return { tracks, nextCursor: null };
    }
    return toLikesPage(
      'apple_music',
      await fetchAppleMusicLibrarySongsPage({
        developerToken,
        musicUserToken,
        fetchImpl: boundFetch,
        cursor: request.continuation,
        targetTracks: LIKES_PAGE_TARGET,
        maxPages: LIKES_PAGE_MAX_PROVIDER_PAGES,
      }),
    );
  } catch (err) {
    throwIfInvalidCursor(err);
    if (err instanceof AppleMusicUnauthorizedError) {
      throw new HttpError(409, 'REAUTH_REQUIRED', 'Reconnect your Apple Music account.');
    }
    throw err;
  }
}
