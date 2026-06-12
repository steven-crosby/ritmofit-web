# Conventions

## Language & tooling
- **TypeScript** across backend and web; `strict` mode on.
- **Package manager:** pnpm workspaces (monorepo). One lockfile at root.
- **Lint/format:** ESLint + Prettier, shared config at root; CI fails on lint errors.
- **Node:** pin a current LTS in `.nvmrc` / `engines`.
- **Cloudflare tooling:** `wrangler` for the Worker + D1 (dev, migrations, deploy).

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
- **Integration:** route-level tests against a local D1 (Miniflare / `wrangler dev` test harness).
- Tests are part of "done" for each route group, not an afterthought.

## Secrets & env
- Never commit secrets. `.dev.vars` (wrangler local) and `.env` are git-ignored; commit a
  `.dev.vars.example` / `.env.example` with keys and blank values.
- **M1 env:** Better Auth secrets (signing/session), Apple & Google sign-in client/service IDs, the D1
  binding (in `wrangler.toml`), `ENCRYPTION_KEY` (declared now, used M2 for provider tokens).
- **M2 placeholders (document now, unused in M1):** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`,
  `SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_TEAM_ID`,
  `APPLE_MUSIC_PRIVATE_KEY`. Keep out of the codebase until M2.
- Production secrets live in Cloudflare (`wrangler secret put`), not in the repo.

## Git
- Small, focused commits aligned to the M1 build order.
- Conventional-commit style (`feat:`, `fix:`, `chore:`, `docs:`).
- Branch per build-order step; PR back to main.

## CORS
- Strict. The web SPA is served from `https://ritmofit.studio` (Pages); the API Worker is a **separate
  origin** at `https://api.ritmofit.studio`. Allow only the production web origin
  (`https://ritmofit.studio`) and local dev origins (Vite, e.g. `http://localhost:5173`) — credentials
  enabled for the Better Auth session cookie.

## Logging
- Never log tokens, refresh tokens, `Authorization` headers, cookies, provider secrets, or Apple
  private keys. Provider errors may be logged in sanitized form.

## Domain & infra (current state)
- Domain `ritmofit.studio` on Cloudflare DNS.
- API = Cloudflare Worker; database = Cloudflare D1; web = Cloudflare Pages / Workers static assets.
- iOS app is a separate repo and a second client of this backend — not a separate source of truth.
