# RitmoFit Web — Pre-Launch Readiness Review

_Regenerated 2026-06-13. Reviewer: Claude (Opus 4.8). Supersedes the prior pass — its B1–B4 + S1/S2/S4 items shipped in PR #40, so this is a fresh, current-state review._

> **Status update (2026-06-13, end of session).** The should-fix tier from this review is **shipped, merged,
> and deployed** to `ritmofit.studio` (Worker `b9949950`):
> - ✅ **PR #42** — 401/session-expiry recovery · auth-form try/catch · delete-class UI · input `.max()` caps.
> - ✅ **PR #43** — route-level integration tests (Workers pool + D1; 8 tests; CI step). _(closes the "no
>   route-level tests" gap.)_
> - ✅ **PR #44** — code-split the SPA (main chunk 330 → 291 KB) · paginate `GET /explore`.
>
> **One 🔴 blocker remains: transactional email is not provisioned** (`RESEND_API_KEY`/`EMAIL_FROM` unset in
> prod → reset/verification hit the console fallback). This is the only launch gate left and is an ops task
> (Resend account + DNS + `wrangler secret put`), not code. Remaining items below are post-launch
> nice-to-haves (write-route rate limits, component/render tests, further pagination). Email-verification
> posture was decided as **send-but-don't-block**.

## Stack & architecture (verified against the code, not assumed)

pnpm monorepo, Cloudflare-native, single-origin deploy.

- **`packages/shared`** — Zod entity schemas = the contract; OpenAPI generated from them. Consumed by api + web.
- **`packages/music`** — provider adapters (SoundCloud / Spotify / Apple Music / BPM), pure + network-injectable.
- **`apps/api`** — Hono on Workers, Drizzle + D1 (SQLite), Better Auth. Entry `src/index.ts`; 16 route modules under `/api/v1`, Better Auth at `/api/auth/*`. Daily Cron drains the provider purge queue + prunes rate-limit rows.
- **`apps/web`** — React 18 + Vite + TS SPA (no router — `App.tsx` switches on `pathname`). Served as static assets by the **same Worker** (single origin → first-party cookie, no CORS).

**Deploy:** manual two-step (`pnpm --filter @ritmofit/web build` → `pnpm --filter @ritmofit/api run deploy`). Live at `https://ritmofit.studio`. CI is advisory (never deploys, does not block merges); branch protection not enforced (private repo on Free).

## Gate results (run 2026-06-13)

| Gate | Result |
|------|--------|
| `pnpm -r typecheck` | ✅ 4 packages clean |
| `pnpm lint` (eslint) | ✅ clean |
| `pnpm test` (vitest) | ✅ 222 tests (api 169 + web 53) |
| `pnpm --filter @ritmofit/web build` | ✅ builds; **single 330.65 KB JS chunk (93.98 KB gzip)**, 24 KB CSS |

All static gates are green. The findings below are about what the gates **don't** cover: a missing prod secret, missing UI CRUD/recovery paths, unbounded inputs, absent integration tests, and no code-splitting.

## Headline

The codebase remains unusually clean for an MVP: `requireAccess` is genuinely called on every class-scoped route, the Zod contract is shared end-to-end, OAuth tokens are encrypted with PKCE, the run-payload is batched (no N+1), there is exactly one `TODO` and zero `any`/`@ts-ignore` in the web tree, and 222 unit tests pass. The launch risk is **not** in the builder logic. It is concentrated in:
1. **One operational blocker** — transactional email is wired in code but the prod secret is unset, so password recovery silently no-ops.
2. **A few missing client paths** — no delete-class UI, no session-expiry recovery, two auth forms that hang on a network error.
3. **Hardening gaps** — unbounded string inputs, no pagination on growth-unbounded lists, no route-level/integration tests, and a single un-split bundle.

---

## Frontend / UI & UX

