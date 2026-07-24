# Implementation Prompt 05: Builder Workspace & Energy Arc Timeline Ribbon (`P0-02`, `P2-01`)

**Goal:** Implement the "Energy Arc & Cue Anchor Ribbon" signature component inside `ChoreographyEditor` and refine track score reordering and move inspection controls.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Inspect Code:**
   Read `apps/web/src/components/ChoreographyEditor.tsx`, `TimelineStrip.tsx`, and `SegmentBand.tsx`.

2. **Implement Timeline Ribbon Signature:**
   - Construct the Energy Ribbon visual header showing dynamic track waveforms, intensity zones (Warmup, Base, Push, Climb, Sprint), and cue pins (`anchor_ms`).
   - Style cue pins with color-coded badges (Amber for Climb, Cyan for Move/Tapback, Crimson for Peak Sprint).
   - Polish `CustomMovesDialog.tsx` and `SongsByMoveDialog.tsx` for fast inline movement editing and reverse song lookup.

3. **Verification:**
   Run:
   ```bash
   pnpm --filter @ritmofit/web build
   pnpm test
   ```
