/**
 * Provider connection routes — connect a user's music account, list connections,
 * disconnect. Two connect mechanisms share the `music_connections` table (no
 * migration): redirect OAuth for SoundCloud (Authorization Code + PKCE) and Spotify
 * (confidential Authorization Code) via the `PROVIDER_OAUTH` registry below, and a
 * MusicKit-JS token handoff for Apple Music (no redirect OAuth exists for it).
 *
 * Redirect-OAuth flow (confidential client → secret server-side):
 *  1. POST /providers/:provider/connect  — authed. Mint PKCE verifier + state,
 *     stash them in a short-lived **encrypted httpOnly cookie** (carries userId,
 *     so the callback needs no session), return the authorize URL.
 *  2. GET  /providers/:provider/callback — the provider redirects here. Validate the
 *     state cookie (CSRF + identity), exchange the code, encrypt + upsert the
 *     tokens, redirect back to the SPA. No `requireSession` — the cookie is the
 *     identity, and a JSON 401 would break the browser redirect.
 *
 * Apple Music (MusicKit JS) flow — no redirect, no cookie:
 *  - GET  /providers/apple_music/config     — authed. The developer token the SPA
 *    passes to `MusicKit.configure()`.
 *  - POST /providers/apple_music/connection — authed. Store the Music-User-Token the
 *    browser obtained (encrypted; no refresh token — MusicKit re-mints on expiry).
 *
 * Shared:
 *  - GET    /providers/connections          — authed. Token-free view only.
 *  - DELETE /providers/:provider/connection — authed. Immediate disconnect.
 *
 * Tokens are encrypted at rest and NEVER returned to a client. Never log tokens
 * or the code (conventions.md). Disconnect forgets the tokens immediately and
 * enqueues the deferred 7-day metadata purge (provider refs + album art) drained
 * by the Cron Trigger — see `lib/music/purge.ts`.
 */
import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  providerSchema,
  musicConnectionViewSchema,
  connectAppleMusicSchema,
  supportsUserAccount,
  type Provider,
  type ConnectProviderResponse,
  type MusicConnectionView,
  type AppleMusicClientConfig,
} from '@ritmofit/shared';
import {
  buildSoundCloudAuthorizeUrl,
  exchangeSoundCloudCode,
  buildSpotifyAuthorizeUrl,
  exchangeSpotifyCode,
  type OAuthTokens,
} from '@ritmofit/music';
import type { AppEnv, Env } from '../lib/types.js';
import { requireSession } from '../middleware/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { createDb, type Db } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { boundFetch } from '../lib/fetch.js';
import { encryptSecret, decryptSecret } from '../lib/crypto.js';
import {
  requireEncryptionKey,
  soundcloudCreds,
  spotifyCreds,
  appleMusicCreds,
  hasAppleMusicConfig,
} from '../lib/music/provider-config.js';
import { generateCodeVerifier, challengeFromVerifier, randomToken } from '../lib/pkce.js';
import { enqueueProviderPurge } from '../lib/music/purge.js';
import { musicConnections } from '../db/schema.js';

const STATE_COOKIE = 'rf_oauth_state';
const STATE_TTL_MS = 10 * 60 * 1000;

export const providerConnectionRoutes = new Hono<AppEnv>();

// ── helpers ─────────────────────────────────────────────────────────────────

function parseProvider(raw: string): Provider {
  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'VALIDATION_ERROR', `Unknown provider '${raw}'.`);
  return parsed.data;
}

/**
 * Per-provider OAuth wiring — the implementation behind the capability matrix's
 * `userConnect` flag. The connect/callback routes stay provider-agnostic: they own
 * the PKCE state cookie, the encryption, and the redirects, and defer the
 * provider-specific URL/credential/exchange details to one of these entries. Keep
 * this map's keys in lockstep with `supportsUserAccount` — a provider that reports
 * `userConnect: true` without an entry here would 501 mid-flow.
 */
interface ProviderOAuth {
  creds(env: Env): { clientId: string; clientSecret: string };
  redirectUri(env: Env): string;
  buildAuthorizeUrl(p: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
  }): string;
  exchangeCode(cfg: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    codeVerifier: string;
    fetchImpl: typeof boundFetch;
  }): Promise<OAuthTokens>;
}

const PROVIDER_OAUTH: Partial<Record<Provider, ProviderOAuth>> = {
  soundcloud: {
    creds: soundcloudCreds,
    redirectUri: (env) =>
      env.SOUNDCLOUD_REDIRECT_URI ?? `${env.BETTER_AUTH_URL}/api/v1/providers/soundcloud/callback`,
    buildAuthorizeUrl: buildSoundCloudAuthorizeUrl,
    exchangeCode: exchangeSoundCloudCode,
  },
  spotify: {
    creds: spotifyCreds,
    redirectUri: (env) =>
      env.SPOTIFY_REDIRECT_URI ?? `${env.BETTER_AUTH_URL}/api/v1/providers/spotify/callback`,
    buildAuthorizeUrl: buildSpotifyAuthorizeUrl,
    exchangeCode: exchangeSpotifyCode,
  },
};