- [ ] **[BLOCKER]** Verify the password-reset email actually reaches users before launch — `apps/api/src/lib/email.ts:55` silently `console.log`s and returns when `RESEND_API_KEY` is unset, so the "Forgot password?" flow in `apps/web/src/components/Login.tsx:19-27` appears to succeed (`"a reset link is on its way"`) while no email is sent. Why it matters: a locked-out user has no recovery. Fix: set the prod secret (tracked under API → blockers); until then the UI is misleading. (confidence: high)
- [ ] **[SHOULD-FIX]** Add a 401/session-expiry recovery path — `apps/web/src/lib/api.ts:51-60` throws a generic `Error` on any non-OK response; `Dashboard` surfaces the message string but never signs out or returns to `Login`, so an expired session shows `"Authentication required."` on every action with no way forward but a manual reload. Fix: detect `res.status === 401` in `api()` and call `authClient.signOut()` / reset to the login view. (confidence: high)
- [ ] **[SHOULD-FIX]** Wrap the auth-form submits so a network rejection can't hang the button — `apps/web/src/components/Login.tsx:29-34` and `apps/web/src/components/ResetPassword.tsx:27-31` `await` Better Auth calls with no try/catch; on a thrown (not returned) error, `setBusy(false)` never runs and the button is stuck on `…` with no message. Fix: try/catch around the call (or route through `useAsyncAction`). (confidence: high)
- [ ] **[SHOULD-FIX]** Add a delete-class (and rename) UI — `DELETE /classes/:id` exists at `apps/api/src/routes/classes.ts:279` and `PATCH` already accepts `title`, but `apps/web/src/components/Dashboard.tsx` only offers create / publish / share / run. A class created by mistake can never be removed from the UI. Fix: add an owner-only delete with inline confirm to `ClassHeaderCard` or `LibraryRail`, and a title-edit affordance. (confidence: high)
- [ ] **[NICE-TO-HAVE]** Make the top bar responsive — `apps/web/src/components/Dashboard.tsx:122-155` is a non-wrapping `flex` row of four pill buttons + the user name; on a narrow viewport it overflows horizontally. The stated surface is "a laptop," so this is low priority, but add `flex-wrap` or a menu collapse. (confidence: med)
- [ ] **[NICE-TO-HAVE]** Handle unknown routes — `apps/web/src/App.tsx:16` special-cases only `/reset-password`; every other deep link (served `index.html` by `not_found_handling = "single-page-application"`) renders `Login`/`Dashboard` rather than a 404. Add a minimal not-found branch. (confidence: low)
- [ ] **[NICE-TO-HAVE]** Lazy-load album-art images — the `<img>` in `apps/web/src/components/Dashboard.tsx:716` (and LiveMode) has no `loading="lazy"` / `decoding="async"`; a long track list fetches every thumbnail eagerly. (confidence: low)

## API / backend logic

- [ ] **[BLOCKER]** Set `RESEND_API_KEY` (+ `EMAIL_FROM`) as Worker secrets in prod and verify a real send — `apps/api/src/lib/auth.ts:55-79` wires reset + verification email, but `apps/api/src/lib/email.ts:55` no-ops without the key, and the current status update above records these secrets as unset. Why it matters: password recovery and email verification both silently fail in production. Fix: create a Resend account, verify `ritmofit.studio` + add SPF/DKIM/DMARC to the Cloudflare DNS zone, then `wrangler secret put RESEND_API_KEY` and `EMAIL_FROM`; send a live reset to confirm delivery. (confidence: high)
- [ ] **[SHOULD-FIX]** Bound user-supplied string lengths in the contract — every text field is `.min(1)` with **no `.max()`**: `classSchema.title`/`description` (`packages/shared/src/entities/classes.ts:21-23`), `classTrackInputFields.notes`, `cueInputFields.text` (`entities/choreography.ts`), `nameOverride`, `createTrackSchema.title`/`artist` (`entities/tracks.ts`), team `name`. A client can POST multi-MB strings → storage bloat + a heavy run-payload. Fix: add reasonable `.max()` caps (e.g. title 200, notes/text 2 000). (confidence: high)
- [ ] **[SHOULD-FIX]** Decide the email-verification posture before opening sign-ups — `apps/api/src/lib/auth.ts:66-80` is send-but-don't-block (no `requireEmailVerification`), and sharing/teams resolve targets **by email** (`routes/shares.ts`, `routes/teams.ts`), so an unverified (or spoofed) address flows straight into the trust graph. Fix: either require verification before a user can be shared-to/added, or gate sign-in on verification once email delivery (above) is live. (confidence: high it's a gap; severity depends on launch bar)
- [ ] **[NICE-TO-HAVE]** Consider a light write-rate limit on authoring routes — only `GET /providers/:provider/search` is limited (`apps/api/src/routes/providers.ts:43-48`, 30/min/user); create-class/track/cue/section and `copy` rely on Better Auth's auth-route limits only, so an authenticated client could spam-create. Low risk (authed, owner-scoped). Fix: reuse `rateLimit()` on the heavier POSTs if abuse appears. (confidence: low)
- [ ] **[NICE-TO-HAVE]** Tighten the prod CORS allow-list — `apps/api/src/index.ts:75` and `lib/auth.ts:37` keep `http://localhost:5173` in the allowed origins unconditionally; harmless under single-origin, but gate the localhost entry on a dev flag. (confidence: low)

## Data layer & state management

