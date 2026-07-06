/**
 * Worker bindings and Hono context types, shared across middleware and routes.
 */
import type { User } from '@ritmofit/shared';

/**
 * Worker environment. `DB` is the D1 binding (wrangler.toml); the rest come from
 * `.dev.vars` locally and `wrangler secret put` in prod. Social-provider keys are
 * optional — a provider is only enabled when both of its halves are present.
 */
export interface Env {
  DB: D1Database;
  IMAGES_BUCKET: R2Bucket;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  /** Canonical SPA origin. Production is same-origin with BETTER_AUTH_URL. */
  WEB_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /**
   * Sign in with Apple. `APPLE_CLIENT_ID` is the web Services ID; the JWT client
   * secret is signed from the Apple `.p8` key material when team/key/private-key
   * fields are present. `APPLE_CLIENT_SECRET` is kept as a static fallback for
   * already-generated Apple client-secret JWTs.
   */
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  /**
   * SoundCloud API app credentials (M2). Both halves required to enable the live
   * provider; absent → SoundCloud routes report the provider as unavailable.
   * Server-side only — SoundCloud treats all clients as confidential.
   */
  SOUNDCLOUD_CLIENT_ID?: string;
  SOUNDCLOUD_CLIENT_SECRET?: string;
  /**
   * Spotify app credentials (M2). Both halves required to enable the live
   * provider; used for client-credentials catalog search/lookup AND the per-user
   * OAuth connect flow ("search my Spotify" likes plus in-app Web Playback SDK
   * playback — see `SPOTIFY_CONNECT_SCOPE`). Per the hard music rules we NEVER read
   * Spotify BPM (audio-features deprecated Nov 2024).
   */
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  /**
   * Apple Music **developer token** config and optional storefront (default 'us').
   * The token is generated from key material when possible; the static
   * APPLE_MUSIC_DEVELOPER_TOKEN remains as a fallback for manually generated
   * tokens. Distinct from Sign in with Apple.
   */
  APPLE_MUSIC_DEVELOPER_TOKEN?: string;
  APPLE_MUSIC_TEAM_ID?: string;
  APPLE_MUSIC_KEY_ID?: string;
  APPLE_MUSIC_PRIVATE_KEY?: string;
  APPLE_MUSIC_STOREFRONT?: string;
  /**
   * API key for the third-party BPM provider (GetSongBPM) used to fill
   * `tracks.display_bpm` (M2, optional). Never Spotify. Absent → BPM lookup
   * reports the provider as unavailable; BPM stays manual.
   */
  GETSONGBPM_API_KEY?: string;
  /**
   * The registered OAuth redirect URI for the SoundCloud connect flow. Defaults
   * to `${BETTER_AUTH_URL}/api/v1/providers/soundcloud/callback` when unset.
   */
  SOUNDCLOUD_REDIRECT_URI?: string;
  /**
   * The registered OAuth redirect URI for the Spotify connect flow. Defaults to
   * `${BETTER_AUTH_URL}/api/v1/providers/spotify/callback` when unset. Must be
   * registered verbatim in the Spotify developer dashboard.
   */
  SPOTIFY_REDIRECT_URI?: string;
  /**
   * Secret that derives the AES-GCM key for encrypting provider tokens at rest
   * (and the OAuth state cookie). Required for the provider-connection routes;
   * generate with `openssl rand -base64 32`. Other endpoints boot without it.
   */
  ENCRYPTION_KEY?: string;
  /**
   * When 'true', provider search/import are served from the dev mock catalog
   * (step 9 seam) instead of any live provider API — the whole builder runs with
   * zero provider credentials. Never set in prod.
   */
  MOCK_PROVIDERS?: string;
  /**
   * Resend API key for transactional email (password reset + verification,
   * B1/B2). Absent → emails are logged to the Worker console instead of sent
   * (dev fallback); never leave unset in prod. Server-side only.
   */
  RESEND_API_KEY?: string;
  /**
   * The `From` address for transactional email, e.g. `Ritmo Studio
   * <noreply@ritmofit.studio>`. Must be on a Resend-verified domain. Defaults to
   * `noreply@ritmofit.studio` when unset.
   */
  EMAIL_FROM?: string;
}

/** Values the auth middleware sets on the Hono context for downstream handlers. */
export interface AppVariables {
  /** Canonical user id (`users.id` — Better Auth's id). */
  userId: string;
  /** Canonical profile, shaped by the shared `userSchema`. */
  user: User;
}

/** Hono generic env for this app. */
export type AppEnv = { Bindings: Env; Variables: AppVariables };
