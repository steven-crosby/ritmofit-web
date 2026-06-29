# Web Launch Readiness

This is the completed launch-readiness record for `ritmofit-web`: the web app is launch-ready on
production, and focus shifts to the iOS wrap-up and parity close. It does not weaken the D18 parity
principle; it defines the current sequence.

Use `web-launch-session-plan.md` for the session-sized execution order.

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

- ~~Richer Library presentation: track-art collage, duration, last-opened date, duplicate action, and a
  create-class chooser.~~ **Done (web, Session 3, 2026-06-28):** `GET /classes` now returns additive
  card aggregates (`trackCount`, `totalDurationMs`, `albumArtUrls`) via a new `ClassListItem` shape, and
  the Library rail renders a track-art collage, track count + total runtime, a last-opened date, a
  duplicate ("save a copy") action, and a create-class template chooser. iOS parity tracked in
  `web-ios-parity.md`. Mobile/desktop layout: automated suites green; a manual visual pass at 320px and
  desktop is still recommended before the launch gate.
- ~~Songs-by-Move as a first-class create path; the reverse lookup shipped, but it is not yet a prominent
  class-starting workflow.~~ **Done (web, Session 4, 2026-06-28):** each Songs-by-Move result now offers
  "Start a class" — it creates a class and copies that choreographed `class_track` (song + its cues +
  placed moves) into it via the existing copy-class-track route, then opens it in the builder.
- ~~Class-detail read mode that interleaves songs, moves, cues, and section bands outside the editor.~~
  **Done (web, Session 4, 2026-06-28):** `ClassSummaryView` now renders songs **plus** each track's
  placed moves and cues and the section/energy bands (all from the existing run-payload), and is reachable
  for owned classes via a "View" (Preview) action on each Library card — with an "Open in builder" CTA
  instead of "Save a copy". No API change. iOS parity tracked in `web-ios-parity.md`.
- ~~Rhythm-cycle seed vocabulary expansion for the default moves library.~~ **Done (web/api, Session 5,
  2026-06-28):** +7 cycle seed moves landed in `seed.sql` (data-only, no migration), and the remote
  idempotent re-seed was applied during the Session 5 deploy chain.
- ~~Settings/profile surface beyond sign-out.~~ **Done (web, Session 5 follow-up, 2026-06-28):** the
  top nav now opens an Account dialog that fetches `/auth/me`, shows the signed-in email, edits
  `displayName` and `imageUrl` via the new protected `PATCH /auth/me`, and keeps sign-out reachable
  inside the dialog. Deployed in Worker `92d3904e`. No migration; shared/API contract change is
  additive. iOS parity tracked in `web-ios-parity.md`.
- ~~Custom-move `baseMoveId` / template editing.~~ **Done (web, Session 5, 2026-06-28):** the custom-move
  manager (`CustomMovesDialog`) edit form now exposes a **Discipline** (`template`) select and a **Based
  on** (`baseMoveId`) library-move picker, persisted via the existing `updateUserMove`; the read row
  shows both when set. The contract/API already supported both fields, so this is UI-only — no
  shared-contract, API, or schema/migration change. The fast inline builder creation stays name-only by
  design. iOS parity tracked in `web-ios-parity.md`.
- ~~Planning timeline playing-track pulse.~~ **Done (web, Session 5, 2026-06-28):** the active track's
  block in the planning `TimelineStrip` now carries the design system's second sanctioned tempo pulse
  (10 §2) — a subtle `scale 1.0→1.03` + faint cyan border-luminance breath retimed per the track's BPM
  via `--rf-bpm` (new `.rf-beat-pulse-subtle` keyframe). Quieter than the Live HUD pulse, exactly one per
  screen, gated to a known tempo, and removed entirely under `prefers-reduced-motion` (the static
  selection ring alone marks the active track). Client-only off the run-payload; no schema/API change.
  iOS parity tracked in `web-ios-parity.md`.