function spaUrl(env: Env, path: string): string {
  return `${env.WEB_ORIGIN ?? env.BETTER_AUTH_URL}${path}`;
}

function describeOAuthConnectFailure(provider: Provider, err: unknown): string {
  if (err instanceof Error) return `[provider-connect:${provider}] ${err.name}: ${err.message}`;
  return `[provider-connect:${provider}] ${String(err)}`;
}

/** The encrypted-cookie payload tying a callback to the user who started it. */
const stateCookieSchema = z.object({
  state: z.string(),
  verifier: z.string(),
  provider: providerSchema,
  userId: z.string(),
  exp: z.number(),
});

function toConnectionView(row: typeof musicConnections.$inferSelect): MusicConnectionView {
  return musicConnectionViewSchema.parse({
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    providerUserId: row.providerUserId,
    scope: row.scope,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

/** Insert-or-update the caller's connection for a provider (unique user+provider). */
async function upsertConnection(
  db: Db,
  fields: {
    userId: string;
    provider: Provider;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string | null;
    providerUserId: string | null;
    scope: string | null;
    expiresAt: number | null;
  },
): Promise<void> {
  const now = Date.now();
  await db
    .insert(musicConnections)
    .values({ id: crypto.randomUUID(), ...fields, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [musicConnections.userId, musicConnections.provider],
      set: {
        accessTokenEncrypted: fields.accessTokenEncrypted,
        refreshTokenEncrypted: fields.refreshTokenEncrypted,
        providerUserId: fields.providerUserId,
        scope: fields.scope,
        expiresAt: fields.expiresAt,
        updatedAt: now,
      },
    });
}

// ── routes ──────────────────────────────────────────────────────────────────

// Connect mints an encrypted state cookie and builds an OAuth URL per call; cap it
// per user so the flow can't be hammered.
const connectLimiter = rateLimit({
  keyPrefix: 'provider-connect',
  windowMs: 60_000,
  max: 10,
  key: (c) => c.get('userId'),
});

/** POST /providers/:provider/connect — start the OAuth flow (returns authorize URL). */
providerConnectionRoutes.post(
  '/providers/:provider/connect',
  requireSession,
  connectLimiter,
  async (c) => {
    const provider = parseProvider(c.req.param('provider'));
    const key = requireEncryptionKey(c.env);
    const userId = c.get('userId');
    const db = createDb(c.env);

    // Dev seam: connect immediately with placeholder tokens so the UI is testable
    // with zero credentials.
    if (c.env.MOCK_PROVIDERS === 'true') {
      await upsertConnection(db, {
        userId,
        provider,
        accessTokenEncrypted: await encryptSecret('mock-access-token', key),
        refreshTokenEncrypted: await encryptSecret('mock-refresh-token', key),
        providerUserId: 'mock-user',
        scope: 'mock',
        expiresAt: Date.now() + 3600_000,
      });
      const body: ConnectProviderResponse = { authorizeUrl: null, connected: true };
      return c.json(body);
    }

    const oauth = PROVIDER_OAUTH[provider];
    if (!supportsUserAccount(provider) || !oauth) {
      throw new HttpError(501, 'NOT_IMPLEMENTED', `Provider '${provider}' is not yet integrated.`);
    }
    const { clientId } = oauth.creds(c.env);

    const verifier = generateCodeVerifier();
    const challenge = await challengeFromVerifier(verifier);
    const state = randomToken();
    const cookie = await encryptSecret(
      JSON.stringify({ state, verifier, provider, userId, exp: Date.now() + STATE_TTL_MS }),
      key,
    );
    setCookie(c, STATE_COOKIE, cookie, {
      httpOnly: true,
      secure: c.env.BETTER_AUTH_URL.startsWith('https://'),
      sameSite: 'Lax',
      path: '/',
      maxAge: STATE_TTL_MS / 1000,
    });

    const authorizeUrl = oauth.buildAuthorizeUrl({
      clientId,
      redirectUri: oauth.redirectUri(c.env),
      codeChallenge: challenge,
      state,
    });
    const body: ConnectProviderResponse = { authorizeUrl, connected: false };
    return c.json(body);
  },
);

/** GET /providers/:provider/callback — OAuth redirect target. Validates, stores, redirects. */
providerConnectionRoutes.get('/providers/:provider/callback', async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const fail = (reason: string) => c.redirect(spaUrl(c.env, `/?error=${reason}`));

  const raw = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: '/' });
  if (!raw) return fail('state_missing');

  let payload: z.infer<typeof stateCookieSchema>;
  try {
    payload = stateCookieSchema.parse(
      JSON.parse(await decryptSecret(raw, requireEncryptionKey(c.env))),
    );
  } catch {
    return fail('state_invalid');
  }

  const code = c.req.query('code');
  const state = c.req.query('state');
  if (c.req.query('error')) return fail('access_denied');
  if (!code || !state || state !== payload.state || payload.provider !== provider) {
    return fail('state_mismatch');
  }
  if (Date.now() > payload.exp) return fail('state_expired');
  const oauth = PROVIDER_OAUTH[provider];
  if (!supportsUserAccount(provider) || !oauth) return fail('unsupported_provider');

  const key = c.env.ENCRYPTION_KEY!; // requireEncryptionKey already succeeded above
  try {
    const { clientId, clientSecret } = oauth.creds(c.env);
    const tokens = await oauth.exchangeCode({
      clientId,
      clientSecret,
      redirectUri: oauth.redirectUri(c.env),
      code,
      codeVerifier: payload.verifier,
      fetchImpl: boundFetch,
    });
    await upsertConnection(createDb(c.env), {
      userId: payload.userId,
      provider,
      accessTokenEncrypted: await encryptSecret(tokens.accessToken, key),
      refreshTokenEncrypted: tokens.refreshToken
        ? await encryptSecret(tokens.refreshToken, key)
        : null,
      providerUserId: null,
      scope: tokens.scope,
      expiresAt: tokens.expiresInSec ? Date.now() + tokens.expiresInSec * 1000 : null,
    });
  } catch (err) {
    // Never surface token-exchange detail to the browser. Logs keep only provider,
    // error class, and sanitized messages from our helpers; no tokens/codes/secrets.
    console.warn(describeOAuthConnectFailure(provider, err));
    return fail('connect_failed');
  }
  return c.redirect(spaUrl(c.env, `/?connected=${provider}`));
});

