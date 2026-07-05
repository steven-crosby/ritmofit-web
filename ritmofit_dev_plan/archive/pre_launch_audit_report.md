# Ritmo Studio Web — Pre-Launch QA Audit Report

_Audit date: 2026-06-18 (fresh re-run) · Scope: `main` at `95207b8` (post-merge of PR #77 undici
pin + PR #78 format-gate fix) · Role: Staff QA Engineer · **Read-only** — no code changes or
deploys were made. Posture: independent re-verification; prior reports treated as priors, not
ground truth._

## Verdict

**PASS — launch-ready from a code/QA standpoint. 0 launch blockers.** All **9 / 9** CI-equivalent
quality gates pass on the current `main`, backend authorization / music / secret constraints hold,
remote D1 is fully migrated, security headers are correct on both surfaces (verified live in
production), and a live WCAG 2.1 A/AA accessibility pass on the critical paths returned **zero
violations** with **8/8 modal-mechanics assertions** passing.

This run confirms the two gate failures found in the 2026-06-18 audit are resolved on `main`:
`audit:ci` is green (undici pinned to `^7.28.0`, PR #77) and `format:check` is green
(`design-system-audits/` excluded + `REVIEW_HISTORY.md` formatted, PR #78). **No regressions.** The
only open items are pre-existing **operational / owner actions** (branch protection, a dependency
upgrade, a rollback drill) — none are code blockers.

---

## 1. Quality Gates — ✅ 9 / 9 PASS

Run locally with pnpm **11.4.0**. **Runtime drift caveat:** local Node is **v24.16.0**; CI pins
**Node 22** (and CI itself is green on `95207b8` — run `27787157389`, `completed success`). Re-run
the final release gates on the pinned CI runtime for exact parity (advisory).

| Gate                                                 | Result  | Notes                                                                                                               |
| ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                  | ✅ PASS | "All matched files use Prettier code style!" (incl. the working-tree audit artifacts).                              |
| `pnpm -r typecheck`                                  | ✅ PASS | All 4 buildable workspaces, strict TS.                                                                              |
| `pnpm lint`                                          | ✅ PASS | ESLint, no findings.                                                                                                |
| `pnpm test`                                          | ✅ PASS | **323 unit tests** — web 148 (26 files), api 175 (23 files).                                                        |
| `pnpm --filter @ritmofit/api test:integration`       | ✅ PASS | **42 mounted Worker/D1 tests** (8 files), on undici 7.28.0.                                                         |
| `pnpm --filter @ritmofit/web build`                  | ✅ PASS | 194 modules; main JS 304.70 kB (90.80 kB gzip); lazy dialog/live chunks emitted.                                    |
| `pnpm --filter @ritmofit/api openapi`                | ✅ PASS | 39 schemas, 36 paths.                                                                                               |
| `git diff --exit-code apps/api/openapi/openapi.json` | ✅ PASS | No committed-spec drift.                                                                                            |
| `pnpm audit:ci`                                      | ✅ PASS | Exit 0. Only the 6 documented dev/build-only esbuild/vite GHSAs remain ignored; the undici advisories are resolved. |

---

## 2. Architecture & Backend Constraints — ✅ PASS

### Music rules — ✅ PASS

- **No provider-audio / derived-analysis caching, no embedded playback.** Source scan for
  `new Audio(` / `<audio` / `crossfade` / `createBufferSource` / `MediaElementAudio` /
  `audio-features` across `apps` + `packages` returned **no playback/caching code**. Live mode drives
  a virtual prompter clock and offers provider **handoff links**, not embedded players.
- **No BPM from Spotify.** `packages/music/src/spotify.ts` documents and enforces the constraint
  (audio-features/tempo endpoint never called; `display_bpm` null on import). Tempo comes only from
  the dedicated BPM-provider path.

### Authorization — ✅ PASS

- **All 14 route modules mount `requireSession`** (`.use('*', requireSession)`, or per-route for
  `provider-connections.ts` / `auth.ts`). The OAuth callback is intentionally session-less,
  authenticated by an encrypted, httpOnly, short-TTL state cookie, and mounted before the blanket
  guard.
- **Every class-scoped handler gates via `requireAccess` / `require*Access`** at the correct level
  (`view`/`edit`/`owner`) — `classes.ts`, `class-tracks.ts`, `cues.ts`, `placed-moves.ts`,
  `sections.ts`, `shares.ts`; centralized in `apps/api/src/lib/authz.ts`.
- **Documented non-class exceptions confirmed:** `tracks` / `moves` (owner-scoped local checks),
  `teams` (team-authz roles), `explore` / `providers` (session-gated catalog), the session-less OAuth
  callback. Backend code is unchanged since the prior detailed pass.

### Secrets — ✅ PASS

- Only `apps/api/.dev.vars.example` is tracked. Source/config scan for private-key blocks and common
  live-token/secret patterns returned **no matches**. (Pattern scan, not proof of absence.)

---

## 3. Pre-Launch Blockers & Migrations — ✅ PASS

- **0 launch blockers remain.** All five original blockers are DEPLOYED per REVIEW.md /
  REVIEW_HISTORY.md and cross-check consistent; deferred SHOULD-FIX items are closed.
- **Local migrations:** `0000`–`0012` present (13 files); no new migration introduced.
- **Remote D1:** `wrangler d1 migrations list ritmofit --remote` → **"✅ No migrations to apply!"**
  (verified this session — wrangler is authorized again after the token was rolled / re-login).
  Production D1 is current through `0012`; nothing pending before deploy.

---

## 4. Frontend UI, Security & Accessibility — ✅ PASS

### Security headers — ✅ PASS (verified live in production)

- **Worker** (`apps/api/src/index.ts`): global `app.use('*')` applies HSTS
  (`max-age=31536000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`,
  and a locked `default-src 'none'; frame-ancestors 'none'; base-uri 'none'` CSP on API/health.
- **SPA** (`apps/web/public/_headers`): same transport/frame headers + a page CSP (`default-src
'self'`; `script-src 'self'` + Cloudflare insights; `font-src 'self'`; `img-src 'self' data:
https:`; `frame-ancestors 'none'`; `object-src 'none'`; `form-action 'self'`).
- **Live production check (read-only):** `https://ritmofit.studio/` → 200 with the full SPA header
  set (7/7); `/api/v1/health` → 200; `/api/v1/classes` → **401** unauthenticated.

### Design system — ✅ PASS

- `apps/web/tailwind.config.js` maps `--rf-*` custom properties (56 `var(--rf-*)` refs) generated
  from `ritmofit_design_system/tokens.json`. A scan for raw `#rrggbb` in `apps/web/src/components`
  returned **no matches**.
- **Documented exception confirmed:** `apps/web/src/lib/cue-colors.ts` holds literal hex for the cue
  palette (persisted free hex at rest), guarded by `cue-colors.test.ts`, which imports `tokens.json`
  and fails on any drift from the primitives. Test-only; green in `pnpm test`.

### Accessibility — ✅ PASS (live browser)

- **Tooling:** Chrome DevTools MCP / a11y skill not connected. Per direction, ran a **live-browser**
  pass via Playwright + `@axe-core/playwright` against the running local stack (fresh disposable D1
  migrated `0000`–`0012` + seeded, `MOCK_PROVIDERS=true`, web :5173 / api :8787).
- **Result: 0 axe WCAG 2.1 A/AA violations across 7 scans** — login, empty dashboard, class detail,
  Connections / Share / Explore dialogs, and **Live mode**.
- **Modal mechanics, asserted live: 8/8 passed** on the Connections dialog — `role="dialog"` +
  `aria-modal="true"`, accessible name, background `#root` `inert` + `aria-hidden="true"`, focus moved
  inside on open, focus returned to trigger on close, `inert` removed on close.
- **Caveat:** axe automated rules cover a meaningful **subset** (not 100%) of WCAG; a manual
  screen-reader pass remains a worthwhile pre-launch nicety.

---

## Remaining Items (non-blocking — operational / owner actions)

Carried from REVIEW.md; none are product-code blockers:

1. **Branch protection** — require the CI job before merge (GitHub repo setting; owner action). _This
   audit's PR sequence (#77/#78) merged through individually-red checks precisely because protection
   is off — enabling it would prevent a broken `main` slipping through. Highest-value owner action._
2. **Dependency upgrade** — Vite 5 → 6 / newer Better Auth to clear the remaining accepted
   **dev/build-only** esbuild/vite advisories at the source rather than ignoring them.
3. **Live prod rollback drill** — Worker `wrangler rollback` + D1 Time-Travel are documented and
   verified-available read-only; a live exercise is deferred to a maintenance window.
4. **Full SoundCloud OAuth consent round-trip** — only the missing-state callback path is
   live-smoke-verified in prod; success/denial/token-failure round-trip remains a follow-up smoke.
5. **PR preview environments** — deliberately deferred (CI already runs the full gate incl. Worker/D1
   integration; auto-deploy-on-push conflicts with the manual prod guardrail).

## Regressions

**None.** Both gate failures from the earlier 2026-06-18 audit (`audit:ci`, `format:check`) are
resolved on `main` and re-verified green here. Authz, headers, migrations, music rules, secrets, and
a11y are all consistent with the recorded state.

## Working-tree note (informational)

Uncommitted at audit time: modified `REVIEW.md` and `apps/web/src/lib/cue-colors.ts` +
`cue-colors.test.ts` (prior-session edits — the token-drift guard; not part of this audit). Untracked:
`pre_launch_audit_report.md` (this report), `ritmofitweb-prelaunch-audit.md` (the audit prompt),
`security.md` (web-security skill copy; no secrets). None affect the gate results above
(`format:check` passes with them present).

---

## Appendix — How to reproduce

```bash
# Gates (all green on main @ 95207b8)
pnpm install --frozen-lockfile
pnpm format:check && pnpm -r typecheck && pnpm lint && pnpm test
pnpm --filter @ritmofit/api test:integration
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api openapi && git diff --exit-code apps/api/openapi/openapi.json
pnpm audit:ci

# Remote migration state (read-only)
pnpm --filter @ritmofit/api exec wrangler d1 migrations list ritmofit --remote   # "No migrations to apply!"

# Production header/health smoke (read-only)
curl -sS -D - https://ritmofit.studio/ -o /dev/null
curl -sS -D - https://ritmofit.studio/api/v1/health
curl -sS -o /dev/null -w '%{http_code}\n' https://ritmofit.studio/api/v1/classes   # expect 401

# Live a11y audit (disposable local D1 + Playwright + axe-core)
PERSIST=/tmp/rf-a11y-d1b
pnpm --filter @ritmofit/api exec wrangler d1 migrations apply ritmofit --local --persist-to $PERSIST
pnpm --filter @ritmofit/api exec wrangler d1 execute ritmofit --local --persist-to $PERSIST --file=./apps/api/src/db/seed.sql
pnpm --filter @ritmofit/api exec wrangler dev --port 8787 --persist-to $PERSIST --var MOCK_PROVIDERS:true &
pnpm dev:web &
node /tmp/rf-a11y/a11y.smoke.mjs        # 7 axe WCAG 2.1 A/AA scans + 8 modal-mechanics checks
```
