# Decisions

Every locked decision, why it was made, and what we traded off. If you're considering changing one,
read the rationale first — several were chosen to avoid expensive retrofits. Where this synthesis
resolved a disagreement between the two source drafts, that's called out as **[Resolved]**.

---

## D1 — We own the account system

**Decision:** The backend has a canonical `users` table; Apple/Google/email are purely
identity-verification methods.

**Why:** An instructor needs one stable identity across iOS and web, and across playback providers.
Provider-agnostic *tracks* only make sense if the *account* is provider-agnostic too. With Better Auth
storing its tables in **our D1**, "owning the users table" is literal — not synced from an external
auth SaaS via webhook.

---

## D2 — Cloudflare-native platform: Workers + D1 + Workers static assets  **[Resolved]**

**Decision:** The API is a **Hono app on a Cloudflare Worker**; the database is **Cloudflare D1**
(SQLite); the web SPA is served as **Workers static assets from the same Worker as the API** (single
origin). *(Original plan considered a separate Cloudflare Pages site; in production we instead serve the
built SPA from the API Worker — `[assets]` in `wrangler.toml` with `run_worker_first=["/api/*"]` — so
SPA and API share one origin and the session cookie stays first-party. No separate Pages site.)*

**Why:**
- `ritmofit.studio` is already on Cloudflare DNS; staying on one platform keeps DNS, compute, DB, and
  static hosting in one account with one deploy story.
- **D1 binds directly to the Worker** — no connection-pooling or driver-over-HTTP problem. (This is the
  deployment gap the Postgres alternative left open: a Worker talking to managed Postgres needs
  Hyperdrive or a pooler. D1 sidesteps it entirely.)
- Lowest latency (DB co-located with compute at the edge), generous free tier, one vendor to reason
  about for a small team.

**Tradeoff considered — and how we cover it:** The Postgres/Supabase alternative would have handed us
managed Sign in with Apple (token rotation, private-relay emails) for free. By going CF-native we take
auth on ourselves — so we **do not hand-roll it**: we use **Better Auth** (D2a) which handles the
Apple/Google token dance on Workers+D1. We also lose Postgres niceties (RLS, richer SQL); the sharing
**union query** is simple enough in SQLite (see [`authorization.md`](./authorization.md)), and the
absence of RLS just means the app-level authz helper is the single gate — which we wanted anyway.

---

## D2a — Better Auth for the auth layer  **[Resolved]**

**Decision:** Use **Better Auth** with its D1/Drizzle adapter for email, Apple, and Google sign-in;
sessions and OAuth account links live in our D1.

**Why:** Sign in with Apple is the most expensive thing to get wrong (token rotation, private-relay
email handling) and the most common place hand-rolled auth breaks. Better Auth is Workers-compatible,
stores its tables in our own database (satisfying D1), and keeps us off external auth SaaS. If Better
Auth ever proves to be friction on Workers, the fallback is a minimal custom session system (hashed
session tokens in D1, secure HTTP-only cookies) — but we try the managed-library path first.

**Tradeoff:** A dependency in the auth-critical path. Accepted, because the alternative (hand-rolling
Apple token rotation) is riskier than the dependency.

---

## D3 — TypeScript everywhere (backend + web), Hono + Drizzle + React/Vite

**Decision:** One language across backend and web. Backend = Hono on a Worker. ORM = Drizzle. Web =
React + Vite SPA. Monorepo with a shared package.

**Why:**
- Shared types: `Class`, `Cue`, `Move`, `TrackRef` defined once in `packages/shared`, used by API and
  web. For a small team this roughly halves the mental surface area.
- **Hono over tRPC:** iOS (Swift) is also a client and can't consume tRPC ergonomically. A plain
  REST/OpenAPI surface gives both clients a documented contract. Hono is lightweight and a first-class
  Workers citizen.
- **Drizzle over Prisma:** TypeScript-native, generates readable SQL, drops to raw SQL when the
  timeline/sharing queries get gnarly, and has a clean D1 driver.
- **Vite SPA, not Next.js:** the planning tool sits behind a login; no SSR needed; a plain SPA is
  simpler and deploys as static assets on Cloudflare.

**Tradeoff named:** iOS (Swift) and this backend (TypeScript) don't share code — iOS consumes the
generated OpenAPI spec and maintains its own types. Unavoidable with a native client; explicit, not a
problem.

---

## D4 — Provider-agnostic tracks

**Decision:** A `track` is the abstract song; `track_provider_ids` attaches one row per provider
(Spotify / Apple Music / SoundCloud) with that provider's ID and optional URI.

**Why:** Supports "play through whichever app the instructor opens live." The same song resolves to a
Spotify URI at one studio and a SoundCloud URL at another. Schema-modeled in M1 (cheap now, painful to
retrofit) even though provider *API calls* are M2.

**Tradeoff:** More join complexity up front and a same-song matching problem later. Accepted.

**M1 ownership (resolved in audit):** tracks are a **per-user library**, not global singletons — `tracks`
carries `owner_user_id` and only the owner may edit a track. This avoids the multi-tenant footgun where
one user editing a shared global track silently mutates another user's class. Because tracks are
hand-entered in M1 with no provider IDs to match on, **duplicates across users are accepted**;
**cross-user track identity / ISRC dedup is deferred to M2**, when provider IDs give a stable matching
key. Provider-agnosticism is still modeled now (`track_provider_ids`); only *de-duplication* waits.

---

## D5 — Teams are many-to-many

**Decision:** `team_memberships` join table; a user belongs to many teams, a team has many users.

