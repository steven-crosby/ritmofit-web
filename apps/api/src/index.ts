import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import { API_VERSION } from '@ritmofit/shared';
import type { AppEnv } from './lib/types.js';
import { createAuth } from './lib/auth.js';
import { HttpError } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { classRoutes } from './routes/classes.js';
import { classTrackRoutes } from './routes/class-tracks.js';
import { cueRoutes } from './routes/cues.js';
import { placedMoveRoutes } from './routes/placed-moves.js';
import { moveRoutes } from './routes/moves.js';
import { trackRoutes } from './routes/tracks.js';
import { mockRoutes } from './routes/mock.js';
import { teamRoutes } from './routes/teams.js';
import { shareRoutes } from './routes/shares.js';

export type { Env } from './lib/types.js';

const app = new Hono<AppEnv>();

// Map thrown errors to the standard `{ error: { code, message, details? } }`
// envelope (conventions.md) so routes stay thin and let helpers throw.
app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body failed validation.',
          details: err.issues,
        },
      },
      422,
    );
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
api.route('/classes', classRoutes);
// These routers use mixed bases (e.g. /classes/:id/tracks and /class-tracks/:id),
// so they're mounted at the api root with full paths.
api.route('/', classTrackRoutes);
api.route('/', cueRoutes);
api.route('/', placedMoveRoutes);
api.route('/', moveRoutes);
api.route('/', trackRoutes);
api.route('/', mockRoutes);
api.route('/', teamRoutes);
api.route('/', shareRoutes);

export default app;
