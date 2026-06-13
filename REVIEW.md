# RitmoFit Web — Pre-Launch Readiness Review

_Generated 2026-06-13. Reviewer: Claude (Opus 4.8). Status: **in progress** — updated area-by-area._

## Stack & architecture (verified, not assumed)

pnpm monorepo, Cloudflare-native, single-origin deploy.

- **`packages/shared`** — Zod entity schemas = the contract; OpenAPI generated from them.
- **`packages/music`** — provider adapters (SoundCloud / Spotify / Apple Music / BPM), pure + network-injectable.
- **`apps/api`** — Hono on Workers, Drizzle + D1 (SQLite), Better Auth. Entry `src/index.ts`. ~16 route modules mounted under `/api/v1`; Better Auth at `/api/auth/*`. Daily Cron drains the provider purge queue.
- **`apps/web`** — React 18 + Vite + TS SPA. Served as static assets by the **same Worker** (single origin → first-party cookie, no CORS). Entry `src/main.tsx` → `App.tsx`.

**Deploy:** manual (`pnpm --filter @ritmofit/web build` then `pnpm --filter @ritmofit/api run deploy`). Live at `https://ritmofit.studio`. CI is advisory (typecheck/lint/test), never deploys, does not block merges. Branch protection not enforced (private repo on Free).

## Gate results (run 2026-06-13)

| Gate | Result |
|------|--------|
| `pnpm -r typecheck` | ✅ 4 packages clean |
| `pnpm lint` (eslint) | ✅ clean |
| `pnpm test` (vitest) | ✅ 212 tests (api 159 + web 53) |
| `pnpm --filter @ritmofit/web build` | ✅ builds; **single 326 KB JS chunk (92.75 KB gzip)**, 24 KB CSS |

All static gates are green. Findings below are about what the gates **don't** cover.

---

## Findings

Severity legend: 🔴 blocker · 🟡 should-fix · 🟢 nice-to-have. Each item notes my **confidence**.

### Headline

