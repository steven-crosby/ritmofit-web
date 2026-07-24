# Repository Guidelines

<!-- note (Codex, 2026-07-05): Consolidated stale historical notes and source-of-truth routing after the D20 solo-first reset. -->
<!-- note (Claude, 2026-07-06): Recorded the D21 creator-workstation-shell frame in Product Boundaries. -->
<!-- note (Codex, 2026-07-12): Consolidated canonical instructions into AGENTS.md and removed Claude-only wrappers. -->
<!-- note (Codex, 2026-07-13): Promoted verified OpenAPI, migration, PWA, provider, and deployment lessons from historical agent memory. -->
<!-- note (Codex, 2026-07-16): Restored stale-chunk recovery and real-browser playback verification guidance. -->
<!-- note (Grok, 2026-07-22): Added short workspace-container block so nested-git sessions still see multi-checkout rules. -->
<!-- note (Claude, 2026-07-24): Recorded the agent-agnostic design-audit pack v6 and its docs/audits deliverable path. -->

This is the canonical contributor and agent guide for Ritmo Studio. If another instruction file conflicts
with it, follow `AGENTS.md`, then repair the stale file. When an AI agent edits this file or adds a note
to it, identify the agent and date in a short HTML comment.

## Workspace container (parent)

This checkout often lives under `~/repos/ritmostudio/`, a **non-git workspace container** with
`ritmofit-ios/` and multiple independent `ritmofit-web` checkouts. Parent routing guide:
`../../AGENTS.md` (or `~/repos/ritmostudio/AGENTS.md`).

- Confirm which checkout and branch you are in before editing
  (`git branch --show-current`). Sibling checkouts are not in sync by default.
- Never copy changes between checkouts — use git (commit/push/pull) through shared `origin`.
- Serialize shared browser profiles, GUI sessions, and local-port QA when concurrent lanes need them.
- Freeze shared OpenAPI/routes/auth-db-error helpers/migrations across parallel lanes until coordinated.
- **This file remains authoritative** for code in this checkout.

## Source Of Truth

- `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`: current product focus, milestone state, and open work.
- `ritmofit_dev_plan/decisions.md`: locked product and architecture decisions, including D20.
- `ritmofit_dev_plan/conventions.md`: detailed naming, style, env, logging, CORS, and DB conventions.
- `ritmofit_dev_plan/deployment-runbook.md`: production deploy, rollback, D1 recovery, and smoke tests.
- `agent-prompts/SCHEDULE.md`: prompt cadence; use `agent-prompts/daily/start-session.md` and
  `agent-prompts/daily/close-session.md` for interactive work blocks.
- `README.md`: setup, local dev, and broad repo orientation.
- `agent-prompts/`: canonical session, maintenance, and remote-agent prompts.
- `agent-prompts/design-audit/`: agent-agnostic full-product design audit. One owner authorization, one
  continuous run, one deliverable folder at `docs/audits/<agent>-design-audit-<YYYY-MM-DD>/`. The running
  agent makes no Git commits and no production code edits; implementation is a separate session, unlocked
  only by owner dispositions in that run's `run-decisions.md`.

Keep `AGENTS.md` limited to durable operating rules and canonical command surfaces. Do not use it as a
dated status log; update the planning docs for status changes and `HISTORY.md` for deploy/build history.

## New Machine And Portability

Setting up a fresh clone: follow `README.md` in order — Prerequisites (Node `>=22.13`, pnpm `>=11.4`
via `corepack enable`) → Install → **Configure local secrets** (`apps/api/.dev.vars` copied from
`apps/api/.dev.vars.example`; never committed) → Run locally → first-run local D1
`db:migrate:local && db:seed:local`. Then run the full gate in "Verification, PRs, And Commits" once
as a health check — green means the box is set up correctly. Secrets are the only thing a clone
cannot reproduce for you; everything else is in the repo.

This guide is self-contained and **repo-relative**. Never hardcode an absolute machine path or a home
directory in anything committed (docs or scripts); resolve from the repo root. On
some machines this repo is one of several side-by-side checkouts under a non-git workspace container —
the directory above the repo is not part of it, so do not assume that layout or reach outside the
repo root. Per-machine agent configuration is not tracked and does not travel with the repo; anything
meant to be portable belongs in a tracked file here.

## Product Boundaries