/**
 * GET /providers/apple_music/config — the developer token + storefront MusicKit JS
 * needs to configure in the browser. Apple Music has no redirect OAuth, so the SPA
 * configures MusicKit, lets the user authorize, and posts the resulting
 * Music-User-Token to the connection endpoint below. The developer token is a public
 * client credential by design, but we serve it only to authenticated callers.
 */
providerConnectionRoutes.get('/providers/apple_music/config', requireSession, async (c) => {
  // Dev seam: hand MusicKit a placeholder token so the flow runs with zero creds.
  if (c.env.MOCK_PROVIDERS === 'true') {
    const mock: AppleMusicClientConfig = {
      developerToken: 'mock-developer-token',
      storefront: null,
    };
    return c.json(mock);
  }
  const { developerToken, storefront } = await appleMusicCreds(c.env);
  const body: AppleMusicClientConfig = { developerToken, storefront: storefront ?? null };
  return c.json(body);
});

/**
 * POST /providers/apple_music/connection — store the Music-User-Token MusicKit
 * returned in the browser. There is no OAuth code exchange and no refresh token:
 * the Music-User-Token is long-lived (~6 months) and re-minted by MusicKit on
 * expiry, so we persist it (encrypted) with no hard expiry and surface a reconnect
 * prompt if Apple later rejects it.
 */
providerConnectionRoutes.post(
  '/providers/apple_music/connection',
  requireSession,
  connectLimiter,
  async (c) => {
    const key = requireEncryptionKey(c.env);
    // Outside the dev mock seam, refuse to store a token we could never spend.
    if (c.env.MOCK_PROVIDERS !== 'true' && !hasAppleMusicConfig(c.env)) {
      throw new HttpError(503, 'PROVIDER_UNAVAILABLE', 'Apple Music is not configured.');
    }
    const { musicUserToken } = connectAppleMusicSchema.parse(await c.req.json());
    await upsertConnection(createDb(c.env), {
      userId: c.get('userId'),
      provider: 'apple_music',
      accessTokenEncrypted: await encryptSecret(musicUserToken, key),
      refreshTokenEncrypted: null,
      providerUserId: null,
      scope: null,
      expiresAt: null,
    });
    return c.body(null, 204);
  },
);

/** GET /providers/connections — the caller's connections (tokens stripped). */
providerConnectionRoutes.get('/providers/connections', requireSession, async (c) => {
  const db = createDb(c.env);
  const rows = await db
    .select()
    .from(musicConnections)
    .where(eq(musicConnections.userId, c.get('userId')))
    .all();
  return c.json(rows.map(toConnectionView));
});

/**
 * DELETE /providers/:provider/connection — disconnect. Forgets the tokens
 * immediately (security), then enqueues the deferred metadata purge (provider
 * refs + album art) that a daily Cron Trigger drains within the 7-day SLA. See
 * `lib/music/purge.ts`.
 */
providerConnectionRoutes.delete('/providers/:provider/connection', requireSession, async (c) => {
  const provider = parseProvider(c.req.param('provider'));
  const userId = c.get('userId');
  const db = createDb(c.env);
  const deleted = await db
    .delete(musicConnections)
    .where(and(eq(musicConnections.userId, userId), eq(musicConnections.provider, provider)))
    .run();
  // Only schedule the destructive metadata purge when a connection actually
  // existed — a no-op disconnect (never connected / double-click) must not strip
  // the user's provider refs + album art.
  if ((deleted.meta.changes ?? 0) > 0) {
    await enqueueProviderPurge(db, userId, provider);
  }
  return c.body(null, 204);
});