The codebase is **unusually clean for an MVP**: centralized authorization that's actually called on every class-scoped route, a Zod contract shared end-to-end, encrypted OAuth tokens with PKCE, atomic batched writes, 212 green unit tests, and zero typecheck/lint warnings. The launch risks are **not** in the class-builder logic — they're in the **account lifecycle** (no password reset, no email at all), **abuse surface** (no effective rate limiting), **client resilience** (no error boundary, several silent form failures), and **operational gates** (CI doesn't build or block, no route-level tests). None are deep architectural problems; all are fillable before launch.

---

## 🔴 BLOCKERS — must fix before launch

### B1. No password reset / account recovery exists
**Where:** [apps/api/src/lib/auth.ts:44](apps/api/src/lib/auth.ts#L44) (`emailAndPassword: { enabled: true }`); [apps/web/src/components/Login.tsx](apps/web/src/components/Login.tsx) (no "forgot password" link).
**What:** Better Auth is enabled with email/password but **no `sendResetPassword` callback and no email transport is configured anywhere in the repo**. There is no forgot-password UI.
**Why it matters:** Any user who forgets their password is **permanently locked out** with no self-serve recovery. For a real account-based product this is a hard launch blocker, not a polish item.
**Fix:** Wire an email transport (Cloudflare Email Routing/Send, or Resend/Postmark) and Better Auth's `emailAndPassword.sendResetPassword` + `sendVerificationEmail`; add "Forgot password?" + reset-token screens to `Login`. Confidence: **high**.

### B2. No transactional email → no email verification either
**Where:** [apps/api/src/lib/auth.ts:33-46](apps/api/src/lib/auth.ts#L33-L46); user table column exists but unused: [schema.ts:74](apps/api/src/db/schema.ts#L74) (`emailVerified` defaults false).
**What:** No `requireEmailVerification`, no verification send. Anyone can register with **any** email (including someone else's) and use the account immediately. Sharing and team-invite both resolve targets **by email** ([routes/shares.ts], [routes/teams.ts] `POST .../members`), so unverified identities flow into the trust graph.
**Why it matters:** Account spoofing/spam-signup surface, and — coupled with B1 — confirms there is **no email pipeline at all**, which most launches require. Whether "hard blocker" depends on your launch bar, but it's the same missing capability as B1, so fix together.
**Fix:** Same transport as B1; turn on `requireEmailVerification` (or at least verification-on-signup). Confidence: **high** it's a gap; severity depends on launch posture.

### B3. No global React error boundary — one render throw white-screens the whole app
**Where:** [apps/web/src/App.tsx](apps/web/src/App.tsx), [apps/web/src/main.tsx](apps/web/src/main.tsx) — no `ErrorBoundary`/`componentDidCatch` anywhere (verified by grep).
**What:** Any uncaught render-time exception (a malformed payload, an unexpected null) unmounts the entire tree to a blank page with no recovery path.
**Why it matters:** A single edge-case in any of ~20 components can brick the app for a user mid-class-build with no way back except a manual reload. Cheap to prevent, high blast radius.
**Fix:** Add a top-level `ErrorBoundary` around `<App/>` (and ideally a narrower one around `LiveMode`, which runs during a live class) that renders a recover/reload fallback. Confidence: **high**.

### B4. No effective rate limiting on auth or API
**Where:** Better Auth construction [apps/api/src/lib/auth.ts:33](apps/api/src/lib/auth.ts#L33) (no `rateLimit` config); no Cloudflare WAF rules in repo; public search route [apps/api/src/routes/providers.ts](apps/api/src/routes/providers.ts).
**What:** Sign-in/sign-up have no rate limiting. Better Auth's built-in limiter defaults to **in-memory** storage, which on Workers is **per-isolate** and effectively a no-op (consecutive requests may land on fresh isolates). Provider `search?q=` is authenticated but proxies to upstream providers unbounded.
**Why it matters:** Password brute-force, signup spam, and provider-quota exhaustion are all open on a public origin (`ritmofit.studio`).
**Fix:** Cheapest: add Cloudflare **WAF rate-limiting rules** on `/api/auth/*` (no code). Better: configure Better Auth `rateLimit` with a D1/KV store, and add a small limiter on the provider routes. Confidence: **high**.

---

## 🟡 SHOULD-FIX — during soft launch

### S1. Silent failures + double-submit in create/add forms
**Where:** `CreateClassForm` [Dashboard.tsx:248-266](apps/web/src/components/Dashboard.tsx#L248-L266); `AddTrackForm` [Dashboard.tsx:952-1006](apps/web/src/components/Dashboard.tsx#L952-L1006); `togglePublish` [Dashboard.tsx:452-459](apps/web/src/components/Dashboard.tsx#L452-L459); `loadDetail`'s `listClassTracks` call [Dashboard.tsx:68](apps/web/src/components/Dashboard.tsx#L68).
**What:** These `await` mutating calls with **no `try/catch`** — a failure becomes an unhandled promise rejection and the user sees nothing. Submit buttons aren't disabled while in-flight, so a slow network → double-click → **duplicate class/track**. `togglePublish` has `finally` but no `catch`, so publish errors vanish. `loadDetail` only wraps the run-payload fetch; a `listClassTracks` failure throws uncaught.
**Why it matters:** Data duplication and dead-end UX on the most common actions.
**Fix:** Route all of these through the existing `error` state; disable buttons on `busy`. Confidence: **high**.

### S2. Missing indexes on hot foreign-key columns
**Where:** [schema.ts](apps/api/src/db/schema.ts) — verified against migrations. No index on `class_tracks.class_id`, `cues.class_track_id`, `class_track_moves.class_track_id`, `classes.owner_user_id`, `user_moves.user_id`. (Existing indexes: `class_sections.class_id`, `classes.visibility`, `tracks(owner,match_key)`, the unique indexes, Better Auth's.)
**What:** Every run-payload assembly ([run-payload.ts:72-101](apps/api/src/lib/run-payload.ts#L72-L101)), class-detail load, copy, and the `listVisibleClasses` owned-arm ([authz.ts:164](apps/api/src/lib/authz.ts#L164), filters `classes.owner_user_id`) currently **full-scans** these tables. `class_tracks` and `cues`/`moves` are the per-class hot path.
**Why it matters:** Invisible at launch-day volume (a handful of classes), but scans grow linearly with total rows across **all** users since these columns aren't indexed. Trivially cheap to fix now.
**Fix:** One additive migration adding the five indexes above. Confidence: **medium-high** (SQLite scans small tables fast, so impact is latent not immediate).

### S3. No route-level / integration tests — authz enforcement is unverified end-to-end
**Where:** Test suite is all pure-helper unit tests (`apps/api/src/lib/**/*.test.ts`). Documented as known debt in CLAUDE.md.
**What:** `resolveAccess`/`assertAccess` are well-tested in isolation (27 cases), but **no test asserts that a given HTTP route actually calls `requireAccess`**. A regression that drops the gate from one route would pass all 212 tests.
**Why it matters:** Authorization is the *only* access gate (D1 has no RLS). The highest-severity possible bug class is exactly the one with zero automated coverage.
**Fix:** Add a thin integration layer (Hono `app.request()` against a Miniflare/local-D1 binding) hitting one read + one write per route group as an authed non-owner, asserting 403/404. Confidence: **high** on value.

### S4. CI doesn't build, doesn't block, and skips format/OpenAPI drift
**Where:** [.github/workflows/ci.yml](.github/workflows/ci.yml).
**What:** Runs typecheck + lint + test, but **not** `pnpm build` (a `vite build` can fail where `tsc --noEmit` passes — e.g. asset/import resolution), not `format:check`, not OpenAPI-spec drift. CI is advisory (doesn't block merge — documented decision). Stale comment: `node-version-file: .nvmrc # Node 20` but `.nvmrc` is `22`.
**Why it matters:** A deploy-breaking build regression can land on `main` green. Deploys are manual, so the break surfaces only at deploy time.
**Fix:** Add a `build` step (at least `pnpm --filter @ritmofit/web build`); optionally add `format:check` + an `openapi` regen-and-diff step. Fix the stale comment. Reconsider branch protection when the repo leaves Free/private. Confidence: **high**.

### S5. Live-OAuth connect success/failure is invisible to the user
**Where:** Callback redirects to `/account?connected=…` / `?error=…` [provider-connections.ts:176,222](apps/api/src/routes/provider-connections.ts#L176); SPA has **no router** and renders `Dashboard` for every path; only `ConnectionsDialog` reads `window.location.search` ([ConnectionsDialog.tsx:42-44](apps/web/src/components/ConnectionsDialog.tsx#L42)) and only if the user manually re-opens it.
**What:** After a real SoundCloud redirect, the `/account` URL has no view and the connected/error result is never surfaced unless the user happens to reopen the dialog.
**Why it matters:** Currently masked because live providers are behind the mock seam — becomes a real broken flow the moment `SOUNDCLOUD_*` creds ship.
**Fix:** Read the query params on app load and show a toast / open the dialog; or add minimal client routing for `/account`. Confidence: **high** (latent until live providers enabled).

### S6. Single 326 KB JS bundle, no code-splitting
**Where:** `vite build` output — one `index-*.js` (326 KB / 92.75 KB gzip). [apps/web/src/components/Dashboard.tsx:27-37](apps/web/src/components/Dashboard.tsx#L27-L37) statically imports `LiveMode` + every dialog.
**What:** `LiveMode` (only used while running a class) and all five dialogs (Teams/Explore/Connections/Share/CustomMoves) load before first paint.
**Why it matters:** 92 KB gzip is acceptable for launch, but it's the cheapest perf win available and will only grow as the builder does.
**Fix:** `React.lazy` + `Suspense` for `LiveMode` and the dialogs. Confidence: **high** (clear win, low risk).

---

## 🟢 NICE-TO-HAVE — post-launch polish

- **G1. Unbounded provider search `q`.** [providers.ts:43](apps/api/src/routes/providers.ts#L43) passes `q` straight through with no max length. Add a Zod `.max()`. Confidence: medium (adapters cap results, low real risk).
- **G2. No client-side password guidance.** [Login.tsx](apps/web/src/components/Login.tsx) has no min-length/strength hint; errors only appear post-submit. Add inline validation. Confidence: high (UX).
- **G3. No deep-link routes.** Everything (explore, account, a specific class) is dialog/component state — URLs aren't shareable or bookmarkable, browser back doesn't work as expected. A product decision; revisit if shareable class links matter. Confidence: high (it's by design today).
- **G4. Top-bar overflow risk on small screens.** [Dashboard.tsx:107-140](apps/web/src/components/Dashboard.tsx#L107) — brand + 4 pill buttons; no wrap/menu collapse below `sm`. Verify on a narrow viewport. Confidence: medium (unverified visually).
- **G5. Album-art `<img>` lacks width/height + `loading="lazy"`.** [Dashboard.tsx:682-687](apps/web/src/components/Dashboard.tsx#L682) — minor CLS and eager loading of off-screen art. Confidence: medium.
- **G6. Stale CI comment** (`# Node 20`) — see S4.

---

## Suggested sequencing of the blockers

The blockers cluster into two independent tracks; do the **email track first** because it's the longest pole (needs an external service decision + DNS/SPF/DKIM) and gates two blockers.

1. **B1 + B2 together (email pipeline).** Pick a transport (Cloudflare Email or Resend), wire SPF/DKIM/DMARC on `ritmofit.studio`, then implement `sendResetPassword` + verification and the reset UI. This is the critical path — start it first because deliverability setup has lead time you don't control. B1 (reset) is the true must-have; B2 (verification) rides the same plumbing.
2. **B4 (rate limiting) — in parallel, fast.** Add Cloudflare WAF rate-limit rules on `/api/auth/*` (dashboard config, no code, ~30 min). This closes the brute-force window that B1's new reset/login flows would otherwise widen. Do it alongside track 1.
3. **B3 (error boundary) — small, do anytime.** A self-contained ~30-line addition with no external dependency; land it early so the rest of soft-launch testing surfaces *handled* errors instead of white screens.

Rationale: B1/B2 share infrastructure and have the longest external lead time, so they set the launch date — begin immediately. B3 and B4 are quick, dependency-free, and make the email work safer to test, so they slot in alongside. After blockers, take S1 (silent form failures) and S3 (route-level authz tests) first in the should-fix tier — S1 because it corrupts data on the happiest path, S3 because it guards the one security invariant that has no automated coverage.
