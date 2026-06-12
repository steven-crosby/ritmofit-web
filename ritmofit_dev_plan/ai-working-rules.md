# AI Working Rules

The working agreement for any AI assistant (or human) implementing in this repo. Carries the ChatGPT
draft's concrete plan→confirm template and the Claude draft's inviolable rules.

## Absolute rule: plan before code

Before writing code for any feature, propose a plan and **wait for confirmation.** Use this template:

```md
## Proposed plan

### Goal

### Files to create/change

### Schema impact
(migrations? new tables/columns? matches schema.md?)

### API surface impact
(new/changed endpoints? authz requirements?)

### Frontend impact

### Risks / open questions

### Verification steps

Please confirm before I implement.
```

When implementation is complete, summarize:

```md
## Completed

## Files changed

## How to verify

## Known issues / next steps
```

## Session startup

1. Read `DEVELOPMENT_PLAN.md` and the rest of this folder.
2. Inspect current repo structure; identify the active milestone (and where in the build order).
3. Check existing migrations before changing schema; check existing routes before adding endpoints;
   check existing shared schemas before creating duplicates.
4. Summarize what you found, then propose a plan.

## Inviolable constraints

1. **Respect the three music constraints** (`music-providers.md`): never cache audio or
   platform-derived data, never pull Spotify BPM, never mix/crossfade audio in-app. If a request seems
   to require it, **stop and flag it.**
2. **The shared package is the contract.** Define entity shapes once in `packages/shared`; don't
   redefine them in `apps/api` or `apps/web`. Don't duplicate enums or magic strings.
3. **Centralize authorization.** Every class-scoped route calls `requireAccess` (`lib/authz.ts`). D1
   has **no RLS back-stop** — a missing check is a security bug, not a style nit.
4. **Never commit secrets.** Use `.dev.vars` (git-ignored) locally and `wrangler secret put` in prod.
5. **Verify platform facts.** Provider APIs and auth pricing change; check current docs over training
   data, especially before each music milestone.

## Don't overbuild

Don't add infrastructure before the product needs it. Specifically **do not** build, unless explicitly
requested:
- teams/sharing **UI** ahead of the core builder (schema is in M1; routes come last — D9),
- explore/marketplace/paid classes, realtime collaboration, analytics, AI recommendations,
- embedded music streaming or an in-app media engine,
- extra monorepo packages (`music`, `ui`) before the milestone that uses them.

## Source-of-truth boundaries

- **Backend owns:** classes, class_tracks, cues, placed moves, the moves library, user custom language,
  provider references, teams, shares.
- **Providers own:** playback, provider-specific track availability, provider playlists.
- **Frontend owns:** presentation, interaction state, temporary unsaved form state.

## Prefer small vertical slices

A good slice: schema (if needed) → shared Zod schema/type → API route (with `requireAccess`) → frontend
UI → loading/empty/error states → tests. Ship the smallest complete slice that advances the product.

## Schema migration rules

Before changing schema: (1) inspect current schema + migrations, (2) propose a migration plan, (3)
explain data impact, (4) wait for confirmation. Never edit an applied migration after the fact unless
the project is still pre-deployment and the owner approves a reset.

## Frontend rules

- Use the RitmoFit design system (`ritmofit_design_system/`) — tokens, components, accessibility rules.
- Accessible controls, visible focus, labeled icon buttons, colorblind-safe patterns (never color
  alone). Include loading, empty, and error states. Keep UI responsive on laptop screens.
- Avoid a global state library unless clearly needed; TanStack Query for server state, local state for
  in-progress form edits.
