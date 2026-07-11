# Ritmo Studio — Development Plan

> **Read this first.** Entry point for any AI assistant (or human) working in this repo. It explains
> what we're building, the decisions locked in, the platform realities that constrain every music
> feature, and where to find detail. Deep context lives alongside this file; this is the map.
>
> This plan began as the synthesis of earlier draft plans. The draft sources are no longer part of the
> live documentation set; use the index below for current source-of-truth files.

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
- **Current operating focus (2026-07-07):** the launch gate is green and the app is live. The active
  track is the **D21 creator-workstation-shell slice** — the first slice (Cycle/Pilates/HIIT templates,
  readiness + discovery resting state, provider shelves) is deployed; the **saved-playlist browsing
  sub-slice is now **implemented and deployed (Worker `ded27a07`)** (new `GET
  /providers/:provider/playlists` + `GET /providers/:provider/playlists/:playlistId/tracks`
  endpoints; TrackSearch "Saved playlists" mode with per-playlist drill-in, individual track
  preview/add, and "Import all N" bulk-import; resting shelf cards show live playlist counts and open
  `PlaylistBrowserDialog` to create a class from any playlist; all three providers integrated —
  Spotify OAuth, SoundCloud OAuth, Apple Music Music-User-Token). Alongside the
  **provider-authorized playback initiative**. SoundCloud, Apple Music, and Spotify Web Playback SDK
  adapters are now registered and live-verified for Builder clip-window preview (`TrackPreview.tsx`,
  manual/single-track/no-auto-advance) and Live Mode. The **2026-07-06 batch made the player usable
  across all three providers**: SoundCloud plays via the public Widget without a live connection,
  Apple Music `authorize()` recovers instead of freezing, Spotify plays in-app for Premium users via
  the official Web Playback SDK, older Spotify connections missing playback scopes surface a reconnect
  action, and Spotify-only tracks can still be **resolved cross-provider** to a playable equivalent.
  Teams, Sharing, Publish, and Explore stay hidden/dormant (D20). The **2026-07-07 workstation-shell
  consolidation** then unified primary navigation to the four locked destinations — **Classes, Music,
  Live, Account**: Music is a first-class provider/source workspace (saved-playlist *and* liked-tracks
  browsing on its shelves), Live is a runnable-class queue with preflight readiness, and Account is an
  in-page settings workspace (Profile, Preferences, Music Connections, Security). Liked-tracks browsing
  (browse likes → create a class from likes) now appears in both the Classes resting state and the
  Music workspace via a shared provider-browse hook. Last production deploy
  **2026-07-11 (Worker `b883cae9`)** — eighth parallel lane-agent round (all-harden, D21 loop): three
  disjoint-lane correctness slices — Builder preview resolve for `no_provider_ref` manual-add tracks
  (#269), by-id cue nested-authz regression lock completing the #254 triad (#270), and post-refresh
  playlist Forbidden/AccessDenied → stable `REAUTH_REQUIRED` / `PROVIDER_FORBIDDEN` mapping (#271) —
  **no schema/migration** (supersedes `6b8e1a48`). For per-deploy detail and the live Worker version,
  see [`HISTORY.md`](./HISTORY.md), newest first.

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
and provider-authorized playback as one instructor workflow. The old point-in-time StructClub audit is
archived for provenance; active launch checks and deferrals now live in
[`web-launch-readiness.md`](./web-launch-readiness.md).

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

1. **Plan before code.** For any feature, propose files, schema impact, API surface, frontend impact,
   risks, and verification — then wait for confirmation. Use the plan→confirm template in
   [`../CLAUDE.md`](../CLAUDE.md) → "Working Agreement".
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
> - **Milestone state** (M1–M4 and Web Launch Readiness done; provider-authorized playback complete;
>   solo creator refinement active) → [`milestones.md`](./milestones.md).
> - **Launch gate** (go/no-go checklist, verification plan, deferrals) →
>   [`web-launch-readiness.md`](./web-launch-readiness.md).
> - **Chronological deploy/build log** (every PR, Worker version id, migration step, the live Worker
>   version, and remote D1 migration level) → [`HISTORY.md`](./HISTORY.md), newest entry first.
> - **Paused iOS parity record** → [`web-ios-parity.md`](./web-ios-parity.md) (kept for contract/design
>   sync context, not a current product gate).
> - **Contributor + deployment instructions** → [`../CLAUDE.md`](../CLAUDE.md) and
>   [`deployment-runbook.md`](./deployment-runbook.md).
>
> The headline: backend **M1–M4 complete and deployed**, the web launch gate is green, and the app is
> live at `https://ritmofit.studio` (one Worker, single origin). The active track is solo creator
> refinement. Provider-authorized playback is complete (all three adapters live as of 2026-07-06). Community surfaces are
> preserved as dormant scaffolding, not active product.

- **M1 ✅ done: Auth + class/cue data model — schema-complete, routes-lean.** Modeled the
  expensive-to-retrofit relationships now (provider-agnostic tracks, many-to-many teams, owner+shares);
  routes in builder-first order — class builder + cues/moves end-to-end (with a **mock-track seam**)
  before teams/sharing routes. No provider API calls; BPM hand-entered. Versioned **run-payload** ships.
- **M2 ✅ done: Music-provider integration.** SoundCloud first; search, provider-ID resolution, optional
  third-party BPM, deep-link playback. SoundCloud, Spotify, and Apple Music catalog adapters are live
  when production credentials are present; unsupported account-specific capabilities stay hidden by the
  shared provider-capability matrix.
- **M3 ✅ done: Live mode + iOS parity polish.** Cue prompter, interval timers; run-payload hardened.
- **M4 ✅ done historically, now dormant: Explore / sharing UX** on the M1 `shares` model —
  share-by-email, team-sharing, and the Explore feed (publish via `classes.visibility`, public VIEW
  floor, `GET /explore`, save-a-copy). These routes/schema pieces remain in place, but the current web
  product hides Teams, Sharing, Publish, and Explore while solo creator refinement is active.
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
| [`provider-playback-implementation.md`](./provider-playback-implementation.md) | As-built player architecture: all three provider adapters (SoundCloud, Apple Music, Spotify) live-verified; Live Mode preflight/auto-advance and Builder preview wired |
| [`editing-granularity-scoping.md`](./editing-granularity-scoping.md) | As-built record of trim / beat-snap / free-placement; the granularity boundary (D13) and open follow-ups |
| [`milestones.md`](./milestones.md) | Milestone breakdown, M1 build order, acceptance criteria |
| [`web-launch-readiness.md`](./web-launch-readiness.md) | Completed web launch gate, verification plan, and live deferrals |
| [`deployment-runbook.md`](./deployment-runbook.md) | Production deploy + rollback/recovery procedure, secrets matrix, smoke checks |
| [`conventions.md`](./conventions.md) | Code style, naming, env, wrangler/D1, git, testing |
| [`glossary.md`](./glossary.md) | Domain terms (cue, move, class_track, share, etc.) |
| [`../agent-prompts/daily/close-session.md`](../agent-prompts/daily/close-session.md) | End-of-session runbook — say "run close-session" |
| [`HISTORY.md`](./HISTORY.md) | Archived dated build/deploy log (PRs, Worker versions, migration steps) |
| [`web-ios-parity.md`](./web-ios-parity.md) | Paused web ↔ iOS parity record: useful sync points and historical backlog, superseded as a current product gate by D20 |
| [`archive/structclub-parity-audit.md`](./archive/structclub-parity-audit.md) | Archived point-in-time StructClub competitive audit; active takeaways are consolidated into `web-launch-readiness.md` |

---

## Backlog / Open Items

Forward work lives in the solo creator loop. The **creator-workstation-shell slice (D21)** — discovery
shelves, liked/saved cards, playlist browsing, Cycle/Pilates/HIIT template narrowing, and the unified
Classes / Music / Live / Account navigation — **shipped 2026-07-07 (Worker `9d0a5710`)**. Provider-authorized
playback for all three providers shipped 2026-07-06. Historical
web launch deferrals remain in [`web-launch-readiness.md`](./web-launch-readiness.md); the old
cross-surface parity record remains in [`web-ios-parity.md`](./web-ios-parity.md), but it is not the
current planning queue.

**Open production issues:**

- _None currently tracked here._

**Known deferred post-launch features (not blocking, owner decision):**

- **Google sign-in** — `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are unprovisioned; Google is excluded from the Login UI. See `deployment-runbook.md` for activation steps (owner deferral, 2026-06-28).
- **Automatic BPM lookup (GetSongBPM)** — the adapter is built; `GETSONGBPM_API_KEY` is not provisioned in prod, so `POST /tracks/:id/bpm-lookup` returns `503`. Activate via `wrangler secret put GETSONGBPM_API_KEY`. (Owner deferral, 2026-06-28.)

Recently closed (kept as pointers so the trail isn't lost):

- **`sections[]` id in run-payload — ✅ shipped** (2026-07-10, PR #267, Worker `6b8e1a48`): the
  run-payload section projection now carries the `class_sections` row `id` (additive, OpenAPI regen,
  no migration), completing the id-everywhere pattern already applied to cues and moves so Live/editor
  can correlate or deep-link a band even when two share a `type`. Server-derived `endOffsetMs` was
  evaluated and deferred (no consumer needs it; iOS derives the band window client-side).

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
- **Community surfaces** (Teams, Sharing, Publish, Explore, invites, collaborators, public class pages,
  social discovery, marketplace/community browsing, share links, and rich Explore merchandising) are
  explicitly deferred until the owner reopens them.
