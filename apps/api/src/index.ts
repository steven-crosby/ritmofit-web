import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { API_VERSION } from '@ritmofit/shared';
import type { AppEnv } from './lib/types.js';
import { createAuth } from './lib/auth.js';
import { AccessError } from './lib/authz.js';
import { authRoutes } from './routes/auth.js';

export type { Env } from './lib/types.js';

const app = new Hono<AppEnv>();

// Map thrown errors to the standard `{ error: { code, message } }` envelope
// (conventions.md) so routes can stay thin and let helpers like requireAccess throw.
app.onError((err, c) => {
  if (err instanceof AccessError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
    500,
  );
});

// CORS for the SPA. Credentials are on for the Better Auth session cookie, so the
// allowed origin must be echoed explicitly (never `*`). Non-browser callers (no
// Origin header) get no CORS header, which is correct.
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const allowed = [c.env.WEB_ORIGIN ?? 'http://localhost:5173', 'https://ritmofit.studio'];
      return allowed.includes(origin) ? origin : null;
    },
    credentials: true,
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// Better Auth's own routes (sign-up / sign-in / social callbacks), library-managed.
app.on(['GET', 'POST'], '/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw));

// Our REST surface under /api/v1.
const api = app.basePath(`/api/${API_VERSION}`);

api.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'ritmofit-api',
    version: API_VERSION,
  }),
);

api.route('/auth', authRoutes);

export default app;