Ritmo Studio helps individual rhythm fitness instructors build, choreograph, organize, rehearse, and run
classes in one creative loop. The current product model is **solo-first and web-first**: the web app is
the product-definition surface, and iOS follows later from proven contracts and UX decisions. D20 pauses
the old D18 parity gate; current web work is not blocked by iOS parity bookkeeping. Still call out
contract or design implications when a web change affects future iOS work.

The product frame is a **creator workstation shell over trusted music services (D21)**: Spotify, Apple
Music, and SoundCloud are the reliable music substrate, and Ritmo adds the instructor layer — class
structure, choreography, rehearsal, playback windows, readiness, and Live Mode. Provider libraries are the
raw material; class-building is the creative layer on top. Design for **familiar before specialized** —
instructors browse, listen, and inspect playlists and convert curiosity into a class, with no single
forced creation flow. The current core disciplines/templates are **Cycle, Pilates, and HIIT** (Pilates
maps to the stored `sculpt` enum for now). This extends D20's solo-first, web-first model; it does not
reopen the deferred community surfaces below.

Teams, sharing, publishing, Explore, public class pages, collaborators, invites, and social/community
discovery are deferred community surfaces. Preserve existing backend/API/schema scaffolding, but do not
surface, polish, or expand those workflows unless the owner explicitly reopens them.

## Working Agreement

Before substantial work, inspect the relevant code and docs, then propose a concise plan and wait for
owner confirmation. Substantial work includes features, architecture, schema/API behavior, auth,
design-system changes, infrastructure, deploys, and broad refactors. A useful plan names the goal, likely
files, schema/migration/API impact, frontend impact, risks, open questions, and verification.

Use `start-session` for orientation and `close-session` for wrap-up when the owner asks. Do not discard,
overwrite, stash, or silently include existing worktree changes. Prefer small vertical slices: shared
contract, API/authz, UI states, then tests. Do not add infrastructure or revive deferred surfaces unless
the request clearly calls for it.

Work verified, not assumed. Before acting on a path, command, file, or instruction that comes from
notes, memory, or a handoff, confirm it still exists in this repo rather than trusting it. Flag
judgment calls and substitutions explicitly instead of choosing silently, and surface anything that
contradicts what you were told.

Owner working style: the owner (Steven) values directness, decisiveness once scope is clear, explicit
flagging of assumptions and trade-offs, and tight written summaries (tables welcome) over long prose.
Ask focused clarifying questions before non-trivial changes rather than guessing, then act. Report
outcomes plainly — including what was skipped, substituted, or failed.

## Project Structure

- `apps/web`: React/Vite/Tailwind SPA; components in `src/components`, helpers and tests in `src/lib`,
  generated styles in `src/styles`, public assets in `public`.
- `apps/api`: Hono Cloudflare Worker; routes in `src/routes`, helpers in `src/lib`, Drizzle schema/seed
  in `src/db`, migrations in `migrations`, integration tests in `test`.
- `packages/shared`: canonical Zod schemas, enums, and inferred TypeScript types.
- `packages/music`: provider adapters and music-domain helpers.
- `ritmofit_design_system`: design tokens, component guidance, accessibility, motion, and layout rules.
- `INBOX.md`: raw breadcrumb catcher; surface at start-session and route/delete at close-session.

## Commands

Use Node `>=22.13` and pnpm `>=11.4`.

- `pnpm install --frozen-lockfile`: install workspace dependencies.
- `pnpm dev:api`: run the Worker locally at `http://localhost:8787`.
- `pnpm dev:web`: generate tokens and run Vite at `http://localhost:5173`.
- `pnpm build`: build all workspaces.
- `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`, `pnpm test`: core local gates.
- `pnpm --filter @ritmofit/api test:integration`: Worker/D1 integration tests.
- `pnpm --filter @ritmofit/web build`: production SPA build.
- `pnpm --filter @ritmofit/api openapi`: regenerate `apps/api/openapi/openapi.json`.
- `pnpm --filter @ritmofit/api contract-parity`: compare backend/OpenAPI run-payload DTOs with the
  vendored iOS snapshot allowlist.

The root `pnpm test` uses `--if-present`. When a workspace package gains its first tests, add an
explicit `test` script to that package so a green root command cannot silently mean zero tests ran.

For local API setup after schema changes:

```bash
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
```

## Engineering Rules

TypeScript is strict. Prettier uses two spaces, single quotes, semicolons, trailing commas, and a
100-column width. Use camelCase values, PascalCase types/components, snake_case SQL columns,
lower_snake enum values, plural kebab-case routes, and `_ms` suffixes for millisecond fields.

