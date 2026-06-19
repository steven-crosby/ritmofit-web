# ritmofit-web

RitmoFit is a choreography and class-running tool for rhythm spin cycle instructors. The web app is
where instructors do most of their planning — assembling classes on a laptop with a large screen,
multiple windows, and the time to audition many tracks. The iOS app is where they run classes live.

This repository is a pnpm TypeScript monorepo: a React/Vite/Tailwind SPA (`apps/web`) and the
authoritative Hono/Cloudflare Workers + D1 backend (`apps/api`) it shares with the iOS client, plus
shared contracts (`packages/shared`) and music-provider adapters (`packages/music`). In production a
single Worker serves both the SPA and the API from one origin.

## Prerequisites

- Node 22.13 or newer
- pnpm 11.4 (`corepack enable` will provision it)

## Install

```bash
pnpm install --frozen-lockfile
```

## Configure local secrets

The Worker reads local secrets from a git-ignored `apps/api/.dev.vars`. Copy the documented template
and fill in what you need:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Only `BETTER_AUTH_SECRET` is required to boot (`openssl rand -base64 32`). Leaving the provider keys
blank with `MOCK_PROVIDERS=true` runs search/import/connect against a deterministic mock catalog, and
leaving `RESEND_API_KEY` blank logs verification/reset emails to the `wrangler dev` console instead of
sending them — so the full builder works with no third-party credentials. Every variable is documented
inline in `apps/api/.dev.vars.example`. Production secrets are managed with `wrangler secret put`, never
committed.

## Run locally

```bash
pnpm dev:api   # Worker at http://localhost:8787
pnpm dev:web   # generates design tokens, then Vite at http://localhost:5173
```

First-time (or after schema changes) local database setup:

```bash
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
```

## Test and quality gates

The CI-equivalent gates (also documented in [`AGENTS.md`](AGENTS.md)):

```bash
pnpm format:check
pnpm -r typecheck
pnpm lint
pnpm test                                      # fast Vitest unit/component suites
pnpm --filter @ritmofit/api test:integration   # mounted Worker against Miniflare D1
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi && git diff --exit-code apps/api/openapi/openapi.json
pnpm audit:ci
```

## Build

```bash
pnpm build   # all workspaces
```

## Design system & tokens

The UI is driven by design tokens, not ad-hoc colors. The flow is single-source:

- `ritmofit_design_system/tokens.json` is the **canonical** design-system token source
  of truth for the app — edit token values here. (The workspace-root
  `ritmofit-design-system-final/` is an audit/review snapshot, **not** an upstream this
  is vendored from.) Never hand-edit the generated token CSS in app code.
- `pnpm --filter @ritmofit/web tokens` (auto-runs on `dev`/`build`) regenerates
  `src/styles/tokens.css`: the dark `:root` set plus an **opt-in**
  `[data-theme="light"]` block. Dark is the default; nothing sets `data-theme`, so
  light mode is inert until a theme toggle is added. Live mode stays dark in both
  themes. `tokens.css` is a generated, git-ignored artifact.
- `tailwind.config.js` only maps the `--rf-*` vars into Tailwind utilities — tokens
  stay the single source. Reference channels semantically (`text-state-danger`,
  `bg-live`) rather than the intensity ramp or raw colors.
- Fonts are **self-hosted** under `public/fonts` (no third-party CDN). Refresh the
  subsets with `node apps/web/scripts/fetch-fonts.mjs`; licensing is in
  `public/fonts/NOTICE.md` (ship each family's full `OFL.txt` before production).

## Deploy

Deployments are **manual and production-facing** — see the deploy, rollback, and D1 recovery procedures
in [`ritmofit_dev_plan/deployment-runbook.md`](ritmofit_dev_plan/deployment-runbook.md) and the
"Security, Deployment & Session Close" section of [`AGENTS.md`](AGENTS.md). Apply any required remote D1
migrations **before** the code that depends on them.

## Where to read more

- [`AGENTS.md`](AGENTS.md) — canonical contributor and agent guide (architecture, rules, workflow,
  verification). It takes precedence if any other doc conflicts.
- [`ritmofit_dev_plan/`](ritmofit_dev_plan/) — architecture, authorization, schema, milestones, and
  operational runbooks.
- [`ritmofit_design_system/README.md`](ritmofit_design_system/README.md) — tokens, components,
  accessibility, motion, and layout guidance for UI work.
- [`ritmofit_dev_plan/archive/`](ritmofit_dev_plan/archive/) — archived launch-readiness review
  (`REVIEW.md`/`REVIEW_HISTORY.md`), pre-launch audit reports, and superseded AI session prompts.
