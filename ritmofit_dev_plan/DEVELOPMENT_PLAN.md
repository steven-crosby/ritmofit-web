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
> assets; single origin ⇒ first-party auth, no CORS), with remote D1 migrated through `0006`. M4
> (Explore / sharing UX) shipped in three slices — share-by-email, team-sharing, and the Explore feed
> (`classes.visibility`, public VIEW floor, `GET /explore`, save-a-copy); **featured curation is
> deliberately deferred**. CI (`.github/workflows/ci.yml`) gates `typecheck`/`lint`/`test` (164) on every
> push/PR — **advisory** (enforced branch protection needs GitHub Pro/public; repo is private/Free).
> Current launch/deploy status is tracked in [`../REVIEW.md`](../REVIEW.md); canonical contributor and
> deployment instructions are in [`../AGENTS.md`](../AGENTS.md).
>
> **Pre-launch blocker remediation deployed (2026-06-14).** PR #45 shipped four audited launch fixes:
> production OAuth callbacks use the canonical web origin; shares and team grants require a verified
> target identity; Dashboard class detail is keyed by class/request and rejects stale responses; and
> provider disconnect purges clear unprovenanced artwork while retaining exhausted duties in a durable
> failed state. Remote D1 is migrated through `0009` (`failed_at` plus the active-queue index), and Worker
> version 46 (`aa26e286-c517-444a-952f-d5e410c9439f`) is live at 100%. Health, SPA, protected-route,
> code-split asset, and missing-state SoundCloud callback smokes passed; the callback now returns to
> `https://ritmofit.studio`.
>
> **Production transactional email verified (2026-06-14).** Resend verifies
> `ritmofit.studio`; public DNS resolves the sending MX/SPF/DKIM records and DMARC policy.
> Worker secret-only version 48 (`5bcf4a47-5795-4832-b8b0-bde95d651b3d`) supplies a
> sending-only, domain-restricted `RESEND_API_KEY` and explicit `EMAIL_FROM`. A real
> Gmail-alias signup received and completed email verification (`email_verified = 1`);
> the password-reset email also arrived, opened the valid reset form, and completed the
> password change. The temporary production account and its cascaded auth rows were
> removed after the test. The transactional-email launch blocker is closed.
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
> change; `pnpm test` = api 159 + web 17 = **176** *(merged PR #13, **deployed** 2026-06-12, Worker
> version `810f25d3`)*. **Slice 8** adds the **cue color picker** (rationed palette, no plasma; tags the
> existing `cues.color`; deployed, Worker `74a94ec5`). **Slice 9** adds **custom user-moves** (create +
> place reusable moves from the inspector; web-only — the `/user-moves` routes + run-payload name
> resolution already existed; *merged PR #17, **deployed 2026-06-12**, Worker `511af62c`*). **Slice 10**
> adds the **timeline-marker strip** beneath the ribbon (proportional track blocks + ▲ cue / ◆ move markers
> on a shared time axis; *merged PR #19, **deployed 2026-06-12**, Worker `ca91c8c5`*). **Slice 11** makes
> the timeline's blocks + markers **clickable/keyboard-selectable** (open a track in the inspector,
> cross-highlight its row; *merged PR #21, **deployed 2026-06-13**, Worker `755e3489`*). **Slice 12** makes
> a cue/move **marker click focus its row** in the inspector (*merged PR #23, deployed, Worker `802ebe48`*).
> **Slice 13** adds a **custom-moves manager** (rename / description / delete via a dialog from the Moves
> section; web-only over the existing `/user-moves` routes; *merged PR #25, **deployed 2026-06-13**, Worker
> `cc437560`*). **Slice 14** adds the signature **on-beat pulse** — the Live "Now" cue card breathes on the
> track's beat (CSS, reduced-motion-safe; *merged PR #27, **deployed 2026-06-13**, Worker `9a298d21`*).
> **Slice 15** adds the All-Out **"drop"** — a plasma glow bloom + cue crossfade on all-out cue advances in
> Live (CSS, reduced-motion-safe; *merged PR #29, **deployed 2026-06-13**, Worker `c3a502c0`*). **Slice 16**
> adds the **segment band** — a new `class_sections` table (**migration `0006`**) + fixed `segmentType` enum,
> full-stack (shared + CRUD routes + additive run-payload `sections[]` + a `SegmentBand` under the timeline);
> this is the first builder slice that **does** change schema + contract (*merged PR #31, **deployed
> 2026-06-13**, Worker `14d363cf`; remote D1 migrated to `0006`*). Slices 7–15 were no schema/API/shared change.
> **Slice 17** adds **stable cue/move `id`s to the run-payload** — an **additive** contract change (no
> schema/migration; `schemaVersion` stays 1) so the timeline marker→row focus correlates by id and two
> cues/moves at the same `anchorMs` disambiguate (closes the slice-12/16 caveat) — and hardens the
> contract iOS Phase 2 consumes; `pnpm test` = api 159 + web 49 = **208** (*merged PR #33, **deployed
> 2026-06-13**, Worker `7edfda8a`, no schema/migration*).
> Deferred: the planning-timeline pulse, the playhead/tap-to-seek, segment icons/drag-resize, custom-move
> `baseMoveId`/`template` editing, and a run-payload `id` on `sections[]` (symmetry, if iOS wants it). See
> `milestones.md` for the full slice log.
>
> **Music frontend (the "M2 frontend") complete + deployed (2026-06-13).** M2's provider backend had
> shipped with **no UI** (tracks were hand-typed as Title/Artist/ms); that gap is now closed. **S1**
> track search → import → add (provider-picked, debounced, 44px song cards); **S2** provider-connection
> settings (connect/disconnect, clear states); **S3** "search my likes" (token-spending); **S4** a BPM
> lookup button. Then, when real credentials were first set, two **prod-only** bugs surfaced (the mock
> path never exercised live `fetch`/limits) and were fixed: a Workers `Illegal invocation` from passing
> the **bare global `fetch`** to adapters (→ a bound `fetch` wrapper) and **Spotify rejecting `limit=25`**
> with 400 "Invalid limit" (→ 10); provider failures now also map to **502** (typed `ProviderError`), not
> 500. **All three providers verified live in prod** (SoundCloud / Spotify / Apple Music — real search +
> import + album art; secrets set via `wrangler secret`, Apple developer-token minted by the new
> `apps/api/scripts/apple-dev-token.mjs`). `pnpm test` = api 159 + web 53 = **212**. PRs #35–#37; latest
> Worker after the error-mapping fix. **Open:** SoundCloud per-user *Connect* OAuth round-trip needs the
> redirect URI registered + a browser login to confirm (provider *search* via app-token is verified).
>
> **Next major milestone: iOS Phase 2** (the native live surface in `ritmofit-ios`, against this same
> backend/run-payload). The web *backend* build order is done; the web *UI* design-system build continues.
>
> **Web hardening — track-duration Live guard deployed (2026-06-14).** PR #49 adds
> class-specific `class_tracks.duration_ms_override` (migration `0010`), letting owners/editors repair an
> unknown or incorrect provider/library duration without mutating another user's private track.
> Sequencing, anchor validation, copies, and the run-payload use the effective duration
> (`override ?? track.duration_ms`). The builder labels missing durations, offers an `m:ss` correction
> in the inspector, and blocks Live mode until every track has a positive duration. Unit/component
> tests (241), Worker/D1 integration tests (17), CI, and fresh-D1 migration verification passed.
> Remote D1 was migrated through `0010` before Worker
> `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` deployed at 100%. Health, SPA, auth enforcement,
> security-header, main-bundle, and Live-mode chunk smokes passed.

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
| [`close-session-checklist.md`](./close-session-checklist.md) | End-of-session runbook — say "run the close-session checklist" |
