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
 * read; the rest power in-app playback via the official Web Playback SDK:
 * `streaming` (the SDK stream), `user-read-email` / `user-read-private` (the SDK
 * verifies Premium at init via these), and `user-modify-playback-state` /
 * `user-read-playback-state` (start / seek / pause a `spotify:track:…` on our SDK
 * device through the Connect Web API). Never an audio-features/analysis scope —
 * BPM from Spotify is forbidden (music-providers.md). Existing connections predate
 * the playback scopes, so callers must treat a stored scope without `streaming` as
 * "reconnect for playback" (see `spotifyScopeHasPlayback`).
 */
export const SPOTIFY_CONNECT_SCOPE =
  'user-library-read streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state';

/**
 * Whether a stored connection scope string is playback-capable — i.e. the user
 * granted the Web Playback SDK's `streaming` scope. Connections made before the
 * scope expansion return `false` and need a reconnect before they can play.
 */
export function spotifyScopeHasPlayback(scope: string | null | undefined): boolean {
  if (!scope) return false;
  return scope.split(/\s+/).includes('streaming');
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
});

/** Build the URL to send the user to so they can authorize the connection. */
export function buildSpotifyAuthorizeUrl(p: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
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

/** Exchange an authorization code for tokens. */
export function exchangeSpotifyCode(cfg: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
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
