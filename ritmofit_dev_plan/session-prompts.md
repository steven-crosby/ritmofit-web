# Session Prompts

Copy-paste prompts for driving implementation with Claude, mapped 1:1 to the M1 build order in
[`milestones.md`](./milestones.md). All of them rely on the working agreement in
[`ai-working-rules.md`](./ai-working-rules.md): **plan → confirm → code → summarize**. Claude proposes
before it builds; you confirm; it implements; it summarizes.

**Rules of thumb**
- **One build-order step per session.** Small vertical slices with a confirm gate are the whole point;
  batching defeats the migration/authz review discipline.
- **When a step touches UI (steps 6+ and 12), point at the design system** (`ritmofit_design_system/`)
  so Claude uses the tokens, the energy ribbon, Martian Mono for BPM, and the redundant-encoding rules
  rather than inventing styling.
- The root [`AGENTS.md`](../AGENTS.md) is the canonical agent guide and directs agents to the relevant
  plans, so these prompts can stay
  short.

---

## Reusable session-start prompt (any session)

```
Read ritmofit_dev_plan/ (start with DEVELOPMENT_PLAN.md) and ritmofit_design_system/README.md.
Inspect the repo, tell me which M1 build-order step we're on, and propose a plan for the
next step per ritmofit_dev_plan/ai-working-rules.md — files to create/change, schema impact,
API surface, frontend impact, risks, verification. Wait for my confirmation before coding.
```

---

## Step 1 — monorepo scaffold (the first build session)

```
This is our first build session. Read ritmofit_dev_plan/DEVELOPMENT_PLAN.md, architecture.md,
conventions.md, and milestones.md, plus ai-working-rules.md.

We're on M1 build-order step 1 (monorepo scaffold). Propose a plan — then wait for my
confirmation — to set up:
- pnpm workspace root + tsconfig.base.json + shared ESLint/Prettier + .nvmrc
- packages/shared, apps/api, apps/web (only these three for now)
- apps/api: a Hono Worker with wrangler.toml + a D1 binding and GET /api/v1/health
- apps/web: Vite + React + TS SPA, Tailwind wired to the tokens in
  ritmofit_design_system/tokens.json (generate CSS custom properties from it)
Acceptance: web runs via Vite, API runs via `wrangler dev`, /health returns ok, and
packages/shared imports resolve from both apps. Do NOT implement product features yet.
Finish with the "Completed / Files changed / How to verify / Known issues" summary.
```

## Step 2 — the contract (packages/shared)

```
M1 step 2: build packages/shared. Zod schemas + inferred types for every entity in
ritmofit_dev_plan/schema.md, enums defined once (none/easy/mod/hard/all_out, providers, etc.).
Plan first. Acceptance: types import cleanly in api and web.
```

## Step 3 — database (Drizzle schema + migration + seed)

```
M1 step 3: Drizzle schema (apps/api/src/db/schema.ts) matching schema.md exactly for D1/SQLite —
TEXT UUID PKs, integer-ms timestamps, TEXT+CHECK enums, the shares one-target CHECK, the
class_track_moves at-most-one-reference rule, unique constraints. First migration + seed the
global moves library. Acceptance: `wrangler d1 migrations apply` runs locally; seed creates moves.
```

## Step 4 — auth (Better Auth)

```
M1 step 4: wire Better Auth (email/Apple/Google) on Workers+D1. POST /auth/session upserts the
canonical users row on first sight; session middleware resolves the user. Keep Apple Sign-in
separate from Apple Music. Acceptance: sign in locally; API identifies the user; unauthenticated
requests rejected.
```

## Step 5 — authorization (before any protected route)

```
M1 step 5: implement lib/authz.ts requireAccess per ritmofit_dev_plan/authorization.md, with unit
tests including the owned ∪ shared-direct ∪ shared-team union. D1 has no RLS, so this is the only
gate. Acceptance: owner/edit/view/none resolve correctly in tests.
```

## Step 6 — class builder core

```
M1 step 6: class + class_track routes (CRUD, reorder, copy-with-cues), all through requireAccess.
Acceptance: create a class; add/edit/remove class_tracks; reorder persists; copy duplicates cues+moves.
```

## Step 7 — choreography (cues, moves, library)

```
M1 step 7: cues + class_track_moves routes (anchored to class_track) and the moves-library +
user-moves routes. Acceptance: add/edit/delete cues and placed moves; create a custom user move;
list global + user moves.
```

## Step 8 — tracks + provider IDs (hand-entered)

```
M1 step 8: hand-entered track + provider-id routes. Acceptance: create a provider-agnostic track
with manual BPM; attach/remove a provider ID. (No provider API calls — that's M2.)
```

## Step 9 — mock-track seam

```
M1 step 9: a dev-only mock search/import path that creates tracks with no provider API, so the
builder is fully exercisable without credentials. Acceptance: full builder flow works with zero keys.
```

## Step 10 — run-payload

```
M1 step 10: GET /classes/:id/run-payload, versioned, assembled per the shape in api.md (class +
ordered tracks + provider refs + cues + moves). Acceptance: one request returns everything to run
a class; no client-only assumptions.
```

## Step 11 — teams + sharing (built last, per decision D9)

```
M1 step 11: team + membership + share routes; wire shares into the GET /classes union. Acceptance:
create a team, add a member, share a class to a user and to a team; shared classes appear in the
recipient's GET /classes.
```

## Step 12 — OpenAPI + web skeleton

```
M1 step 12: generate the OpenAPI spec from the shared schemas; build a minimal React+Vite UI with
Better Auth login proving login → create class → add a tagged track, using ritmofit_design_system
tokens/components. Acceptance: spec generates; the end-to-end flow works in the browser.
```

---

## After M1

M1's "definition of done" (see [`milestones.md`](./milestones.md)): a logged-in user can create a
class, add hand-entered tracks, tag them with cues/moves/intensity, place them on a timeline, share
with a user or team, and fetch the whole thing as a versioned run-payload — all through the backend.

Then M2 (music providers, SoundCloud first), M3 (live mode + run-payload hardening), M4 (explore /
sharing UX). Write per-step prompts the same way: name the step, point at the relevant plan doc, state
the acceptance criteria, and let Claude plan before coding.
