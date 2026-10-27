# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above) is the canonical guide that Cursor, Codex and Claude all share. It holds
the rules, the session workflow, the commands and the full CI gate. On any conflict `AGENTS.md` wins.
This file adds only the architecture map and the test commands that `AGENTS.md` leaves out. Put new
durable rules in `AGENTS.md` so every tool sees them, not here.

## Running a subset of tests

```bash
pnpm --filter @ritmofit/web exec vitest run src/lib/readiness.test.ts   # one web file
pnpm --filter @ritmofit/api exec vitest run src/lib/authz.test.ts -t "owner"   # one API test by name
pnpm --filter @ritmofit/api exec vitest run --config vitest.integration.config.ts test/authz.integration.test.ts
pnpm --filter @ritmofit/music test
pnpm e2e   # local-only Playwright smoke (mock providers, port 8798); see README
```

Web tests are configured in `apps/web/vite.config.ts` and default to the node environment. Component
tests opt into jsdom per file with `// @vitest-environment jsdom`. The API unit config is
`apps/api/vitest.config.ts`. The integration config runs the mounted Worker
with `@cloudflare/vitest-pool-workers` against a Miniflare D1 that has the real migrations applied.
Storage is rolled back after each test. That per-test isolation is the reason vitest and pool-workers
are pinned (see the comments in `pnpm-workspace.yaml`), so do not bump them casually.

## Architecture

**One Worker serves everything.** `apps/api/wrangler.toml` serves `apps/web/dist` as static assets
with SPA fallback and `run_worker_first = ["/api/*"]`. The SPA and the API share one origin
(`ritmofit.studio`), so the Better Auth session cookie is first-party. The same Worker exports a
`scheduled` handler: a daily cron drains the provider metadata-purge queue
(`lib/music/purge.ts`) and prunes rate-limit rows.

**API request path** (`apps/api/src/index.ts`):

1. Security headers are set on every response. Page CSP lives separately in
   `apps/web/public/_headers`, and the two must stay in sync.
2. A malformed nested `/classes/:id/...` id returns a JSON 404 before auth.
3. `app.onError` maps thrown `HttpError`, `ProviderError`/`ProviderQuotaExceededError` (502/429)
   and `ZodError` (422) to the `{ error: { code, message } }` envelope. Routes stay thin and let
   helpers throw.
4. `/api/auth/*` belongs to Better Auth (`lib/auth.ts`). The REST surface is `/api/v1`.

**Route mount order is load-bearing.** Most routers are mounted at `/` and register a blanket
`use('*', requireSession)`, which becomes global middleware. Public routes (`/uploads` cover reads, the
provider OAuth callback in `provider-connections.ts`) must be mounted _before_ those routers or they
turn into 401s. Keep this in mind when adding a router.

**Authz** lives in `apps/api/src/lib/authz.ts`: `requireAccess` plus per-child helpers
(`requireClassTrackAccess`, `requireCueAccess`, `requireSectionAccess`, `requirePlanBlockAccess`, …)
that resolve the child back to its class. Hidden or missing resources both return 404. The
integration suite (`authz`, `nested-resource-access`, `class-route-access`) is the regression net
that proves each route actually calls its gate.

**Contract chain:** Zod schemas in `packages/shared` → validated by the API → imported as types by
`apps/web/src/lib/api.ts` (the typed fetch client) → registered by hand in
`apps/api/scripts/generate-openapi.ts` → `apps/api/openapi/openapi.json` → checked against the
vendored iOS snapshot (`ios-snapshot/`, `contract-parity`). The run payload that Live Mode consumes
(`lib/run-payload.ts`) is the DTO that iOS relies on most.

**Music, server side:** `packages/music` holds the provider clients (Spotify, Apple Music,
SoundCloud), OAuth/PKCE, identity and playlist-URL parsing, and the `ProviderError` types.
`apps/api/src/lib/music/` wires them to D1 (registry, playlist import/preview, likes, Spotify playback
token, BPM lookup, purge). `MOCK_PROVIDERS=true` with blank keys swaps in `lib/mock-catalog.ts` so
the app runs with no third-party credentials.

**Music, client side:** playback runs only through official SDKs, inside
`apps/web/src/lib/playback/`. `coordinator.ts` is the pure core (provider selection, clip-window math,
preflight) with injected `now`. `runtime.ts` drives the per-provider adapters
(`spotify-adapter`, `apple-music-adapter` via `lib/musickit.ts`, `soundcloud-adapter`).
`liveness.ts` tracks whether audio is actually progressing. The design rationale is in
`ritmofit_dev_plan/provider-playback-implementation.md`.

**Web app:** React 18 + Tailwind with **no router**. `App.tsx` gates on the session and switches on
`window.location.pathname` (only `/`, `/privacy`, `/reset-password` are known paths). After that,
navigation is component state inside `Dashboard`. Pure logic and hooks live in `src/lib/*.ts`, each
with a co-located test. `Root.tsx` keeps `UpdatePrompt` _outside_ the `ErrorBoundary` so a stale
precached shell can always reach the PWA update. `lazyWithReload.ts` recovers from stale chunks after
a deploy. Tokens: edit `ritmofit_design_system/tokens.json`; `src/styles/tokens.css` is generated and
git-ignored.

**D1 shapes the schema:** ids are TEXT UUIDv4, timestamps are INTEGER epoch ms (`_ms`), enums are TEXT
with CHECK constraints, and there is no RLS. Drizzle schema is in `apps/api/src/db/schema.ts`; Better
Auth tables are in `auth-schema.ts`. `ritmofit_dev_plan/schema.md` must agree with both.

## Where the deeper docs are

Domain vocabulary (class, plan block, section, cue, placed move, clip window): see
`ritmofit_dev_plan/glossary.md`. Locked decisions such as D20/D21/D22: `decisions.md`. Access model:
`authorization.md`. API surface: `api.md`. Provider capabilities and policy: `music-providers.md`.