Define entity shapes once in `packages/shared`; API validation, web types, and OpenAPI output consume
those schemas. Class-scoped access must go through `requireAccess` or the matching centralized authz
helper. D1 has no row-level security, so missing app-level authz is a security bug. Return the standard
JSON error envelope and preserve documented 404 behavior for hidden resources.

The OpenAPI generator in `apps/api/scripts/generate-openapi.ts` manually registers component schemas
and paths. When adding or changing a route or DTO, inspect both registries directly; regeneration with
no diff does not prove the surface was registered.

Generate and commit new Drizzle migrations. Never rewrite an applied migration without explicit approval.
Keep queries SQLite-compatible and reconcile `schema.md` with Drizzle before dependent code. Review the
generated SQL before applying it, especially table-rebuild `INSERT ... SELECT` column/value alignment,
because a syntactically valid rebuild can silently move the wrong data.

For UI work, use `ritmofit_design_system` tokens and established components. Include loading, empty,
error, and permission states. Controls must be keyboard accessible, visibly focused, and labeled; never
encode meaning by color alone. Respect `prefers-reduced-motion`. Use browser viewport emulation for
narrow responsive QA; shrinking a headless window can capture a cropped wider layout. Preserve the PWA
prompted-update path, and keep service-worker navigation fallback denied for `/api/` routes so OAuth and
auth callbacks reach the Worker rather than a cached SPA shell. Preserve an update/reload recovery path
for stale service-worker chunks after a deployment.

## Music Constraints

These rules are non-negotiable:

- Never cache provider audio or provider-derived analysis.
- Never obtain BPM from Spotify; use manual BPM or a dedicated permitted tempo provider.
- Never download, proxy, remix, mix, crossfade, decode, analyze, or create derivative provider audio.
- In-app playback is allowed only through official provider-authorized SDKs/widgets. Providers own the
  audio stream, authorization, subscription checks, and availability.

Re-verify provider API and authentication behavior before changing integrations. Keep Sign in with Apple
separate from Apple Music. Never log tokens, cookies, authorization headers, private keys, or provider
secrets. Diagnose provider API-shape drift separately from authorization/scope failures. Verify connect,
browse/import, readiness, playback, seeking, pause/resume, and reconnect as distinct capabilities; success
in one does not prove the others. For provider/audio playback changes, API probes and automated tests are
not enough; verify actual playback behavior in a real browser.

## Verification, PRs, And Commits

Name tests `*.test.ts` / `*.test.tsx`; Worker/D1 suites use `*.integration.test.ts`. Add focused coverage
for non-trivial helpers, authz, route mounting, query behavior, and regressions.

Before submitting code, run the CI-equivalent gate unless the owner accepts a narrower docs-only check:

```bash
pnpm format:check
pnpm -r typecheck
pnpm lint
(cd ritmofit_design_system && npm run verify)
pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
git diff --exit-code apps/api/openapi/openapi.json
pnpm --filter @ritmofit/api contract-parity
pnpm audit:ci
```

CI is advisory and never deploys. Use small Conventional Commits, commonly scoped:
`feat(web): ...`, `fix(api): ...`, `test(api): ...`, `docs: ...`. PRs should explain behavior and risk,
link relevant issues, list verification, include screenshots for UI changes, and call out schema,
migration, shared-contract, config, secret, and deployment impacts.

## Security And Deployment

Never commit `.env`, `.dev.vars`, credentials, tokens, private keys, or production data dumps. Local
Worker secrets belong in ignored `apps/api/.dev.vars`; production secrets are managed with
`wrangler secret put`.

Deployments are manual and production-facing. Merging is not deploying: keep `main` deployable, but ship
in deliberate batches. Deploy immediately only for a production bug, regression, security fix, or
live-verification finding. Deploy schema/migration, auth, provider, and infrastructure changes on their
own; apply required remote D1 migrations before code. The Worker deploy command does not build the SPA;
build `apps/web/dist` before deploying the Worker that serves it.

For deploys and rollback, follow `ritmofit_dev_plan/deployment-runbook.md`. After deployment, smoke-test
the SPA, health endpoint, a protected endpoint, relevant assets/headers, and report the Worker version
plus remote migration state. If an asset-hash check disagrees with a confirmed deploy, cache-bust the
request before diagnosing a rollback or broken release.
