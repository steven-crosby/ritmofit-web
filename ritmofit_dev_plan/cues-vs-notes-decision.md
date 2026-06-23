<!-- note (Claude, 2026-06-23): Resolution of DEVELOPMENT_PLAN backlog item #3 (Cues vs. Notes), plus scope for the step-1 implementation slice. -->

# Cues vs. Notes — decision & step-1 scope

Resolves backlog item #3 in [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md).

## Question

Is the unified cueing system sufficient, or does the data model need to split
**Quick Cues** (short, glanceable, dominate the live prompter) from **Notes**
(instructor context, not meant to be shouted mid-effort)?

## What the code actually does today

- **`cues`** (anchored to a `class_track` by `anchor_ms`): `text` up to 1000 chars,
  optional `color` tag, reserved `beat`/`bar`. Rendered in `LiveMode.tsx` →
  `CueByCue` as the **focal "Now" card at `text-4xl`** with a "Next" countdown.
  This is the glanceable, shout-it surface.
- **`class_track_moves`**: already a separate concept (movement + intensity). Not
  part of this question.
- **`class_tracks.notes`** (free text, max 2000): a per-track context field that
  **already exists across the whole stack** —
  - DB: `apps/api/src/db/schema.ts` (`notes` column on `class_tracks`).
  - Contract: `packages/shared` (`classTrackInputFields`, `updateClassTrackSchema`)
    and the **run-payload** (`run-payload.ts` → per-track `notes`).
  - API: `PATCH /class-tracks/:id` reads/writes it (`routes/class-tracks.ts`).
  - Builder: the Dashboard track-settings panel **edits it today** — textarea,
    persists via `updateClassTrack`, shows it in the track row.

### The real gap

`class_tracks.notes` is **write-only**. An instructor can author per-track context
and it ships in the run-payload, but it is **never displayed on any read surface**:

- `ClassSummaryView` maps `payload.tracks` but renders title/artist/duration only —
  no notes.
- `LiveMode` / `LiveTimeline` render **no** `notes` at all — the one place an
  instructor would want their context while running a class.

So the "Notes" half of the backlog question isn't missing from the model — it's a
captured-but-never-read channel.

## Decision

**Do not split the schema.** The unified system is not broken; the notes channel is
unfinished on the read side. Graded plan:

1. **Complete the read path for `notes`** (step 1, scoped below). No schema /
   migration / contract change.
2. **Make cues glanceable by intent** — the prompter is the "shout this" surface;
   the 1000-char ceiling stays in the DB but the cue editor nudges toward short
   text, and the focal "Now" render clamps so a long cue can't blow up the card.
3. **Only if field use proves it** — if instructors need *anchored, per-moment*
   notes distinct from cues, add a **`kind: 'cue' | 'note'` discriminator column**
   to `cues` (one nullable column, default `'cue'`; run-payload stays additive,
   `schemaVersion` unchanged). The prompter shows `cue` big, `note` subtly.
   **Deferred until evidenced.**

### Why a discriminator, not a new `notes` table (if step 3 ever happens)

- M1 principle: model expensive relationships now, keep routes lean — a
  discriminator is the lean move.
- A new anchored-`notes` table **doubles the surface**: new routes, a new
  run-payload array, and a new rendering path on **iOS** (cues are a shared
  cross-client contract; every change ripples to the iOS live surface). A nullable
  enum column on `cues` adds none of that.

## Step 1 — scope (read path for track notes)

**Type:** frontend-only. No DB, migration, shared-contract, or API change — `notes`
is already in the run-payload and in `ClassTrack`.

**In scope**

1. **Live mode** — show the current track's `notes` as a **subtle, non-focal**
   context line (e.g. near the track header in `CueByCue`, `LiveMode.tsx` ~L381–397),
   explicitly **not** the big "Now" card. Primary gap; the reason notes exist.
2. **Class summary** — render `notes` per track in `ClassSummaryView`
   (tracks map ~L119) for the **owner's own** classes. For foreign/Explore classes,
   gate or omit, consistent with cues/moves already being copy-gated ("save a copy
   to view cues/moves"). Treat instructor notes as at least as private as cues.

**Out of scope (later steps)**

- Cue length guidance / focal-card clamp (step 2).
- Any `cues` schema change / `kind` discriminator (step 3, deferred).

**Verification**

- A track with notes shows them subtly in Live without disturbing the focal cue
  flow; reduced-motion and screen-reader announcement of the focal cue unchanged.
- Notes visible on the owner's class summary; not leaked on a foreign class.
- Existing gates stay green: `pnpm -r typecheck`, `pnpm test`, web build, OpenAPI
  drift (should be a no-op — no contract change), `pnpm audit:ci`.
