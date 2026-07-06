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

**Current product status (2026-07-05):** D20 keeps this scaffolding but makes Teams dormant. Do not
surface, polish, or expand team workflows unless the owner explicitly reopens community/collaboration
work.

---

## D6 — Classes belong to one user; sharing is layered (Google Drive model)

**Decision:** A `class` has exactly one `owner_user_id`. Access for others comes from a separate
`shares` table, which targets a single user *or* a whole team.

**Why:** Ownership stays simple and unambiguous (always one owner). Sharing is additive and revocable
without touching ownership — like sharing a Drive file. Cleaner than "classes live in team libraries."

**Tradeoff:** "List my classes" becomes a union (owned ∪ shared-directly ∪ shared-via-team). Fine at
our scale; a deliberate query shape in [`authorization.md`](./authorization.md).

**Current product status (2026-07-05):** D20 keeps this access scaffolding but removes sharing from the
current user-facing product. The solo library should feel owned and personal; old share rows may remain
reachable through backend scaffolding, but agents should not build new sharing UX now.

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
- **Library** — `moves` (global seed: Climb, Sprint, Jog, Tap Back, Push, Recovery, … — full seed list in `schema.md`) + `user_moves`
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

## D11 — BPM is manual; playback is provider-authorized  **[Amended by D19, 2026-07-02]**

See [`music-providers.md`](./music-providers.md). Summary: Spotify BPM is unavailable to new apps
(deprecated Nov 2024), so BPM is hand-entered in M1 (`tracks.display_bpm`, optional
`class_tracks.display_bpm_override`); an optional third-party provider may come in M2. Ritmo Studio may
control playback inside the web app only through official provider-authorized SDKs/widgets. We never
cache audio, derive provider analysis, or treat provider playback as audio we own.

---

## D12 — Versioned run-payload as the iOS live contract  **[Resolved, adopted from the ChatGPT draft]**

**Decision:** Provide `GET /classes/:id/run-payload` — a single, versioned response containing
everything needed to run a class live (class + ordered tracks + provider refs + cues + moves). Hardened
in M3.

**Why:** The iOS live app runs on a bike in a studio, possibly on flaky wifi. Fetching a class as one
self-contained payload beats composing the live view from a dozen granular calls. The granular REST
endpoints still exist for editing; run-payload is the read-optimized live contract.

---

## D13 — Permanent non-goals: provider playback control, not audio ownership or a DAW  **[Amended by D19, 2026-07-02]**

> Original D13 item 1 read "no in-app audio playback / streaming — Ritmo Studio never plays tracks
> itself; it deep-links / hands off to the provider app." **D19** supersedes that half: official
> provider-authorized in-app playback is now allowed. Items 2–4 and the no-audio-ownership boundary
> are unchanged.

**Decision:** The following are **permanent product non-goals** — not "later milestones." They are
ruled out by the music-provider constraints ([`music-providers.md`](./music-providers.md)) and by the
product's purpose (synthesize *planning + choreography* with provider-authorized playback, not own audio
or become a production tool). A feature request that requires one of these should be **declined or
redesigned**, not scheduled.

