# Implementation Prompt 06: Live Mode & Studio Prompter UI (`P0-01`)

**Goal:** Overhaul `LiveMode.tsx` and `LiveTimeline.tsx` to provide ultra-high glanceability, 4-rem timers, high contrast cues, and 44px+ touch controls for in-studio use.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Inspect Code:**
   Read `apps/web/src/components/LiveMode.tsx`, `LivePreflight.tsx`, `LiveTimeline.tsx`, and `ClassPulse.tsx`.

2. **Implement Studio Prompter:**
   - Increase main timer font size to 4rem (`Azeret Mono`, Kinetic Amber `#f59e0b`).
   - Style active cue titles with 2.2rem bold uppercase typography for distance reading.
   - Expand play/pause and next-cue touch targets to at least 44x44px minimum (ideally 56px+ in Live mode).
   - Ensure pause, disconnect, and warning overlays pop up cleanly with explicit recovery actions.

3. **Verification:**
   Run:
   ```bash
   pnpm --filter @ritmofit/web build
   pnpm test
   ```
