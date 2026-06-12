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
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  WEB_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  /** When 'true', enables the dev-only mock-track seam (step 9). Never set in prod. */
  MOCK_PROVIDERS?: string;
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
