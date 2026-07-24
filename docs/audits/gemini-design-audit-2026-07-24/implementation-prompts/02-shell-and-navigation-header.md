# Implementation Prompt 02: Navigation Shell & Persistent Stage Header (`P1-03`)

**Goal:** Overhaul the main application header in `Dashboard.tsx` to provide a persistent, high-vibrancy top stage bar with clear destination switching between Classes, Music, Live, and Account.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Inspect Shell:**
   Read `apps/web/src/components/Dashboard.tsx`. Locate the top navigation bar and destination switcher state (`destination`).

2. **Implement Stage Header:**
   - Update header container styling to use `backdrop-filter: blur(16px)` and Studio Obsidian background.
   - Refine destination buttons (`Classes`, `Music`, `Live`, `Account`) with active Kinetic Amber highlights and clear icons.
   - Add persistent stage readiness status pill displaying overall provider connection health and active class indicator.
   - Ensure mobile responsiveness for viewports down to 320px with a horizontally scrollable destination list.

3. **Verification:**
   Run:
   ```bash
   pnpm --filter @ritmofit/web build
   pnpm test
   ```
