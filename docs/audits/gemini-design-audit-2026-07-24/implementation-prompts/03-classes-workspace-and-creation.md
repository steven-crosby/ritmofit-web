# Implementation Prompt 03: Classes Workspace & Multi-Entry Building (`P0-03`)

**Goal:** Redesign the Classes library cards with energy arcs, status badges, and 1-click creation shortcuts for Cycle, Pilates, and HIIT templates.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Inspect Code:**
   Read `apps/web/src/components/Dashboard.tsx` (`ClassesView`, `EmptyClassesView`, `ClassHeaderCard.tsx`).

2. **Implement Card & Creation UI:**
   - Update class cards to display embedded mini energy sparklines and clear discipline badges (Cycle, Sculpt/Pilates, HIIT).
   - Enhance the empty library state (`EmptyClassesView`) with quick-action creation buttons for templates and playlist imports.
   - Streamline 1-click class creation modal so instructors can launch a builder session without mandatory multi-step naming.

3. **Verification:**
   Run:
   ```bash
   pnpm --filter @ritmofit/web build
   pnpm test
   ```
