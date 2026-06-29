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
import { users, sessions, accounts, verifications, rateLimits } from '../db/schema.js';
import type { Env } from './types.js';
import { sendEmail, actionEmail } from './email.js';
import { signAppleJwt } from './apple-jwt.js';

export function hasAppleSignInConfig(env: Env): boolean {
  return Boolean(
    env.APPLE_CLIENT_ID &&
    (env.APPLE_CLIENT_SECRET || (env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY)),
  );
}

async function appleClientSecret(env: Env): Promise<string> {
  if (env.APPLE_CLIENT_SECRET) return env.APPLE_CLIENT_SECRET;
  if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    throw new Error('Sign in with Apple is not fully configured.');
  }
  return signAppleJwt({
    teamId: env.APPLE_TEAM_ID,
    keyId: env.APPLE_KEY_ID,
    privateKey: env.APPLE_PRIVATE_KEY,
    audience: 'https://appleid.apple.com',
    subject: env.APPLE_CLIENT_ID,
  });
}

export function createAuth(env: Env) {
  const db = createDb(env);

  // A provider is enabled only when both halves of its credential pair are set,
  // so local dev boots with email/password and zero external secrets.
  const socialProviders = {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(hasAppleSignInConfig(env)
      ? {
          apple: async () => ({
            clientId: env.APPLE_CLIENT_ID!,
            clientSecret: await appleClientSecret(env),
            // Native iOS Sign in with Apple issues ID tokens whose audience is the
            // app bundle id (not the web Services ID). Declaring it lets Better Auth
            // accept tokens posted from the iOS client to /sign-in/social.
            appBundleIdentifier: 'studio.ritmofit.RitmoFit',
          }),
        }
      : {}),
  };

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_ORIGIN ?? 'http://localhost:5173', 'https://ritmofit.studio'],
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      // Map Better Auth's singular model names onto our plural Drizzle tables.
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        rateLimit: rateLimits,
      },
    }),
    // Map Better Auth's `name` / `image` fields onto our existing columns.
    user: { fields: { name: 'displayName', image: 'imageUrl' } },
    emailAndPassword: {
      enabled: true,
      // B1 — password reset. Better Auth builds `url` (routes through its own
      // handler, then redirects to the SPA's /reset-password with the token).
      sendResetPassword: async ({ user, url }) => {
        const { html, text } = actionEmail({
          heading: 'Reset your RitmoFit password',
          intro: `Someone (hopefully you) asked to reset the password for ${user.email}. This link expires in 1 hour.`,
          buttonLabel: 'Reset password',
          url,
          footer: "If you didn't request this, you can safely ignore this email.",
        });
        await sendEmail(env, {
          to: user.email,
          subject: 'Reset your RitmoFit password',
          html,
          text,
        });
      },
    },
    // B2 — email verification. Sent on sign-up but NOT required to sign in
    // (send-don't-block posture); tighten with requireEmailVerification later.
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        const { html, text } = actionEmail({
          heading: 'Confirm your email',
          intro: `Welcome to RitmoFit! Confirm ${user.email} to secure your account.`,
          buttonLabel: 'Verify email',
          url,
          footer: 'You can keep using RitmoFit while this is pending.',
        });
        await sendEmail(env, {
          to: user.email,
          subject: 'Confirm your RitmoFit email',
          html,
          text,
        });
      },
    },
    socialProviders,
    // B4 — brute-force / signup-spam protection, state in our D1 `rate_limit`
    // table. Better Auth's auto prod-detection (process.env.NODE_ENV) doesn't fire
    // on Workers, so enable explicitly on the https origin and leave http://localhost
    // dev unthrottled. Defaults are generous; per-endpoint rules tighten auth.
    rateLimit: {
      enabled: env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 3600, max: 10 },
        '/request-password-reset': { window: 3600, max: 5 },
        '/forget-password': { window: 3600, max: 5 },
        '/reset-password': { window: 3600, max: 10 },
      },
    },
    // Key rate limits only by Cloudflare's single trusted visitor-IP header.
    // `X-Forwarded-For` can include client-supplied values before Cloudflare
    // appends to it, so it must not be a fallback for auth throttling.
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
  });
}

export type Auth = ReturnType<typeof createAuth>;
