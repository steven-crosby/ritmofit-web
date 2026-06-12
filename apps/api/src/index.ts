import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { API_VERSION } from '@ritmofit/shared';
import type { AppEnv } from './lib/types.js';
import { createAuth } from './lib/auth.js';
import { authRoutes } from './routes/auth.js';

export type { Env } from './lib/types.js';

const app = new Hono<AppEnv>();

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
