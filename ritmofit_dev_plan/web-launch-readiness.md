# Web Launch Readiness

This is the completed launch-readiness record for `ritmofit-web`: the web app is launch-ready on
production. For the current operating focus see `DEVELOPMENT_PLAN.md`. This file preserves the sequence
that was in force at launch; it is not the current product gate.

> **D20 update (2026-07-05):** Teams, Sharing, Publish, and Explore were part of the launch-era shipped
> surface, but they are now hidden/dormant while the product focuses on the solo creator loop. The D18
> parity gate is also paused; web-first product definition is the current operating model.

The session-by-session execution log for this (now-complete) milestone is archived at
`archive/web-launch-session-plan.md`; the per-deploy chronology lives in `HISTORY.md`.

## Goal

Ship a dependable web product at `https://ritmofit.studio` that a rhythm spin instructor can use for the
core loop: sign in, build and choreograph classes, manage songs and provider references, run class live,
share with another instructor or team, explore public classes, and recover from common errors without
agent hand-holding.

## Scope

Launch readiness was the active product gate. Per owner direction (2026-06-28), **everything documented
in `ritmofit_dev_plan/` is launch-required except Explore feature expansion and Teams feature
expansion**. StructClub parity and polish are also **100% launch-required** for the launch-scoped web
surface, not an audit archive.

Status (2026-06-29): the web launch gate is green and deployed. The launch-candidate deploy shipped from
`main`, then the credential-backed Apple Sign In / Apple Music / Spotify provider follow-up was merged
through PR #154 and redeployed from `main` as Worker `e60e5138-3248-4c0f-a926-997955016199`.

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

## Launch-Required Work — completed (summary)

The launch backlog was cut from three sources, in order: the **documented product plan** (every
non-Explore/non-Teams item in this folder), **StructClub parity/polish** for the core instructor loop
(class templates, song/move/cue tagging, cue colors, class copying, sharing, team-share support,
reorder/add-to-class workflows, class running, legible discovery/library), and **production
readiness** (CI, deploy, smoke, auth/email, provider disconnect-purge, protected-route behavior,
test-data cleanup).

All launch-required items closed across Sessions 1–6 (2026-06-27 → 2026-06-28). The per-item log with
PR numbers and Worker versions lives in [`HISTORY.md`](./HISTORY.md); iOS parity follow-ups were
recorded in [`web-ios-parity.md`](./web-ios-parity.md) as each item shipped. Highlights:

- **Library/builder/Live polish (Sessions 3–6):** richer Library cards (track-art collage, runtime,
  last-opened, duplicate action, create-class template chooser); Songs-by-Move "Start a class";
  class-detail read mode; +7 cycle seed moves; account/profile dialog (`PATCH /auth/me`); custom-move
  `template`/`baseMoveId` editing; planning-timeline tempo pulse; segment-band "snap to tracks"; Live
  Mode current-section band. All client-only or additive-contract; no migrations.
- **Production fixes (Sessions 1–2):** PWA stale-shell chunk crash (PR #124); Cloudflare-injected
  script vs CSP (fixed with `Cache-Control: no-transform`); manual-add duration input parity;
  playlist-import gated to Spotify via the shared `providerCapabilities.playlistImport` flag.
- **Auth/provider verification (Session 2):** email/password sign-up/in/out + password reset verified
  live; email verification confirmed as send-don't-block (stateless signed JWT — no `verifications`
  row is expected); provider search/import/connect paths verified; Apple Sign In deployed
  credential-backed (Worker-signed client-secret JWT + `/auth/capabilities` gating); BPM auto-lookup
  softened to an instructor-friendly `503` with the key deferred; Google sign-in deferred.

## Launch Gate

The web app is launch-ready when all items below are true:

- **Git/CI:** `main` is clean, branch-protected, and CI-green with the full gate:
  `format:check`, typecheck, lint, design-system verify, unit, integration, web build, OpenAPI
  no-drift, iOS contract parity, and `audit:ci`.
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
- **Competitive baseline:** protect Ritmo Studio's existing advantages over the StructClub reference:
  beat-aware authoring, trim/clip windows, free/back-to-back timeline modes, keyboard-accessible editing,
  multi-provider search/import, email/team sharing with permissions, cue color tags, class tags, and
  wake-lock-backed Live Mode.
- **Provider rules:** no provider audio caching, no Spotify BPM, no mixed/overlapped playback, in-app
  playback only through official provider-authorized SDKs/widgets, and disconnect purge behavior
  remains intact.
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
(cd ritmofit_design_system && npm run verify)
pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi
git diff --exit-code apps/api/openapi/openapi.json
pnpm --filter @ritmofit/api contract-parity
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
- **Automatic BPM lookup (GetSongBPM):** `GETSONGBPM_API_KEY` is unprovisioned in prod, so the
  third-party tempo-lookup path returns `503` with a friendly fallback message; manual BPM entry covers
  the launch loop. Provision the key post-launch to enable one-tap tempo fill (owner decision,
  2026-06-28).
- **Google social sign-in:** `GOOGLE_CLIENT_ID/SECRET` are unprovisioned; the web Login stays
  email/password + Apple when Apple is configured, with no broken Google button (decision D2a). Provision
  Google OAuth credentials post-launch to enable Google sign-in (owner decision, 2026-06-28).

## StructClub Reference Consolidation

The archived StructClub audit produced one durable product read: Ritmo Studio's choreography engine is ahead,
while first-impression discovery/library/onboarding polish is the main competitive gap. Launch readiness
therefore does not mean copying StructClub feature-for-feature; it means making the shipped Ritmo Studio loop
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

- ~~Embedded provider playback or transport controls.~~ **Decided (D19, 2026-07-02):**
  provider-authorized in-app playback via official SDKs/widgets is now approved and planned — see
  [`provider-playback-implementation.md`](./provider-playback-implementation.md). The remaining
  prohibition is Ritmo Studio-owned streams, mixing, crossfade, or any transport outside official provider
  mechanisms.

## Handoff To iOS

After the web launch gate is green and the production deploy is smoke-tested, the next milestone is the
iOS wrap-up: refresh the iOS contract/design snapshots, close run-payload DTO lag, then work through the
capability backlog in `web-ios-parity.md` and the iOS repo's `BUILD_ORDER.md`.
