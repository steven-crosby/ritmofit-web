# Ritmo Studio — Development Plan

> **Read this first.** Entry point for any AI assistant (or human) working in this repo. **"Now"** is
> the only dated block: current focus, the next step, open owner decisions, and `main` vs production.
> The rest is the product map — what we're building, locked decisions and hard constraints.
> Actionable work lives in [RF task records](./tasks/README.md); legacy backlog sections below are
> historical planning context until explicitly triaged into records, never a second execution queue. Shipped history lives in [`HISTORY.md`](./HISTORY.md); what a session or lane still owes
> forward lives in [`handoffs/`](./handoffs/README.md). Keep "Now" under ~30 lines: when it changes,
> move the superseded text into a HISTORY entry instead of letting it accumulate here.

---

## Now

<!-- Claude Code, 2026-10-29: Rewrote Now around the phased plan after the 2026-10-28 UX audit intake; superseded text moved to HISTORY. -->
<!-- Claude Code, 2026-10-30: Round r20261029a closed (#664, #665 deployed); Now points at the next round. -->

**Current actionable state:** [RF board](./tasks.md), backed by canonical [task records](./tasks/README.md).
The order of work is [Phases](#phases) below; each phase lists RF records, not a second backlog.
**Main vs production (observed 2026-10-30):** production is Worker
`765c9424-6007-480c-9b52-1e71426f0f18` at main `d888d28`, SPA `assets/index-BAVpF1uf.js`. It adds
RF-123 (#664) and RF-132 (#665) to RF-124, RF-107, RF-90 and RF-122. Rollback is
`2a302ce6-7665-47d2-8f79-68d6822450b1`. Docs records after `d888d28` do not change runtime. See
[HISTORY](./HISTORY.md).
**In flight:** the D25 provider matrix (#654). Round r20261029a is closed: RF-123 and RF-132 are
Done and deployed, and the owner's device checks on 2026-10-30 passed apart from a lock error on
quick Apple track jumps, now evidence on [RF-108](./tasks/RF-108.json).
**Next step:** the owner picks the next round's Ready set. Candidates: RF-131's six audit questions
(they unblock RF-133 and RF-134), Apple hardening with RF-108, RF-128 and RF-147 while the
subscription lasts, and [RF-151](./tasks/RF-151.json), the owner's song-selection design for Music ›
Songs.
**Window:** the Apple Music subscription ends around 2026-11-27, so anything that needs a live Apple
account (Phase 1) goes first. Spotify is reopened (owner, 2026-10-28) but every Web API call returns
`403` until the developer app accepts the connected account.
**Open owner decisions:** RF-131's six questions; the next round's Ready set; the review queue
(RF-91, RF-93, RF-94, RF-96, RF-16, RF-23, RF-32); whether [RF-80](./tasks/RF-80.json) is cancelled or
rescoped now that RF-124 found the playback root cause; Live finish placement (see Backlog).

## Phases

<!-- Claude Code, 2026-10-29: Owner-approved phased plan (session 2026-10-29). -->

Ordered by the Apple Music window, then by the audit's P0s. A phase lists records; each record's
status, acceptance and next action stay canonical. Agents still need the owner's Ready, a brief or a
direct ask before starting one.

| Phase | Target | Records | Why this order |
| --- | --- | --- | --- |
| 0. Land what is in flight | this week | Done 2026-10-29: #657 deployed, [RF-124](./tasks/RF-124.json) and [RF-29](./tasks/RF-29.json) closed, #658 merged. Open: #654; [RF-131](./tasks/RF-131.json) decisions | Clears the P1 playback fix and unblocks the UX P0s |
| 1. Apple hardening | by ~2026-11-20 | Done 2026-10-30: [RF-132](./tasks/RF-132.json), [RF-123](./tasks/RF-123.json). Open: [RF-128](./tasks/RF-128.json) (with [RF-147](./tasks/RF-147.json)), [RF-125](./tasks/RF-125.json), [RF-108](./tasks/RF-108.json), [RF-121](./tasks/RF-121.json), [RF-136](./tasks/RF-136.json), [RF-126](./tasks/RF-126.json) (incl. desktop Safari) | Needs a live Apple subscription |
| 2. Trust and truth | after RF-131 | [RF-133](./tasks/RF-133.json), [RF-134](./tasks/RF-134.json), [RF-135](./tasks/RF-135.json), [RF-137](./tasks/RF-137.json), [RF-129](./tasks/RF-129.json) (absorbs RF-139), [RF-138](./tasks/RF-138.json), [RF-145](./tasks/RF-145.json) | The audit's main theme; mostly web |
| 3. Spotify | when the `403` is resolved | [RF-92](./tasks/RF-92.json) (with [RF-74](./tasks/RF-74.json)), [RF-16](./tasks/RF-16.json), RF-131 decision 6 | Blocked by the developer-app allowlist |
| 4. Beta-expansion gate | before inviting more instructors | [RF-116](./tasks/RF-116.json) → [RF-140](./tasks/RF-140.json) (self-service deletion, D22), the D22 provider-terms review | Required before expansion |
| 5. Polish | fill-in | [RF-141](./tasks/RF-141.json), [RF-142](./tasks/RF-142.json) (absorbs RF-73), [RF-143](./tasks/RF-143.json), [RF-144](./tasks/RF-144.json), [RF-146](./tasks/RF-146.json) | Copy, accessibility, benchmark triage |
| Background | between phases | [RF-100](./tasks/RF-100.json) (Ready), [RF-87](./tasks/RF-87.json), RF-101–RF-106, RF-109–RF-115, RF-117–RF-120, [RF-127](./tasks/RF-127.json) | Small hardening (mostly P3; RF-87 and RF-115 are P2) |


---

## Legacy focus context

Retained for [RF-96](./tasks/RF-96.json) reconciliation. The dated observations and outstanding
items below are historical inputs, not a second execution queue or current authorization.

_Last updated 2026-10-27 (Cursor). Deployed tree was `535e61a` at that observation. Worker `24cdedc9-8103-417c-a502-23b0846c0967`. [#637](https://github.com/steven-crosby/ritmofit-web/pull/637) (better-auth 1.7.14) and [#636](https://github.com/steven-crosby/ritmofit-web/pull/636) (iOS Safari FairPlay probe without `WebKitMediaKeys`) are live. [#636](https://github.com/steven-crosby/ritmofit-web/pull/636) subsequently failed the recorded iPhone check; see RF-29. Rollback is Worker `df90f169-a51d-4476-bb9a-d4fbf6ab3663`. Apple 5:18 debugging stays tabled; Spotify stayed tabled at that observation (reopened by the owner on 2026-10-28)._

- **Focus:** music-led Phase 1 ([D24](./decisions.md#d24--music-drives-creation-and-instruction-until-the-instructor-chooses-otherwise-resolved-2026-09-30)) — reliable Apple Music Live playback, desktop Cycle/Pilates first, then iPhone. Spotify was tabled here; the owner reopened it on 2026-10-28.
- **Production:** deploy on 2026-10-27 at 2:06 PM MT (2026-10-27T20:06:15Z): Worker `24cdedc9-8103-417c-a502-23b0846c0967`, tree `535e61a`. [#637](https://github.com/steven-crosby/ritmofit-web/pull/637) (better-auth 1.6.25 → 1.7.14, `2bd73e0`) and [#636](https://github.com/steven-crosby/ritmofit-web/pull/636) (FairPlay probe on iOS Safari without `WebKitMediaKeys`) are in that tree. [#636](https://github.com/steven-crosby/ritmofit-web/pull/636) subsequently failed the recorded iPhone check; see RF-29. Rollback Worker `df90f169-a51d-4476-bb9a-d4fbf6ab3663` (`bf31706`). SPA `assets/index-CClNobxY.js` (was `assets/index-DvFKqouw.js`); CSS `assets/index-DGcMUSRx.css` unchanged. No migration applied. [HISTORY](./HISTORY.md).
- **Main vs production:** observed 2026-10-27 2:06 PM MT, immediately after deploy: Worker `24cdedc9-8103-417c-a502-23b0846c0967` at 100%, SPA `assets/index-CClNobxY.js` (3/3 cache-busted fetches matched the build), health 200 with `database: true`. Deployed tree was `535e61a` at that observation. [#636](https://github.com/steven-crosby/ritmofit-web/pull/636) is deployed; the later failed iPhone check remains RF-29. This docs record is not in the deployed tree. Remote D1 had no migrations to apply. Rollback target is Worker `df90f169-a51d-4476-bb9a-d4fbf6ab3663`. Since then `main` gained only tooling, docs and tests ([#640](https://github.com/steven-crosby/ritmofit-web/pull/640), [#641](https://github.com/steven-crosby/ritmofit-web/pull/641), [#625](https://github.com/steven-crosby/ritmofit-web/pull/625), [#596](https://github.com/steven-crosby/ritmofit-web/pull/596)); `git diff 535e61a` over `apps`/`packages` touches no runtime file, so no deploy is owed for them.
- **Delivery:** #518 Live short-screen teaching/completion and #519 Builder refresh/Live-return/deletion ownership are live; #520–#526 add evidence/status/cleanup records. The 2026-10-20 deploy of main `9e43307` includes [#527](https://github.com/steven-crosby/ritmofit-web/pull/527) (Live tab keyboard navigation and Hono 4.13.7 → 4.13.11, [GHSA-5r4p-p66f-jhc7](https://github.com/advisories/GHSA-5r4p-p66f-jhc7)), [#528](https://github.com/steven-crosby/ritmofit-web/pull/528) (docs), [#529](https://github.com/steven-crosby/ritmofit-web/pull/529) (class-route access and run-payload contract integration tests), and [#530](https://github.com/steven-crosby/ritmofit-web/pull/530) (2s presentation grace on the Live Waiting for music panel). The 2026-10-21 deploy of main `80b5e0f` ships [#532](https://github.com/steven-crosby/ritmofit-web/pull/532) (preserve untouched clip-end precision, `421d0dc`), [#535](https://github.com/steven-crosby/ritmofit-web/pull/535) (builder failure fallback when an error has no message, `3a1cc3f`), and [#536](https://github.com/steven-crosby/ritmofit-web/pull/536) (Live preflight Exit stays inside the header, `80b5e0f`). Docs records [#531](https://github.com/steven-crosby/ritmofit-web/pull/531) and [#534](https://github.com/steven-crosby/ritmofit-web/pull/534) are in that same tree. The later 2026-10-21 deploy of main `3ffb7e0` ships [#533](https://github.com/steven-crosby/ritmofit-web/pull/533) (prioritize actionable Live preflight checks, `037199a`) and [#538](https://github.com/steven-crosby/ritmofit-web/pull/538) (class summary recovery for a blank load error, `3ffb7e0`). The 2026-10-21 6:10 PM MT deploy of main `4770ab9` ships [#540](https://github.com/steven-crosby/ritmofit-web/pull/540) (fill blank TrackPreview failure alerts). The 2026-10-22 12:39 PM MT deploy of main `2a85509` ships [#543](https://github.com/steven-crosby/ritmofit-web/pull/543) (SegmentBand blank failure lines, `decf9f7`), [#544](https://github.com/steven-crosby/ritmofit-web/pull/544) (TrackSearch blank Add-music failure copy, `910ecc1`), [#549](https://github.com/steven-crosby/ritmofit-web/pull/549) (Live playback blank failure, `968379d`), and [#548](https://github.com/steven-crosby/ritmofit-web/pull/548) (Apple connect blank failure, `2a85509`). Docs records [#541](https://github.com/steven-crosby/ritmofit-web/pull/541), [#542](https://github.com/steven-crosby/ritmofit-web/pull/542), [#545](https://github.com/steven-crosby/ritmofit-web/pull/545), and [#547](https://github.com/steven-crosby/ritmofit-web/pull/547) are in that same tree. The 2026-10-22 3:39 PM MT deploy of main `b644217` ships [#551](https://github.com/steven-crosby/ritmofit-web/pull/551) (authored sections under Class Pulse). Docs record `5edeb78` (the earlier same-day Worker `f559fcca` record) is in that tree and does not change runtime. The 2026-10-22 6:34 PM MT deploy of main `a56e0ee` ships [#553](https://github.com/steven-crosby/ritmofit-web/pull/553) (teaching-order cue list on a builder song) and applies remote migration `0021_rainy_falcon.sql`. Docs record `8541f9e` (the earlier same-day Worker `d5dc04f9` record) is in that tree and does not change runtime. The 2026-10-23 9:05 AM MT deploy of main `a4a021d` ships [#555](https://github.com/steven-crosby/ritmofit-web/pull/555) (stored cue fields on the run payload, `82b5b9d`) and [#556](https://github.com/steven-crosby/ritmofit-web/pull/556) (teach the cue hold on Cue-by-Cue). Docs record `a42c0f1` is in that tree and does not change runtime. No migration was applied. Draft [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) was not deployed. The 2026-10-23 9:57 PM MT deploy of main `4cc4121` ships [#560](https://github.com/steven-crosby/ritmofit-web/pull/560) (patch zod 4.4.3 → 4.6.7 for [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), `003d4b6`; includes regenerated `openapi.json`). Docs [#559](https://github.com/steven-crosby/ritmofit-web/pull/559) (`4cc4121`) and `0f3d18a` ([#558](https://github.com/steven-crosby/ritmofit-web/pull/558), the 2026-10-23 teaching screen deploy record) are in that tree and do not change runtime. No migration was applied. Drafts [#546](https://github.com/steven-crosby/ritmofit-web/pull/546) and [#557](https://github.com/steven-crosby/ritmofit-web/pull/557) were not deployed. [Round handoff](https://github.com/steven-crosby/ritmofit-web/blob/711c54339834b9c7ef3ddff312c9fd3cc744ce4e/ritmofit_dev_plan/handoffs/2026-10-21-r20261021-round-close.md).
- **Technical verification:** the 2026-10-13 preflight completed a fresh 12-surface × 5-width local matrix, native Chrome 200%, dialog inert/focus wrapping/return, Full List/completion/Exit. Eleven production HTTP probes and security headers passed on that build; authenticated QA Builder and narrow prompter-only Live/Exit passed. [Evidence and limits](../docs/audits/deployment-preflight-518-519-2026-10-13/README.md).
- **Human acceptance:** the earlier owner-approved desktop Cycle/Pilates spot-check remains historical ([record](../docs/audits/apple-natural-acceptance-2026-10-09/README.md)). On the 2026-10-13 build, Steven confirmed Apple authorization, audible start and clean natural handover to Bad Romance; a transient Waiting for music panel appeared and cleared. Apple post-Exit silence and all four SoundCloud hearing checks are now confirmed. A separate later Apple recovery at 5:18 was unwitnessed; stability/cause remain open. UI/SDK state, synthetic completion and deployment do not close these checks. Real iPhone Safari remains unverified.
- **Next step:** the owner device retry in [RF-29](./tasks/RF-29.json); confirm the loaded bundle before trying Break Stuff once. No product-code PR or deployment is authorized by this task. Apple 5:18 debugging remains tabled. Spotify was tabled at this observation; the owner reopened it on 2026-10-28.
- **Cleanup:** #520–#523 completed publication branches removed locally/remotely after merge/tree checks. Three superseded root handoffs retired through #523. SoundCloud QA was deleted with its recorded 404; Apple fixture `75b7af90-141f-4f56-b02b-0bdd2c1c9dfe`, investigation handoff and all evidence stay. The completed cleanup handoff is closed and kept to preserve audit links. On 2026-10-19 the local worktrees and local branches for #518 and #519 were removed; neither tree had product files missing from `main`. Their untracked planning briefs were kept outside the repo. The same day, after an explicit owner yes, origin branches `codex/r20261011c-live-short-viewport` (`a06e0e6`) and `codex/r20261011c-builder-refresh-integrity` (`3d7bfd6`) were deleted. The local verification tag, the Apple fixture, and original classes stay. [Close receipt](../docs/audits/session-close-2026-10-13/receipt.json).
- **Owner decisions:** further fixture cleanup separately; Live finish placement, style, and confirmation still open (wording decided 2026-10-24: the live header control reads End Class, same handler, no confirmation); playlist import builds blocks only (decided 2026-10-24, [design](./playlist-import-blocks-design.md); slice A merged as [#572](https://github.com/steven-crosby/ritmofit-web/pull/572) (`88128ef`); slice B, the picker and paste-a-link preview, is draft [#573](https://github.com/steven-crosby/ritmofit-web/pull/573); the 15-song cap is per import, owner 2026-10-25); liveness alerting; F-02/D11. Missing-page and error screens keep `rf-hero-glow` (owner, 2026-10-24). OD-02 resolved: current cue remains the Live hero.

---

## What Ritmo Studio is

Ritmo Studio helps **individual rhythm fitness instructors** build, choreograph, organize, rehearse, and
run their own classes in one continuous creative flow. The current core disciplines are rhythm cycle,
Pilates, and HIIT.

- **Solo-first product:** perfect the individual creator experience until instructors naturally want to
  share, publish, and collaborate. Community features come later because the solo workflow has earned
  them, not because the app assumes them.
- **Web-first product definition:** the web app is the surface where the core creative loop, information
  architecture, and interaction model are being dialed in now. The iOS app remains a future/native client
  of the same backend, but current web work is not blocked by parity bookkeeping.
- **One shared backend:** the backend in this repo remains the source of truth for accounts, classes,
  choreography, tracks, moves, provider references, and run payloads. A later iOS app should inherit the
  proven web decisions through the same API and design canon.
- **Creator workstation shell over trusted services (D21):** Spotify, Apple Music, and SoundCloud are the
  reliable music substrate; Ritmo adds the instructor layer — class structure, choreography, rehearsal,
  playback windows, readiness, and Live Mode. Provider libraries are the raw material and class-building
  is the creative layer on top. The app should feel *familiar before it feels specialized*: browse, listen,
  and inspect playlists, then convert curiosity into a class — no single forced creation flow.
- **Simple. Stupid. Swift. (D23):** the first instructor-facing comprehension test. Prefer the defensible
  workflow that makes the instructor think least about the software, within the correctness boundaries in
  [`design principle 0`](../ritmofit_design_system/01-design-principles.md).
- **Private-beta release boundary (D22):** v1 is invite-only and non-monetized for a small instructor
  cohort. Official provider SDK/widget playback remains available alongside a first-class
  prompter-only path. API credentials are technical access, not proof of commercial or in-studio-use
  permission. Re-review provider terms and obtain any required written approval before public launch,
  monetization, or meaningful scale.

**The core product insight:** today instructors build a playlist in Spotify/Apple Music/SoundCloud,
then import it into a separate app (e.g. StructClub) to choreograph, then run it live in a third mode.
That context-switching breaks creative flow. Ritmo Studio's bet: *building a playlist* and *choreographing
a class* are one creative act split by tooling — so **the class IS the playlist plus choreography**,
modeled as a single object from day one.

## Competitive reference

StructClub remains the clearest product reference for rhythm-instructor expectations: fast discovery,
rich class/library presentation, movement-oriented creation paths, and a confident live-running surface.
Ritmo Studio intentionally diverges where provider constraints require it: playback may be controlled inside
Ritmo Studio only through official provider SDKs/widgets, while providers still own the audio stream and
availability. StructClub includes community/sharing concepts, but Ritmo Studio's current improvement target
is the solo creator loop: planning, music selection, choreography, organization, rehearsal, live prompting,
and provider-authorized playback as one instructor workflow. The old point-in-time StructClub audit and the completed launch gate are archived for provenance
([`archive/`](./archive/README.md)).

---

## ⚠️ Hard constraints — read before designing ANY music feature

These are platform/legal realities, not preferences. Full reasoning in [`music-providers.md`](./music-providers.md).
If a feature seems to require breaking one, **stop and flag it** — don't design around it.

1. **No BPM from Spotify.** Spotify deprecated the audio-features (tempo) endpoint for new apps in
   **November 2024**. BPM is **manual entry** in M1 (`tracks.display_bpm`, optional per-class override);
   an optional third-party BPM provider may come later. Never build against Spotify BPM.
2. **Official provider playback only; no mixing / crossfade.** Ritmo Studio may control playback through
   official Spotify, Apple Music, and SoundCloud SDKs/widgets. It never downloads, proxies, re-hosts,
   mixes, beatmatches, or crossfades provider audio.
3. **No caching of audio or platform-derived data.** We store **references** (provider IDs/URIs) and
   **our own** metadata (classes, cues, moves, intensity, timeline, manual BPM) — never audio.

> Always re-verify provider API terms before each music milestone — they change.

---

## Locked decisions

| Area | Decision |
|---|---|
| Surface model | **Solo-first, web-first** — web defines the individual creator loop now; iOS follows later from the proven contract and UX decisions (D20; D18 parity gate paused) |
| Product frame | **Creator workstation shell over trusted music services** — providers (Spotify/Apple/SoundCloud) are the substrate; Ritmo adds the instructor layer; provider libraries are raw material and class-building is the layer on top; familiar before specialized (D21) |
| Platform | **Cloudflare-native** — Workers (API) + D1 (database) + the SPA served as Workers static assets from the **same Worker/origin** as the API (no separate Pages site, single origin) |
| Account system | We own the `users` table; auth providers only verify identity |
| Auth | **Better Auth** on Workers + D1 (email, Apple, Google). Sessions in our D1. |
| Backend framework | **Hono** (TypeScript) on a Worker; REST surface documented with OpenAPI |
| Database | **Cloudflare D1** (SQLite); **Drizzle** ORM + migrations |
| Validation / contract | **Zod** schemas + inferred types in `packages/shared`, consumed by API and web |
| Web frontend | **React + Vite + TypeScript** (SPA, no SSR) + Tailwind w/ Ritmo Studio design tokens |
| iOS | Native Swift, separate repo; consumes the same backend via the OpenAPI contract |
| Repo shape | **Monorepo**: `packages/shared`, `apps/api`, `apps/web` (add packages only when earned) |
| Track identity | **Provider-agnostic** `track` + many `track_provider_ids` |
| Teams | **Dormant scaffolding** (`team_memberships`); preserve schema/routes, but do not surface or expand team workflows now |
| Class ownership | A class belongs to **one user**; sharing scaffolding exists but is deferred from the current product |
| Cues vs Moves | **Separate concepts**, both anchored to a `class_track` by `anchor_ms` |
| Moves library | Global `moves` seed + `user_moves` custom language; placements reference them |
| Time encoding | **Milliseconds everywhere** (`anchor_ms`, `start_offset_ms`, `duration_ms`) |
| iOS live contract | A versioned **`GET /classes/:id/run-payload`** — one request runs a class |
| Playback | **Provider-authorized only** (D19) — official SDKs/widgets (Spotify Web Playback SDK, MusicKit on the Web, SoundCloud Widget API); providers own the audio stream, Ritmo Studio owns the class timeline and playback windows |

Rationale + named tradeoffs for each: [`decisions.md`](./decisions.md).

---

## Working agreement for AI assistants

1. **Follow [`../AGENTS.md`](../AGENTS.md)** — it is canonical, including "Working Agreement" (plan →
   confirm before substantial work) and "Session Workflow" (start-session → plan → PR → close-session
   → handoff; lanes never merge).
2. **Respect the hard constraints above.** Never cache audio, pull Spotify BPM, or mix audio in-app.
3. **The shared package is the contract.** Entity shapes live once in `packages/shared`; don't
   redefine them in `apps/api` or `apps/web`.
4. **Centralize authorization.** One `requireAccess` helper, not scattered checks. D1 has no
   row-level security, so the app-level gate is the *only* gate — see [`authorization.md`](./authorization.md).
5. **Verify product/platform facts.** Provider APIs and auth pricing change; check current docs over
   training data.

---

## Milestones (headline)

Backend **M1–M4 are complete and deployed**, the web launch gate is complete, and the app is live at
`https://ritmofit.studio` (one Worker, single origin). Provider-authorized playback is complete for all
three providers (2026-07-06). The active track is the solo creator loop (D20/D21) and, within it,
music-led Phase 1 (D24). Community surfaces are dormant scaffolding, not active product.

- **M1 ✅ Auth + class/cue data model** — schema-complete, routes-lean, versioned run-payload.
- **M2 ✅ Music-provider integration** — SoundCloud, Spotify, Apple Music catalog adapters; the shared
  provider-capability matrix hides unsupported account-specific capabilities.
- **M3 ✅ Live mode + run-payload hardening.**
- **M4 ✅ historically, now dormant: Explore / sharing** — routes and schema remain; Teams, Sharing,
  Publish, and Explore stay hidden (D20).
- **Web Launch Readiness ✅** — gate and deferrals archived in
  [`archive/web-launch-readiness.md`](./archive/web-launch-readiness.md); full milestone definitions in
  [`archive/milestones.md`](./archive/milestones.md).

---

## Index

| File | Purpose |
|---|---|
| [`tasks.md`](./tasks.md) / [`tasks/`](./tasks/README.md) | Generated RF board / canonical actionable task records |
| [`handoffs/`](./handoffs/README.md) | Session restart context and dated observations; link RF records for current actionable work |
| [`HISTORY.md`](./HISTORY.md) | Dated build/deploy/verification log (PRs, Worker versions, migrations), newest first |
| [`decisions.md`](./decisions.md) | Every locked decision with rationale + tradeoffs |
| [`music-led-instructor-workflow-plan.md`](./music-led-instructor-workflow-plan.md) | D24 phased plan: connection/playback reliability → mobile teaching clarity → Builder speed/rehearsal |
| [`instructor-class-score-blueprint.md`](./instructor-class-score-blueprint.md) | Owner-approved class-building UX direction: run of show, optional precision score, timed exercise steps |
| [`class-template-handoff.md`](./class-template-handoff.md) | Settled scaffold/recipe rules for class templates (a product spec, not a session handoff) |
| [`class-scaffold-contract.md`](./class-scaffold-contract.md) | Cross-lane contract for class scaffolds and the Classes home |
| [`playlist-import-blocks-design.md`](./playlist-import-blocks-design.md) | Decided playlist-import block policy (2026-10-24); implementation not started |
| [`architecture.md`](./architecture.md) | Cloudflare-native stack, repo layout, data flow, deployment |
| [`schema.md`](./schema.md) | Current data model (D1/SQLite): tables, columns, relationships |
| [`api.md`](./api.md) | REST surface, run-payload, auth, error conventions |
| [`authorization.md`](./authorization.md) | The ownership + sharing access model (app-level gate) |
| [`music-providers.md`](./music-providers.md) | The three hard constraints; BPM/playback strategy |
| [`provider-playback-implementation.md`](./provider-playback-implementation.md) | As-built player architecture for all three provider adapters, Live preflight/auto-advance, Builder preview |
| [`editing-granularity-scoping.md`](./editing-granularity-scoping.md) | As-built trim / beat-snap / free-placement; the granularity boundary (D13) |
| [`deployment-runbook.md`](./deployment-runbook.md) | Production deploy + rollback/recovery, secrets matrix, smoke checks |
| [`prod-fixture-hygiene.md`](./prod-fixture-hygiene.md) | Naming/tagging and cleanup of `[QA]` fixtures created in production |
| [`conventions.md`](./conventions.md) | Code style, naming, env, wrangler/D1, git, testing |
| [`glossary.md`](./glossary.md) | Domain terms (cue, move, class_track, share, etc.) |
| [`web-ios-parity.md`](./web-ios-parity.md) | Paused web ↔ iOS parity record (sync context, not a current gate; D20) |
| [`archive/`](./archive/README.md) | Superseded docs (overview, milestones, launch readiness, Classes-home proposal) and the retired remote maintenance loop |
| [`../agent-prompts/README.md`](../agent-prompts/README.md) | Session workflow prompts: start/close-session, parallel rounds, templates, audit packs |

---

## Backlog / Open Items

Curated forward work. Shipped detail and evidence live in [`HISTORY.md`](./HISTORY.md); the
2026-10-06 entry there preserves the narrative this section replaced.

**Music-led workflow (D24) — active.** Phase 1 (1A connection recovery, 1B music-authoritative Live
clock, 1C truthful preflight with explicit Apple browser authorization) shipped 2026-10-02 (#478).
Remaining for Phase 1 acceptance: production natural boundaries and full uninterrupted classes
(see Now), audible output, iPhone Safari behavior, and interruption handling; scenarios in the
[acceptance record](../docs/audits/music-led-phase-1-acceptance/README.md). Later phases await owner
approval.

**Playlist → class → Live — decided 2026-10-24.** Playlist import builds blocks only: one block per
song, source order, no generated cues, notes, or teaching content. The first block is warm-up and the
last block is cooldown. Importing into an empty Classes template replaces those scaffold blocks.
Over 15 songs in one import, the instructor picks a source-ordered subset before the class or the
import is written; the import never silently truncates. The 15-song cap is per import (owner,
2026-10-25): it counts only the songs in that `songBlocks` request. Tracks already on the class do
not count, so a class with 10 tracks may import 15 more. Manual add is uncapped, per-batch cost is
what matters for performance, and the picker does not compute remaining slots. The cap is playlist
import only: search, manual add, and Songs-by-Move copy stay uncapped. Paste-a-link uses the same
blocks, labels, scaffold replacement, and picker. More than 100 occurrences is a 422 with no write,
and the provider fetch stops as soon as the count exceeds 100. The preview times out after 8 seconds
with a retryable error and no partial write. A 100-song link should open the picker in under 2
seconds. Design: [`playlist-import-blocks-design.md`](./playlist-import-blocks-design.md). Slice A
(the `songBlocks` commit) merged as [#572](https://github.com/steven-crosby/ritmofit-web/pull/572)
(`88128ef`). Slice B (picker, paste-a-link preview, scaffold labels) is draft
[#573](https://github.com/steven-crosby/ritmofit-web/pull/573). Evidence:
[desktop audit 2026-10-03](../docs/audits/playlist-to-live-2026-10-03/coverage.md).

**Class-building direction.** The [class-score blueprint](./instructor-class-score-blueprint.md)
proposes a 20-minute HIIT interaction prototype and contract proposal as its first slice; it does not
authorize implementation. Recipe/scaffold rules: [`class-template-handoff.md`](./class-template-handoff.md).

**Instructor benchmark gaps (2026-09-29)** — findings only, to be triaged into records by
[RF-146](./tasks/RF-146.json); evidence in
[`docs/audits/instructor-benchmark-2026-09-29/evidence/`](../docs/audits/instructor-benchmark-2026-09-29/evidence/README.md):

- Verify Apple Music from web Live on a real iPhone for a full class (Bluetooth output, screen
  locked/unlocked, one notification). The result decides web Live vs native iOS Live on the phone.
- Ask the instructor what Struct Club's Live "Open" intensity means and where she sees a
  beats-remaining count.
- (P0) portrait-first glance screen; (P0) a class that finishes hands-free after one playback error;
  (P1) cue plus per-cue note (schema change); (P1) beats-to-next-cue count; (P1) builder speed — mark a
  cue at the playhead, copy a routine between songs; (P1) real rehearse mode; (P2) discipline-specific
  effort words in Live.

**SPC-09 — provider permission vs provider error.** Design the API signals that separate a permission
failure from a provider error before adding UI states (Studio Pulse Check; ledger:
[`run-decisions.md`](../docs/audits/studio-pulse-check-2026-09-13/run-decisions.md)). Replaced as the
next focus by Phase 1 (2026-09-30); tracked as [RF-145](./tasks/RF-145.json).

**Spotify — reopened (owner, 2026-10-28).** It was tabled on 2026-10-02 until Apple Music UI/UX and
Live playback were hardened. The family now has Spotify Family. The Apple Music subscription ends
around 2026-11-27, so Apple hardening and Apple device checks come first in that window. Known issue
on resume: the connected account is rejected by the Spotify developer app ("The user is not
registered for this application"), so every Spotify Web API call returns `403`.

**Open owner decisions:**

- Live finish control: wording decided (owner, 2026-10-24). The live header button reads “End Class”
  before and after the class ends, with the same handler and no confirmation. Finished-class copy is
  the screen-reader line “That's the class — great ride.”, the run-state label “Class complete” (the
  ` · Track n of total` suffix stays), compact status still “Complete”, and the music rail “Last song
  done” when playback has ended. Placement, style, and whether End Class confirms are still open. On
  the last track, disabled Next leaves no separate nearby early-finish control. Owner feedback from
  the 2026-10-11 attended Cycle spot-check; routed from INBOX at close.
- Alerting half of playback liveness (the observer still observes only; never alerts or calls `fail()`).
- F-02: D11 `createPattern` remains unconfirmed
  ([design-audit ledger](../docs/audits/claude-design-audit-2026-07-24/run-decisions.md)).

**Decided (owner, 2026-10-24):** missing-page (`NotFound.tsx`) and error (`ErrorBoundary.tsx`) screens
keep `rf-hero-glow`. OD-01 removed that warmth from sign-in only. No further glow change.

**Pending live verification (non-blocking):**

- Round-9 provider checks: real SoundCloud/Apple catalog playlist-URL imports and the Apple
  library-link `400`.
- Live-site SoundCloud audio: accept the PWA refresh and repeat audible Preview + Live pause/resume
  once against a real public SoundCloud track.

**Deferred (owner decision):**

- **Google sign-in** — `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` unprovisioned; Google is excluded
  from the Login UI. Activation steps in `deployment-runbook.md` (deferred 2026-06-28).
- **Automatic BPM lookup (GetSongBPM)** — adapter built; `GETSONGBPM_API_KEY` not provisioned, so
  `POST /tracks/:id/bpm-lookup` returns `503`. Activate with `wrangler secret put GETSONGBPM_API_KEY`
  (deferred 2026-06-28).
- **Community surfaces** (Teams, Sharing, Publish, Explore, invites, collaborators, public class pages,
  social discovery, share links, Explore merchandising) — deferred until the owner reopens them (D20).
- **Cues vs notes split** — resolved as *don't split*; if anchored per-moment notes are ever needed,
  add a `kind` discriminator to `cues` ([archived decision](./archive/cues-vs-notes-decision.md)).

**Landed reference (not current work):** the 2026-07-24 design-audit implementation (six slices,
shipped 2026-07-27; [kickoff](../docs/audits/claude-design-audit-2026-07-24/IMPLEMENTATION-KICKOFF.md))
and the Studio Pulse Check batches 1–3 (shipped through 2026-09-19; ledger above). #470's v2 recipes
are deployed: a Worker rollback below `dd9a27e9` is unsafe once any v2-recipe class exists.
