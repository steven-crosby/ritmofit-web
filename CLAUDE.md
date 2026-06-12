# RitmoFit

RitmoFit is a choreography and class-running tool for rhythm spin cycle instructors. The web app (this
repo) is the planning surface; a separate iOS app is the live surface. Both are clients of one shared
backend — the backend is the single source of truth.

## Before doing any work

Read [`ritmofit_dev_plan/DEVELOPMENT_PLAN.md`](ritmofit_dev_plan/DEVELOPMENT_PLAN.md) and the rest of
[`ritmofit_dev_plan/`](ritmofit_dev_plan/), plus
[`ritmofit_design_system/README.md`](ritmofit_design_system/README.md). For the exact per-session
prompts and build order, see
[`ritmofit_dev_plan/session-prompts.md`](ritmofit_dev_plan/session-prompts.md).

## Working agreement

Follow [`ritmofit_dev_plan/ai-working-rules.md`](ritmofit_dev_plan/ai-working-rules.md): **propose a
plan and wait for confirmation before writing code**, then summarize when done. Work in small vertical
slices — one build-order step per session.

## Inviolable rules

- **Respect the three hard music constraints** in
  [`ritmofit_dev_plan/music-providers.md`](ritmofit_dev_plan/music-providers.md): never cache audio or
  platform-derived data, never pull BPM from Spotify (deprecated for new apps Nov 2024 — BPM is manual
  in M1), never mix/crossfade audio in-app. If a request seems to require any of these, stop and flag it.
- **The shared package is the contract.** Define entity shapes once in `packages/shared`; don't redefine
  them in `apps/api` or `apps/web`.
- **Centralize authorization.** Every class-scoped route calls `requireAccess`
  ([`authorization.md`](ritmofit_dev_plan/authorization.md)). D1 has **no row-level security** — a
  missing check is a security bug.
- **Never commit secrets.** Use `.dev.vars` (git-ignored) locally and `wrangler secret put` in prod.

## Stack (locked — see [`decisions.md`](ritmofit_dev_plan/decisions.md))

Cloudflare-native: Workers (API) + D1 (database) + Pages/static assets (web). Hono + Drizzle + Zod,
React + Vite + TypeScript, Better Auth (email/Apple/Google). Monorepo: `packages/shared`, `apps/api`,
`apps/web`.

## UI

Use the design system in [`ritmofit_design_system/`](ritmofit_design_system/) for all UI — tokens from
[`tokens.json`](ritmofit_design_system/tokens.json), the redundant-encoding accessibility rules, Martian
Mono for BPM/data, and the energy-ribbon / tempo primitives. Don't invent styling.

## Current state

Pre-code. The repo holds the design system and dev plan only. The first build session is **M1
build-order step 1 (monorepo scaffold)** — see `ritmofit_dev_plan/milestones.md`.
