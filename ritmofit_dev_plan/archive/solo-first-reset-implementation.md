# Solo-first reset implementation prompt

Use this prompt when resuming the Ritmo Studio reset that hides Teams, Sharing, Publish, and Explore
while preserving backend/API scaffolding for a later, more mature product.

## Context

The owner confirmed a product-canon reset on 2026-07-05:

- Ritmo Studio must focus on the individual creator experience first.
- Teams, Sharing, Publish, Explore, invites, collaborators, public class pages, social discovery,
  marketplace/community browsing, and share links are deferred until explicitly reopened by the owner.
- Do not delete backend scaffolding yet. Use the hybrid approach: remove user-facing web UI now,
  preserve schemas, migrations, routes, shared contracts, API client functions, and existing dormant
  components until a later migration/refactor.
- The single-user experience still includes accounts/auth, cloud sync, and cross-device access. The
  reference feel is Apple Notes: personal, synced, quiet, direct.
- Existing production user/data dependency on Teams or Sharing is not a concern.

The owner also wants this canon captured:

> Ritmo Studio helps individual rhythm fitness instructors build, choreograph, organize, rehearse,
> and run their own classes in one continuous creative flow.

Supporting doctrine:

> The current product is solo-first. Perfect the individual creator experience until instructors
> naturally want to share, publish, and collaborate. Community features come later because the solo
> workflow has earned them, not because the app assumes them.

Creative-flow doctrine:

> Do not impose one rigid workflow. Instructors may start from a class type, a target duration, a song,
> a movement idea, an energy arc, or a rehearsal need. The product should support the natural loop:
> "I have class Monday; it is a standard 45-minute ride or a Burn 30-minute ride; I need the right songs,
> then choreography, then rehearsal/live mode."

Web-first doctrine:

> Web is the product-definition surface for now. Dialing in the web app near-perfectly should make the
> later iOS app refinement straightforward because the core creative loop, contracts, and UX decisions
> will already be proven.

## Branch/setup

Work from the session branch:

```bash
git switch codex/removing-teams-explore-sharing
```

If the branch is missing, recreate it from current `main`:

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/removing-teams-explore-sharing
```

Before editing, run:

```bash
git status --short --branch
```

Preserve any unrelated worktree changes. Do not deploy. Do not apply migrations.

## Confirmed implementation plan

This plan was already confirmed by the owner in the originating session. Do not stop to ask for
confirmation again unless local repo state has changed in a way that materially alters scope.

### Documentation edits

Update canon docs so future agents build the solo-first product:

- `AGENTS.md`
  - Update Product & Architecture from spin-only / two co-equal surfaces / explore-sharing-teams core
    to rhythm fitness instructors and solo creator loop first.
  - Add or update dated Codex note near the top.
  - Replace the hard iOS parity gate wording with web-first / iOS-later guidance. iOS parity should not
    drive current product decisions.
  - Add an explicit "Deferred Community Surfaces" guardrail: do not build teams, invites,
    collaborators, public class pages, publishing flows, social discovery, marketplace/community browse,
    or share links unless explicitly requested.
- `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`
  - Rewrite "What Ritmo Studio is" around individual rhythm fitness instructors, including spin cycle,
    Pilates, and HIIT as current core disciplines.
  - Remove Explore/sharing/teams from the active/core capability language.
  - Keep historical M4 status honest, but mark it dormant/deferred from current product direction.
  - Update the "Locked decisions" surface model row and any current operating focus text.
- `ritmofit_dev_plan/overview.md`
  - Replace the user/problem framing with solo creator workflow and creative-flow flexibility.
  - Keep provider and music constraints intact.
  - Reframe StructClub comparison: sharing/team/explore are observed competitor features, but Ritmo
    Studio's current improvement target is solo creative continuity and class-shape clarity, not social
    collaboration.
- `ritmofit_dev_plan/decisions.md`
  - Add a new decision, likely D20, for the solo-first reset.
  - D20 should explicitly supersede the active parts of D18 that made Explore/sharing/teams core and
    iOS parity gating current web work.
  - Do not erase historical D5/D6/D9/D18 context. Mark teams/shares/explore scaffolding as retained but
    dormant.
- `ritmofit_dev_plan/web-ios-parity.md`
  - Recast as paused/deferred process documentation. Web defines the product now; iOS follows later.
  - Keep contract/design sync notes useful, but remove the sense that current web features are blocked by
    iOS parity items.
  - Move Explore and Sharing/Teams out of active backlog or clearly label them "deferred community
    surfaces."
- `ritmofit_dev_plan/milestones.md`
  - Keep M4 historical completion record, but add a current-status note that those user-facing web
    surfaces are now hidden/dormant.
  - Update current focus from iOS parity wrap to solo creator refinement and provider-authorized
    playback as it supports rehearsal/live mode.
- `ritmofit_dev_plan/api.md`, `authorization.md`, `schema.md`, `glossary.md`
  - Keep API/schema facts intact.
  - Add clear "dormant/deferred scaffolding" notes where Explore/Teams/Shares/Public visibility are
    documented.
  - Do not remove route docs or schema tables.

### Web UI edits

Hybrid approach: hide user-facing surfaces, keep scaffolding.

- `apps/web/src/components/Dashboard.tsx`
  - Remove top-bar `Explore` and `Teams` buttons.
  - Remove `exploreOpen`, `teamsOpen`, `previewClassId`, the lazy `ExploreDialog`, lazy `TeamsDialog`,
    and their render branches if now unreachable.
  - Keep `ClassSummaryView` for own-class Library card preview.
  - Remove class-header `Share` and `Publish` / `Make private` controls from the user-facing UI.
  - Remove `onShare` plumbing if no longer needed.
  - Remove publish toggle code and associated `visibility` copy from `ClassHeaderCard`.
  - Filter the class library to show only classes owned by the current user, so old share rows do not
    reintroduce the community model. A simple UI-level filter after `listClasses` is acceptable for this
    slice because backend scaffolding remains.
  - Ensure duplicated/copied classes and new classes still open normally.
- `apps/web/src/components/AccountDialog.tsx`
  - Remove or replace copy that says profile details are used across teams and sharing.
- Tests
  - Update `Dashboard.test.tsx` to assert Explore/Teams buttons are absent from the top bar if useful.
  - Update `ClassHeaderCard.test.tsx` props/cases after removing `onShare`.
  - Leave `ShareDialog.test.tsx` and `TeamsDialog.test.tsx` unless deleting the components; dormant
    scaffolding can keep its tests.
  - If any tests mention "Shared ride" or "Shared Anthem" only as arbitrary fixture titles, rename only
    if it improves clarity; not required.

### Do not do in this slice

- Do not delete backend routes: `apps/api/src/routes/shares.ts`, `teams.ts`, `explore.ts`.
- Do not delete shared schemas/entities/enums for sharing, teams, visibility, or Explore.
- Do not change migrations.
- Do not regenerate OpenAPI unless a doc/code change unexpectedly requires it.
- Do not deploy.
- Do not build new replacement product surfaces beyond hiding the deferred ones.

## Verification

Run focused verification first:

```bash
pnpm --filter @ritmofit/web test -- Dashboard ClassHeaderCard AccountDialog
pnpm --filter @ritmofit/web build
```

If edits are broader or lint/type issues appear, also run:

```bash
pnpm format:check
pnpm lint
pnpm -r typecheck
```

Summarize:

- Docs changed and the new canon.
- Web surfaces hidden.
- Backend/API/schema scaffolding preserved.
- Verification commands and results.
- Any residual risk, especially if shared/Explore classes can still be reached via direct API routes.