- ~~Segment-band track-range binding.~~ **Done (web, Session 5, 2026-06-28):** the segment band gains a
  "Snap to tracks" toggle (default on, edit-only) that snaps a dragged or arrow-keyed boundary to the
  nearest track edge (class start, each track's `startOffsetMs`, class end); arrow keys jump between
  boundaries under snap for keyboard parity, and the numeric editor stays exact as the precise path. As
  documented (`milestones.md`), this is snapping-to-track-starts — a client-side authoring affordance,
  **no contract/schema/migration change** (sections still store a free `startOffsetMs`). iOS parity
  tracked in `web-ios-parity.md`.
- ~~Live Mode dropped the energy-arc sections the run-payload carries.~~ **Done (web, Session 6,
  2026-06-28):** the live prompter now renders a compact current-section band under the header (icon +
  tint + label, never color alone) with a muted countdown to the next section, computed from the
  run-payload `sections[]` via a new `liveSectionAt` helper. View-independent (Cue-by-Cue and Full List)
  and hidden when a class has no sections or before the first one starts. Reuses the existing `SegmentBand`
  icon/tint language (now an exported `SegmentIcon`). Client-only off the run-payload — **no
  shared-contract, API, or schema/migration change**. The rest of the Session 6 Live Mode / StructClub
  parity pass (cue prompter, timer, intensity, notes, trim, beat pulse, cue colors, wake lock, and the
  no-in-app-playback constraint) was verified green in a browser walk at desktop and 320px. iOS parity
  tracked in `web-ios-parity.md`.

Production audit findings (Session 1, 2026-06-27):

- **PWA stale-shell crash after deploy — fixed and deployed (PR #124, merged `c0f5037`; live in Worker
  `e6fb7c1a`).** A returning tab running an older service-worker-cached shell hard-crashed to the
  ErrorBoundary when it lazy-imported a chunk hash the new deploy had removed. `lazyWithReload` now
  reloads once into the fresh shell.
- **CSP blocks an inline `<script>` on every page load — fixed and deployed (Worker `dafa2638`,
  2026-06-28).** Live HTML showed Cloudflare injecting `window.__CF$cv$params` plus
  `/cdn-cgi/challenge-platform/scripts/jsd/main.js`, matching Cloudflare JavaScript Detections.
  `_headers` now sends `Cache-Control: ... no-transform` for the SPA/static surface so Cloudflare does
  not inject the CSP-blocked script. Verified live: SPA `Cache-Control` includes `no-transform` and the
  HTML contains no `__CF$cv$params` (re-confirmed on Worker `9519447a`).
- **Manual-add track duration is raw milliseconds — fixed and deployed (Worker `dafa2638`,
  2026-06-28).** The builder "Add manually" form now uses the same positive `m:ss` duration input and
  parser as the track inspector.

Production audit findings (Session 2, 2026-06-28 — Auth, Account, And Provider Readiness):

- **Auth core verified green in production.** Email/password sign-up, sign-in, sign-out (with browser
  `Origin`), password reset (end-to-end, rotates credentials), and signed-out/expired-session `401`
  behavior all confirmed against `https://ritmofit.studio`.
- **Email verification is wired correctly — the earlier "no verification artifact" read was a
  misunderstanding, not a bug.** Better Auth has `sendOnSignUp: true` and sends the verification email
  through the same Resend transport as password reset (which is confirmed working in prod). The
  verification link carries a **stateless signed JWT** (`{email, iat, exp}`), so **no row is expected in
  the `verifications` table** — its absence is correct. `email_verified = 0` after sign-up is the
  intended **send-don't-block** posture (verification is sent but not required to use the app);
  `requireEmailVerification` can be tightened later if desired.
- **Provider paths verified green.** SoundCloud/Spotify/Apple Music catalog search return live results;
  track import works; adding an imported track to a class works; SoundCloud connect start works via
  `POST` (returns `authorizeUrl`); likes before connection return `409 NOT_CONNECTED`; a no-op
  SoundCloud disconnect returns `204` and does not enqueue a purge.
- **Playlist-import UI offered a dead end on non-Spotify providers — fixed (this session).** Playlist
  import is Spotify-only on the backend (SoundCloud returns `501`, Apple Music has no path), but the
  TrackSearch "Import Playlist" mode was shown for every provider. Added a `playlistImport` flag to the
  shared `providerCapabilities` matrix (Spotify only) and gated the mode off it, matching the existing
  `userLikes` pattern, so the UI no longer offers an import that always fails.
- **BPM auto-lookup is unconfigured in prod (`GETSONGBPM_API_KEY` missing) → `503`. Decision: defer +
  soften (owner, 2026-06-28).** Manual BPM entry is unaffected. Softened this session: the `503`
  `PROVIDER_UNAVAILABLE` now returns instructor-facing copy ("Automatic tempo lookup isn't available
  right now — you can set the BPM manually.") instead of leaking an internal "not configured" detail.
  Provisioning the GetSongBPM key is a **post-launch deferral** (see Current Deferrals).
- **Apple/Google sign-in were unprovisioned in the Session 2 audit.** Apple sign-in is now completed and
  deployed as a credential-backed launch slice: the Worker signs Apple client-secret JWTs from
  `APPLE_CLIENT_ID` + Team/Key/private-key secrets, and the web Login only renders "Continue with Apple"
  when `/auth/capabilities` reports the backend is configured. Google remains a post-launch provisioning
  deferral.

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
