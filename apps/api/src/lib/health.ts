/**
 * Public liveness for `GET /api/v1/health`.
 *
 * The database probe is `SELECT 1` against the D1 binding. A missing binding or
 * any failed probe is `database: false` and `status: "unavailable"` (HTTP 503).
 * Required-secret fields are presence booleans only — never the secret values.
 * A missing secret stays visible as `false` and does not by itself change
 * `status`; local and test workers boot without the production provider keys.
 */
import { API_VERSION } from '@ritmofit/shared';
import type { Env } from './types.js';

/**
 * Production Worker secrets from the deployment runbook. Apple sign-in and
 * Apple Music each accept a static token or the Team/Key/private-key trio;
 * both forms are reported so an operator can see which one is set.
 * Google and GetSongBPM stay off this list — they are unprovisioned on purpose.
 */
export const REQUIRED_SECRET_NAMES = [
  'BETTER_AUTH_SECRET',
  'BETA_ALLOWED_EMAILS',
  'ENCRYPTION_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'SOUNDCLOUD_CLIENT_ID',
  'SOUNDCLOUD_CLIENT_SECRET',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET',
  'APPLE_CLIENT_ID',
  'APPLE_CLIENT_SECRET',
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_PRIVATE_KEY',
  'APPLE_MUSIC_DEVELOPER_TOKEN',
  'APPLE_MUSIC_TEAM_ID',
  'APPLE_MUSIC_KEY_ID',
  'APPLE_MUSIC_PRIVATE_KEY',
] as const satisfies readonly (keyof Env)[];

export type RequiredSecretName = (typeof REQUIRED_SECRET_NAMES)[number];

export interface HealthReport {
  status: 'ok' | 'unavailable';
  service: 'ritmofit-api';
  version: typeof API_VERSION;
  database: boolean;
  secrets: Record<RequiredSecretName, boolean>;
}

export function secretPresence(env: Env): Record<RequiredSecretName, boolean> {
  const secrets = {} as Record<RequiredSecretName, boolean>;
  for (const name of REQUIRED_SECRET_NAMES) {
    const value = env[name];
    secrets[name] = typeof value === 'string' && value.trim().length > 0;
  }
  return secrets;
}

/** `true` only when D1 accepts `SELECT 1` and returns a row. */
export async function probeDatabase(db: D1Database | undefined): Promise<boolean> {
  if (!db || typeof db.prepare !== 'function') return false;
  try {
    const row = await db.prepare('SELECT 1').first();
    return row != null;
  } catch {
    return false;
  }
}

export async function readHealth(env: Env): Promise<HealthReport> {
  const database = await probeDatabase(env.DB);
  return {
    status: database ? 'ok' : 'unavailable',
    service: 'ritmofit-api',
    version: API_VERSION,
    database,
    secrets: secretPresence(env),
  };
}

/** 200 only when the report is healthy. Callers must not treat 503 as ok. */
export function healthHttpStatus(report: HealthReport): 200 | 503 {
  return report.status === 'ok' ? 200 : 503;
}