- [ ] **[SHOULD-FIX]** Paginate the growth-unbounded list endpoints — `GET /explore` and `GET /classes` (`apps/api/src/routes/classes.ts:70-85`) return **all** matching rows; `/explore` is public and grows with every user's published classes, and `/classes` sorts the full set in memory (`classes.ts:81-84`). Fix: add `limit`/`offset` (or a cursor) to `/explore` first, then `/classes`. (confidence: med)
- [ ] **[NICE-TO-HAVE]** Add upper bounds to duration/anchor integers — `durationMs`/`targetDurationMs`/`anchorMs` are `z.int().positive()`/`nonnegative()` with no ceiling (`packages/shared/src/common.ts`, `entities/tracks.ts`); a bogus 10-digit duration inflates `totalDurationMs` and the ribbon geometry. Fix: cap at a sane max (e.g. 24 h). (confidence: low)
- [ ] **[NICE-TO-HAVE]** Re-confirm app-level cleanup for any future polymorphic share targets — `shares.resourceId` carries no FK (`apps/api/src/db/schema.ts:331`); class-delete already removes matching shares (`routes/classes.ts:283`), which is correct, but a second `resourceType` would need the same manual sweep. Document/guard it. (confidence: low)
- [ ] **[NICE-TO-HAVE]** Accept that the rate-limit counter is read-then-upsert racy under bursts — `apps/api/src/lib/rate-limit.ts:77-99` (acknowledged in the comment, matches Better Auth's own approach). Fine for abuse mitigation; only revisit if exact accounting is ever needed. (confidence: high it's intentional)
- [x] **Verified good:** authz centralized and called on every class-scoped route (`lib/authz.ts`); run-payload assembled in 3 batched waves, no N+1 (`lib/run-payload.ts:70-105`); FK cascade/restrict + enum CHECKs mirror the contract; FK hot-path indexes present (migration `0008`); migrations sequential `0000–0008` with a `meta/` dir.

## Testing & CI/CD

- [ ] **[SHOULD-FIX]** Add route-level / integration tests against a real D1 — the 169 api tests are all pure-helper unit tests; no test exercises a mounted Hono route, so a regression that drops a `requireAccess` call, breaks the `copy` batch transaction, or malforms the run-payload would pass CI. Fix: add `@cloudflare/vitest-pool-workers` (or Miniflare) tests that hit `/api/v1/...` end-to-end, prioritizing authz on each class-scoped route + `POST /classes/:id/copy`. (confidence: high)
- [ ] **[SHOULD-FIX]** Add component/render smoke tests — `apps/web/vite.config.ts` runs vitest with `environment: 'node'`, so `Dashboard`, `LiveMode`, and every dialog (the bulk of the UX) have zero render coverage; the 53 web tests are pure geometry/logic helpers. Fix: add `jsdom` + `@testing-library/react` and smoke-render the auth forms, Dashboard, and LiveMode. (confidence: med)
- [ ] **[SHOULD-FIX]** Enable required-checks branch protection before adding a collaborator or launching — CI is advisory and direct pushes to `main` are allowed (documented; gated by the repo being private on Free). Fix: upgrade to Pro or make the repo public (after a secrets-in-history audit), then require the `checks` job to pass before merge. (confidence: med — documented constraint)
- [ ] **[NICE-TO-HAVE]** Add `format:check` to CI — the script exists in root `package.json` but `.github/workflows/ci.yml` omits it, so formatting drift isn't caught. (confidence: low)
- [ ] **[NICE-TO-HAVE]** Report coverage (and consider a floor on the api lib) so the integration-test gap above is visible over time. (confidence: low)
- [x] **Verified good:** CI runs typecheck → lint → test → web build → OpenAPI-drift on every push/PR; pnpm + Node pinned via `packageManager` + `.nvmrc`.

## Performance

- [ ] **[SHOULD-FIX]** Code-split the SPA — the build emits a single **330 KB / 94 KB-gzip** JS chunk, so `LiveMode` (408 lines), the `ChoreographyEditor` (783 lines), and all five dialogs load eagerly on first paint even though they're behind interactions. Fix: `React.lazy` + `Suspense` for `LiveMode` and the dialogs (`Share`/`Teams`/`Explore`/`Connections`/`CustomMoves`); they're already conditionally rendered in `Dashboard.tsx`. (confidence: high)
- [ ] **[NICE-TO-HAVE]** Pair `/classes` + `/explore` pagination (above) with server-side ordering/limits so the list endpoints don't fetch-then-sort the full set in the Worker (`apps/api/src/routes/classes.ts:81-84`). (confidence: low)
- [ ] **[NICE-TO-HAVE]** Add `loading="lazy"` to album-art thumbnails in the track list and Live full-list view so long classes don't fetch every image up front. (confidence: low)
- [x] **Verified good:** run-payload + `listVisibleClasses` use `Promise.all` waves, not per-row queries; static assets are served/cached by Cloudflare; the on-beat pulse + all-out bloom are CSS-only and fully removed under `prefers-reduced-motion`.

---

## Launch Blockers — Do First

Work top to bottom; the rest of the checklist is post-launch hardening.

- [ ] **Provision transactional email in prod.** Create a Resend account, verify `ritmofit.studio` and add SPF/DKIM/DMARC to the Cloudflare DNS zone, then `wrangler secret put RESEND_API_KEY` + `EMAIL_FROM`. — `apps/api/src/lib/email.ts:55`, `apps/api/src/lib/auth.ts:55-79`
- [ ] **Send a real password-reset and a real verification email end-to-end on `ritmofit.studio`** and confirm both land (not just the console fallback). — `apps/web/src/components/Login.tsx`, `ResetPassword.tsx`