1. **No Ritmo Studio-owned audio playback / streaming.** Ritmo Studio may control playback through official
   Spotify / Apple Music / SoundCloud SDKs/widgets, but the provider owns the audio stream,
   authorization, subscription checks, and availability. Ritmo Studio never downloads, proxies, caches,
   re-hosts, or serves provider audio. *(music-providers.md #2/#3.)*
2. **No audio mixing / crossfade between tracks.** We do not mix, beatmatch, or crossfade audio.
   Free-placement deliberately **rejects overlaps** for this reason: a class is a single playback
   timeline, and any provider-native gapless behavior remains provider-owned. *(music-providers.md #2.)*
3. **No destructive audio editing.** "Trimming" sets a per-class **playback window**
   (`clip_start_ms` / `clip_end_ms`), never an edit to the source file; there is no waveform/DSP layer.
   Ritmo Studio is not a DAW — the editing-granularity work (trim / beat-snap / free placement) raises
   *choreography* control, and stops short of audio production on purpose
   (see [`editing-granularity-scoping.md`](./editing-granularity-scoping.md)).
4. **No in-app audio analysis / decoding pipeline.** We do not decode or analyze audio to derive
   tempo/beat data. BPM is **manual** (`display_bpm` / `display_bpm_override`) or, optionally, from a
   dedicated third-party tempo service (M2); the beat grid's downbeat is **hand-marked**
   (`beat_anchor_ms`). *(music-providers.md #1/#3.)*

**Why:** These aren't backlog items waiting for capacity — they're platform/legal realities
(provider terms) and a scope boundary (provider playback control vs. audio ownership/production).
Listing them as locked decisions stops each one from being re-proposed as "just one more feature" and
keeps the build honest about what Ritmo Studio is.

**Revisit only if** the underlying provider terms materially change (e.g. a license that permits
first-party hosting, mixing, or derived audio), in which case treat it as a new, deliberately-scoped
initiative — and update [`music-providers.md`](./music-providers.md) first. Adjacent capabilities that
are *not* ruled out: official provider-authorized in-app playback
([`provider-playback-implementation.md`](./provider-playback-implementation.md)), beat-snapping a
dragged track start, carrying `timeline_mode` through whole-class copy, and per-track time signatures.

---

## D14 — RPM (cadence) + Holds per track  **[Resolved 2026-06-24, from the mockup-parity audit]**

**Decision:** Model **RPM** (pedal cadence) and **Holds** per track, surfaced on builder track rows and
the Live HUD (the mockup shows "118 RPM · 3 Holds" per row). RPM is a **manual per-track field**, kept
**distinct from BPM** — cadence ≠ music tempo (an instructor may pedal at half-time), so it is not
derived from `display_bpm` (cf. D11).

**Why:** Cadence is core spin-instructor language; the audit found prod models only BPM. The owner
chose to add it.

**Tradeoff:** New schema field(s) + builder/Live UI + a run-payload addition. The **Holds**
sub-question (derived count vs. manual field) was **settled as Option B — a manual per-track
`hold_count`** (null = unset, `0` = "no holds"), shipped end-to-end (schema, shared contract,
run-payload; PR #110). Keep RPM and BPM visually distinct so they're never conflated.

---

## D15 — Public marketing landing page  **[Resolved 2026-06-24]**

**Decision:** Build a public **marketing landing** at `/` (mockup `marketing.html`); sign-in becomes
secondary. Signed-out users see the landing, not the Login form directly.

**Why:** The owner wants a public front door for traction. (At decision time the signed-out gate in
`App.tsx` rendered `<Login>` straight away; the landing has since **shipped** —
`apps/web/src/components/MarketingPage.tsx`, the signed-out front door at `/`.)

**Tradeoff / note:** A marketing page wants SEO/pre-render, which lightly tensions with **D3** ("Vite
SPA, no SSR — the tool sits behind a login"). Resolve by **pre-rendering / serving the landing route as
static** (the Worker already serves static assets) rather than adopting full SSR/Next. Expands the
client routing + the signed-out branch in `App.tsx` (`KNOWN_PATHS`).

---

## D16 — Save model: auto-save + status indicator (not staged)  **[Resolved 2026-06-24]**

**Decision:** Keep **silent auto-save** (the current optimistic-write model) and add a subtle
**saving/saved status indicator**. Do **not** adopt the mockup's staged Save/Discard.

**Why:** Auto-save is lower-friction and already implemented across the builder's many independent
writes; an indicator delivers the mockup's "CLASS SHAPE SAVED" reassurance without a builder-state
rework.

**Tradeoff:** Needs one lightweight global save-status signal the per-field writes feed into; minor.

---

## D17 — Intensity vocabulary = spin zones (Build/Push/Attack/All Out)  **[Resolved 2026-06-24]**

**Decision:** Adopt **zone vocabulary** for the five intensity levels, matching the current mockups:
**Z0 None · Z1 Build · Z2 Push · Z3 Attack · Z4 All Out**. This is **display-layer only** — keep the
enum `none/easy/mod/hard/all_out` (`packages/shared` + DB) **unchanged** (no migration); change
`INTENSITY_LABEL` in `IntensityReadout.tsx` and optionally surface the `Z0–Z4` number. Supersedes both
the prod effort labels (easy/moderate/hard) and the design-system "movement" labels
(Arrival/Rise/Drive/Recover/Release).

**Why:** Spin-native and evocative; aligns prod to the latest mockups. The owner's call among three
competing vocabularies that had drifted apart.

**Tradeoff:** Backward-compatible (labels only). Pairs with flipping the intensity control from a
raw-enum dropdown to a labeled **segmented control** (mockup-parity backlog), and updating the design-system
rhythm/intensity doc to name the zones canonically.

---

## D18 — "Spotify for instructors": full surface parity (web ↔ iOS)  **[Resolved 2026-06-24; superseded for current planning by D20, 2026-07-05]**

> **Current status:** D20 pauses this as a hard product gate. Keep the contract/design sync lessons, but
> current web work is no longer blocked by landing the same capability on iOS or by tracking parity debt.
> D20 also removes Explore, sharing, and teams from the active core capability set.

**Decision:** Web and iOS are **two complete, co-equal surfaces of one product** — not a "planning
surface" and a "live surface." Every core instructor capability — **build & choreograph** a class,
**library**, **multi-provider search**, **explore**, **sharing/teams**, **and running a class live** —
exists on **both**, expressed in **each platform's native idiom** (iOS gestures + bottom tab bar; web
sidebar + keyboard). A surface may *lean* toward a context (web comfortable at a desk, iOS in the room),
but is **never capability-limited**. This **supersedes** the earlier asymmetric-surfaces framing in
`overview.md`, `DEVELOPMENT_PLAN.md`, and `08-ios-web-alignment.md`.

**Why:** The product promise — "Spotify for instructors" — is that you pick up either device and do
*everything*, intuitively. Spotify mirrors its core loop across mobile/desktop/web (platform-idiomatic,
not byte-identical); Ritmo Studio holds the same bar. Concretely, **the iOS app is iPhone-only**, so web is
today the *only* good large-screen / tablet / Android live surface — a presenter-only web would leave
every non-iPhone live scenario half-served.

**Former enforcement (paused by D20):** No feature merges on one surface without the same capability
landing on the other **or** a tracked, linked parity item on the other surface. **Existing asymmetries
are treated as defects**, worked down ahead of most net-new feature work. Mechanics, sync points, the
current parity backlog, and the documented exceptions live in
[`web-ios-parity.md`](./web-ios-parity.md).

**Documented exceptions (allowed divergence):** genuinely platform-bound affordances only — iPhone
haptics, lock-screen / Now-Playing integration, and motion/ambient sensing remain iOS-only. A
second-screen "presentation/cast" view (laptop → TV) is a web-leaning *enhancement*, not a limiter.
"UX expression" is **platform-idiomatic**, not a unified pixel-identical UI.

**Tradeoff:** Overturns the original asymmetric architecture; implied sizable near-term parity work in
**both** directions. Web's core live-run surface has since shipped. The current operating sequence is web
launch readiness first, then iOS catch-up for builder/library/search/explore/sharing and additive
run-payload fields; future web live work is framed as enhancement rather than the core parity gap. This
raises cross-repo coordination cost (two clients, one contract), accepted as the cost of the core
promise. **Open follow-on (not now):** iPad as a first-class iOS target — today the principle leans on web
to cover iPad.

---

## D19 — Provider-authorized in-app playback  **[Resolved 2026-07-02]**

**Decision:** Ritmo Studio may control music playback **inside the app**, exclusively through **official
provider-authorized mechanisms**: the Spotify Web Playback SDK / Connect playback (Premium required),
Apple Music MusicKit on the Web (subscriber authorization required), and the official SoundCloud
Widget API. One Ritmo Studio player surface, provider-specific adapters underneath; the provider owns the
audio stream, authorization, subscription checks, and availability — Ritmo Studio owns the class timeline,
playback windows, and provider choice. Implementation plan:
[`provider-playback-implementation.md`](./provider-playback-implementation.md).

**Why:** Sending an instructor to a provider app mid-class breaks the core promise (one continuous
creative/performance surface), and official browser SDKs/widgets now provide a terms-compliant path.
This is the deliberately-scoped initiative D13's revisit clause called for.

**Supersedes:** the playback halves of **D11** ("playback is external") and **D13 item 1** ("no in-app
audio playback/streaming — deep-link/hand-off only"). Provider handoff links remain only as a
recovery/fallback affordance, not the primary path.

**Explicitly unchanged:** everything else in D11/D13 and `music-providers.md` — no downloading,
proxying, caching, re-hosting, remixing, mixing, crossfading, beatmatching, decoding, analyzing, or
derivative provider audio; no BPM from Spotify; "shortening a song" stays a saved **playback window**
(`clip_start_ms` / `clip_end_ms`), never an edited audio asset; disconnect-purge behavior intact.

**Token boundary:** stored provider tokens are still never returned to clients. The single documented
exception is short-lived, provider-scoped **browser playback credentials** an official SDK requires —
minted per session, never logged or persisted client-side, never used for catalog/BPM shortcuts.

**Tradeoff:** entitlement-gated UX (Premium/subscriber checks, per-provider availability states),
expanded Spotify OAuth scopes with a reconnection path, and later iOS follow-up when native refinement
resumes. The current web slice should optimize rehearsal and Live Mode first; iOS parity is not a
present gate under D20.

---

## D20 — Solo-first creator reset: web first, community later  **[Resolved 2026-07-05]**

**Decision:** Ritmo Studio's current product is solo-first and web-first. It helps **individual rhythm
fitness instructors** build, choreograph, organize, rehearse, and run their own classes in one
continuous creative flow. The current core disciplines are rhythm cycle, Pilates, and HIIT. Web is the
product-definition surface now; the iOS app should follow later from the proven backend contract,
creative loop, and UX decisions.

**Doctrine:** Perfect the individual creator experience until instructors naturally want to share,
publish, and collaborate. Community features come later because the solo workflow has earned them, not
because the app assumes them.

**Creative-flow rule:** Do not force a single workflow. An instructor may start from "I have a standard
45-minute class Monday," "I need a Burn 30-minute ride," a specific song, a movement idea, an energy arc,
or a rehearsal need. The app should support finding the right songs, choreographing, organizing,
rehearsing, and running Live Mode without imposing one canonical order.

**Deferred surfaces:** Teams, invites, collaborators, public class pages, publishing flows, social
discovery, marketplace/community browsing, Explore, sharing UX, and share links are deferred until the
owner explicitly reopens them.

**Scaffolding retained:** The database schema, migrations, shared contracts, API routes, authorization
helpers, and some web components for teams/shares/public visibility/Explore may remain for now. Preserve
them as dormant scaffolding; do not delete or expand them in this reset. The current web app should hide
those user-facing surfaces and bias toward the caller's own personal library.

**Supersedes:** The active planning parts of D18 that made Explore/sharing/teams core capabilities and
made iOS parity a hard gate for current web work. D18 remains useful historical context for contract and
design sync, but it is not the current product gate.

**Why:** The app will be more valuable if the solo instructor loop is excellent before it becomes social.
The owner wants the web app dialed in near-perfectly first; that should make later iOS development and
refinement straightforward because the core loop and contract will already be proven.

**Tradeoff:** Previously shipped social/community scaffolding stays in the repo and backend. That can
create confusing affordance drift if future agents polish or expose it accidentally, so docs and UI must
label it dormant/deferred. Direct API access may still exist until a later hard-removal or migration
slice; that is accepted for this hybrid reset.

---

## D21 — Creator workstation shell over trusted music services  **[Resolved 2026-07-06]**

**Decision:** Ritmo Studio is a **creator workstation shell over trusted music services**. Spotify, Apple
Music, and SoundCloud are the reliable music **substrate**; Ritmo adds the instructor-specific layer —
class structure, choreography, rehearsal, playback windows, readiness, and Live Mode. Provider libraries
are the **raw material**; class-building is the **creative layer on top**. Ritmo started as a choreography
app with music references; it is becoming a familiar music workstation where provider libraries are the
raw material and class-building is the creative act on top.

**Creative principle — familiar before specialized:** The app should feel *familiar before it feels
specialized*. An instructor can browse, listen, inspect playlists, and follow curiosity **without being
forced into one creation flow** — then convert that curiosity into a class. This extends D20's
creative-flow rule (no single canonical order) to the *entry* of the loop: discovery is a first-class
on-ramp, not a detour.

**Player evolution (the shift that motivates this).** The original model was **handoff-oriented**: Ritmo
owned the choreography/timeline and sent users to a provider app or link for audio; Live Mode was mostly a
prompter and class clock. That changed in two steps:

1. **D19** allowed **provider-authorized in-app playback** through official SDKs/widgets only. Ritmo still
   never owns, caches, analyzes, mixes, or crossfades provider audio, but it can control playback windows
   through MusicKit on the Web, the SoundCloud Widget API, and (later) the Spotify Web Playback SDK.
2. The player becomes part of a broader **music-service shell**. It is no longer just "play this class
   live." The direction is: browse provider libraries inside Ritmo; open liked tracks and playlists like a
   music app; preview/listen while building; convert musical curiosity into class creation; and run Live
   Mode with provider playback, preflight, auto-advance, and recovery states.

**Current web-desktop slice (first implementation of the doctrine).** The next web slice makes the shell
concrete. These are locked product decisions for that slice:

- **Templates narrow to three.** Show only **Cycle**, **Pilates**, and **HIIT** as class templates.
  **Pilates maps to the existing `sculpt` enum value** for now — display-layer only, no migration (the
  same label-only pattern as D17); the stored enum (`cycle`/`hiit`/`sculpt`/`tread`) and the move-library
  grouping are unchanged, and legacy `tread`/`sculpt` classes still render their labels.
- **Require a template before a new class is created** — but only at the **create-class entry point**.
  Copy-class and Songs-by-Move deliberately create untemplated classes because they derive from an
  existing source; the requirement is on the "new blank class" path, not the whole API.
- **Replace unclear/empty workspace states with class readiness plus music discovery.** When no class is
  open, the workspace's resting state is the readiness/next-step surface and the discovery shell — not an
  empty panel (design principle 8: alive at rest).
- **Add provider shelves** for Spotify, Apple Music, and SoundCloud, and include **each service's
  liked/saved tracks card**.
- **Playlist cards open a playlist detail / track list, not an immediate import.**
- From a playlist/detail view, users can **browse/listen first, then `Start class` or `Add selected`.**

**Relationship to existing decisions.** D21 **builds on** and does not supersede D19 (provider-authorized
playback) or D20 (solo-first, web-first); it names the product frame those decisions serve. The
design-system Library guidelines (`ritmofit_design_system/11-library-guidelines.md`) already specify this
surface (a source rail of liked tracks / saved playlists / recent imports / provider filters, a low-noise
track list, and a selection tray); D21 makes that surface the near-term web target and the workspace's
resting state. The **hard music constraints are unchanged** (`music-providers.md`; D11/D13 as amended by
D19): browsing and previewing happen **only** through provider-authorized SDKs/widgets, and Ritmo never
downloads, caches, proxies, mixes, or derives provider audio, and never takes BPM from Spotify.

**Contract / scope note for implementers.** Today's backend already supports catalog **search**, per-user
**likes** (all three providers), single-track **import**, and **Spotify playlist-URL import** (straight
into a class). Two pieces of the slice need **new read surfaces** and should be sequenced as their own
sub-slice: (a) **listing a user's saved playlists** per provider, and (b) **browsing a playlist's tracks
without importing** (the adapter's `getPlaylist` exists for Spotify; SoundCloud needs permalink
`/resolve`, Apple Music has no path yet) — each needs shared contracts + API routes + adapter methods +
tests + OpenAPI regen. **In-list preview** reuses the D19 playback stack
(`apps/web/src/lib/playback/*`, `TrackPreview.tsx`) extended to a not-yet-imported candidate. See
`provider-playback-implementation.md` → "Music-service shell direction (D21)."

**Why:** The solo loop is more valuable when it starts from *familiar music behavior* — the browsing and
listening instructors already do on Spotify/Apple/SoundCloud — and converts it into classes, instead of
demanding a cold "name a class, then fill it" start. The providers are the dependable substrate; Ritmo's
durable value is the instructor layer on top.

**Tradeoff:** Entitlement-gated discovery UX (connect/subscriber states per provider), new provider
read-surfaces with their upstream-quota and no-caching handling, and a browse-first on-ramp layered onto
the existing "a class *is* playlist + choreography" model (D6/overview) without weakening it — the
discovery surface always points at a create action, never a passive feed (design principle 1).

---

## Deferred from M1

- **Segments / class sections.** *(Deferred from M1; **shipped later**.)* In M1 segments were a design
  concept only — no `class_sections` table. They were added in the design-system builder build
  (**slice 16, migration `0006`**, PR #31) as a `class_sections` table with a fixed `segmentType` enum
  (`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`) plus an additive run-payload `sections[]`
  (`schemaVersion` stayed 1). See `milestones.md` slice 16. *(So this is no longer "don't invent the
  table" — the table exists; build against it.)*
- **`class_snapshots`** (history/restore/iOS cache) — revisit when versioning is a real requirement.
- **`color_role` on class_tracks** — color belongs to the design layer, not the data model. (`color`
  on a *cue* stays — the design system uses it for visual cue tagging.)