**Why:** Instructors freelance across studios. Cheap to model now, expensive to retrofit. **Schema in
M1; team/membership routes built later in the milestone** (routes-lean — see D9).

---

## D6 — Classes belong to one user; sharing is layered (Google Drive model)

**Decision:** A `class` has exactly one `owner_user_id`. Access for others comes from a separate
`shares` table, which targets a single user *or* a whole team.

**Why:** Ownership stays simple and unambiguous (always one owner). Sharing is additive and revocable
without touching ownership — like sharing a Drive file. Cleaner than "classes live in team libraries."

**Tradeoff:** "List my classes" becomes a union (owned ∪ shared-directly ∪ shared-via-team). Fine at
our scale; a deliberate query shape in [`authorization.md`](./authorization.md).

---

## D7 — Cues and Moves are separate, anchored per-class

**Decision:** `cues` and `class_track_moves` are distinct tables. Both attach to a `class_track` (a
track *in a class*), not to the global `track`. Both anchor to `anchor_ms` (+ optional beat/bar).

**Why:** Choreography depends on class context — the same song can have different cues in two classes.
Anchoring to `class_track` reflects how instructors actually work.

**Fork to be aware of:** because choreography lives on `class_track`, reusing a track in another class
does **not** auto-carry its cues/moves. "Copy a track across classes *with* its tags" is an explicit
**copy operation** (`POST /class-tracks/:id/copy`), not a side effect. Making choreography global to a
track would be a real schema change — revisit deliberately.

---

## D8 — Moves library (global + user) vs move placements  **[Resolved]**

**Decision:** Reconcile the two drafts' different "move" models into two layers:
- **Library** — `moves` (global seed: Climb, Sprint, Jog, Tap Back, Push, Recovery) + `user_moves`
  (a user's custom moves / personal coaching language, optional `base_move_id` → `moves`).
- **Placement** — `class_track_moves` is a *timeline instance* on a `class_track` (anchored by
  `anchor_ms`, optional intensity) that references a library move (`move_id` or `user_move_id`) or
  carries a freeform name.

**Why:** One draft treated "move" as a reusable named exercise (a library the picker pulls from); the
other treated it as a timeline marker. Both are real and the product needs both — the design system's
MovePicker shows "global moves first, user moves second," and the timeline shows placed move markers.
Custom user language ships from v1 because instructors have personal phrasing.

**Tradeoff:** Two tables where a naive model has one. Worth it: the library enables reuse and the
picker; the placement enables the timeline. `cues` stay separate (coaching prompts with text + color),
visually distinct from move markers on the timeline.

---

## D9 — M1 is schema-complete but routes-lean  **[Resolved]**

**Decision:** Model the expensive-to-retrofit relationships in M1 (provider-agnostic tracks,
many-to-many teams, owner+shares, cues/moves on `class_track`). But **build the routes in
builder-first order**: class + class_track + cues + moves end-to-end (with a **mock-track seam**)
*before* team/membership/share routes.

**Why:** Splits the two source drafts' disagreement at the right seam. One draft front-loaded all
teams/sharing routes in M1; the other deferred teams from the schema entirely. Schema is cheap to get
right now and costly to migrate later — so we keep it complete. Routes/UI are where premature surface
hurts — so we sequence them behind the core builder, which is what actually validates the product.

---

## D10 — Milliseconds everywhere for time  **[Resolved]**

**Decision:** All time-into-a-track and timeline offsets are integer **milliseconds**: `anchor_ms`
(cues/moves), `start_offset_ms` (class_track on the class timeline), `duration_ms` (tracks),
`target_duration_ms` (classes). One draft used seconds for offsets and ms for anchors — we standardize
on ms to avoid unit bugs at the boundary. Wall-clock ms is the provider-independent default; revisit
beat-grid alignment only when the live iOS player needs it.

---

## D11 — BPM is manual in M1; playback is external

See [`music-providers.md`](./music-providers.md). Summary: Spotify BPM is unavailable to new apps
(deprecated Nov 2024), so BPM is hand-entered in M1 (`tracks.display_bpm`, optional
`class_tracks.display_bpm_override`); an optional third-party provider may come in M2. The app is a
planning surface; audio plays through the user's own provider apps; we never cache audio or
platform-derived data.

---

## D12 — Versioned run-payload as the iOS live contract  **[Resolved, adopted from the ChatGPT draft]**

**Decision:** Provide `GET /classes/:id/run-payload` — a single, versioned response containing
everything needed to run a class live (class + ordered tracks + provider refs + cues + moves). Hardened
in M3.

**Why:** The iOS live app runs on a bike in a studio, possibly on flaky wifi. Fetching a class as one
self-contained payload beats composing the live view from a dozen granular calls. The granular REST
endpoints still exist for editing; run-payload is the read-optimized live contract.

---

## Cut from M1 (flagged, not built)

- **Segments / class sections.** *(Cut from M1; **shipped later**.)* In M1 segments were a design
  concept only — no `class_sections` table. They were added in the design-system builder build
  (**slice 16, migration `0006`**, PR #31) as a `class_sections` table with a fixed `segmentType` enum
  (`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`) plus an additive run-payload `sections[]`
  (`schemaVersion` stayed 1). See `milestones.md` slice 16. *(So this is no longer "don't invent the
  table" — the table exists; build against it.)*
- **`class_snapshots`** (history/restore/iOS cache) — revisit when versioning is a real requirement.
- **`color_role` on class_tracks** — color belongs to the design layer, not the data model. (`color`
  on a *cue* stays — the design system uses it for visual cue tagging.)
