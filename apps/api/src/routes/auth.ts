/**
 * Auth bootstrap routes under `/api/v1/auth`.
 *
 * Better Auth's own sign-in/sign-up/callback routes are mounted separately at
 * `/api/auth/*` (see index.ts). These are our thin reconciliation + identity endpoints.
 */
import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';
import { createAuth } from '../lib/auth.js';
import { requireSession } from '../middleware/auth.js';
import { serializeUser } from '../lib/serialize.js';

export const authRoutes = new Hono<AppEnv>();

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
