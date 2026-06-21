# Editing-Granularity Scoping — Trimming · Free Placement · Beat-Snapping

> Status: **scoping only** (no code yet). Branch `claude/ritmofit-editing-granularity-wxp4z5`.
> Context: the planning surface today is strong on *ordering* and *annotation* but caps out
> below a DAW on fine-grained control. These three deferred features are the realistic levers
> to raise that ceiling **without** turning RitmoFit into an audio editor (the three music
> constraints in `music-providers.md` stay inviolable — no in-app audio, no mixing, no trimming
> of the *audio file itself*; "trimming" here means clipping the *playback window*, not the file).

This doc compares all three: what changes, effort, risk, and a recommended order. Estimates are
grounded in the current code (file paths inline).

---

## The one architectural fact that drives everything

The class timeline is **server-derived and back-to-back**, funnelled through a single function:

- `effectiveDurationMs(trackDurationMs, durationMsOverride)` → `durationMsOverride ?? trackDurationMs`
  (`apps/api/src/lib/duration.ts`) is the **only** place a track's contributed length is decided.
- `computeSequence()` (`apps/api/src/lib/sequencing.ts`) sums those durations into contiguous
  `startOffsetMs` values. It is reused by both the **write path** (`resequence`, persisted on every
  add/delete/reorder) and the **read path** (`computeClassTimeline` in
  `apps/api/src/lib/run-payload.ts`, recomputed at assembly — the "M3 hardening" guarantee).
- `startOffsetMs` and `position` are documented as **server-derived / client-read-only**
  (`packages/shared/src/entities/classes.ts`, `run-payload.ts`).

Consequence: **trimming and beat-snapping are additive and cheap because they ride this chokepoint;
free placement is expensive because it *inverts* the invariant** (offset stops being derived and
becomes user-authored), which also breaks the deployed run-payload v1 timeline semantics that iOS
depends on.

Next migration number is **`0014`** (latest is `0013`). Remote D1 is live, so every schema change
ships a forward migration with a safe default for existing rows.

---

## Feature A — Per-class track trimming ⭐ recommended first ✅ shipped

> **Status: implemented** on this branch. `class_tracks` gained `clip_start_ms` (NOT NULL default 0)
> and `clip_end_ms` (nullable) via migration `0014`; `effectiveDurationMs` / the new `resolveClipWindow`
> centralize the window math, so `resequence` + `computeClassTimeline` propagate it for free; the
> run-payload re-bases cue/move anchors to the clip start; `PATCH /class-tracks/:id` validates the window
> contains every anchor; and the track inspector grew a "Trim" start–end control. Scope below is the
> as-built record.

**Goal:** play a sub-range `[clipStartMs, clipEndMs)` of a track within a class (e.g. skip a 0:20
intro, end at the 2:15 drop), so the contributed duration shrinks and the rest of the timeline
follows automatically.

