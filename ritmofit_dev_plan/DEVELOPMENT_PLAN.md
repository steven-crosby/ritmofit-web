# RitmoFit — Development Plan

> **Read this first.** Entry point for any AI assistant (or human) working in this repo. It explains
> what we're building, the decisions locked in, the platform realities that constrain every music
> feature, and where to find detail. Deep context lives alongside this file; this is the map.
>
> This plan began as the synthesis of earlier draft plans. The draft sources are no longer part of the
> live documentation set; use the index below for current source-of-truth files.

---

## What RitmoFit is

A choreography and class-running tool for **rhythm spin cycle instructors**.

- **Two complete, co-equal surfaces of one product** ("Spotify for instructors"): the **web app** and
  the **iOS app** (separate repo) each carry the *full* instructor loop — build & choreograph, library,
  search, explore, sharing, **and** run a class live — expressed in each platform's native idiom. A
  surface may *lean* toward a context (web at a desk, iOS in the room) but is **never capability-limited**.
- Both are clients of **one shared backend** built in this repo. A class built on web opens on iOS
  unchanged. **The backend is the single source of truth; neither client is.**
- The parity principle is locked as decision **D18**; the hard gate + current parity backlog live in
  [`web-ios-parity.md`](./web-ios-parity.md).
- **Current operating focus (2026-07-02):** the web launch gate is green and deployed. The active web
  track is the **provider-authorized playback initiative**
  ([`provider-playback-implementation.md`](./provider-playback-implementation.md)) alongside continuing
  owner-approved design/polish slices. The iOS handoff / parity wrap is queued behind it; its backlog
  stays tracked in [`web-ios-parity.md`](./web-ios-parity.md), and the parity gate still applies to
  every web feature merge.

**The core product insight:** today instructors build a playlist in Spotify/Apple Music/SoundCloud,
then import it into a separate app (e.g. StructClub) to choreograph, then run it live in a third mode.
That context-switching breaks creative flow. RitmoFit's bet: *building a playlist* and *choreographing
a class* are one creative act split by tooling — so **the class IS the playlist plus choreography**,
modeled as a single object from day one.

## Competitive reference

StructClub remains the clearest product reference for rhythm-instructor expectations: fast discovery,
rich class/library presentation, movement-oriented creation paths, and a confident live-running surface.
RitmoFit intentionally diverges where provider constraints require it: playback may be controlled inside
RitmoFit only through official provider SDKs/widgets, while providers still own the audio stream and
availability. RitmoFit competes by making web-based planning, choreography, sharing, live prompting, and
provider-authorized playback feel like one instructor workflow. The old point-in-time StructClub audit
is archived for provenance; active launch checks and deferrals now live in
[`web-launch-readiness.md`](./web-launch-readiness.md).

---

## ⚠️ Hard constraints — read before designing ANY music feature

These are platform/legal realities, not preferences. Full reasoning in [`music-providers.md`](./music-providers.md).
If a feature seems to require breaking one, **stop and flag it** — don't design around it.

1. **No BPM from Spotify.** Spotify deprecated the audio-features (tempo) endpoint for new apps in
   **November 2024**. BPM is **manual entry** in M1 (`tracks.display_bpm`, optional per-class override);
   an optional third-party BPM provider may come later. Never build against Spotify BPM.
2. **Official provider playback only; no mixing / crossfade.** RitmoFit may control playback through
   official Spotify, Apple Music, and SoundCloud SDKs/widgets. It never downloads, proxies, re-hosts,
   mixes, beatmatches, or crossfades provider audio.
3. **No caching of audio or platform-derived data.** We store **references** (provider IDs/URIs) and
   **our own** metadata (classes, cues, moves, intensity, timeline, manual BPM) — never audio.

> Always re-verify provider API terms before each music milestone — they change.

---

## Locked decisions

