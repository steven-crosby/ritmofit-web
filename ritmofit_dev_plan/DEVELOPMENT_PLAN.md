# Ritmo Studio — Development Plan

> **Read this first.** Entry point for any AI assistant (or human) working in this repo. **"Now"** is
> the only dated block: current focus, the next step, open owner decisions, and `main` vs production.
> The rest is the stable map — what we're building, locked decisions, hard constraints, and the
> backlog. Shipped history lives in [`HISTORY.md`](./HISTORY.md); what a session or lane still owes
> forward lives in [`handoffs/`](./handoffs/README.md). Keep "Now" under ~30 lines: when it changes,
> move the superseded text into a HISTORY entry instead of letting it accumulate here.

---

## Now

_Last updated 2026-10-09 (Codex UX round close and release-record reconciliation). No deployment occurred in this session._

- **Focus:** music-led Phase 1 ([D24](./decisions.md#d24--music-drives-creation-and-instruction-until-the-instructor-chooses-otherwise-resolved-2026-09-30)) — reliable Apple Music Live playback, desktop Cycle/Pilates first, then iPhone. Spotify remains tabled.
- **Production:** #494 baseline, source `e712274`; Worker `5f67d242-8956-42b7-9318-67b2797d3454` at 100%, SPA `assets/index-mZ1ypG4t.js` on three consecutive cache-busted checks. The historical deployment record from #497 is retained in HISTORY; this reconciliation does not deploy code.
- **Main ahead:** application tip `0ec1d10` includes undeployed #495/#499 (Apple library/catalog pagination guards), #501 (asynchronous transport-read handling), #503 (Builder clarity and keyboard rename focus), and #504 (Live timing/full guidance). #498 contributes recovery tests. Both UX PRs are merged; combined candidate CI and both post-merge main CI runs passed.
- **Acceptance:** natural desktop Cycle/Pilates runs on deployed #494 still need retained results and human listening confirmation. Fresh Cycle/Pilates fixtures are prepared and tagged `qa-fixture`; neither has played, and attended playback waits for listener availability. Synthetic integrated Builder → Live → Builder checks passed and establish UI behavior only.
- **Next step:** complete attended desktop acceptance with fresh tagged fixtures, then investigate iPhone Safari. Publish actual outcomes before claiming playback acceptance. See the [round close handoff](./handoffs/2026-10-09-ux-close-acceptance.md).
- **Release decision:** choose an exact batch after acceptance. The [release proposal](./release-proposal-2026-10-09.md) prepares isolated provider candidate `0afa5c8` and a later main/web batch. Current main contains provider, runtime, and presentation changes; merging is not deployment. Provider changes require their own deliberate release scope and the deployment runbook's fresh SPA build, remote migration check, rollback anchor, and smoke tests.
- **Owner decisions:** exact release batch and deployment; playlist-derived teaching-draft policy; liveness alerting; F-02/D11; NotFound/ErrorBoundary warmth; cleanup of retained QA fixtures/branches/worktrees. Fixture creation is authorized; deletion remains separate under [fixture hygiene](./prod-fixture-hygiene.md).

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
