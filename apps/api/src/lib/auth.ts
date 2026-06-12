/**
 * Better Auth wiring (decision D2a) — email/password now, Apple/Google when keys exist.
 *
 * Built per request via `createAuth(env)` because the D1 binding and secrets live on
 * `env`, not at module load (the Workers constraint). Better Auth's own routes are
 * mounted at `/api/auth/*` in `index.ts`; this module only constructs the instance.
 *
 * Field mapping keeps the shared contract intact: Better Auth's `name` / `image`
 * fields are stored in our `display_name` / `image_url` columns, so `userSchema`
 * (displayName / imageUrl) never changes. Apple **Sign-in** here is entirely separate
 * from Apple **Music** (M2) — different credentials, different milestone.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb } from './db.js';
import { users, sessions, accounts, verifications } from '../db/schema.js';
import type { Env } from './types.js';

export function createAuth(env: Env) {
  const db = createDb(env);

  // A provider is enabled only when both halves of its credential pair are set,
  // so local dev boots with email/password and zero external secrets.
  const socialProviders = {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
      ? { apple: { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET } }
      : {}),
  };

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_ORIGIN ?? 'http://localhost:5173', 'https://ritmofit.studio'],
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      // Map Better Auth's singular model names onto our plural Drizzle tables.
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    // Map Better Auth's `name` / `image` fields onto our existing columns.
    user: { fields: { name: 'displayName', image: 'imageUrl' } },
    emailAndPassword: { enabled: true },
    socialProviders,
  });
}

export type Auth = ReturnType<typeof createAuth>;
