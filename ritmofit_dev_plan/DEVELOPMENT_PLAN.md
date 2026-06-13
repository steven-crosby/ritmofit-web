# RitmoFit — Development Plan

> **Read this first.** Entry point for any AI assistant (or human) working in this repo. It explains
> what we're building, the decisions locked in, the platform realities that constrain every music
> feature, and where to find detail. Deep context lives alongside this file; this is the map.
>
> This plan is the **synthesis** of two earlier drafts (`chatgpt_dev_plan/`, `claude_dev_plan/`).
> It takes the reasoned doc structure and platform-awareness of the Claude draft, the Cloudflare-native
> stack and the run-payload/mock-track ideas of the ChatGPT draft, and resolves the schema into one.

---

## What RitmoFit is

A choreography and class-running tool for **rhythm spin cycle instructors**.

- The **web app** is the *planning* surface — assembling and choreographing classes on a laptop:
  auditioning tracks, ordering them into an energy arc, tagging cues and moves to specific moments.
- The **iOS app** (separate repo) is the *live* surface — running the class in front of a room.
- Both are clients of **one shared backend** built in this repo. A class built on web opens on iOS
  unchanged. **The backend is the single source of truth; neither client is.**

**The core product insight:** today instructors build a playlist in Spotify/Apple Music/SoundCloud,
then import it into a separate app (e.g. StructClub) to choreograph, then run it live in a third mode.
That context-switching breaks creative flow. RitmoFit's bet: *building a playlist* and *choreographing
a class* are one creative act split by tooling — so **the class IS the playlist plus choreography**,
modeled as a single object from day one.

---

## ⚠️ Hard constraints — read before designing ANY music feature

These are platform/legal realities, not preferences. Full reasoning in [`music-providers.md`](./music-providers.md).
If a feature seems to require breaking one, **stop and flag it** — don't design around it.

1. **No BPM from Spotify.** Spotify deprecated the audio-features (tempo) endpoint for new apps in
   **November 2024**. BPM is **manual entry** in M1 (`tracks.display_bpm`, optional per-class override);
   an optional third-party BPM provider may come later. Never build against Spotify BPM.
2. **No in-app audio mixing / crossfade.** RitmoFit is a **planning surface**. Audio plays through the
   user's own provider apps; we deep-link / hand off via `track_provider_ids.provider_uri`. We never
   stream or mix tracks ourselves.
3. **No caching of audio or platform-derived data.** We store **references** (provider IDs/URIs) and
   **our own** metadata (classes, cues, moves, intensity, timeline, manual BPM) — never audio.

> Always re-verify provider API terms before each music milestone — they change.

---

## Locked decisions

| Area | Decision |
|---|---|
| Platform | **Cloudflare-native** — Workers (API) + D1 (database) + Pages/Workers static assets (web) |
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

Rationale + named tradeoffs for each: [`decisions.md`](./decisions.md).

---

## Working agreement for AI assistants

1. **Plan before code.** For any feature, propose files, schema impact, API surface, frontend impact,
   risks, and verification — then wait for confirmation. Use the template in
   [`ai-working-rules.md`](./ai-working-rules.md).
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

> **Status (2026-06-12): M1–M4 complete, merged to `main`, and fully deployed.** The whole app — API +
> web planning surface — is **live at `https://ritmofit.studio`**, served by one Worker (Workers static
> assets; single origin ⇒ first-party auth, no CORS), with remote D1 migrated through `0005`. M4
> (Explore / sharing UX) shipped in three slices — share-by-email, team-sharing, and the Explore feed
> (`classes.visibility`, public VIEW floor, `GET /explore`, save-a-copy); **featured curation is
> deliberately deferred**. CI (`.github/workflows/ci.yml`) gates `typecheck`/`lint`/`test` (164) on every
> push/PR — **advisory** (enforced branch protection needs GitHub Pro/public; repo is private/Free).
> Full deploy + CI record in [`../CLAUDE.md`](../CLAUDE.md).
>
> **Web design-system build (builder UI) underway (2026-06-12).** The rich planning UI M1 deferred is
> now being built in vertical slices — the difference between the data-flow skeleton and the designed
> surface in [`../ritmofit_design_system/`](../ritmofit_design_system/). Slices 1–4 are merged (PR #8)
> and **deployed** (Worker version `4afed022`, no schema change): (1) the energy-arc **intensity ribbon**,
> (2) low-noise **song rows** (44px art, Martian-Mono BPM, intensity bars), (3) the **track inspector**
> (edit intensity/BPM/notes, remove), (4) **cue + placed-move authoring**. Also wired **vitest into
> `apps/web`** (geometry unit test). Slices 5–6 added drag/keyboard reorder and inline-edit of cues/moves
> (PRs #9–#10). **Slice 7** assembles it all into the spec'd **full 3-pane `09` layout** (library · class
> workspace · sticky inspector, with a class-header summary) — purely presentational, no schema/API/shared
> change; `pnpm test` = api 159 + web 17 = **176** *(branch `feat/web-builder-3pane-layout`, not yet
> deployed)*. Deferred: cue color picker, the on-beat pulse, custom user-moves, the timeline-marker strip,
> the segment band. See `milestones.md` for the full slice log.
>
> **Next major milestone: iOS Phase 2** (the native live surface in `ritmofit-ios`, against this same
> backend/run-payload). The web *backend* build order is done; the web *UI* design-system build continues.

- **M1 ✅ done: Auth + class/cue data model — schema-complete, routes-lean.** Modeled the
  expensive-to-retrofit relationships now (provider-agnostic tracks, many-to-many teams, owner+shares);
  routes in builder-first order — class builder + cues/moves end-to-end (with a **mock-track seam**)
  before teams/sharing routes. No provider API calls; BPM hand-entered. Versioned **run-payload** ships.
- **M2 ✅ done: Music-provider integration.** SoundCloud first; search, provider-ID resolution, optional
  third-party BPM, deep-link playback. Spotify + Apple Music adapters behind the mock until real creds.
- **M3 ✅ done: Live mode + iOS parity polish.** Cue prompter, interval timers; run-payload hardened.
- **M4 ✅ done: Explore / sharing UX** on the M1 `shares` model — share-by-email, team-sharing, and the
  Explore feed (publish via `classes.visibility`, public VIEW floor, `GET /explore`, save-a-copy). The
  two open decisions were settled: publish/visibility = a `visibility` enum; **featured = deferred** (no
  admin concept yet — it remains a future slice). All deployed.

---

## Index

| File | Purpose |
|---|---|
| [`overview.md`](./overview.md) | Product context, the user, the problem, StructClub reference |
| [`decisions.md`](./decisions.md) | Every locked decision with rationale + tradeoffs |
| [`architecture.md`](./architecture.md) | Cloudflare-native stack, repo layout, data flow, deployment |
| [`schema.md`](./schema.md) | Full M1 data model (D1/SQLite): tables, columns, relationships |
| [`api.md`](./api.md) | REST surface, run-payload, auth, error conventions |
| [`authorization.md`](./authorization.md) | The ownership + sharing access model (app-level gate) |
| [`music-providers.md`](./music-providers.md) | The three hard constraints; BPM/playback strategy |
| [`milestones.md`](./milestones.md) | Milestone breakdown, M1 build order, acceptance criteria |
| [`conventions.md`](./conventions.md) | Code style, naming, env, wrangler/D1, git, testing |
| [`glossary.md`](./glossary.md) | Domain terms (cue, move, class_track, share, etc.) |
| [`ai-working-rules.md`](./ai-working-rules.md) | The plan→confirm template + the inviolable rules |
