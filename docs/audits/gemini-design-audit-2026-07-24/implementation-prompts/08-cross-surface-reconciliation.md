# Implementation Prompt 08: Final Cross-Surface Reconciliation & Quality Pass

**Goal:** Perform the final visual regression check, accessibility verification, and contract reconciliation across all implemented surfaces against the Phase 3 design audit prototype.

**Authority:** Implementation only. Do not commit, push, open PR, or deploy unless granted.

---

## Task Instructions

1. **Full Workspace Tour:**
   Walk the end-to-end user loop in the browser:
   - Marketing / Login -> Classes Library -> Music Sourcing -> Builder Workstation -> Live Prompter -> Account Settings.

2. **Automated & Manual Verification Gates:**
   Run full project verification:
   ```bash
   pnpm format:check
   pnpm -r typecheck
   pnpm lint
   (cd ritmofit_design_system && npm run verify)
   pnpm test
   pnpm --filter @ritmofit/api test:integration
   pnpm --filter @ritmofit/web build
   ```

3. **Check Quality Criteria:**
   - Verify WCAG AA contrast on all text elements.
   - Verify keyboard focus rings are visible.
   - Verify mobile layouts render cleanly down to 320px width.
