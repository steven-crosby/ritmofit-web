# Repository Guidelines

<!-- note (Codex, 2026-06-22): Made this guide independent of the untracked parent workspace. -->

<!-- note (Codex, 2026-06-26): Moved session prompts into agent-prompts/daily for the daily personal-workflow loop. -->

This file is the canonical contributor and agent guide for RitmoFit. If another instruction file
conflicts with it, follow `AGENTS.md`. This guide may exceed 400 words when needed to preserve
architecture, workflow, safety, or verification requirements.

When an AI agent (e.g. Claude, Gemini) edits this file or adds a note to it, it must identify itself —
label the change with the authoring agent and date (e.g. `<!-- note (Claude, 2026-06-17): … -->`).

<!-- note (Claude, 2026-06-24): Adopted the full surface-parity principle (D18) — web and iOS are co-equal surfaces; added the hard parity gate below. -->

## Product & Architecture

RitmoFit is a choreography and class-running tool for rhythm spin instructors, delivered as **two
complete, co-equal surfaces of one product** ("Spotify for instructors"): this **web app** and the
separate **iOS app**. Each carries the _full_ instructor loop — build & choreograph, library, search,
explore, sharing, **and** run a class live — in its platform's native idiom; neither is
capability-limited. This repository contains the web surface and the shared backend the iOS app also
consumes. The backend is the source of truth for classes, choreography, tracks, moves, teams, and
shares. Music providers own playback and provider-specific availability. The frontend owns presentation
and temporary form state.

The stack is a pnpm TypeScript monorepo: React/Vite/Tailwind on the web, Hono/Cloudflare Workers and D1
on the API, Drizzle for persistence, Zod for contracts, and Better Auth for identity. Production serves
the SPA and API from the same Worker and origin.

## Surface Parity (Web ↔ iOS) — hard gate

The parity principle is locked as `ritmofit_dev_plan/decisions.md` **D18**; mechanics, sync points, the
current parity backlog, and the documented exceptions live in
`ritmofit_dev_plan/web-ios-parity.md`. **The gate is binding:** no feature merges on one surface without
the same capability landing on the other **or** a tracked, linked parity item on the other surface.
Existing asymmetries are defects, not the steady state. Allowed divergence is limited to the documented
exceptions (iPhone-only haptics/lock-screen/motion; web-leaning second-screen presentation) and
platform-idiomatic UX expression. When planning any feature, state its parity impact in the plan and PR.

## Before Implementing

Read the relevant material in `ritmofit_dev_plan/` and, for UI work,
`ritmofit_design_system/README.md`. Before any substantial work, inspect the existing implementation,
propose a concise plan, and wait for confirmation. Substantial work includes features, architecture,
schema or API behavior, authentication, design-system changes, infrastructure, deployment, and broad
refactors. Include:

- Goal and files affected.
- Schema/migration and API-contract impact.
- Frontend impact, risks, and open questions.
- Verification steps.

Inspect existing schemas, migrations, shared types, and routes before adding new ones. Prefer a small
vertical slice: shared contract, API and authorization, UI states, then tests. Do not build deferred
features or new infrastructure unless requested. When implementation is complete, summarize the files
changed, verification performed, and any remaining risks or follow-ups.

## Project Structure

- `apps/web`: React/Vite UI. Components are in `src/components`, helpers and colocated unit tests in
  `src/lib`, and generated design tokens in `src/styles`.
- `apps/api`: Hono Worker. Routes are in `src/routes`, backend helpers in `src/lib`, Drizzle schemas in
  `src/db`, migrations in `migrations`, and Worker/D1 integration tests in `test`.
- `packages/shared`: canonical Zod schemas, enums, and cross-client TypeScript types.
- `packages/music`: provider adapters and music-domain helpers.
- `ritmofit_design_system`: tokens, components, accessibility, motion, and layout guidance.
- `ritmofit_dev_plan`: architecture, authorization, conventions, milestones, and operational runbooks.
- `INBOX.md`: breadcrumb catcher for raw ideas; surfaced at start-session, routed/cleared at
  close-session. The only file allowed to be messy — drain it into the trackers above.

## Development Commands

Use Node 22.13+ and pnpm 11.4. Install with `pnpm install --frozen-lockfile`.

