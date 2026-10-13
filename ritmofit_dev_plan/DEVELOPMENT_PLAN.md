# Ritmo Studio — Development Plan

> **Read this first.** Entry point for any AI assistant (or human) working in this repo. **"Now"** is
> the only dated block: current focus, the next step, open owner decisions, and `main` vs production.
> The rest is the stable map — what we're building, locked decisions, hard constraints, and the
> backlog. Shipped history lives in [`HISTORY.md`](./HISTORY.md); what a session or lane still owes
> forward lives in [`handoffs/`](./handoffs/README.md). Keep "Now" under ~30 lines: when it changes,
> move the superseded text into a HISTORY entry instead of letting it accumulate here.

---

## Now

_Last updated 2026-10-13 (Codex close-session). #523 merged as `973db61`; local and remote main were reconciled. Production application source aligns at `4fd1ecd`. Apple 5:18 debugging is tabled by Steven; its cause remains unresolved._

- **Focus:** music-led Phase 1 ([D24](./decisions.md#d24--music-drives-creation-and-instruction-until-the-instructor-chooses-otherwise-resolved-2026-09-30)) — reliable Apple Music Live playback, desktop Cycle/Pilates first, then iPhone. Spotify remains tabled.
- **Production:** deployed #518/#519 from main `4fd1ecd` on 2026-10-13: Worker `73493517-2006-4beb-bf7c-cdb1edf298fd` at 100%, SPA `assets/index-C1EvvyLa.js` matched on three consecutive cache-busted checks and in the authenticated browser after its prompted PWA update. No migrations applied. Immediate rollback Worker `9563d726-bc4d-44f7-834a-d7dbcc388d19`. [HISTORY](./HISTORY.md).
- **Delivery:** #518 Live short-screen teaching/completion and #519 Builder refresh/Live-return/deletion ownership are live; #520 adds evidence only. [PR #521](https://github.com/steven-crosby/ritmofit-web/pull/521) publishes preflight/deployment/cleanup records with no product changes. #521 passed reviewed-head and post-main CI and is merged. [#522](https://github.com/steven-crosby/ritmofit-web/pull/522) records the scoped recovery investigation and is merged as `9625ef9`; full post-main CI passed. No application changes require another deployment.
- **Technical verification:** completed fresh 12-surface × 5-width local matrix, native Chrome 200%, dialog inert/focus wrapping/return, Full List/completion/Exit. Eleven production HTTP probes and security headers passed; authenticated QA Builder and narrow prompter-only Live/Exit passed. [Evidence and limits](../docs/audits/deployment-preflight-518-519-2026-10-13/README.md).
- **Human acceptance:** the earlier owner-approved desktop Cycle/Pilates spot-check remains historical ([record](../docs/audits/apple-natural-acceptance-2026-10-09/README.md)). On the deployed build, Steven confirmed Apple authorization, audible start and clean natural handover to Bad Romance; a transient Waiting for music panel appeared and cleared. Apple post-Exit silence and all four SoundCloud hearing checks are now confirmed. A separate later Apple recovery at 5:18 was unwitnessed; stability/cause remain open. UI/SDK state, synthetic completion and deployment do not close these checks. Real iPhone Safari remains unverified.
- **Next step:** Apple 5:18 debugging is tabled at Steven’s request; resume only on an explicit owner instruction. No investigation is active. The normal visible run through 6:34 does not resolve the original cause. [Retained investigation handoff](./handoffs/2026-10-13-apple-recovery-investigation.md). Real iPhone, the view-tab arrow-key gap and transient waiting-panel presentation remain open for later prioritization.
- **Cleanup:** #520–#523 completed publication branches removed locally/remotely after merge/tree checks. Three superseded root handoffs retired through #523. SoundCloud QA was deleted with its recorded 404; Apple fixture `75b7af90-141f-4f56-b02b-0bdd2c1c9dfe`, investigation handoff and all evidence stay. The completed cleanup handoff is closed and kept to preserve audit links. Both lane branches remain attached to retained protected worktrees; briefs, `.claude/`, verification tag, original classes/playlists and local smoke state remain untouched. [Close receipt](../docs/audits/session-close-2026-10-13/receipt.json).
- **Owner decisions:** protected lane cleanup and further fixture cleanup separately; Live finish wording/location/style (backlog; Exit works); playlist-derived teaching-draft policy; liveness alerting; F-02/D11; NotFound/ErrorBoundary warmth. OD-02 resolved: current cue remains the Live hero.

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
| [`handoffs/`](./handoffs/README.md) | One file per session or lane: in flight, next action, open owner decisions |
| [`HISTORY.md`](./HISTORY.md) | Dated build/deploy/verification log (PRs, Worker versions, migrations), newest first |
| [`decisions.md`](./decisions.md) | Every locked decision with rationale + tradeoffs |
| [`music-led-instructor-workflow-plan.md`](./music-led-instructor-workflow-plan.md) | D24 phased plan: connection/playback reliability → mobile teaching clarity → Builder speed/rehearsal |
| [`instructor-class-score-blueprint.md`](./instructor-class-score-blueprint.md) | Owner-approved class-building UX direction: run of show, optional precision score, timed exercise steps |
| [`class-template-handoff.md`](./class-template-handoff.md) | Settled scaffold/recipe rules for class templates (a product spec, not a session handoff) |
| [`class-scaffold-contract.md`](./class-scaffold-contract.md) | Cross-lane contract for class scaffolds and the Classes home |
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

**Playlist → class → Live teaching draft — product gap, owner decision.** Imports preserve source
order but create no exercise blocks, generic cues, or notes; the Classes template path puts all songs
into its first fixed block and leaves empty blocks that disable Run Live. Ranked fix sequence and QA
fixture IDs: [desktop audit 2026-10-03](../docs/audits/playlist-to-live-2026-10-03/coverage.md).
No teaching-draft, readiness, schema/API, or 15-song-cap change is authorized yet.

**Class-building direction.** The [class-score blueprint](./instructor-class-score-blueprint.md)
proposes a 20-minute HIIT interaction prototype and contract proposal as its first slice; it does not
authorize implementation. Recipe/scaffold rules: [`class-template-handoff.md`](./class-template-handoff.md).

**Instructor benchmark gaps (2026-09-29)** — findings only; evidence in
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
next focus by Phase 1 (2026-09-30); still open.

**Spotify — tabled (owner, 2026-10-02)** until Apple Music UI/UX and Live playback are hardened. Stays
connected, not a release gate, no readiness claims. Known issue when it resumes: the connected account
is rejected by the Spotify developer app ("The user is not registered for this application"), so
every Spotify Web API call returns `403`.

**Open owner decisions:**

- Live finish control: decide wording (for example “End class”), placement, style and whether it
  confirms. Exit works functionally; on the last track, disabled Next leaves no nearby early-finish
  control. Owner feedback from the 2026-10-11 attended Cycle spot-check; routed from INBOX at close.
- Alerting half of playback liveness (the observer still observes only; never alerts or calls `fail()`).
- F-02: D11 `createPattern` remains unconfirmed
  ([design-audit ledger](../docs/audits/claude-design-audit-2026-07-24/run-decisions.md)).
- `NotFound.tsx` / `ErrorBoundary.tsx` still use the heat-glow class that OD-01 removed from sign-in;
  whether warmth should go there too was never decided.

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
