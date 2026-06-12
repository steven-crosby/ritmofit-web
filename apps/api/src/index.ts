import { Hono } from 'hono';
import { API_VERSION } from '@ritmofit/shared';

/**
 * Worker bindings. `DB` is the Cloudflare D1 database (see wrangler.toml).
 * Secrets from `.dev.vars` / `wrangler secret put` are added in later steps.
 */
export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// All REST routes live under /api/v1 (API_VERSION comes from @ritmofit/shared,
// proving the workspace import resolves inside the Worker bundle).
const api = app.basePath(`/api/${API_VERSION}`);

api.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'ritmofit-api',
    version: API_VERSION,
  }),
);

export default app;
