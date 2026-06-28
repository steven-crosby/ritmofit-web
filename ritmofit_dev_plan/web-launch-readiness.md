# Web Launch Readiness

This is the active operating milestone for `ritmofit-web`: make the web app launch-ready on production,
then shift focus to the iOS wrap-up and parity close. It does not weaken the D18 parity principle; it
defines the current sequence.

Use `web-launch-session-plan.md` for the session-sized execution order.

## Goal

Ship a dependable web product at `https://ritmofit.studio` that a rhythm spin instructor can use for the
core loop: sign in, build and choreograph classes, manage songs and provider references, run class live,
share with another instructor or team, explore public classes, and recover from common errors without
agent hand-holding.

## Scope

Launch readiness is the active product gate. Per owner direction (2026-06-28), **everything documented
in `ritmofit_dev_plan/` is launch-required except Explore feature expansion and Teams feature
expansion**. StructClub parity and polish are also **100% launch-required** for the launch-scoped web
surface, not an audit archive.

New feature work is still controlled: build only what is necessary to satisfy the documented launch
surface, close StructClub-critical parity/polish gaps, or make an already-shipped capability usable,
safe, and credible.

**In scope:**

- Production smoke and regression testing across the core instructor loop.
- Authentication, password reset, verification email, and session behavior.
- Provider connection/search/import handoff paths that are already shipped.
- Builder, library, Live Mode, sharing, marketing/sign-in, account flows, and the already-shipped
  Explore/Teams routes.
- Accessibility, responsive layout, reduced-motion behavior, empty/loading/error/permission states.
- Documentation, deployment runbook, launch notes, and known-deferral cleanup.
- StructClub-derived launch checks: the web app should feel credible against the reference product on
  first use, especially in library, Explore, class building, Live Mode, and sharing.

**Out of scope until after web launch:**

- New product capability that is not launch-critical.
- iOS parity implementation work, except for tracking the follow-up clearly.
- Explore feature expansion: richer merchandising, category chips, featured/admin curation, and themed
  collection treatment beyond proving the shipped feed/copy flow works.
- Teams feature expansion beyond the shipped team creation, membership, and team-share management flow.
- Reworking the design system beyond launch-blocking defects.

## Launch-Required Work

The launch backlog should be cut from these sources, in this order:

- **Documented product plan:** every non-Explore/non-Teams item in this folder is launch-required unless
  a new owner decision explicitly moves it out.
- **StructClub parity/polish:** the web app must cover the reference product's core instructor loop
  with RitmoFit's rules intact: class templates, song tagging, exercise/move tagging, cue colors,
  beat-drop style cues, class copying, sharing, team-share support, reorder/add-to-class workflows,
  class running, and a legible discovery/library experience.
- **Production readiness:** CI, deploy, smoke, auth/email, provider disconnect-purge, protected-route
  behavior, and cleanup of test data.

Known launch-required polish/work items from the current audit:

- Richer Library presentation: track-art collage, duration, last-opened date, duplicate action, and a
  create-class chooser.
- Songs-by-Move as a first-class create path; the reverse lookup shipped, but it is not yet a prominent
  class-starting workflow.
- Class-detail read mode that interleaves songs, moves, cues, and section bands outside the editor.
- Rhythm-cycle seed vocabulary expansion for the default moves library.
- Settings/profile surface beyond sign-out.
- Custom-move `baseMoveId` / template editing.
- Planning timeline playing-track pulse.
- Segment-band track-range binding.

Production audit findings (Session 1, 2026-06-27):

