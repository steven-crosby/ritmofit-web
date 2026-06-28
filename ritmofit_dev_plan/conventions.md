# Conventions

## Language & tooling
- **TypeScript** across backend and web; `strict` mode on.
- **Package manager:** pnpm workspaces (monorepo). One lockfile at root.
- **Lint/format:** ESLint + Prettier, shared config at root; CI fails on lint errors.
- **Node:** pin a current LTS in `.nvmrc` / `engines`.
- **Cloudflare tooling:** `wrangler` for the Worker + D1 (dev, migrations, deploy). **Deploys are
  manual** (`pnpm --filter @ritmofit/api deploy`) — no push-to-deploy CI; Workers Builds is intentionally
  disconnected (see `architecture.md` → Deployment).

## Naming
- **DB columns:** snake_case (`owner_user_id`, `start_offset_ms`, `anchor_ms`).
- **TypeScript:** camelCase fields, PascalCase types. The shared package maps between the two; don't
  leak snake_case into TS or camelCase into SQL.
- **Enums:** lower_snake values (`all_out`, `apple_music`), defined once in `packages/shared` and
  reused by Drizzle (`text({ enum: [...] })`).
- **Routes:** plural nouns, kebab where multi-word (`/class-tracks/:id`, `/class-track-moves/:id`).
- **Time fields end in `_ms`** and are integer epoch/relative milliseconds (decision D10).

## The shared contract rule
- Every entity shape is a Zod schema in `packages/shared`; TS types are `z.infer`'d from it.
- API request/response validation uses these schemas; the web client imports the same types; iOS
  consumes the generated OpenAPI spec.
- **Never** redefine an entity shape in `apps/api` or `apps/web`. Change it once in `shared`.

## Authorization
- All class-scoped access goes through `apps/api/src/lib/authz.ts` (`requireAccess`). No inline checks.
  D1 has no RLS, so this helper is the only gate. See `authorization.md`.

## Errors
- JSON shape: `{ error: { code, message, details? } }`.
- Status conventions in `api.md` (401/403/404/409/422). NONE access returns **404**, not 403, to avoid
  revealing existence.

## Database (D1 / SQLite specifics)
- IDs are `TEXT` UUIDv4; timestamps are `INTEGER` epoch ms; enums are `TEXT` + CHECK.
- Migrations are Drizzle-generated, committed, ordered; applied with `wrangler d1 migrations apply`.
- `schema.md` is the human source of truth; if Drizzle and `schema.md` disagree, reconcile before
  writing dependent code.
- Keep queries SQLite-friendly (no Postgres-only constructs); the `GET /classes` union is plain SQL.

## Testing
- **Unit:** the authz helper and any non-trivial query builders (the `GET /classes` union especially).
- **Integration:** route-level tests against a local D1 (Miniflare) — **implemented** via
  `@cloudflare/vitest-pool-workers`. Run `pnpm --filter @ritmofit/api test:integration` (config
  `apps/api/vitest.integration.config.ts`, tests in `apps/api/test/*.integration.test.ts`); runs the mounted
  worker + real Better Auth sessions against a migrated test D1, and is its own CI step. Kept separate from
  the fast node-env unit suite (`pnpm test`).
- Tests are part of "done" for each route group, not an afterthought.

## Secrets & env
- Never commit secrets. `.dev.vars` (wrangler local) and `.env` are git-ignored; commit a
  `.dev.vars.example` / `.env.example` with keys and blank values.
- **Runtime env:** Better Auth secrets, Apple & Google sign-in credentials, the D1 binding (in
  `wrangler.toml`), `ENCRYPTION_KEY`, email delivery secrets, and provider credentials for Spotify,
  SoundCloud, and Apple Music.
- Keep Sign in with Apple auth credentials separate from Apple Music credentials.
- Production secrets live in Cloudflare (`wrangler secret put`), not in the repo.

## Git
- Small, focused commits aligned to the active launch-readiness gate.
- Conventional-commit style (`feat:`, `fix:`, `chore:`, `docs:`).
- Branch per focused change; PR back to main.

## CORS
- **Production is single-origin:** the SPA and the API are served by the **same Worker** at
  `https://ritmofit.studio` (`/api/*` → Hono, everything else → the built SPA). The Better Auth session
  cookie is therefore **first-party and no cross-origin CORS is needed** in production. (There is no
  separate `api.ritmofit.studio` origin.)
- **Local dev is cross-origin:** Vite serves the web app (`http://localhost:5173`) while the Worker runs
  separately (`http://localhost:8787`), so dev CORS must allow the Vite dev origin with credentials
  enabled for the session cookie.

## Logging
- Never log tokens, refresh tokens, `Authorization` headers, cookies, provider secrets, or Apple
  private keys. Provider errors may be logged in sanitized form.

## Domain & infra (current state)
- Domain `ritmofit.studio` on Cloudflare DNS.
- API = Cloudflare Worker; database = Cloudflare D1; web = Workers static assets served by the **same
  Worker** as the API (single origin; no separate Pages site).
- iOS app is a separate repo and a second client of this backend — not a separate source of truth.