| Area | Decision |
|---|---|
| Surface model | **Full parity** — web and iOS are co-equal surfaces; every core capability on both, platform-idiomatic (D18, [`web-ios-parity.md`](./web-ios-parity.md)) |
| Platform | **Cloudflare-native** — Workers (API) + D1 (database) + the SPA served as Workers static assets from the **same Worker/origin** as the API (no separate Pages site, single origin) |
| Account system | We own the `users` table; auth providers only verify identity |
| Auth | **Better Auth** on Workers + D1 (email, Apple, Google). Sessions in our D1. |
| Backend framework | **Hono** (TypeScript) on a Worker; REST surface documented with OpenAPI |
| Database | **Cloudflare D1** (SQLite); **Drizzle** ORM + migrations |
| Validation / contract | **Zod** schemas + inferred types in `packages/shared`, consumed by API and web |
| Web frontend | **React + Vite + TypeScript** (SPA, no SSR) + Tailwind w/ RitmoFit design tokens |
| iOS | Native Swift, separate repo; consumes the same backend via the OpenAPI contract |
| Repo shape | **Monorepo**: `packages/shared`, `apps/api`, `apps/web` (add packages only when earned) |
| Track identity | **Provider-agnostic** `track` + many `track_provider_ids` |
| Teams | **Many-to-many** (`team_memberships`); schema in M1, routes later |
| Class ownership | A class belongs to **one user**; sharing is layered on (Google Drive model) |
| Cues vs Moves | **Separate concepts**, both anchored to a `class_track` by `anchor_ms` |
| Moves library | Global `moves` seed + `user_moves` custom language; placements reference them |
| Time encoding | **Milliseconds everywhere** (`anchor_ms`, `start_offset_ms`, `duration_ms`) |
| iOS live contract | A versioned **`GET /classes/:id/run-payload`** — one request runs a class |
| Playback | **Provider-authorized only** (D19) — official SDKs/widgets (Spotify Web Playback SDK, MusicKit on the Web, SoundCloud Widget API); providers own the audio stream, RitmoFit owns the class timeline and playback windows |

Rationale + named tradeoffs for each: [`decisions.md`](./decisions.md).

---

## Working agreement for AI assistants

1. **Plan before code.** For any feature, propose files, schema impact, API surface, frontend impact,
   risks, and verification — then wait for confirmation. Use the plan→confirm template in
   [`../AGENTS.md`](../AGENTS.md) → "Before Implementing".
2. **Respect the hard constraints above.** Never cache audio, pull Spotify BPM, or mix audio in-app.
3. **The shared package is the contract.** Entity shapes live once in `packages/shared`; don't
   redefine them in `apps/api` or `apps/web`.
4. **Centralize authorization.** One `requireAccess` helper, not scattered checks. D1 has no
   row-level security, so the app-level gate is the *only* gate — see [`authorization.md`](./authorization.md).
5. **Verify product/platform facts.** Provider APIs and auth pricing change; check current docs over
   training data.

---

## Milestones (headline)

Full breakdown + acceptance criteria in [`milestones.md`](./milestones.md).

> **Where current status lives** (to avoid drift, this map carries no dated status):
> - **Milestone state** (M1–M4 and Web Launch Readiness done; provider-playback initiative active,
>   iOS parity wrap queued) → [`milestones.md`](./milestones.md).
> - **Launch gate** (go/no-go checklist, verification plan, deferrals) →
>   [`web-launch-readiness.md`](./web-launch-readiness.md).
> - **Chronological deploy/build log** (every PR, Worker version id, migration step, the live Worker
>   version, and remote D1 migration level) → [`HISTORY.md`](./HISTORY.md), newest entry first.
> - **Post-web-launch parity work** → [`web-ios-parity.md`](./web-ios-parity.md) (the web↔iOS parity
>   backlog).
> - **Contributor + deployment instructions** → [`../AGENTS.md`](../AGENTS.md) and
>   [`deployment-runbook.md`](./deployment-runbook.md).
>
> The headline: backend **M1–M4 complete and deployed**, the web launch gate is green, and the app is
> live at `https://ritmofit.studio` (one Worker, single origin). The active track is the
> provider-authorized playback initiative; the iOS parity wrap is queued behind it.

- **M1 ✅ done: Auth + class/cue data model — schema-complete, routes-lean.** Modeled the
  expensive-to-retrofit relationships now (provider-agnostic tracks, many-to-many teams, owner+shares);
  routes in builder-first order — class builder + cues/moves end-to-end (with a **mock-track seam**)
  before teams/sharing routes. No provider API calls; BPM hand-entered. Versioned **run-payload** ships.
- **M2 ✅ done: Music-provider integration.** SoundCloud first; search, provider-ID resolution, optional
  third-party BPM, deep-link playback. SoundCloud, Spotify, and Apple Music catalog adapters are live
  when production credentials are present; unsupported account-specific capabilities stay hidden by the
  shared provider-capability matrix.
- **M3 ✅ done: Live mode + iOS parity polish.** Cue prompter, interval timers; run-payload hardened.
- **M4 ✅ done: Explore / sharing UX** on the M1 `shares` model — share-by-email, team-sharing, and the
  Explore feed (publish via `classes.visibility`, public VIEW floor, `GET /explore`, save-a-copy). The
  two open decisions were settled: publish/visibility = a `visibility` enum; **featured = deferred** (no
  admin concept yet — it remains a future slice). All deployed.
