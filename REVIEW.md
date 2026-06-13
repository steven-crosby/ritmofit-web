# RitmoFit Web — Pre-Launch Readiness Review (v2)

_Generated 2026-06-13. Reviewer: Claude (Opus 4.8). Supersedes the v1 review whose B1–B4 +
S1/S2/S4 items have since **shipped** (PR #40)._

## What changed since v1

The v1 review's blockers are **implemented in code**: password-reset + verification email
(`lib/email.ts`, `lib/auth.ts`), the global + LiveMode error boundaries (`ErrorBoundary.tsx`),
D1-backed rate limiting (`lib/rate-limit.ts` + Better Auth `rateLimit`), silent-form-failure guard
(`use-async-action.ts`), FK indexes (migrations `0007`/`0008`), and a CI that now also builds the web
app + checks OpenAPI drift. This pass re-reviews the **current** tree and flags what is still open.

## Stack & architecture (verified)

pnpm monorepo, Cloudflare-native, single-origin deploy.

- **`packages/shared`** — Zod entity schemas = the contract; OpenAPI generated from them.
- **`packages/music`** — provider adapters (SoundCloud / Spotify / Apple Music / BPM), pure + injectable.
- **`apps/api`** — Hono on Workers, Drizzle + D1 (SQLite), Better Auth. Entry `src/index.ts`; 16 route
  modules under `/api/v1`; Better Auth at `/api/auth/*`. Daily Cron drains the purge queue + prunes
  rate-limit rows.
- **`apps/web`** — React 18 + Vite + TS SPA, served as static assets by the **same Worker** (single
  origin → first-party cookie, no CORS). Entry `src/main.tsx` → `App.tsx`. No client router (pathname
  switch for `/reset-password` only).

## Gate results (run 2026-06-13)

| Gate | Result |
|------|--------|
| `pnpm -r typecheck` | ✅ 4 packages clean |
| `pnpm lint` (eslint) | ✅ clean |
| `pnpm test` (vitest) | ✅ **222** (api 169 + web 53) |
| `pnpm --filter @ritmofit/web build` | ✅ builds; **single 330.65 KB JS chunk (93.98 KB gzip)**, 24 KB CSS |

All static gates are green. Everything below is what the gates **don't** cover.

## Headline

This is a genuinely well-built MVP. Authorization is centralized in `lib/authz.ts` and **actually called
on every class-scoped route** (verified file-by-file: classes, class-tracks, cues, placed-moves,
sections, shares all gate via `requireAccess`/`require*Access`; tracks/user-moves do owner-scoped checks;
the dev `mock` seam 404s in prod; `explore` is intentionally public-by-visibility). The remaining launch
risk is **almost entirely operational**, not architectural: the password-reset code is shipped but the
email transport **isn't provisioned in prod**, so recovery silently dead-ends. After that it's
launch-hygiene (legal pages, an OAuth redirect that points at localhost in prod, error reporting) and the
one piece of deep coverage that's missing — **route-level tests for the authorization invariant**, the
single security gate with zero end-to-end tests.

Severity legend: 🔴 blocker · 🟡 should-fix · 🟢 nice-to-have. Confidence noted per item.

---

### Frontend / UI & UX

- [ ] 🔴 **[BLOCKER]** Add user-facing **Privacy Policy + Terms** pages and link them from sign-up/footer — no legal pages exist anywhere in the repo (`apps/web/index.html`, no `/privacy` or `/terms` route). Why: the product collects emails/PII at sign-up and the music-provider OAuth flows (SoundCloud/Spotify/Apple) require a public privacy-policy URL for app approval; lawful PII collection (GDPR/CCPA) needs disclosure. Fix: add static `/privacy` + `/terms` views (pathname-switched like `/reset-password` in `App.tsx:16`) and a consent link on the `Login` sign-up form. (confidence: med — severity depends on launch posture/jurisdiction, but it gates live OAuth)
- [ ] 🟡 **[SHOULD-FIX]** Surface the OAuth connect result on app load — `provider-connections.ts:222` redirects to `/account?connected=…` / `?error=…`, but `App.tsx` renders `Dashboard` for every non-`/reset-password` path and only `ConnectionsDialog` reads those params (and only if the user manually reopens it). Why: after a real SoundCloud redirect the success/failure is invisible. Fix: read `window.location.search` on load and toast / auto-open the dialog, or add an `/account` view. (confidence: high — latent until provider creds ship)
- [ ] 🟡 **[SHOULD-FIX]** Add `<meta name="description">`, Open Graph/Twitter tags, and a favicon to `apps/web/index.html` (currently only `<title>RitmoFit</title>` at line 6; no `public/` dir, so `/favicon.ico` 404s). Why: public **Explore** classes are meant to be shared; links currently render with no preview, and a missing favicon looks unfinished. Fix: add meta tags + a favicon asset. (confidence: high)
- [ ] 🟡 **[SHOULD-FIX]** Add a client-side `minLength={8}` (and a hint) to the **sign-up** password input — `Login.tsx:88-95` has no constraint while `ResetPassword.tsx:81` already enforces `minLength={8}`. Why: Better Auth rejects short passwords server-side, so today a weak password fails only *after* submit with a raw error. Fix: mirror the reset screen's `minLength` + helper text. (confidence: high)
- [ ] 🟡 **[SHOULD-FIX]** Make the top bar wrap/collapse on narrow viewports — `Dashboard.tsx:122` is `flex items-center gap-4` with brand + 4 pill buttons (Explore/Teams/Connections/Sign out, lines 131–154) and **no `flex-wrap`**. Why: on phones the buttons overflow or crush. Fix: `flex-wrap`, an overflow menu, or icon-only buttons below `sm`. (confidence: med — unverified visually, but structurally at risk)
- [ ] 🟢 **[NICE-TO-HAVE]** Give album-art `<img>` intrinsic `width`/`height` + `loading="lazy"` — `Dashboard.tsx:716-721` (and the same pattern in dialogs). Why: avoids layout shift and eager off-screen image loads. (confidence: med)
- [ ] 🟢 **[NICE-TO-HAVE]** Self-host the three Google Fonts instead of CDN `<link>` (`index.html:8-13`). Why: render-blocking third-party request on first paint, plus an EU-privacy concern with Google Fonts hot-linking. Fix: bundle via `@fontsource/*` or local `woff2`. (confidence: med)
- [ ] 🟢 **[NICE-TO-HAVE]** Consider real client routing for shareable/bookmarkable URLs — Explore, account, and a specific class are all component state; browser back/deep-links don't work. Currently by design; revisit if shared class links matter. (confidence: high — it's intentional today)

