/**
 * SoundCloud user-OAuth (M2 slice 2) — Authorization Code + PKCE.
 *
 * Verified June 2026: authorize at `https://secure.soundcloud.com/authorize`
 * (response_type=code, code_challenge_method=S256); exchange/refresh at
 * `https://secure.soundcloud.com/oauth/token` with the client secret as HTTP
 * Basic auth (confidential client). Token response carries access_token,
 * refresh_token, expires_in, scope.
 *
 * Pure functions: no storage, no secrets at rest — the app holds the secret and
 * persists the (encrypted) result. Network is injected for tests. Re-verify the
 * token-endpoint body/credential placement when live credentials land.
 */
import { z } from 'zod';
import type { FetchLike } from './provider.js';
import { readJson, parseProvider } from './errors.js';

// Available in Workers and Node ≥18 (vitest). Declared so the package needs no
// DOM/Workers ambient lib.
declare const btoa: (data: string) => string;

const AUTHORIZE_URL = 'https://secure.soundcloud.com/authorize';
const TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';

/** Normalised token result (provider field names mapped to ours). */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number | null;
  scope: string | null;
}

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
});

/** Build the URL to send the user to so they can authorize the connection. */
export function buildSoundCloudAuthorizeUrl(p: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const q =
    `client_id=${encodeURIComponent(p.clientId)}` +
    `&redirect_uri=${encodeURIComponent(p.redirectUri)}` +
    `&response_type=code` +
    `&code_challenge=${encodeURIComponent(p.codeChallenge)}` +
    `&code_challenge_method=S256` +
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
    throw new Error(`SoundCloud token endpoint returned ${res.status}`);
  }
  const t = parseProvider(tokenResponseSchema, await readJson(res, 'soundcloud'), 'soundcloud');
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? null,
    expiresInSec: t.expires_in ?? null,
    scope: t.scope ?? null,
  };
}

/** Exchange an authorization code (+ PKCE verifier) for tokens. */
export function exchangeSoundCloudCode(cfg: {
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
    `&client_id=${encodeURIComponent(cfg.clientId)}` +
    `&redirect_uri=${encodeURIComponent(cfg.redirectUri)}` +
    `&code_verifier=${encodeURIComponent(cfg.codeVerifier)}` +
    `&code=${encodeURIComponent(cfg.code)}`;
  return postToken(cfg.fetchImpl, cfg.clientId, cfg.clientSecret, body, cfg.tokenUrl ?? TOKEN_URL);
}

/** Renew an access token from a refresh token. */
export function refreshSoundCloudToken(cfg: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl: FetchLike;
  tokenUrl?: string;
}): Promise<OAuthTokens> {
  const body =
    `grant_type=refresh_token` +
    `&client_id=${encodeURIComponent(cfg.clientId)}` +
    `&refresh_token=${encodeURIComponent(cfg.refreshToken)}`;
  return postToken(cfg.fetchImpl, cfg.clientId, cfg.clientSecret, body, cfg.tokenUrl ?? TOKEN_URL);
}