- **Web Launch Readiness ✅ done:** full production web loop verified, launch-blocking polish and
  operational gaps closed, Apple Sign In/provider credentials deployed, and deferrals documented.
  Checklist:
  [`web-launch-readiness.md`](./web-launch-readiness.md).

---

## Index

| File | Purpose |
|---|---|
| [`overview.md`](./overview.md) | Product context, the user, the problem, StructClub reference |
| [`decisions.md`](./decisions.md) | Every locked decision with rationale + tradeoffs |
| [`architecture.md`](./architecture.md) | Cloudflare-native stack, repo layout, data flow, deployment |
| [`schema.md`](./schema.md) | Current data model (D1/SQLite): tables, columns, relationships |
| [`api.md`](./api.md) | REST surface, run-payload, auth, error conventions |
| [`authorization.md`](./authorization.md) | The ownership + sharing access model (app-level gate) |
| [`music-providers.md`](./music-providers.md) | The three hard constraints; BPM/playback strategy |
| [`provider-playback-implementation.md`](./provider-playback-implementation.md) | Planned RitmoFit player architecture: provider adapters, Live Mode preflight/auto-advance, mixed-provider classes |
| [`editing-granularity-scoping.md`](./editing-granularity-scoping.md) | As-built record of trim / beat-snap / free-placement; the granularity boundary (D13) and open follow-ups |
| [`milestones.md`](./milestones.md) | Milestone breakdown, M1 build order, acceptance criteria |
| [`web-launch-readiness.md`](./web-launch-readiness.md) | Completed web launch gate, verification plan, and live deferrals |
| [`deployment-runbook.md`](./deployment-runbook.md) | Production deploy + rollback/recovery procedure, secrets matrix, smoke checks |
| [`conventions.md`](./conventions.md) | Code style, naming, env, wrangler/D1, git, testing |
| [`glossary.md`](./glossary.md) | Domain terms (cue, move, class_track, share, etc.) |
| [`../agent-prompts/daily/close-session.md`](../agent-prompts/daily/close-session.md) | End-of-session runbook — say "run close-session" |
| [`HISTORY.md`](./HISTORY.md) | Archived dated build/deploy log (PRs, Worker versions, migration steps) |
| [`web-ios-parity.md`](./web-ios-parity.md) | Web ↔ iOS surface-parity principle (D18): the hard gate, sync points, and the cross-surface parity backlog |
| [`archive/structclub-parity-audit.md`](./archive/structclub-parity-audit.md) | Archived point-in-time StructClub competitive audit; active takeaways are consolidated into `web-launch-readiness.md` |

---

## Backlog / Open Items

Forward work has two homes during launch sequencing: web launch blockers and deferrals live in
[`web-launch-readiness.md`](./web-launch-readiness.md); post-web-launch cross-surface parity work lives
in [`web-ios-parity.md`](./web-ios-parity.md). Don't keep parallel lists here.

**Open production issues:**

- _None currently tracked here._

Recently closed (kept as pointers so the trail isn't lost):

- **Provider connect prerequisite for playback — ✅ verified** (2026-07-03, Worker
  `94126954-0e61-408e-b404-bb380c338141`): Apple Music, SoundCloud, and Spotify production connect are
  all verified working. SoundCloud required an OAuth request-shape fix; Spotify required registering
  `https://ritmofit.studio/api/v1/providers/spotify/callback` in the Spotify app dashboard. See
  [`deployment-runbook.md`](./deployment-runbook.md).
- **"Songs by Move" / track-and-theme reverse search — ✅ shipped** (PRs #99; reverse move→songs search
  + server-side class tag/theme search). See [`HISTORY.md`](./HISTORY.md).
- **Cues vs. Notes — ✅ resolved + read-path shipped.** Decided *not* to split the schema; the
  `class_tracks.notes` channel already existed end-to-end but was write-only, and Live mode now renders
  it. If *anchored, per-moment* notes ever prove needed, add a `kind: 'cue' | 'note'` discriminator to
  `cues` (additive) rather than a new table. Full decision (archived): [`archive/cues-vs-notes-decision.md`](./archive/cues-vs-notes-decision.md).
- **Explore feature expansion** (rich categorized curation, featured/admin curation, themed collection
  merchandising) remains explicitly deferred from web launch scope in
  [`web-launch-readiness.md`](./web-launch-readiness.md).
