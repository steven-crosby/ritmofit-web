# Implementation Prompt 01: Tokens & Design System (`P1-01`)

**Goal:** Implement the Studio Obsidian (`#120c0a`) and Kinetic Amber (`#f59e0b`) design tokens, typography rules, glassmorphism surface utilities, and energy ribbon styles across the repository's design system package and web app styles.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Inspect Canon:**
   Read `AGENTS.md` and `ritmofit_design_system/tokens.json`. Run `node ritmofit_design_system/scripts/generate-tokens.mjs` (or `pnpm tokens` in `apps/web`) to verify token generation flow.

2. **Update Tokens:**
   - Modify `ritmofit_design_system/tokens.json` to introduce:
     - `--bg-base`: `#120c0a` (Studio Obsidian)
     - `--bg-raised`: `#1c1411`
     - `--bg-surface`: `#261a16`
     - `--accent-amber`: `#f59e0b`
     - `--accent-cyan`: `#06b6d4`
     - `--accent-crimson`: `#f43f5e`
   - Regenerate tokens into `apps/web/src/styles/tokens.css`.

3. **Update `apps/web/src/index.css`:**
   Add utility classes for glassmorphism panels, energy ribbon containers, and athletic typography utilities (`.font-mono`, `.font-sans`, `.badge-amber`, `.badge-cyan`).

4. **Verification:**
   Run:
   ```bash
   pnpm --filter @ritmofit/web build
   (cd ritmofit_design_system && npm run verify)
   ```
