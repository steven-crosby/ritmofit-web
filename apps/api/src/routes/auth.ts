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
import { createAuth, hasAppleSignInConfig } from '../lib/auth.js';
import { requireSession } from '../middleware/auth.js';
import { createDb } from '../lib/db.js';
import { users } from '../db/schema.js';
import { serializeUser, serializeUserRow } from '../lib/serialize.js';
import { HttpError } from '../lib/errors.js';

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/capabilities', (c) =>
  c.json({
    access: { mode: 'invite_only' as const },
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
 */
authRoutes.post('/session', async (c) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, 401);
  }

  return c.json(serializeUser(session.user));
});

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