### API / backend logic

- [ ] 🔴 **[BLOCKER]** Provision the transactional-email transport in prod — set `RESEND_API_KEY` (+ `EMAIL_FROM`) as Worker secrets and verify `ritmofit.studio` on Resend with SPF/DKIM/DMARC. Code path: `email.ts:55` falls back to a **console.log** when the key is unset, and per CLAUDE.md the secret is **not set in prod** (only `BETTER_AUTH_SECRET` + `ENCRYPTION_KEY` are). Why: the entire password-reset flow (`auth.ts:55`) is wired but the email never reaches the user, so **account recovery silently dead-ends** — a forgotten password is a permanent lockout. Fix: create the Resend account, verify the domain + add the DNS records to the Cloudflare zone, `wrangler secret put RESEND_API_KEY` / `EMAIL_FROM`, then send a live reset to confirm deliverability. (confidence: high)
- [ ] 🟡 **[SHOULD-FIX]** Set `WEB_ORIGIN` in prod (or derive the SPA origin from `BETTER_AUTH_URL`) — `provider-connections.ts:62-64` `spaUrl()` falls back to `http://localhost:5173` when `WEB_ORIGIN` is unset, and `wrangler.toml` only sets `BETTER_AUTH_URL`. Why: the post-OAuth redirect (`:222`) would send a **production** user to `http://localhost:5173/account?...`. Fix: add `WEB_ORIGIN = "https://ritmofit.studio"` to `wrangler.toml [vars]`, or change `spaUrl` to default to `BETTER_AUTH_URL`. (confidence: high — latent until SoundCloud creds go live; pairs with the Explore/account UX item)
- [ ] 🟡 **[SHOULD-FIX]** Add error reporting / alerting beyond `console.*` — `ErrorBoundary.componentDidCatch` (`ErrorBoundary.tsx:31`), the `app.onError` 500 branch (`index.ts:61`), and both Cron `waitUntil` catches (`index.ts:136,146`) only log. Why: with no aggregation you won't know reset emails, the purge sweep, or the rate-limit prune are failing in prod. Fix: wire a lightweight reporter (Sentry/Workers Logpush/Tail Worker) for unhandled errors + Cron failures. (confidence: high)
- [ ] 🟢 **[NICE-TO-HAVE]** HTML-escape interpolated values in `actionEmail` — `email.ts:86-94` injects `heading`/`intro`/`url`/`user.email` straight into the HTML string. Why: low real risk (recipient is the user; email addresses can't carry `<>`), but it's an unescaped-template habit worth closing. Fix: escape, or assert the inputs are plain text. (confidence: low)
- [ ] 🟢 **[NICE-TO-HAVE]** Decide on `requireEmailVerification` before opening sign-ups widely — `auth.ts:68-69` is send-on-signup but **does not block** unverified accounts, and both share-by-email (`shares.ts:37`) and team-add-by-email (`teams.ts:113`) resolve targets by email. Why: an unverified address can enter the trust graph / spoof sign-up. Acceptable "don't-block" posture for soft launch; tighten later. (confidence: high it's a gap; low it's launch-blocking)

### Data layer & state management

- [ ] 🟡 **[SHOULD-FIX]** Add self-serve **account deletion + data export** (GDPR/CCPA "right to erasure/access"). Why: there is no delete-account route or UI; a user can't remove their account, classes, tracks, encrypted music tokens, or team memberships. Fix: an authed `DELETE /me` that cascades the user's owned rows (classes CASCADE their children; also delete owned tracks/user-moves/shares/memberships/music_connections + enqueue provider purges) and an export endpoint. (confidence: med — required in some jurisdictions; pairs with the legal-pages blocker)
- [ ] 🟢 **[NICE-TO-HAVE]** Guard the app-level `shares` cascade with a test — `shares.resource_id` is polymorphic (no FK), so the **class-delete route** is the only thing that removes a class's shares (`classes.ts:283-286`). Team-targeted shares are covered by the real FK (`teams CASCADE → shares`), but the class side is code-only. Why: a future delete path that forgets this orphans share rows. Fix: assert it in the route-level tests below. (confidence: high)
- [ ] 🟢 **[NICE-TO-HAVE]** Note for scale (not launch): `listVisibleClasses` (`authz.ts:163-176`) fans out three queries then `GET /classes` does an `inArray` fetch; `resolveAccess` runs 2 queries per class-scoped request, and chained `require*Access` walks the parent chain query-by-query (`authz.ts:210-284`). All are indexed and fine at launch volume; revisit if a single user accumulates thousands of classes. (confidence: high — latent, not a current problem)

### Testing & CI/CD

- [ ] 🟡 **[SHOULD-FIX]** Add **route-level / integration tests** that exercise the HTTP layer (Hono `app.request()` against Miniflare/local-D1) — the suite is all pure-helper units (`src/lib/**/*.test.ts`); `resolveAccess`/`assertAccess` are well covered (27 cases) but **no test asserts a given route actually calls the gate**. Why: authorization is the *only* access control (D1 has no RLS), so a regression dropping `requireAccess` from one route would pass all 222 tests. Fix: one read + one write per route group as an authed non-owner, asserting 403/404 (and that class-delete removes shares). (confidence: high on value)
- [ ] 🟢 **[NICE-TO-HAVE]** Add component-render smoke tests — `apps/web/vite.config.ts:14` sets `environment: 'node'`, so no DOM/component test can run; all 53 web tests are pure geometry/logic. Why: state-driven render bugs (loading/empty/error branches in `Dashboard`) have no coverage. Fix: add `jsdom` + a few Testing-Library smoke tests on the key flows. (confidence: med)
- [ ] 🟢 **[NICE-TO-HAVE]** Reconsider making CI **blocking** + adding `format:check` — `.github/workflows/ci.yml` now runs typecheck/lint/test/build/openapi-drift (good), but it's advisory (doesn't block merges) and skips `format:check`. Both are deliberate plan decisions (private/Free repo; plan-doc markdown unformatted). Revisit when the repo leaves Free/gains a collaborator. (confidence: high — documented as intentional)

