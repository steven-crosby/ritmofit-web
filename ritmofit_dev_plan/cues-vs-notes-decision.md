<!-- note (Claude, 2026-06-23): Resolution of DEVELOPMENT_PLAN backlog item #3 (Cues vs. Notes), plus scope for the step-1 implementation slice. -->
<!-- note (Claude, 2026-06-24): Step-1 read path has SHIPPED — Live mode now renders per-track notes (LiveMode.tsx). This is now an as-built decision record. -->

# Cues vs. Notes — decision & step-1 scope

Resolves the Cues-vs-Notes open item formerly tracked in [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md).

> **Outcome (2026-06-24):** decided **not** to split the schema; the step-1 **read path shipped** — Live
> mode now surfaces the previously write-only `class_tracks.notes`. This doc is kept as the as-built
> decision record. A future `kind: 'cue' | 'note'` discriminator on `cues` remains the additive path *if*
> anchored per-moment notes are ever evidenced.

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
   context line in **both** Live views: a bordered block under the track header in
   `CueByCue` (explicitly **not** the big "Now" card), and a compact "Notes:" line
   under each track header in the Full List. Primary gap; the reason notes exist.
2. **Class summary — no change (finding).** `ClassSummaryView` is reached **only**
   via the Explore preview flow (`previewClassId` ← `onPreview`); it is a
   foreign-class preview where cues/moves are already copy-gated ("save a copy to
   view"). Instructor notes are at least as private, so they must **not** render
   there. The owner already sees and edits notes in the builder track-settings
   panel (`Dashboard.tsx`), so there is no owner-only summary surface to add to.
   Net: the read-path gap was Live mode only.

**Out of scope (later steps)**

- Cue length guidance / focal-card clamp (step 2).
- Any `cues` schema change / `kind` discriminator (step 3, deferred).

**Verification**

- A track with notes shows them subtly in Live without disturbing the focal cue
  flow; reduced-motion and screen-reader announcement of the focal cue unchanged.
- Notes visible on the owner's class summary; not leaked on a foreign class.
- Existing gates stay green: `pnpm -r typecheck`, `pnpm test`, web build, OpenAPI
  drift (should be a no-op — no contract change), `pnpm audit:ci`.