### Changes
- **Schema / migration `0014`:** add `clip_start_ms` (NOT NULL default 0) and `clip_end_ms`
  (nullable = "to end") to `class_tracks` (`apps/api/src/db/schema.ts`), plus a CHECK
  (`clip_start_ms >= 0 and (clip_end_ms is null or clip_end_ms > clip_start_ms)`). Update
  `ritmofit_dev_plan/schema.md` first (it's the source of truth).
- **Shared contract:** add the two fields to `classTrackSchema` and `classTrackInputFields`
  (`packages/shared/src/entities/classes.ts`).
- **Core math (the cheap part):** extend `effectiveDurationMs` to clip:
  contributed = `(clipEnd ?? base) − clipStart`, where `base = durationMsOverride ?? trackDurationMs`.
  Because `resequence`, `computeClassTimeline`, and the PATCH validator all call this one function,
  the **entire timeline propagates for free**.
- **Route:** `PATCH /class-tracks/:id` already accepts `classTrackInputFields` via `buildPatch` and
  already re-`resequence`s on duration change (`apps/api/src/routes/class-tracks.ts`). Add the clip
  fields and **extend the existing "duration must reach the latest cue/move anchor" validation** to
  "the clip window must contain every cue/move anchor."
- **Run-payload projection:** the one genuinely new logic — when `clipStart > 0`, emit cue/move
  `anchorMs` as **offset from clip start** (`anchor − clipStart`) so the live prompter lines up, and
  emit the clipped `durationMs` (already handled by `effectiveDurationMs`). Deep-link start position
  into the provider app is **out of scope** (providers differ); note as a follow-up.

### The one real design decision
Are cue/move anchors stored relative to the **original track start** (simplest; require the clip
window to contain them, reusing the existing validator) or relative to the **clip**? Recommend
**original-track-relative + window-contains-anchors validation**, with the run-payload doing the
offset subtraction. Keeps stored data stable and the edit UI honest.

### Effort & risk
- **Effort: Medium (~2–3 days).** 1 migration, ~3–4 shared/api files, 1–2 UI files, tests.
- **UI:** two numeric "start / end (s)" fields in the track inspector — mirrors the existing
  duration-override field. *Stretch:* drag handles on the track block, reusing the proven
  `SegmentHandle` pattern in `apps/web/src/components/SegmentBand.tsx`.
- **Risk: Low–Medium.** Preserves the back-to-back invariant entirely (a clip just changes one
  track's contributed length). Only subtlety is the anchor reconciliation above.
- **Tests:** new clip cases in `sequencing.test.ts` / `run-payload.test.ts`, duration unit tests,
  one route-validation test.

---

## Feature B — Free timeline placement / gaps (the expensive one)

**Goal:** break back-to-back — let a track sit at an arbitrary `startOffsetMs`, with gaps (silence)
between tracks.

### Why it's costly: it inverts the core invariant
Today `startOffsetMs` is *derived* and `position` is authoritative. Free placement makes
`startOffsetMs` *user-authored* and forces a rethink of everything that assumes derivation:
- `resequence` / `computeSequence` (`sequencing.ts`) — no longer compute offsets; at most sort.
- `computeClassTimeline` (`run-payload.ts`) — `totalDurationMs` becomes `max(start + duration)`,
  **not** the sum; offsets read straight from the row.
- The **M3 hardening guarantee** ("recompute at read so a drifted offset self-heals") directly
  *conflicts* with honoring a user-set offset — it must be bypassed in free mode.
- `POST /classes/:id/tracks/reorder` semantics get muddy when offset, not position, is authoritative.
- `updateClassTrackSchema` deliberately **excludes** `startOffsetMs`/`position` today
  ("server-derived, so not here", `classes.ts`) — that contract changes.
- **Live contract + UI:** gaps create "no track playing" states. `LiveMode.tsx` / `LiveTimeline.tsx`
  assume contiguous tracks (current track = the one containing `elapsedMs`). This ripples into the
  **iOS** run-payload consumer too.

### Mitigation
Gate behind a per-class `timeline_mode` (`sequential` default | `free`) so every existing class and
the current iOS contract keep working untouched; only opted-in classes get authored offsets. Likely
a run-payload note (kept additive — `schemaVersion` can stay 1 if gaps are represented purely by
offsets + total).

### Effort & risk
- **Effort: Large (~5–8 days).** Core invariant, reorder semantics, M3 read-path, live contract, and
  `LiveMode`/`LiveTimeline` gap handling, plus the mode flag.
- **Risk: High.** Changes a deployed, documented contract that iOS reads. Strongly recommend doing
  trimming first and re-evaluating whether this is even needed — much of the latent "control what
  plays when" desire is satisfied by trimming, and a "gap" can be faked with a silent spacer track.

---

## Feature C — Beat-snapping ✅ shipped

> **Status: implemented** on this branch (the "full" UI option). The data prerequisite was solved by
> adding `class_tracks.beat_anchor_ms` (downbeat offset, migration `0015`); BPM comes from the resolved
> `displayBpmOverride ?? track.displayBpm`; 4/4 is assumed. The pure grid math lives in
> `packages/shared/src/beat.ts` (`snapToBeat` / `beatPositionAt` / `beatGridTicks` / `beatGridLayout`).
> The cue/move editor gained a "snap to beat" toggle + a bar.beat readout; the track inspector gained a
> "Downbeat" field; the timeline strip draws a faint beat/bar grid and its markers are now draggable and
> snap to the grid; the run-payload derives beat/bar for cues + moves and exposes `beatAnchorMs` /
> `clipStartMs` for the overlay. Scope below is the as-built record.

### Original analysis (retained)

**Goal:** activate the dormant `beat`/`bar` fields so cue/move anchors snap to the musical grid.

### The honest blocker
The snap *math* is trivial (`beatLenMs = 60000 / bpm`; round anchor to nearest beat). A credible
feature needs a **beat grid**, which needs three things — and we have only one and a half:
1. **BPM** — `displayBpm` (track) / `displayBpmOverride` (class_track) exist but are usually null /
   manual. The optional GetSongBPM provider from M2 (`POST /tracks/:id/bpm-lookup`) can fill it, but
   stays behind the mock until `GETSONGBPM_API_KEY` lands.
2. **Downbeat / phase offset** — **does not exist anywhere.** A constant grid from t=0 is wrong for
   any track with an intro/lead-in. This is exactly why `milestones.md` calls beat/bar
   "non-functional in M1 (no downbeat phase to derive from)."
3. **Time signature** — assume 4/4 for MVP.

### Changes
- **Migration `0014`/`0015`:** add a `beat_anchor_ms` (downbeat offset, default 0) to `class_tracks`;
  and add `beat`/`bar` columns to **`class_track_moves`** — today **only `cues` has them**
  (`schema.ts` lines 292–293), so moves need them for parity (or compute derived-only at read).
- **Pure util:** `(bpm, downbeatOffsetMs, anchorMs) → { snappedMs, beat, bar }` — small, unit-tested.
- **UI (`ChoreographyEditor.tsx`):** when BPM is known, a "snap to beat" toggle + show beat/bar. Two
  gaps today: the anchor input is **whole seconds** (beat snapping wants ms), and markers are
  click-to-focus only — there is **no marker dragging**, so snap-on-drag would be net-new interaction
  (vs. the SegmentBand handles which exist for sections but not for cue/move markers). A beat-grid
  tick overlay on `TimelineStrip.tsx` is the visual payoff.

### Effort & risk
- **Effort: Medium (~3–5 days) for a credible version**; ~1 day for a toy ("snap whole-second anchors
  to nearest beat, assume downbeat 0") that will *feel broken* on real tracks.
- **Risk: Medium — experiential, not architectural.** Additive; doesn't touch the timeline invariant
  or the live contract beyond already-shipped `beat`/`bar`. But without the downbeat field + dependable
  BPM it snaps to the wrong grid. **Do the data prerequisite or don't ship it.**

---

## Recommended sequencing

| Order | Feature | Effort | Risk | Why |
|-------|---------|--------|------|-----|
| 1 | **Trimming** ✅ | Medium (2–3d) | Low–Med | **Shipped.** Rode the centralized duration chokepoint as predicted; preserved invariants; raised the granularity score. |
| 2 | **Beat-snapping** ✅ | Medium (3–5d) | Med (data) | **Shipped (full UI).** Added the downbeat field + grid math; editor toggle, timeline grid + snap-on-drag. Additive — no invariant or live-contract break. |
| 3 | **Free placement** | Large (5–8d) | High | Inverts the core invariant + changes the deployed live/iOS contract. Gate behind a per-class mode; reconsider once trimming lands (silent spacer tracks may suffice). |

**Bottom line:** trimming is the clear first move — cheap because the architecture already centralizes
duration, and it likely absorbs much of the demand that would otherwise justify the expensive free-
placement work. Beat-snapping is cheap in code but only worth doing alongside its data prerequisites.
Free placement is a real project, not a slice.