- **PWA stale-shell crash after deploy — fixed (PR #124, merged `c0f5037`).** A returning tab running an
  older service-worker-cached shell hard-crashed to the ErrorBoundary when it lazy-imported a chunk hash
  the new deploy had removed. `lazyWithReload` now reloads once into the fresh shell. Not yet deployed.
- **CSP blocks an inline `<script>` on every page load** (`script-src 'self'
  https://static.cloudflareinsights.com`; hash differs each load). The built `index.html` has no inline
  scripts, so it is injected at runtime — most likely a Cloudflare zone setting (Rocket Loader / Web
  Analytics auto-inject). Investigate infra-side; a console error on every load hurts launch credibility.
- **Manual-add track duration is raw milliseconds.** The builder "Add manually" form takes duration as
  e.g. `180000` ms (unlabeled, odd `valuemax="0"`), unlike the `m:ss` inspector field. Minor polish.

## Launch Gate

The web app is launch-ready when all items below are true:

- **Git/CI:** `main` is clean, branch-protected, and CI-green with the full gate:
  `format:check`, typecheck, lint, unit, integration, web build, OpenAPI no-drift, and `audit:ci`.
- **Production deploy:** latest launch-candidate runtime is deployed manually through
  `deployment-runbook.md`; remote D1 has no pending migrations, or required migrations were applied
  before code.
- **Live smoke:** `/` returns HTML `200`; `/api/v1/health` returns `200`; unauthenticated protected
  routes return `401`; built assets return `200`; security headers are present.
- **Mounted-route smoke:** Explore, Teams, Shares, playlist import, and upload routes reach their real
  handlers in production; they must fail as `401`/`403`/validated domain errors when unauthenticated or
  invalid, not as accidental `404 NOT_FOUND`. Note: a blanket `use('*', requireSession)` makes **every**
  `/api/v1/*` path (mounted or not) return `401` unauthenticated, so the mounted-vs-unmounted distinction
  is not externally observable without a session — it is covered by
  `apps/api/test/mock-gate-leak.integration.test.ts`. The unauthenticated curl smoke only proves "not a
  bare 404."
- **Auth/email:** sign-up, sign-in, sign-out, password reset, verification email, and expired/invalid
  session behavior are verified without exposing secrets or tokens.
- **Core workflow:** create/edit/copy a class, add/import tracks, add cues/moves/intensity/sections,
  run Live Mode, save/copy from Explore, and share/team-share a class.
- **Competitive baseline:** protect RitmoFit's existing advantages over the StructClub reference:
  beat-aware authoring, trim/clip windows, free/back-to-back timeline modes, keyboard-accessible editing,
  multi-provider search/import, email/team sharing with permissions, cue color tags, class tags, and
  wake-lock-backed Live Mode.
- **Provider rules:** no provider audio caching, no Spotify BPM, no embedded/mixed playback, and
  disconnect purge behavior remains intact.
- **UI quality:** critical screens work at mobile and desktop widths, keyboard focus is visible,
  controls are labeled, empty/error/loading states are clear, and reduced motion is respected.
- **Docs:** `DEVELOPMENT_PLAN.md`, `milestones.md`, `HISTORY.md`, `web-ios-parity.md`, and this file
  agree on launch state, deployment state, and post-launch follow-up.
- **Deferrals:** every non-blocking issue is explicitly listed in the post-launch deferrals section
  below or the parity backlog, and no non-Explore/non-Teams web item is deferred without a fresh owner
  decision.

## Verification Plan

Use the normal CI-equivalent gate before a launch-candidate deploy:

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

After deploy, run the live smoke in `deployment-runbook.md`, then manually verify the core workflow with
test data and delete any production test data before close-session.

## Current Deferrals

These do not block web launch unless a verification pass proves they break the launch-scoped core loop:

- iOS builder/library/search/explore/sharing parity and currently allowlisted run-payload DTO fields.
- iOS design-token drift automation.
- Featured/admin curation for Explore.
- Richer Explore merchandising: category chips, cover-art cards, and themed collection treatment.
- Teams expansion beyond the shipped creation, membership, and team-share management flow.
- Optional run-payload `id` on `sections[]` if iOS wants symmetry.

## StructClub Reference Consolidation

The archived StructClub audit produced one durable product read: RitmoFit's choreography engine is ahead,
while first-impression discovery/library/onboarding polish is the main competitive gap. Launch readiness
therefore does not mean copying StructClub feature-for-feature; it means making the shipped RitmoFit loop
solid, understandable, and constraint-honest.

**Protect as differentiators:**

- Beat/bar-aware cues and moves.
- Per-track trim and downbeat anchors.
- Free and back-to-back timeline modes.
- Keyboard-accessible builder interactions.
- Multi-provider catalog search/import.
- Real sharing and team permissions.
- Accessible intensity, cue-color, and tag systems.

**Do not copy without a decision:**

- Embedded provider playback or transport controls. That conflicts with the hard music constraints unless
  a future, provider-specific, terms-compliant transport strategy is explicitly approved.

## Handoff To iOS

After the web launch gate is green and the production deploy is smoke-tested, the next milestone is the
iOS wrap-up: refresh the iOS contract/design snapshots, close run-payload DTO lag, then work through the
capability backlog in `web-ios-parity.md` and the iOS repo's `BUILD_ORDER.md`.
