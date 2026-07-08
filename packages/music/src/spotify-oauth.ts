/**
 * Spotify user-OAuth — Authorization Code flow (confidential client).
 *
 * Verified against Spotify's Web API authorization docs (June 2026): authorize at
 * `https://accounts.spotify.com/authorize` (response_type=code,
 * space-delimited `scope`); exchange/refresh at `https://accounts.spotify.com/api/token`
 * with the client secret as HTTP Basic auth (we run server-side, so the app is a
 * confidential client). The token response carries access_token, refresh_token,
 * expires_in, scope.
 *
 * We request `user-library-read` (the "search my Spotify" likes read,
 * `GET /me/tracks`) plus the playback scopes the official Web Playback SDK needs
 * plus the read-only saved-playlist scopes (`playlist-read-private`,
 * `playlist-read-collaborative`) that power playlist browse/drill-in
 * (see `SPOTIFY_CONNECT_SCOPE`). Never request audio-features/analysis scopes:
 * BPM from Spotify is forbidden (music-providers.md).
 *
 * Pure functions: no storage, no secrets at rest — the app holds the secret and
 * persists the (encrypted) result. Network is injected for tests. Re-verify the
 * token-endpoint body/credential placement when live credentials land.
 */
import { z } from 'zod';
import type { FetchLike } from './provider.js';
import { readJson, parseProvider, ProviderError } from './errors.js';
import type { OAuthTokens } from './soundcloud-oauth.js';

// Available in Workers and Node ≥18 (vitest). Declared so the package needs no
// DOM/Workers ambient lib.
declare const btoa: (data: string) => string;

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
/**
 * The connect scope set. `user-library-read` powers the "search my Spotify" likes
 * read; `streaming` / `user-read-email` / `user-read-private` /
 * `user-modify-playback-state` / `user-read-playback-state` power in-app playback
 * via the official Web Playback SDK (the SDK verifies Premium at init via the
 * `user-read-*` scopes, then starts/seeks/pauses a `spotify:track:…` on our SDK
 * device through the Connect Web API). `playlist-read-private` /
 * `playlist-read-collaborative` are read-only saved-playlist metadata/track-list
 * scopes that power playlist browse/drill-in — never an audio-features/analysis
 * scope, BPM from Spotify is forbidden (music-providers.md). Existing connections
 * predate the playback and playlist scopes, so callers must treat a stored scope
 * missing `streaming` as "reconnect for playback" (`spotifyScopeHasPlayback`) and
 * one missing `playlist-read-private` as "reconnect to browse saved playlists"
 * (`spotifyScopeHasSavedPlaylists`).
 */
export const SPOTIFY_CONNECT_SCOPE =
  'user-library-read streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state playlist-read-private playlist-read-collaborative';

/**
 * Whether a stored connection scope string is playback-capable — i.e. the user
 * granted the Web Playback SDK's `streaming` scope. Connections made before the
 * scope expansion return `false` and need a reconnect before they can play.
 */
export function spotifyScopeHasPlayback(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).includes('streaming');
}

/**
 * Whether a stored connection scope string can browse saved playlists — i.e. the
 * user granted `playlist-read-private`. Connections made before the playlist
 * scope expansion return `false` and need a reconnect before `/me/playlists` (or
 * a playlist's track list) will succeed.
 */
export function spotifyScopeHasSavedPlaylists(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).includes('playlist-read-private');
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
});

/**
 * Build the URL to send the user to so they can authorize the connection.
 *
 * No PKCE: Spotify per-user connect is a confidential client (secret via Basic
 * auth at the token endpoint), so `code_challenge`/`code_challenge_method` are
 * deliberately absent — this helper takes no `codeChallenge`. The shared OAuth
 * registry (`provider-connections.ts`) still mints a PKCE pair for its
 * provider-agnostic flow; Spotify structurally ignores it (see `exchangeSpotifyCode`).
 */
export function buildSpotifyAuthorizeUrl(p: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const q =
    `client_id=${encodeURIComponent(p.clientId)}` +
    `&redirect_uri=${encodeURIComponent(p.redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SPOTIFY_CONNECT_SCOPE)}` +
    `&state=${encodeURIComponent(p.state)}`;
  return `${AUTHORIZE_URL}?${q}`;
}

async function postToken(
  fetchImpl: FetchLike,
  clientId: string,
  clientSecret: string,
  body: string,
  tokenUrl: string,
): Promise<OAuthTokens> {
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetchImpl(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    throw new ProviderError('spotify', `Spotify token endpoint returned ${res.status}`);
  }
  const t = parseProvider(tokenResponseSchema, await readJson(res, 'spotify'), 'spotify');
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? null,
    expiresInSec: t.expires_in ?? null,
    scope: t.scope ?? null,
  };
}

/**
 * Exchange an authorization code for tokens.
 *
 * No PKCE `code_verifier` in the body: as a confidential client, Spotify proves
 * identity with the client secret via HTTP Basic auth (`postToken`), so the
 * verifier is neither needed nor sent. This helper takes no `codeVerifier`.
 */
export function exchangeSpotifyCode(cfg: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  fetchImpl: FetchLike;
  tokenUrl?: string;
}): Promise<OAuthTokens> {
  const body =
    `grant_type=authorization_code` +
    `&redirect_uri=${encodeURIComponent(cfg.redirectUri)}` +
    `&code=${encodeURIComponent(cfg.code)}`;
  return postToken(cfg.fetchImpl, cfg.clientId, cfg.clientSecret, body, cfg.tokenUrl ?? TOKEN_URL);
}

/** Renew an access token from a refresh token. Spotify may omit a rotated token. */
export function refreshSpotifyToken(cfg: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl: FetchLike;
  tokenUrl?: string;
}): Promise<OAuthTokens> {
  const body =
    `grant_type=refresh_token` + `&refresh_token=${encodeURIComponent(cfg.refreshToken)}`;
  return postToken(cfg.fetchImpl, cfg.clientId, cfg.clientSecret, body, cfg.tokenUrl ?? TOKEN_URL);
}
