# Class scaffold — cross-lane contract

<!-- note (Cursor, 2026-09-19): Written to carry owner decisions from the classes-home lane to the template and builder lanes. -->

**Written by:** `cursor/classes-home-redesign-plan-0f64` ([#433](https://github.com/steven-crosby/ritmofit-web/pull/433))
**Consumed by:** `cursor/class-template-planning-0756` and `cursor/clarify-class-builder-ui-7e9f`
**Baseline:** `main` @ `d7df815`

> **Decisions here are the owner's; findings are verified against the code at that baseline.** Nothing
> in it is authorized implementation. Its purpose is that three concurrent lanes do not each invent a
> different answer to the same question — `AGENTS.md` requires shared surfaces to be frozen across
> parallel lanes until coordinated, and none of these surfaces has been.
>
> Modelled on `docs/audits/claude-design-audit-2026-07-24/shared-foundations-contract.md`.

---

## The frame

Two target instructors, both of whom meet Ritmo with an empty library:

- **A — newly certified.** Took classes as a member for a year, has never planned or led one solo.
  Needs the tool to tell her what a class looks like and when to speak.
- **B — experienced, leaving StructClub.** Frustrated by a broken workflow and an iPhone-only product.
  Needs to feel the speed within minutes, and will benchmark by recreating a class she already teaches.

A **template produces a scaffold: everything a class needs except the selected music.** A uses it for
speed; B uses it when she is being lazy or is out of time, and can start empty instead for maximum
freedom.

**No StructClub import.** Recreating in Ritmo must be faster and simpler than importing. That is the bar.

## Settled

| # | Decision | Owner status |
| --- | --- | --- |
| S1 | No StructClub import or migration. Recreation is the path, and must beat importing on speed. | Decided |
| S2 | A template yields a scaffold — structure, zones, slot durations, intensity — with the music left out. | Decided |
| S3 | An explicitly empty workspace stays available for the experienced instructor. | Decided |
| S4 | **A zone anchors to a track, not to absolute time.** "The climb starts at track 4", never "at 12:00". | Decided |
| S5 | Final Cut Pro is a guideline for **semantics** — lanes, magnetic storyline, connected items, edge-drag trim, selection-driven inspector — **not** for density or its four-region shell. | Decided |
| S6 | Cue examples are **disappearing placeholder text**, never stored rows. Nothing unedited can reach the Live prompter. | Decided |
| S7 | **Ghost cue markers** render on the timeline from the scaffold definition, are never persisted, and disappear once a real cue occupies that point. Shown only while a zone has no real cues, so the timeline gets quieter as she works. | Decided |
| S8 | A track drawn against its zone band, with drag to reposition and edge-drag to crop, is how a length mismatch gets resolved. Crop already adjusts the class clock end to end. | Decided |

## Open

| # | Question | Recommendation on the table |
| --- | --- | --- |
| O1 | Do scaffold cue examples read as **structural prompts** ("call your climb here") or as **coaching lines** ("add a gear, stand up")? | Structural prompts. Coaching lines mean authoring fitness instruction with form and safety implications, and every instructor at one gym delivering the same script. |
| O2 | What occupies Final Cut's viewer slot, if anything? | A rehearsal monitor — what Live shows at the playhead. If it cannot earn the space, use three regions, not four. |
| O3 | How many suggested cue points does a zone define? | Unresolved. Drives how much scaffold content must be authored per discipline. |
| O4 | Does the lazy path offer authored scaffolds, or "my last class with the music stripped"? | Her own past class. `copyClass` already duplicates cues and moves, it costs no authoring, and it sounds like her instead of like us. |

## Verified findings

Each checked against the code at `d7df815`. These are constraints, not opinions.

**F1 — Binding music into a pre-filled slot is not expressible today. This blocks S2.**
`updateClassTrackSchema` is `classTrackInputFields`, which covers intensity, BPM override, duration
override, clip window, beat anchor, offset, notes, RPM, and hold count — and deliberately excludes
`trackId`. A slot therefore cannot be re-pointed at a song. Delete-and-re-add is not equivalent:
`cues` and `class_track_moves` hang off the `class_track` id, so it destroys the choreography the
scaffold exists to provide. Fixing this is additive but needs real rules, because a replacement song
has a different length and can invalidate the clip window or strand an anchor past its end.

**F2 — Placeholder slots are creatable today, at the cost of library pollution.**
`class_tracks.track_id` is NOT NULL with a RESTRICT foreign key, so every slot needs a real `tracks`
row. `addClassTrackSchema` is a union that already accepts an inline `{ track: createTrackSchema }`, so
no schema change is required. But those rows are owner-scoped library entries, so a scaffold fills the
instructor's track library with placeholder ghosts unless they are flagged and filtered from library
views.

**F3 — An anchor-only cue cannot exist.** `cues.text` is `z.string().min(1).max(1000)`. There is no way
to place a silent marker and hang ghost text off it, which is why S7 must be derived-and-rendered
rather than stored.

**F4 — Pre-filled choreography would make readiness lie.** `classReadiness` marks the choreography
dimension ready whenever `cueCount + moveCount > 0`, labelled `Cues & moves set`. Anything that
pre-fills cues or moves satisfies it instantly. That propagates: `classNextStep` reads readiness to
choose each card's primary verb *and* its rank, so an unchoreographed scaffold could sort to the top of
"Ready to teach" on the Classes page. S6 and S7 avoid this by not creating rows; any future change that
does create them must exclude them from the count.

**F5 — S4 is a schema change.** `class_sections` is `(id, class_id, type, start_offset_ms)` with no
duration and no end; a section's extent is implicitly "until the next marker". Track-anchoring means
altering that table and migrating existing rows — explicit-approval territory under `AGENTS.md`.

**F6 — "Template" already means discipline.** `classTemplateValues` is
`['cycle','hiit','sculpt','tread']`, and D21's "requires a template pick" refers to that enum. Overloading
the word makes "start empty" ambiguous. Recommendation: give the scaffold its own word and leave the
enum alone — renaming it ripples through the shared schema, OpenAPI, contract-parity, and the iOS
snapshot for no functional gain.

**F7 — S3 contradicts written canon.** `09-class-builder-guidelines.md`: "A new class starts from a
**template**, not a blank" and "**requires a pick**". Restoring an empty option is a deliberate
amendment to that page and to D21.

**F8 — S5 contradicts written canon.** The same page says "Keep it a **creative workstation, not a
DAW** — no Adobe-Premiere density yet. A dense mode can come later." Adopting Final Cut's density would
amend that line; adopting only its semantics does not.

**F9 — Cropping is fully implemented end to end, and S8 rests on it.** `clip_start_ms` / `clip_end_ms`
on `class_tracks`, effective duration `min(clip_end_ms ?? base, base) − clip_start_ms` feeding the class
clock and the run payload, and `playbackWindowFor` returning `startMs = clipStartMs`,
`endMs = clipStartMs + durationMs` so the provider seeks to the crop and stops at it. Free-mode overlap
testing in `sequencing.ts` uses the effective duration, so **cropping is also how an overlap is
resolved**. The gesture is what's missing, not the capability.

**F10 — Nothing produces free mode.** Drag-to-place is free mode by definition; in sequential,
`start_offset_ms` is server-derived. Today free mode is reachable only through `toggleTimelineMode` in
the builder, and every import path produces sequential. Whether a scaffolded class is born free or
sequential is unresolved and belongs with S4.

**F11 — Anchors constrain both crop and re-point.** The clip window must contain every cue and move
anchor, and the edit route rejects a window that would orphan one. A crop handle must render the first
and last anchors as hard stops rather than failing on release.

**F12 — The scaffold can specify music it cannot find.** D11 forbids taking BPM from Spotify, so a slot
that needs "a three-minute climb around 135 BPM" cannot be matched against a provider catalog. The
scaffold states the requirement; the instructor still finds the song by ear.

## Lane ownership

| Area | Lane |
| --- | --- |
| Scaffold definition, suggested cue points, section re-anchoring (S4/F5), placeholder slots (F2), the bind operation (F1) | `class-template-planning` |
| Timeline lanes, drag-to-place, edge-drag crop (S8/F9/F11), ghost markers (S7), placeholder cue text (S6) | `clarify-class-builder-ui` |
| Start flow, and keeping readiness-driven ranking honest (F4) | `classes-home-redesign` |

Accessibility applies to all three: placeholder text is never a label (`07-accessibility.md`), ghost
markers need a text equivalent rather than existing only as faint marks, drag needs a keyboard path and
cannot be the precise one, and the 390px and 320px gates in `apps/web/smoke/narrow-width.smoke.mjs` are
P0.
