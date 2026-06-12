/**
 * Session middleware — resolves the Better Auth session to the canonical user.
 *
 * This is the identity gate. **Authorization** (per-resource access) is a separate
 * concern handled by `lib/authz.ts` `requireAccess` (step 5) — D1 has no RLS, so
 * both gates are load-bearing. Attach `requireSession` to every non-public route.
 */
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../lib/types.js';
import { createAuth } from '../lib/auth.js';
import { serializeUser } from '../lib/serialize.js';

export const requireSession = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      401,
    );
  }

  c.set('userId', session.user.id);
  c.set('user', serializeUser(session.user));
  await next();
});
