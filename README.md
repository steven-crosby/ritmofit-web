# ritmofit-web

Ritmo Studio helps individual rhythm fitness instructors (Cycle, Pilates, HIIT) build, choreograph,
organize, rehearse, and run their own classes in one continuous creative flow. The current product is
**solo-first and web-first** (D20): this web app is the product-definition surface, framed as a
**creator workstation shell over trusted music services** (D21) — Spotify, Apple Music, and SoundCloud
are the music substrate, and Ritmo adds the instructor layer. A native iOS app follows later from the
proven backend contract; community surfaces (teams, sharing, publish, explore) are deferred.

The current release target is an **invite-only, non-monetized private beta** for a small group of
instructors. Production must set the `BETA_ALLOWED_EMAILS` Worker secret; existing users may sign in,
while new email or social accounts are created only for exact allowlisted addresses. Public launch,
monetization, or meaningful expansion requires a fresh provider-policy review and written permission
where the provider requires it (D22).

This repository is a pnpm TypeScript monorepo: a React/Vite/Tailwind SPA (`apps/web`) and the
authoritative Hono/Cloudflare Workers + D1 backend (`apps/api`), plus shared contracts
(`packages/shared`) and music-provider adapters (`packages/music`). In production a
single Worker serves both the SPA and the API from one origin.

## Tasks and session continuity

The [RF board](ritmofit_dev_plan/tasks.md) is generated from canonical JSON records in
[`ritmofit_dev_plan/tasks/`](ritmofit_dev_plan/tasks/README.md). Any editor or agent can use them;
no external task service is required. Task status never grants commit, merge or deploy permission.

```bash
pnpm tasks list
pnpm tasks show RF-29
pnpm tasks create "Describe an observable outcome"
pnpm tasks:render
pnpm tasks:check
```

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
pnpm tasks:test
pnpm tasks:check
pnpm -r typecheck
pnpm lint
(cd ritmofit_design_system && npm run verify)
pnpm test                                      # fast Vitest unit/component suites
pnpm --filter @ritmofit/api test:integration   # mounted Worker against Miniflare D1
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi && git diff --exit-code apps/api/openapi/openapi.json
pnpm --filter @ritmofit/api contract-parity
pnpm audit:ci
```

### End-to-end smoke

`pnpm e2e` builds the SPA, boots the Worker on `http://localhost:8798` against a fresh local D1
in `e2e/.state/` with mock providers, and drives the signed-in core loop in Playwright at 1440 and
390 wide: sign up, create an empty Cycle class, add two mock tracks, write cues, Run live without
music, play, End Class. Every destination is checked for sideways overflow and for WCAG 2.2 AA
violations with axe. It takes about 30 seconds. It is not part of `pnpm test`, but CI runs it on
every PR and uploads the per-page screenshots as the `e2e-screenshots` artifact.

```bash
pnpm --filter @ritmofit/e2e exec playwright install chromium   # once per machine
pnpm e2e
E2E_CHANNEL=chrome pnpm e2e   # use the installed Google Chrome instead
```

It never reads your `apps/api/.dev.vars` or your local D1. Failure screenshots and traces land in
`e2e/.state/test-results/`, and per-page screenshots in `e2e/.state/shots/`. Port 8798 must be
free; set `E2E_PORT` to move it.

## Build

```bash
pnpm build   # all workspaces
```

## Design system & tokens

The UI is driven by design tokens, not ad-hoc colors. The flow is single-source:

- `ritmofit_design_system/tokens.json` is the **canonical** design-system token source
  of truth for the app — edit token values here. Historical design snapshots may be
  referenced from `ritmofit_dev_plan/HISTORY.md`, but this repo does not vendor from a
  sibling design-system folder. Never hand-edit the generated token CSS in app code.
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
"Security And Deployment" section of [`AGENTS.md`](AGENTS.md). Apply any required remote D1
migrations **before** the code that depends on them.

## Where to read more

- [`AGENTS.md`](AGENTS.md) — canonical contributor and agent guide (architecture, rules, workflow,
  verification). It takes precedence if any other doc conflicts.
- [`ritmofit_dev_plan/`](ritmofit_dev_plan/) — architecture, authorization, schema, milestones, and
  operational runbooks.
- [`ritmofit_design_system/README.md`](ritmofit_design_system/README.md) — tokens, components,
  accessibility, motion, and layout guidance for UI work.
- [`docs/onboarding/ritmofit-tutorial-video-cuts.md`](docs/onboarding/ritmofit-tutorial-video-cuts.md) —
  caption/cut specs for the landing-hero and onboarding tutorial videos.
- [`agent-prompts/delegate-task.md`](agent-prompts/delegate-task.md) — how to hand one task to an
  agent; it opens a PR and squash-merges on green unless the PR touches owner-gated paths (see
  `AGENTS.md` › "Delegation And Merge Policy").
- [`agent-prompts/`](agent-prompts/README.md) — the session workflow (start/close-session, parallel
  lanes, handoff and lane-brief templates) plus attended audit packs, including the agent-agnostic
  [design-audit pack](agent-prompts/design-audit/README.md).
- [`ritmofit_dev_plan/handoffs/`](ritmofit_dev_plan/handoffs/README.md) — one handoff file per
  session or lane: what is in flight and the next action, read by every start-session.
- [`docs/audits/`](docs/audits/) — delivered design-audit runs (critique, prototype, screenshots, and
  proposed implementation prompts). Excluded from the format/lint gates.
- [`ritmofit_dev_plan/archive/`](ritmofit_dev_plan/archive/) — archived launch-readiness review
  (`REVIEW.md`/`REVIEW_HISTORY.md`), pre-launch audit reports, superseded planning docs and AI session
  prompts, and the retired remote maintenance loop (`archive/remote-loop/`).
