# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth

**`AGENTS.md` is the canonical contributor/agent guide** — architecture, engineering rules, music
constraints, verification gates, and deploy procedure. Read it before substantial work. If anything
below conflicts with it, `AGENTS.md` wins. Related docs it points to:

- `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` — current product focus and milestone state.
- `ritmofit_dev_plan/decisions.md` — locked product/architecture decisions (referenced as `D<n>`).
- `ritmofit_dev_plan/conventions.md` — naming, style, env, logging, CORS, DB conventions.
- `ritmofit_dev_plan/deployment-runbook.md` — deploy, rollback, D1 recovery, smoke tests.
- `ritmofit_design_system/README.md` — tokens, components, accessibility, motion, layout.

## Working agreement (from AGENTS.md)

Before substantial work (features, architecture, schema/API behavior, auth, design-system changes,
infrastructure, deploys, broad refactors), inspect the relevant code/docs and propose a concise plan
before acting. Prefer small vertical slices: shared contract → API/authz → UI states → tests. Don't
discard, overwrite, stash, or silently include existing worktree changes. Don't add infrastructure or
revive deferred surfaces (teams, sharing, publish, Explore, public class pages — see Product Boundaries
in AGENTS.md) unless the request clearly calls for it. Verify paths/commands/facts from notes or memory
against the current repo rather than trusting them; flag assumptions and substitutions explicitly.

## Commands

Node `>=22.13`, pnpm `>=11.4` (`corepack enable`).

```bash
pnpm install --frozen-lockfile

pnpm dev:api                                   # Worker at http://localhost:8787
pnpm dev:web                                   # generates tokens, then Vite at http://localhost:5173

pnpm --filter @ritmofit/api db:migrate:local   # first-time / after schema changes
pnpm --filter @ritmofit/api db:seed:local

pnpm build                                     # all workspaces
```

Core local gates (also run in CI, see full list below):

```bash
pnpm format:check
pnpm -r typecheck
pnpm lint
pnpm test                                      # fast Vitest unit/component suites (root uses --if-present)
```

### Running a single test

Each workspace (`apps/web`, `apps/api`, `packages/music`) runs Vitest directly, so filter by file or name
from that workspace:

```bash
pnpm --filter @ritmofit/web test -- src/components/LiveMode.test.tsx
pnpm --filter @ritmofit/web test -- -t "test name substring"
pnpm --filter @ritmofit/api test -- src/lib/authz.test.ts
pnpm --filter @ritmofit/api test:watch         # watch mode, same filtering
```

API integration tests (`*.integration.test.ts`, mounted Worker against Miniflare D1) use a separate
Vitest config and are not part of the plain `test` script:

```bash
pnpm --filter @ritmofit/api test:integration -- src/routes/classes.integration.test.ts
```

When a workspace package gains its *first* test file, give it an explicit `test` script — the root
`pnpm test` uses `--if-present`, so a missing script silently reports success with zero tests run.

### Full CI-equivalent gate

Run before submitting code (narrower docs-only checks may skip this — ask the owner):

```bash
pnpm format:check
pnpm -r typecheck
pnpm lint
(cd ritmofit_design_system && npm run verify)
pnpm --filter @ritmofit/web theme-classes      # catches color utility classes Tailwind never generates; tsc/ESLint can't see string classes
pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
git diff --exit-code apps/api/openapi/openapi.json
pnpm --filter @ritmofit/api contract-parity    # backend/OpenAPI run-payload DTOs vs vendored iOS snapshot allowlist
pnpm audit:ci
```

CI is advisory and never deploys — deployments are manual, see `ritmofit_dev_plan/deployment-runbook.md`.

## Architecture

pnpm TypeScript monorepo, single-origin in production (one Worker serves the SPA and API):

- **`apps/web`** — React/Vite/Tailwind SPA. Components in `src/components`, non-component logic and
  hooks in `src/lib`, generated design-token CSS in `src/styles` (`tokens.css` is git-ignored, generated
  by `pnpm --filter @ritmofit/web tokens`, which auto-runs on `dev`/`build` — never hand-edit it).
- **`apps/api`** — Hono Cloudflare Worker, the authoritative backend. Routes in `src/routes`, shared
  helpers in `src/lib`, Drizzle schema/seed in `src/db`, SQL migrations in `migrations`, integration
  tests in `test`. Backed by Cloudflare D1 (SQLite).
- **`packages/shared`** — canonical Zod schemas, enums, and inferred TypeScript types. Entity shapes are
  defined once here; API validation, web types, and OpenAPI output all consume these schemas rather than
  redeclaring shapes locally.
- **`packages/music`** — provider adapters (Spotify, Apple Music, SoundCloud) and music-domain helpers
  (BPM, identity matching, playlist URL parsing, OAuth/token handling).
- **`ritmofit_design_system`** — canonical design tokens (`tokens.json`) plus component, accessibility,
  motion, and layout guidance. `apps/web`'s `tokens` script regenerates CSS from this source; never edit
  the generated CSS directly.

### Product frame

Ritmo Studio is a **creator workstation shell over trusted music services**: Spotify, Apple Music, and
SoundCloud are the music substrate; the product adds the instructor layer (class structure,
choreography, rehearsal, playback windows, readiness, Live Mode) on top. Current disciplines are Cycle,
Pilates (stored as `sculpt`), and HIIT. Solo-first and web-first — iOS follows later from the proven
backend contract. Teams/sharing/publish/Explore/public pages are deferred: backend scaffolding may exist
but should not be surfaced or expanded without explicit owner sign-off.

### Key conventions

- Class-scoped access must go through `requireAccess` or the matching centralized authz helper in
  `apps/api/src/lib/authz.ts` / `team-authz.ts` — D1 has no row-level security, so missing app-level authz
  is a security bug.
- The OpenAPI generator (`apps/api/scripts/generate-openapi.ts`) manually registers component schemas and
  paths — when adding/changing a route or DTO, check both registries; a no-diff regeneration doesn't prove
  the surface got registered.
- Drizzle migrations are generated and committed, never rewritten once applied without explicit approval.
  Review generated SQL before applying, especially table-rebuild `INSERT ... SELECT` column alignment.
- Naming: camelCase values, PascalCase types/components, snake_case SQL columns, lower_snake enum values,
  plural kebab-case routes, `_ms` suffixes for millisecond fields. Prettier: 2 spaces, single quotes,
  semicolons, trailing commas, 100-column width.
- Local Worker secrets live in git-ignored `apps/api/.dev.vars` (copy from `.dev.vars.example`); only
  `BETTER_AUTH_SECRET` is required to boot. `MOCK_PROVIDERS=true` runs against a deterministic mock catalog
  with no third-party credentials.

### Music constraints (non-negotiable)

- Never cache provider audio or provider-derived analysis.
- Never obtain BPM from Spotify; use manual BPM or a dedicated permitted tempo provider.
- Never download, proxy, remix, mix, crossfade, decode, analyze, or create derivative provider audio.
- In-app playback only through official provider-authorized SDKs/widgets — providers own the audio
  stream, authorization, subscription checks, and availability.
- Keep Sign in with Apple separate from Apple Music. Never log tokens, cookies, authorization headers,
  private keys, or provider secrets.

## Commits

Small Conventional Commits, scoped: `feat(web): ...`, `fix(api): ...`, `test(api): ...`, `docs: ...`.
