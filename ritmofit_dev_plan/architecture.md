# Architecture

## Stack at a glance

| Layer | Choice |
|---|---|
| Compute (API) | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite), bound to the Worker |
| Auth | Better Auth (email, Apple, Google), tables in D1 |
| Backend framework | Hono (TypeScript) |
| ORM / migrations | Drizzle |
| API style | REST, documented with OpenAPI |
| Validation / types | Zod schemas in `packages/shared`, types inferred from them |
| Web client | React + Vite + TypeScript (SPA) + Tailwind (RitmoFit tokens) |
| Web hosting | Workers static assets — the SPA is served by the **same Worker** as the API (single origin); no separate Pages site |
| iOS client | Native Swift (separate repo), consumes the OpenAPI contract |

## How the clients share one backend

```
        ┌─────────────┐         ┌─────────────┐
        │ Web (React) │         │ iOS (Swift) │
        └──────┬──────┘         └──────┬──────┘
               │  HTTPS / REST (OpenAPI contract)
               └───────────┬───────────┘
                           ▼
                  ┌──────────────────────┐
                  │  Hono API (Worker)   │
                  │  - Better Auth mw    │
                  │  - authz helper      │
                  │  - route modules     │
                  └──────────┬───────────┘
                             │ Drizzle (D1 binding)
                             ▼
                  ┌──────────────────────┐
                  │  Cloudflare D1       │
                  │  users, teams,       │
                  │  classes, tracks,    │
                  │  class_tracks, cues, │
                  │  moves, shares ...   │
                  └──────────────────────┘

  Better Auth verifies identity (email/Apple/Google) and issues a session the
  clients send to the API. The Worker validates it and resolves the canonical
  `users` row. The D1 database — not any provider — is the source of truth.
```

The backend is the single source of truth. Neither client holds canonical state; both sync through the
API so a class built on web opens on iOS unchanged.

## Repo layout (monorepo)

```
ritmofit/
├─ DEVELOPMENT_PLAN.md          # entry point / map (this plan)
├─ ritmofit_dev_plan/           # this folder — durable context for AI + humans
├─ ritmofit_design_system/      # the design system (tokens, principles, components)
├─ packages/
│  └─ shared/                   # the contract: Zod schemas + inferred TS types
│     ├─ src/entities/          # class, track, class_track, cue, move, team, share, user
│     └─ src/index.ts
├─ apps/
│  ├─ api/                      # Hono backend (Cloudflare Worker)
│  │  ├─ src/
│  │  │  ├─ db/schema.ts        # Drizzle table definitions (must match schema.md)
│  │  │  ├─ middleware/auth.ts  # Better Auth session → resolve canonical user
│  │  │  ├─ lib/authz.ts        # centralized access checks (see authorization.md)
│  │  │  ├─ routes/             # one module per resource group
│  │  │  └─ index.ts
│  │  ├─ migrations/            # Drizzle/D1 migrations (committed, ordered) — at apps/api/migrations
│  │  ├─ openapi/               # generated OpenAPI spec for iOS + web
│  │  └─ wrangler.toml          # Worker + D1 binding config
│  └─ web/                      # React + Vite SPA
│     ├─ src/
│     │  ├─ lib/api-client.ts   # typed client built on packages/shared
│     │  ├─ lib/auth.ts         # Better Auth client wiring (email/Apple/Google)
│     │  └─ ...
│     └─ index.html
├─ package.json                 # workspace root (pnpm)
└─ tsconfig.base.json           # shared TS config / project refs
```

> Start with these three packages. Add `packages/music` (provider adapters) when M2 begins, and
> `packages/ui` only if component sharing between web and a future marketing surface is real — not
> preemptively. Six empty packages before a feature exists is structure-as-theater.

## Data flow: a typical write

1. Client obtains a Better Auth session at login.
2. Client calls e.g. `POST /api/v1/classes/:id/tracks` with the session credential.
3. `middleware/auth.ts` validates the session and resolves the canonical `users` row (upsert on first
   sight).
4. `lib/authz.ts` checks the user may edit this class (owner or edit-share).
5. The route validates the body against the shared Zod schema, writes via Drizzle to D1, returns the
   created row typed by the shared package.

## The shared package is the contract

`packages/shared` defines each entity once as a Zod schema; the TypeScript type is `z.infer`'d from it.
- The API validates request/response bodies against these schemas.
- The web client imports the same types for its API client.
- iOS can't import TS, so it consumes the **OpenAPI spec** generated from these schemas — keeping all
  three clients honest about the same shapes.

Do not redefine entity shapes inside `apps/api` or `apps/web`. Change a shape once: in `packages/shared`.

## Deployment & environments

- **API:** `wrangler deploy` publishes the Hono Worker with its D1 binding. Migrations applied via
  `wrangler d1 migrations apply`. **Deploys are intentionally manual** (run `pnpm --filter @ritmofit/api
  deploy` from a checkout) — the Cloudflare **Workers Builds** git integration was deliberately
  disconnected (2026-06-12) so a push to `main` does **not** auto-deploy to production. Don't reconnect
  it without deciding you want push-to-deploy CI/CD; a future CI should gate on `pnpm -r typecheck` +
  `pnpm test` before any deploy.
- **Web:** Vite build → **Workers static assets** served by the **same Worker** as the API (`[assets]`
  in `wrangler.toml`, `run_worker_first=["/api/*"]`, SPA fallback). SPA and API share **one origin**
  (`https://ritmofit.studio`), so the session cookie is first-party and **no cross-origin CORS is
  needed**. (There is no separate `api.ritmofit.studio` origin and no Cloudflare Pages site.)
- **Local dev:** `wrangler dev` runs the Worker against a local D1; the web app runs via Vite and
  points at the local API. Secrets in `.dev.vars` (git-ignored); never commit secrets.
- **Provider keys** (Spotify, SoundCloud, Apple Music) are live integration secrets, not committed
  configuration. Production values live in Cloudflare Worker secrets; local values live in ignored
  `.dev.vars`. Keep Sign in with Apple auth credentials separate from Apple Music credentials.

## D1 / SQLite notes that shape the code

- **No native UUID or timestamptz types.** IDs are `TEXT` holding UUIDv4; timestamps are `INTEGER`
  epoch milliseconds. (See `schema.md`.)
- **Enums are `TEXT` + `CHECK`** constraints (Drizzle `text({ enum: [...] })`).
- **No row-level security.** Unlike Postgres, D1 can't back-stop access at the DB layer — so the
  application-level `requireAccess` helper is the *only* gate. Treat `authorization.md` as load-bearing.
- **Keep queries SQLite-friendly.** The `GET /classes` union is plain SQL; avoid Postgres-only
  constructs.
