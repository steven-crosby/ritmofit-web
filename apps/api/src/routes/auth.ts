/**
 * Auth bootstrap routes under `/api/v1/auth`.
 *
 * Better Auth's own sign-in/sign-up/callback routes are mounted separately at
 * `/api/auth/*` (see index.ts). These are our thin reconciliation + identity endpoints.
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { updateUserProfileSchema } from '@ritmofit/shared';
import type { AppEnv } from '../lib/types.js';
import { betaAccessMode, hasAppleSignInConfig } from '../lib/auth.js';
import { refreshSession, requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { users } from '../db/schema.js';
import { serializeUserRow } from '../lib/serialize.js';
import { HttpError } from '../lib/errors.js';

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/capabilities', (c) =>
  c.json({
    // Derived from the gate that actually runs, never a constant: the sign-in
    // surface must not claim an invitation is required where none is (P1-05).
    access: { mode: betaAccessMode(c.env) },
    socialProviders: {
      apple: hasAppleSignInConfig(c.env),
    },
  }),
);

/**
 * POST /auth/session — called once after login (api.md). Validates the Better Auth
 * session and returns the canonical profile. Better Auth's adapter already created
 * the `users` row and, via field mapping, populated display_name / image_url, so in
 * M1 this is a reconciling read rather than an upsert. 401 when unauthenticated.
 * Native clients call it at launch and on foreground to keep a session alive. It
 * is the only REST route that refreshes the session: when the session is older
 * than updateAge it extends the row server-side (`refreshSession`). No response
 * carries a session cookie (RF-178); a 401 means signed out.
 */
authRoutes.post('/session', refreshSession, (c) => c.json(c.get('user')));

/**
 * GET /auth/me — the canonical caller, behind `requireSession`. Doubles as the
 * smoke test that the session gate resolves identity and rejects anonymous calls.
 */
authRoutes.get('/me', requireSession, (c) => c.json(c.get('user')));

/**
 * PATCH /auth/me — update the caller-owned profile fields that are safe for both
 * collaboration display and account settings. Email/password/provider links stay
 * under Better Auth's dedicated routes.
 */
authRoutes.patch('/me', requireSession, async (c) => {
  const body = updateUserProfileSchema.parse(await c.req.json());
  const db = createDb(c.env);
  const patch = { ...body, updatedAt: new Date() };

  await db
    .update(users)
    .set(patch)
    .where(eq(users.id, c.get('userId')));

  const updated = await db
    .select()
    .from(users)
    .where(eq(users.id, c.get('userId')))
    .get();
  if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  return c.json(serializeUserRow(updated));
});
