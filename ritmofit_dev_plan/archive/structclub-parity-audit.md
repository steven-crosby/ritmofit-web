<!-- note (Claude, 2026-06-24): Relocated from the untracked workspace root into the web repo so it's version-controlled. Point-in-time competitive audit; live forward work is in web-ios-parity.md. -->
<!-- note (Codex, 2026-06-28): Archived during web-launch-readiness refactor. Active StructClub-derived launch checks and deferrals now live in ../web-launch-readiness.md; this file is provenance only. -->

# RitmoFit Web — StructClub Feature-Parity Audit

> **Point-in-time competitive audit** (vs. the StructClub iOS app). Forward work distilled from it is
> tracked in [`web-ios-parity.md`](../web-ios-parity.md). This file is the captured analysis, not a live backlog.

**Date:** 2026-06-24
**Subject:** `ritmofit-web` (planning surface at https://ritmofit.studio) vs. **StructClub** iOS app
**Reference:** 8 StructClub screenshots in `structclub screenshots/`
**Method:** Full code + docs audit of `ritmofit-web`, **plus a live walkthrough** of every authenticated
surface on production (signed in as the owner, built + ran a throwaway class, then deleted it).
**Scope (per direction):** All StructClub surfaces including live. Constraint-conflicting features are
treated as real gaps **but flagged** where a recommendation collides with a locked RitmoFit constraint.

---

## 0. Read this first

**The product DNA already matches.** RitmoFit is explicitly built as a StructClub competitor for rhythm
instructors (the dev plan names StructClub directly). The data model and builder are, if anything, *more*
capable than StructClub's. The parity gaps are concentrated in **(a) two production outages, (b) discovery/
library presentation, and (c) one missing create-path ("Songs by Move")** — not in core choreography.

**Architecture note that reframes several "gaps":** StructClub is **one mobile app** that fuses planning +
live playback. RitmoFit deliberately splits these — `ritmofit-web` is the **planning** surface, the native
**iOS app is the live** surface, and both share one backend. So some StructClub features (notably the
in-app Spotify transport bar) are a deliberate architectural divergence, not an oversight.

### 🔴 Headline finding (from the live drive — not visible in code review)

**Two shipped surfaces are completely broken on production right now:**

| Endpoint | Result on prod | Impact |
|---|---|---|
| `GET /api/v1/explore?limit=30&offset=0` | **404 `NOT_FOUND`** | The entire **Explore** feed errors ("Not found.") |
| `GET /api/v1/teams` | **404 `NOT_FOUND`** | The entire **Teams** surface errors ("Not found.") |

Every M1–M3 route works fine (`/classes`, `/class-tracks/*/cues`, `/moves`, `/sections`,
`/providers/*/search`, `/providers/track-import`, `/run-payload`, …). Only the routers mounted **after
`mockRoutes`** 404.

**ROOT CAUSE (diagnosed + fixed 2026-06-24 — it is a code bug, not a stale deploy).** The routes *are*
deployed (confirmed by grepping the live Worker bundle). The dev-only mock seam in
`apps/api/src/routes/mock.ts` registered its "disabled in production" gate as `mockRoutes.use('*', …)`.
Because `mockRoutes` is mounted at the api root (`api.route('/', mockRoutes)` in `index.ts:142`), that `*`
matcher **leaks onto every route registered after it** — `teamRoutes`, `shareRoutes`, `exploreRoutes`,
`uploadsRoutes`, `playlistImportRoutes` (index.ts:143–147). In production (`MOCK_PROVIDERS !== 'true'`) the
gate returns its `{code: NOT_FOUND}` 404 and short-circuits before those handlers run. Routes mounted
*before* mock terminate first, so they're unaffected. The 401-unauth / 404-auth split is the tell: the first
`requireSession` rejects unauthenticated calls before the mock gate is even reached.

**Why CI was green:** the integration suite runs with `MOCK_PROVIDERS='true'` (`vitest.integration.config.ts:40`),
which makes the gate transparent — so the passing `team-access.integration.test` never exercised the
production path. **Real blast radius is wider than Explore+Teams: sharing (`/shares`, `/classes/:id/shares`),
playlist import (`/classes/:id/playlist-import`), and custom cover images (`/uploads/:key`) are also 404 in
production.**

**Fix applied at the time:** scoped the gate to `mockRoutes.use('/mock/*', …)` so it could never leak,
plus two regression tests (a unit test reproducing the leak against the real `mockRoutes`, and a
full-app integration test that drives the worker with `MOCK_PROVIDERS` unset). See §6 P0.

---

## 1. Parity matrix

Status legend: ✅ Present (meets/exceeds) · 🟡 Partial · 🔴 Missing · 🟣 Divergent-by-design (constraint) ·
💥 Exists but broken on prod

| # | StructClub surface | RitmoFit web | Status | One-line gap |
|---|---|---|---|---|
| A | **Explore** — category chips (CYCLE/HIIT/SCULPT/TREAD), themed collections, art cards w/ author + "Class Details" | `ExploreDialog` (groups by `featuredCategory`; Preview + Save-a-copy) | 💥🟡 | Broken on prod (404); no category chips/filter, no cover art on cards, no themed-collection hero |
| B | **Library** — rich rows (2×2 art collage, date, duration), swipe actions, "Create Class → Playlists / Songs by Move" sheet | `LibraryRail` (title + access level + tag filter) | 🟡 | Lean text rows; no thumbnail/date/duration; no create-path chooser |
| C | **Class Detail** — cover, created date, duration, interleaved songs+moves, section markers ("1st Half!"), Edit/Share | `ClassWorkspace` (3-pane editor) + `ClassSummaryView` (read-only preview) | 🟡 | No single read-mode detail with interleaved songs+moves; sections are a fixed enum, not free-text labels |
| D | **Segment/Move editor** — Move picker, Intensity segmented, Display-BPM stepper, Duration, Quick-Cues/Notes tabs, Timeline/Playlist toggle | `TrackInspector` + `ChoreographyEditor` + `SegmentBand` | ✅ | Meets/exceeds; only cosmetic deltas (select vs segmented, field vs stepper, no tabbing) |
| E | **Songs by Move** — pick a move → see songs that use it | — | 🔴 | No reverse "browse by move" index or UI at all |
| F | **Live player** — current-move card (BPM/Intensity/Time), coaching cue, move list, **Spotify now-playing + transport** | `LiveMode` cue prompter (deep-links "Open in SoundCloud") | 🟣 | No embedded playback/transport — collides with the "no in-app audio" constraint |
| G | **Team tab** — browse the team's shared classes | `TeamsDialog` (create team, manage members, share target) | 💥🟡 | Broken on prod (404); it's a share-target manager, not a discovery feed |
| H | **Settings** (gear, top-left) | — (only "Sign out") | 🟡 | No profile/settings surface |
| I | **Create from Playlist** (provider playlist import) | `TrackSearch` → "Import Playlist" mode | ✅ | Present; just not surfaced as a *create-class* entry point |
| — | **Intensity scale** None/Easy/Mod/Hard/All Out | `none/easy/mod/hard/all_out` | ✅ | Exact match |
| — | **Provider connection** ("‹ Spotify") | `ConnectionsDialog` (SoundCloud connect; Spotify/Apple catalog-only) | ✅ | Exceeds — 3 providers; honest capability matrix |
| — | **Move vocabulary** (Left Leg Lead, Oos, Sway…) | Seeded: Bicep Curl, Burpee, Climb, Jog, Sprint, Squat, Tap Back… | 🟡 | Seed library is generic gym/tread, **not rhythm-cycle**; custom moves supported |

---

## 2. Where RitmoFit already EXCEEDS StructClub

These are shipped and verified working live — worth protecting in any redesign:

- **Beat-aware authoring** — per-track downbeat anchor, 4/4 bar.beat grid, snap-to-beat toggle on cues + moves.
- **Per-track trim/clip window** — play only part of a track on the class timeline.
- **Two timeline modes** — back-to-back (server-derived offsets) **and** free placement (drag tracks, gaps allowed, overlaps rejected), with a drag-resizable energy-arc segment band.
- **Drag + full keyboard** reorder, segment handles, and color/intensity pickers (StructClub is touch-drag only).
- **Multi-provider catalog** — SoundCloud + Spotify + Apple Music search/import (verified: live SoundCloud search returned real results); "My likes" for connected SoundCloud; playlist URL import.
- **Real sharing** — invite by email *and* by team, `view`/`edit` permissions, live permission toggle + revoke (StructClub has no visible per-user sharing).
- **Accessibility** — intensity encoded as bars + label (never color alone), screen-reader-announced live prompter, wake-lock during a run, every control keyboard-operable.
- **Cue color tags** (copper/cyan/amber/ember/bone) and class **tags + tag filtering**.

---

## 3. Gap detail (with recommendations)

### A. Explore — 💥 broken + 🟡 thin
- **StructClub:** category filter chips (CYCLE/HIIT/SCULPT/TREAD), emoji-headed themed collections ("JUNE = PRIDE!", "SUMMER SHIMMER"), big cards with cover art, author, duration badge, play overlay, "Class Details ›".
- **RitmoFit:** `ExploreDialog` lists public classes grouped by `featuredCategory` string; each row is text-only (title · author · track count) with **Preview** (read-only track list) + **Save a copy**.
- **Gaps:** (1) **404 on prod** — feed doesn't load at all. (2) No category **chips/filter** even though `classes.template` (`cycle/hiit/sculpt/tread`) exists in the schema — it's just never surfaced. (3) No cover art on cards. (4) "Featured curation deferred" per docs, so no themed-collection hero treatment.
- **Recommend:** P0 fix the 404; then add a `template` chip filter to `/explore` (cheap — column already exists), put cover art on cards, and reuse `featuredCategory` as the themed-collection header.

### B. Library — 🟡 presentation
- **StructClub:** rows show a **2×2 album-art collage**, title, created date, duration badge; a dismissible "Your Classes / Create classes with the + button" onboarding banner; **swipe actions** (Share / Delete / Duplicate); a **"Create Class" action sheet** offering **Playlists** vs **Songs by Move**.
- **RitmoFit:** `LibraryRail` rows are `title` + `accessLevel` only; create is a single "New class title" + Add field. Share/Delete live in the header of an *opened* class; "Save a copy" (duplicate) exists only from Explore/Preview.
- **Recommend (P1):** enrich rows with a track-art collage + duration + last-opened date (all already in the run-payload / `lastOpenedAt`). Add a **Duplicate** action on own classes (the `POST /classes/:id/copy` route already exists). The create-path chooser depends on §E.

### C. Class Detail — 🟡 no read-mode
- **StructClub:** a dedicated Detail screen — big cover, "CREATED 6/7/26", duration, **songs and moves interleaved in one list** with per-row timing, free-text section markers ("1st Half!"), and Edit / Share / ⋯.
- **RitmoFit:** owners get the full **3-pane editor**; the only read-only view is `ClassSummaryView` (Explore preview), which lists tracks but **not** the interleaved moves/cues/sections.
- **Gaps:** no calm "class detail" read view that interleaves songs + moves + section bands; **sections are a fixed enum** (`warm_up/climb/sprint/recovery/cool_down`) so you cannot create a free-text "1st Half!" marker.
- **Recommend (P2):** optional. The editor already conveys everything; consider a read-mode and, if desired, an optional free-text `label` on sections.

### D. Segment/Move editor — ✅ parity (cosmetic deltas only)
- RitmoFit's `TrackInspector` + `ChoreographyEditor` cover Move (library + custom + one-off), Intensity, Display-BPM (+ "Look up BPM"), Duration, Notes, and anchored Cues with color tags — and **add** trim, downbeat/beat-snap, and bar.beat. Verified live: added a cue at 0:30 and a Climb/hard move at 1:00.
- **Cosmetic deltas only:** intensity is a `<select>` (StructClub uses a segmented None/Easy/Mod/Hard/All-Out control); BPM is a number field (StructClub uses ▲▼ steppers); cues + notes are stacked, not a "Quick Cues / Notes" tab pair; the timeline + track list are always-visible panels rather than a Timeline/Playlist toggle.
- **Recommend (P2):** purely visual polish if you want pixel parity; no functional gap.

### E. Songs by Move — 🔴 missing entirely
- **StructClub:** a first-class create path — "Pick songs by move" lists every move (Left Leg Lead, Oos, Sway…); choosing one surfaces songs already choreographed to it, so an instructor builds a class around a movement.
- **RitmoFit:** moves can be **placed** on tracks and **managed** (`CustomMovesDialog`), but there is **no reverse index** — no endpoint or UI to ask "which songs/classes use this move?" Confirmed: no such route in `apps/api/src/routes/` and no UI affordance.
- **Recommend (P1):** this is the most substantive *missing* StructClub feature. Add a `GET /moves/:id/tracks` (or `/classes`) reverse lookup + a "Browse by move" surface. Pairs with the create-class chooser in §B.

### F. Live player — 🟣 divergent by constraint (decision needed)
- **StructClub:** full-screen player with a current-move card (BPM / Intensity / Time), coaching-cue text, a scrollable move list, **and an embedded Spotify now-playing bar with ‹‹ ▶ ›› transport that drives Spotify**.
- **RitmoFit:** `LiveMode` is a **cue prompter** — virtual-clock Play/Pause/Reset + seek, NOW/NEXT cards, intensity bars, countdowns, a Full-List move view, and an **"Open in SoundCloud" deep-link** instead of embedded playback. Verified live.
- **The collision:** an embedded provider transport / now-playing bar requires controlling provider playback in-app, which **directly violates RitmoFit's locked constraint**: *"No in-app audio mixing/crossfade… audio plays through the user's own provider apps; we deep-link/hand off… never stream or mix."* (`DEVELOPMENT_PLAN.md` → Hard constraints).
- **Recommend (decision):** Per your direction I'm listing it as a gap, **but it cannot be closed without amending a hard constraint.** Realistic options: (1) keep the deep-link handoff (constraint-honest, current); (2) add a **Spotify Web Playback SDK**-based now-playing/transport *for Spotify Premium users only* (the one provider with a sanctioned in-app player) — a scoped, terms-compliant way to approach StructClub's feel without "mixing"; (3) richer now-playing metadata (art + scrubber) without transport. **This is a product call, not an engineering oversight.**

### G. Team — 💥 broken + 🟡 wrong shape
- **StructClub:** a **Team tab** in the bottom nav (a browsable destination).
- **RitmoFit:** `TeamsDialog` creates teams + manages members and serves as a **share target**, but there's no "browse my team's classes" feed. Plus it's **404 on prod** right now.
- **Recommend:** P0 fix the 404; P2 consider a team-classes browse view if team discovery matters.

### H. Settings — 🟡 minor
- StructClub has a gear (top-left) on Explore/Library. RitmoFit has only "Sign out." No profile, theme, or account settings surface. Low priority.

### I. Create from Playlist — ✅ present, mis-placed
- The provider **playlist-URL import** works (`TrackSearch` → "Import Playlist"; `POST /classes/:id/playlist-import`). It's only reachable *inside an open class*, not as a create-class entry point like StructClub's sheet. Wire it into §B's chooser to match.

### Move vocabulary — 🟡 content gap
- RitmoFit seeds **generic gym/tread** moves (Bicep Curl, Burpee, Climb, Incline Walk, Jog, Jumps, Mountain Climber, Push, Recovery, Run, Sprint, Sprint Hold, Squat, Tap Back). StructClub's are **rhythm-cycle** (Left Leg Lead, Right Leg Lead, Oos, Walk Your Hands, Sway, Isolate, Hands In & Out). Since the dev plan positions RitmoFit for "rhythm spin cycle instructors," the seed library is arguably off-target. Custom moves bridge it, but the default vocabulary is a quick, high-leverage content fix (re-seed `moves`).

---

## 4. Things RitmoFit has that StructClub's screenshots don't show
Multi-provider import, email/team sharing with permissions, beat-snapping, trim, free placement, drag/keyboard
a11y, tags, cue color tags, wake-lock. Net: **RitmoFit's builder is ahead; its discovery/library/onboarding is behind.**

---

## 5. Login / nav deltas (minor)
- **Login:** email + password + "Forgot password?" + "Sign up". Backend wires Apple/Google, but **no social buttons render** on the live login. (Minor; flag if social sign-in is expected.)
- **Nav:** desktop top-bar (Explore / Teams / Connections / Sign out) vs StructClub's mobile bottom tab bar (Explore / Team / Library) — expected, given web vs mobile.

---

## 6. Prioritized recommendations

**P0 — Production outage (do first; not a parity feature, a regression) — FIX READY**
1. **Root-caused + fixed in the working tree** (`apps/api/src/routes/mock.ts`: scope the mock gate to `/mock/*`; + regression tests). This restores `/explore`, `/teams`, `/shares`, `/classes/:id/playlist-import`, and `/uploads/:key` in production. **Action needed: review the diff, then deploy** (`pnpm --filter @ritmofit/web build` + `wrangler deploy` from `apps/api`) — deployment was deliberately left for owner confirmation. After deploy, smoke-test authenticated `/explore`, `/teams`, and `/shares` (the old smoke test only checked `/health` + `/classes`, which is why this slipped through). Also worth: add `/explore` + `/teams` to the documented prod smoke checklist, and correct `ritmofit_dev_plan/` which records M4 as "fully deployed."

**P1 — Highest-value parity gaps**
2. **Songs by Move** browse + reverse-lookup endpoint (§E) — the main missing StructClub create path.
3. **Library richness** — track-art collage, duration, last-opened date on rows; a Duplicate action (§B).
4. **Explore depth** — `template` category chips/filter + cover art on cards (§A; column already exists).
5. **Re-seed the moves library** with rhythm-cycle vocabulary (content fix; §Move vocabulary).

**P2 — Polish / nice-to-have**
6. Create-class chooser sheet (Playlists / Songs by Move) wiring §I + §E into §B.
7. Editor cosmetics: segmented intensity control, BPM steppers, Quick-Cues/Notes tabbing (§D).
8. Read-mode Class Detail + optional free-text section labels (§C).
9. Settings/profile surface (§H); onboarding "Your Classes" banner; auto-cover collage from track art.

**Decision required (constraint conflict)**
10. Live now-playing/transport (§F) — choose: keep deep-link handoff, add Spotify-Premium Web Playback transport, or richer metadata-only. Cannot ship StructClub's exact in-app transport without amending the "no in-app audio" constraint.

---

## 7. Evidence captured (live, 2026-06-24)
Signed in as the owner account; built **"Parity Test (delete me)"** with a real SoundCloud track
(*H.O.U.S.E (Franken Edit)*, 3:12), a cue at 0:30, and a Climb/hard move at 1:00; ran live mode; **then
deleted the class** (account returned to 0 classes). Surfaces verified: Login, Dashboard/Library (empty +
populated), Explore (**404**), Connections, Builder (header, SoundCloud search→import, energy arc, timeline,
segments), Inspector + Choreography editor (cues/moves), Live prompter, Teams (**404**). Network confirmed
`/explore` and `/teams` → 404 while all other `/api/v1` routes → 200.