- `pnpm dev:api`: run the Worker at `http://localhost:8787`.
- `pnpm dev:web`: generate design tokens and run Vite at `http://localhost:5173`.
- `pnpm build`: build all workspaces.
- `pnpm -r typecheck`: run strict TypeScript checks across workspaces.
- `pnpm lint`: run ESLint.
- `pnpm format` / `pnpm format:check`: write or check Prettier formatting.
- `pnpm test`: run fast Vitest unit suites.
- `pnpm --filter @ritmofit/api test:integration`: test the mounted Worker against Miniflare D1.
- `pnpm --filter @ritmofit/web build`: generate tokens, typecheck, and build the SPA.
- `pnpm --filter @ritmofit/api openapi`: regenerate `apps/api/openapi/openapi.json`.

For local API work, run:

```bash
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
```

## Coding & Domain Rules

Prettier uses two spaces, single quotes, semicolons, trailing commas, and a 100-column width. TypeScript
is strict. Use camelCase values, PascalCase types and React components, snake_case SQL columns and enum
values, plural kebab-case routes, and `_ms` suffixes for millisecond fields.

Define entity shapes once in `packages/shared`; never duplicate contracts or enums in an app. API
request/response validation and OpenAPI generation must use those shared schemas. All class-scoped
access must go through `requireAccess` or the matching centralized authorization helper. D1 has no
row-level security, so a missing authorization call is a security bug. Return the standard JSON error
envelope and preserve the documented 404 behavior for hidden resources.

Generate and commit new Drizzle migrations; do not rewrite an applied migration without explicit
approval. Keep queries SQLite-compatible and reconcile schema documentation with Drizzle before writing
dependent code.

## Music & UI Constraints

These music rules are non-negotiable:

- Never cache provider audio or provider-derived analysis. Store only documented provider references
  and permitted metadata, and preserve required disconnect-purge behavior.
- Never obtain BPM from Spotify; use manual BPM or the dedicated tempo-provider path.
- Never mix, crossfade, or embed provider playback in the app.

If a request appears to require breaking one of these rules, stop and flag it. Re-verify current
provider API and authentication behavior before changing integrations. Keep Sign in with Apple
configuration separate from Apple Music credentials. Never log tokens, cookies, authorization headers,
private keys, or provider secrets.

For UI work, use `ritmofit_design_system` tokens and established components. Include loading, empty,
error, and permission states. Controls must be keyboard accessible, visibly focused, and labeled;
never encode meaning by color alone. Respect `prefers-reduced-motion`. Keep server state separate from
temporary form state, and avoid introducing global state infrastructure without a demonstrated need.

## Testing & Quality Gates

Name unit tests `*.test.ts` or `*.test.tsx` and Worker/D1 tests `*.integration.test.ts`. Add focused
coverage for non-trivial helpers, authorization, route mounting, query behavior, and regressions.

Before submitting code, run the CI-equivalent gates:

```bash
pnpm format:check
pnpm -r typecheck
pnpm lint
pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
git diff --exit-code apps/api/openapi/openapi.json
pnpm audit:ci
```

CI is advisory and never deploys, but it now runs all of the above — including `format:check` and
`pnpm audit:ci`. Prettier owns code and top-level docs; generated artifacts and the long-form
reference doc trees (`ritmofit_dev_plan/`, `ritmofit_design_system/`) are excluded in `.prettierignore`.
`audit:ci` accepts the documented dev/build-only advisories via `auditConfig.ignoreGhsas` in
`pnpm-workspace.yaml`; any new advisory fails the gate.

## Commits & Pull Requests

Use small Conventional Commits, commonly scoped: `feat(web): ...`, `fix(api): ...`, `test(api): ...`,
and `docs: ...`. PRs should explain behavior and risk, link relevant issues, list verification commands,
and include screenshots for UI changes. Explicitly call out schema, migration, shared-contract,
configuration, secret, and deployment impacts. Do not include unrelated cleanup.

## Security, Deployment & Session Close

Never commit `.env`, `.dev.vars`, credentials, tokens, or private keys. Local secrets belong in ignored
files; production secrets are managed with `wrangler secret put`.

Deployments are manual and production-facing, so obtain confirmation before deploying. If migrations
are required, apply them before code that depends on them:

```bash
pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api run deploy
```

After deployment, smoke-test the SPA, health endpoint, and a protected endpoint, and report the Worker
version and remote migration state. When asked to “run close-session,” follow
`agent-prompts/daily/close-session.md` completely, including git/PR hygiene, verification,
deployment-state reporting, documentation updates, blockers, and cleanup of production test data.
