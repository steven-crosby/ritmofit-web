# Pre-Launch QA Prompt for RitmoFit Web

```markdown
You are a Staff QA Engineer preparing RitmoFit Web for its production launch. Your task is to perform a strict pre-launch audit to ensure the repository meets the exact standards defined in the project instructions.

Before beginning, read `AGENTS.md`, `CLAUDE.md`, and review the launch-readiness status in `REVIEW.md`.

Follow this systematic QA process:

1. **Execute Quality Gates**
   Run the exact CI-equivalent validation commands documented in `AGENTS.md` (use the pinned runtime — Node 22.13+, pnpm 11.4 — or note any version drift). Run them all and report each result; treat any failure as a launch-blocking finding rather than stopping the audit early, so the report stays comprehensive:
   - `pnpm format:check`
   - `pnpm -r typecheck`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm --filter @ritmofit/api test:integration`
   - `pnpm --filter @ritmofit/web build`
   - `pnpm --filter @ritmofit/api openapi`
   - `git diff --exit-code apps/api/openapi/openapi.json`
   - `pnpm audit:ci`

2. **Verify Architecture & Backend Constraints**
   - **Music Rules**: Verify absolutely no caching of provider audio or provider-derived analysis, no BPM extraction from Spotify, and no embedded playback.
   - **Authorization**: Verify every route module mounts `requireSession` and that all _class-scoped_ access goes through `requireAccess` (or the matching centralized helper in `apps/api/src/lib/authz.ts`) at the correct min level. Confirm the documented non-class exceptions are intentional and still safe: owner-scoped resources (`tracks`, `user_moves`) using local ownership checks, the session-gated catalog surfaces (`explore`, `providers`), and the intentionally session-less OAuth callback (authenticated by its encrypted state cookie). D1 has no row-level security, so a missing auth check on a class-scoped handler is a critical security bug.
   - **Secrets**: Scan for leaked credentials or `.env` files in source control.

3. **Check Pre-Launch Blockers & Remediation**
   - Cross-check `REVIEW.md` and `REVIEW_HISTORY.md` to ensure that 0 launch blockers remain and that any deferred "SHOULD-FIX" items are accounted for.
   - Check if the database requires any pending migrations for the current codebase before deploying. Use the documented remote check: `pnpm --filter @ritmofit/api exec wrangler d1 migrations list ritmofit --remote`.

4. **Frontend UI, Security & Accessibility Sanity Check**
   - **Security Headers**: Verify that baseline web security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and frame protection) are correctly configured in both the Worker middleware (`apps/api/src/index.ts`) and the SPA assets (`apps/web/public/_headers`), according to modern web security guidelines.
   - **Design System**: Verify frontend components consume the generated design tokens (`ritmofit_design_system/tokens.json` → `apps/web/src/styles/tokens.css` / `--rf-*` Tailwind classes) rather than raw hex. Account for the documented exception in `apps/web/src/lib/cue-colors.ts`, where the cue palette persists free hex at rest and is guarded by `cue-colors.test.ts` against the token primitives.
   - **Accessibility Audit**: Run a live-browser audit of the critical paths (Dialogs, Live Mode) for focus traps, ARIA labels, semantic HTML, and correct `inert`/`aria-hidden` handling. Prefer an automated WCAG 2.1 A/AA pass via the repo's Playwright harness with `@axe-core/playwright` against the running stack (disposable D1, `MOCK_PROVIDERS=true`); if Chrome DevTools MCP or an a11y skill is connected, you may use it instead. State which tooling you used and note that automated rules cover only a subset of WCAG.

**Deliverable:**
Compile your findings into a comprehensive `pre_launch_audit_report.md` artifact. Group your findings into Pass/Fail categories, and explicitly list any regressions or remaining blockers. Do NOT make any code changes or fix issues during this audit phase—wait for my explicit approval on your report first.
```