### Performance

- [ ] 🟡 **[SHOULD-FIX]** Code-split the eager imports — `Dashboard.tsx:28-39` statically imports `LiveMode` + all five dialogs (Teams/Explore/Connections/Share/CustomMoves), so the single 330 KB / 94 KB-gzip chunk loads everything before first paint. Why: cheapest perf win, and it grows as the builder does. Fix: `React.lazy` + `Suspense` for `LiveMode` and the dialogs. (confidence: high — clear win, low risk)
- [ ] 🟢 **[NICE-TO-HAVE]** Self-host fonts (see Frontend) and add `loading="lazy"` to off-screen art (see Frontend) — both shave first-paint/CLS. (confidence: med)
- [ ] 🟢 **[NICE-TO-HAVE]** Consider `build.sourcemap` (hidden) in `vite.config.ts` so the error reporter above can symbolicate prod stack traces. (confidence: med)

---

## Launch Blockers — Do First

A short, ordered checklist. The email item is the true must-have and has external lead time (domain
verification + DNS propagation), so start it first.

- [ ] 1. **Provision prod email.** Create Resend account → verify `ritmofit.studio` → add SPF/DKIM/DMARC to the Cloudflare DNS zone → `wrangler secret put RESEND_API_KEY` (+ `EMAIL_FROM`) → send a live password-reset and confirm it lands. (`email.ts:55`, `auth.ts:55`)
- [ ] 2. **Publish Privacy Policy + Terms** and link them from the sign-up form; required before any live music-provider OAuth review and for lawful PII collection. (`App.tsx:16`, `Login.tsx`)

> Note: both blockers are **operational/legal**, not code defects — the application logic, authorization,
> and data model are launch-ready. If your launch is a closed soft-launch (email/password only, no live
> music providers, trusted invitees), item 2 can run in parallel and item 1 is the single gating task.
