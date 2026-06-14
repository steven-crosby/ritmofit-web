import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import { API_VERSION } from '@ritmofit/shared';
import { ProviderError } from '@ritmofit/music';
import type { AppEnv, Env } from './lib/types.js';
import { createAuth } from './lib/auth.js';
import { createDb } from './lib/db.js';
import { drainPurgeQueue, createD1PurgeStore } from './lib/music/purge.js';
import { pruneRateLimits } from './lib/rate-limit.js';
import { HttpError } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { classRoutes } from './routes/classes.js';
import { classTrackRoutes } from './routes/class-tracks.js';
import { cueRoutes } from './routes/cues.js';
import { placedMoveRoutes } from './routes/placed-moves.js';
import { sectionRoutes } from './routes/sections.js';
import { moveRoutes } from './routes/moves.js';
import { trackRoutes } from './routes/tracks.js';
import { providerRoutes } from './routes/providers.js';
import { providerConnectionRoutes } from './routes/provider-connections.js';
import { mockRoutes } from './routes/mock.js';
import { teamRoutes } from './routes/teams.js';
import { shareRoutes } from './routes/shares.js';
import { exploreRoutes } from './routes/explore.js';

export type { Env } from './lib/types.js';

const app = new Hono<AppEnv>();

// Baseline browser security headers on every Worker response (the API + health;
// the SPA/static assets are served by the [assets] handler, which the Worker does
// not run for, so those carry the same set via `apps/web/public/_headers` — keep
// the two in sync). API responses are JSON, so their CSP is locked to
// `default-src 'none'`; the page CSP that allows the app's own scripts/styles/fonts
// lives in `_headers`. Set after `next()` so the final response (including the
// library-managed Better Auth responses) is covered.
app.use('*', async (c, next) => {
  await next();
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
});

// Map thrown errors to the standard `{ error: { code, message, details? } }`
// envelope (conventions.md) so routes stay thin and let helpers throw.
app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status);
  }
  // An upstream music provider misbehaved (non-JSON / unexpected shape). This is a
  // bad-gateway, NOT a client validation error — keep it out of the 422 branch
  // below (a provider `ZodError` would otherwise read as "your request was invalid").
  if (err instanceof ProviderError) {
    // 502, not 500: an upstream provider misbehaved. Log the detail (provider +
    // message) so it stays diagnosable, but never leak it to the client.
    console.warn(`[provider:${err.provider}] ${err.message}`);
    return c.json(
      { error: { code: 'PROVIDER_UNAVAILABLE', message: 'A music provider is temporarily unavailable.' } },
      502,
    );
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
// Mounted BEFORE the root routers below: those each register a blanket
// `use('*', requireSession)` which, mounted at '/', becomes a global middleware.
// The OAuth callback here must stay public (it authenticates via its state cookie,
// not a session), so its concrete route has to be registered first to win.
api.route('/', providerConnectionRoutes);
// These routers use mixed bases (e.g. /classes/:id/tracks and /class-tracks/:id),
// so they're mounted at the api root with full paths.
api.route('/', classTrackRoutes);
api.route('/', cueRoutes);
api.route('/', placedMoveRoutes);
api.route('/', sectionRoutes);
api.route('/', moveRoutes);
api.route('/', trackRoutes);
api.route('/', providerRoutes);
api.route('/', mockRoutes);
api.route('/', teamRoutes);
api.route('/', shareRoutes);
api.route('/', exploreRoutes);

/**
 * Worker entry. Beyond `fetch`, a daily Cron Trigger (`[triggers]` in
 * wrangler.toml) drains the provider metadata-purge queue — the deferred
 * disconnect-compliance duty (see `lib/music/purge.ts`). `waitUntil` lets the
 * drain finish past the handler's return.
 */
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      drainPurgeQueue(createD1PurgeStore(createDb(env)), (msg) => console.log(`[purge] ${msg}`))
        .then((summary) => {
          console.log(`[purge] ${JSON.stringify(summary)}`);
        })
        // A throw before the per-row try (e.g. listQueue) would otherwise reject
        // waitUntil unobserved and silently skip the whole sweep. Log so a failed
        // run is visible; the queue is durable, so the next sweep retries it.
        .catch((err) => {
          console.error(`[purge] sweep failed: ${err instanceof Error ? err.message : String(err)}`);
        }),
    );

    // Same daily sweep prunes stale rate-limit rows (D1 has no TTL); independent
    // of the purge so one failing doesn't skip the other.
    ctx.waitUntil(
      pruneRateLimits(createDb(env), Date.now())
        .then((deleted) => console.log(`[rate-limit] pruned ${deleted} stale rows`))
        .catch((err) =>
          console.error(
            `[rate-limit] prune failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        ),
    );
  },
};
