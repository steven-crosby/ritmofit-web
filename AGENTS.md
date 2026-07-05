# Repository Guidelines

<!-- note (Codex, 2026-06-22): Made this guide independent of the untracked parent workspace. -->

<!-- note (Codex, 2026-06-26): Moved session prompts into agent-prompts/daily for the daily personal-workflow loop. -->

This file is the canonical contributor and agent guide for Ritmo Studio. If another instruction file
conflicts with it, follow `AGENTS.md`. This guide may exceed 400 words when needed to preserve
architecture, workflow, safety, or verification requirements.

When an AI agent (e.g. Claude, Gemini) edits this file or adds a note to it, it must identify itself —
label the change with the authoring agent and date (e.g. `<!-- note (Claude, 2026-06-17): … -->`).

<!-- note (Claude, 2026-06-24): Adopted the full surface-parity principle (D18) — web and iOS are co-equal surfaces; added the hard parity gate below. -->
<!-- note (Codex, 2026-06-28): Set the active operating focus to web launch readiness first, with iOS parity wrap-up tracked next. -->
<!-- note (Codex, 2026-06-29): Web launch gate is green/deployed; active operating focus moves to iOS handoff and parity wrap. -->
<!-- note (Codex, 2026-06-29): Synced the CI-equivalent gate with the live workflow: design-system verify and iOS contract parity are always part of the gate. -->
<!-- note (Codex, 2026-07-02): Updated music constraints for official provider-authorized in-app playback (D19). -->
<!-- note (Claude, 2026-07-02): Doc audit — current operating sequence now names the provider-playback initiative; cadence source of truth is agent-prompts/SCHEDULE.md. -->
<!-- note (Codex, 2026-07-05): Reset current product focus to the solo-first individual creator loop; community surfaces are dormant/deferred. -->

## Product & Architecture

Ritmo Studio helps **individual rhythm fitness instructors** build, choreograph, organize, rehearse, and
run their own classes in one continuous creative flow. The current core disciplines are rhythm cycle,
Pilates, and HIIT. The product is solo-first: perfect the individual creator experience until instructors
naturally want to share, publish, and collaborate. Community features come later because the solo workflow
has earned them, not because the app assumes them.

The web app is the product-definition surface for now. The separate iOS app remains a future/native
client of the same backend, but current web product decisions are not gated on iOS parity. Dialing in the
web app near-perfectly should make later iOS refinement straightforward because the core creative loop,
contracts, and UX decisions will already be proven. The backend is the source of truth for accounts,
classes, choreography, tracks, moves, provider references, and live/run payloads. Music providers own
playback and provider-specific availability. The frontend owns presentation and temporary form state.

The stack is a pnpm TypeScript monorepo: React/Vite/Tailwind on the web, Hono/Cloudflare Workers and D1
on the API, Drizzle for persistence, Zod for contracts, and Better Auth for identity. Production serves
the SPA and API from the same Worker and origin.

## Current Product Focus

The solo-first reset is locked as `ritmofit_dev_plan/decisions.md` **D20** and supersedes the active
product-planning parts of the earlier web/iOS parity decision (**D18**). The current product loop is:
choose or shape a class idea, find the right songs, choreograph the class, organize it in the personal
library, rehearse, and run Live Mode. Do not make that flow rigid. Instructors may start from a class
format, duration, song, movement idea, energy arc, or rehearsal need; the UI should keep creative paths
open rather than forcing a single sequence.

**Current operating sequence (2026-07-05):** the web launch gate is green and deployed. The active track
is solo creator refinement plus the **provider-authorized playback initiative**
(`ritmofit_dev_plan/provider-playback-implementation.md`) where it improves rehearsal and Live Mode.
iOS wrap-up is deferred behind the web product-definition pass.

## Deferred Community Surfaces

Teams, invites, collaborators, public class pages, publishing flows, social discovery, marketplace or
community browsing, Explore, and share links are **deferred**. Do not build, polish, promote, or expand
them unless the owner explicitly reopens that work. The repository still contains backend/API/schema
scaffolding for teams, shares, public visibility, and Explore; preserve it for now, but keep those
surfaces hidden from the current web product. If a request appears to depend on community/social
behavior, stop and confirm scope before implementing.

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
- Never download, proxy, remix, mix, crossfade, decode, analyze, or create derivative provider audio.
- In-app playback is allowed only through official provider-authorized SDKs/widgets. Ritmo Studio controls
  playback windows and class timing; providers own the audio stream and provider-specific availability.

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
(cd ritmofit_design_system && npm run verify)
pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
git diff --exit-code apps/api/openapi/openapi.json
pnpm --filter @ritmofit/api contract-parity
pnpm audit:ci
```

CI is advisory and never deploys, but it now runs all of the above. Prettier owns code and top-level
docs; generated artifacts, long-form reference doc trees (`ritmofit_dev_plan/`,
`ritmofit_design_system/`), agent prompts, and the vendored iOS snapshot are excluded in
`.prettierignore`.
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

Deployments are manual and production-facing, so obtain confirmation before deploying.

**Deploy cadence — merging is not deploying.** Do **not** deploy after every PR merge. Keep `main` as
the always-green, deployable integration line and merge slices as they pass the gate, but ship to
production in deliberate batches:

- **Default — batch at a checkpoint.** Group related, low-risk slices (especially presentation-only
  ones) into one deploy at a natural boundary: a finished feature, the end of a work session, or a
  milestone. One Worker version per coherent change set keeps rollback clean.
- **Deploy immediately, out of band,** only for a production bug, regression, security fix, or
  something surfaced during live verification.
- **Deploy on its own,** never batched with unrelated work, for any schema/migration, auth, provider,
  or infrastructure change — apply migrations before dependent code and prefer off-peak timing.

If migrations are required, apply them before code that depends on them:

```bash
pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --remote
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api run deploy
```

After deployment, smoke-test the SPA, health endpoint, and a protected endpoint, and report the Worker
version and remote migration state. When asked to “run close-session,” follow
`agent-prompts/daily/close-session.md` completely, including git/PR hygiene, verification,
deployment-state reporting, documentation updates, blockers, and cleanup of production test data.
