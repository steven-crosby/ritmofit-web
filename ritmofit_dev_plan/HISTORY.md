# RitmoFit Web — Status / Deploy History

Archived dated build & deploy log. The live docs ([`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md),
[`milestones.md`](./milestones.md)) keep current state + milestone definitions; this file is the
chronological record (PRs, Worker version ids, migration steps, per-slice detail).

> Append-only. Newest entries first within each section, as in the source docs.

---

## From DEVELOPMENT_PLAN.md — dated deploy log

> **Session 2026-06-23 deployed (Worker `d183ee42-eba4-40ae-9def-fc0bd313223e`).**
> Caught up the long undeployed delta (**PRs #85–#93**, ~28 commits) in one code-only deploy. PRs merged
> this session: **#91** (`44e7b6b`, chore: ESLint-ignore git-ignored DesignSync artifacts so local
> `pnpm lint` matches CI), **#92** (`3c3f1fd`, docs: sweep housekeeping — backlog section,
> self-contained `AGENTS.md`, removed obsolete `design-system-audits/`), **#93** (`8c70a6b`, feat:
> surface track `notes` in Live mode + the Cues-vs-Notes decision doc;
> [`cues-vs-notes-decision.md`](./cues-vs-notes-decision.md)), and **#94** (close-session docs).
> Deployed from `main` (`69dcdcd`); prior Worker `e3528c85` (PR #84) is the rollback anchor.
> **No migrations applied — remote D1 was already current at `0016`** (clip-window `0014`, `beat_anchor_ms`
> `0015`, free-timeline `0016` had been applied previously; the earlier "remote at `0013`" note was
> stale, not a pending-migration gap — `wrangler d1 migrations list ritmofit --remote` → "No migrations
> to apply"). Pre-deploy gates green: typecheck, lint, unit (api 231 + web 166), integration 49, web
> build, OpenAPI no-drift. Post-deploy smoke (live): `/api/v1/health` → `200` (`{"status":"ok"}`),
> `/` → `200` html, unauthenticated `/api/v1/explore` → `401`. Bindings confirmed: D1 `ritmofit`,
> R2 `ritmofit-images`, `BETTER_AUTH_URL`/`WEB_ORIGIN` = `https://ritmofit.studio`.

> **PR #81 follow-up hardening deployed (2026-06-21, PR #84, Worker `e3528c85`).**
> PR #84 merged to `main` as `51c5b9e` and deployed from a clean worktree. Browser pinch zoom is
> restored; class-cover uploads now enforce a shared 5 MiB limit, return a documented `413`, serve with
> `nosniff`, and best-effort delete replaced/deleted R2 objects; Spotify playlist import now paginates
> the provider's 50-item pages instead of silently truncating and rejects malformed later pages rather
> than returning a partial import. No schema or migration change; remote D1 remains through `0013` with
> no pending migrations. Pre-deploy gates: format, typecheck, lint, unit 330, Worker/D1/R2 integration
> 44, web build, OpenAPI no-drift, and `audit:ci` all green. Post-deploy smoke: SPA `200`, health `200`,
> unauthenticated `/classes` `401`, all six security headers present, built asset
> `index-BhYgwUet.js` served `200`, and production viewport metadata is
> `width=device-width, initial-scale=1.0`. Prior Worker `d625bc50` is the rollback anchor.
>
> **Class covers, tags, playlist import + PWA deployed (2026-06-20, PR #81, Worker `d625bc50`).**
> PR #81 (feat: class covers, tags, playlist import, and PWA assets) merged to `main` (merge commit
> `0aad7a4`) and deployed. Adds: per-class custom cover images stored in a **new R2 bucket**
> (`ritmofit-images`, bound as `IMAGES_BUCKET`) and served by the Worker at `/api/v1/uploads/covers/*`;
> a `class_tags` table with add/remove/clone-on-copy; Spotify playlist URL import (bounded concurrency,
> same-song dedup; SoundCloud import deliberately 501 pending `/resolve`); and PWA manifest + service
> worker + icon/favicon/OG assets. Two review fixes landed on the branch first: tags serialize via
> `json_group_array` (a comma in a tag no longer splits it in the list view), and `coverImageUrl`/`tags`
> were dropped from the create/update JSON contract (written only by their dedicated endpoints — `tags`
> isn't a `classes` column, so a PATCH carrying it would have broken), with `featuredCategory` now
> honored on create. **New infra prerequisite:** R2 had to be enabled on the Cloudflare account (owner
> dashboard opt-in) and the `ritmofit-images` bucket created before deploy — the runbook's environment
> matrix predates R2. **Migration `0013`** (`class_tags` + `classes.featured_category` /
> `classes.cover_image_url`, additive/non-breaking) applied to remote D1 before code; remote D1 now at
> `0013`. Migrations-before-code order followed. Pre-deploy gates green: typecheck, lint (repo source;
> untracked local `.ds-sync`/`.design-sync` tooling lints dirty but isn't in git or CI), unit 175 +
> web 150, integration 42, web build (PWA SW generated), OpenAPI no-drift. Post-deploy smoke: SPA 200,
> health 200, unauth `/classes` + `/explore` 401, security headers present, served asset hash
> `index-DPf04y_D.js` matches the build, `IMAGES_BUCKET` binding resolves in prod. The cover-serving
> route is session-gated (consistent with the fully-authenticated app — Explore itself requires auth);
> logged-in same-origin `<img>` requests carry the cookie, so covers render. Prior live version
> `12aa76f9` (2026-06-17) is the rollback anchor. Five non-blocking review follow-ups left as a PR
> comment (Spotify 100-track truncation, orphaned-cover cleanup, upload size limit, image `nosniff`,
> `user-scalable=no` a11y).
>
> **Web UI coverage closed + PR-preview decision deferred (2026-06-15, PRs #65–#66, not deployed).**
> PR #66 closes the last REVIEW.md "web UI coverage" SHOULD-FIX with jsdom + Testing Library component
> tests for Dashboard (incl. the keyed rapid-switch guard), the Connections/Share/Teams dialogs, and
> ErrorBoundary (web unit suite 103 → 118; total api 175 + web 118, integration 41). PR #65 recorded the
> integration-test matrix + audit disposition. Separately, evaluated linking the GitHub repo to Cloudflare
> for CI/preview deploys and **deferred PR preview environments** (recorded as a DEFERRED decision in
> REVIEW.md): the repo-link is rejected outright (duplicates CI + pushes toward auto-deploy, conflicting
> with the manual-deploy guardrail); previews revisited when a second reviewer joins or at launch, via a
> `wrangler versions upload` PR job (a version, not a deploy) if pursued. All test/docs-only — no schema,
> migration, API, shared-contract, or OpenAPI change, so **not a deploy**; production stays on Worker
> `768cdded` / remote D1 `0012`. Close-session gates green (typecheck, lint, unit 293, integration 41,
> web build, OpenAPI no-drift).
>
> **LiveMode timeline perf deployed (2026-06-15).** PR #62 closes the REVIEW.md NICE-TO-HAVE
> "avoid rebuilding the active event list on every animation frame": each track's cues/moves are now
> flattened/sorted once per payload, a primitive-returning `trackIndexAt` keeps frame-rate memos from
> invalidating unless the live track changes, and current/next come from a single O(log n) binary search
> over the stable pre-sorted array (`FullList` reuses the same precomputed events). Web-only — no schema,
> migration, API, shared-contract, or OpenAPI change; +8 LiveMode unit tests (suite 3 → 11). All
> CI-equivalent gates green (typecheck, lint, unit api 175 + web 103, 28 Worker/D1 integration, web
> build, OpenAPI no-drift). Worker `768cdded-78b4-4150-a017-d8c92042c750` is live at 100% (supersedes
> `7505f9aa`); remote D1 unchanged (no pending migrations, through `0012`). Post-deploy smoke: SPA `200`,
> `/health` `200`, `/explore` + `/classes` `401`, and the new `LiveMode-Bu73mx7n.js` chunk `200`.
>
> **Integration-test matrix completed + audit gate kept green (2026-06-15, PRs #63–#64, not deployed).**
> PR #63 closes the last REVIEW.md "Expand Worker/D1 integration tests" gaps: new `provider-callback`,
> `provider-disconnect`, and `password-reset` suites drive the mounted worker against Miniflare D1
> (integration suite 28 → 41), covering every OAuth-callback failure branch (state minted via the test
> `ENCRYPTION_KEY`), the disconnect → purge-enqueue side effect, and the full Better Auth reset flow
> (request → reset → sign-in, plus no-enumeration + invalid-token). PR #64 dispositions two
> newly-published dev/build-only vite advisories (`GHSA-fx2h-pf6j-xcff`, `GHSA-v6wh-96g9-6wx3`) that had
> started failing `audit:ci` on `main`. Both are test/tooling-only — no schema, migration, API,
> shared-contract, or OpenAPI change — so **neither is a deploy**; production stays on Worker `768cdded`
> / remote D1 `0012`. Merged after green CI. The integration-test matrix item is closed; at that point,
> the remaining code-level SHOULD-FIX from the review was the Better Auth trusted client-IP header.
>
> **Better Auth trusted client-IP hardening completed and deployed (PR #67, 2026-06-15).** Better Auth now
> keys auth rate limits only from Cloudflare's trusted `CF-Connecting-IP` header, removing
> `X-Forwarded-For` as a fallback because clients can supply values before Cloudflare appends to it. The
> Worker/D1 integration helper now supplies a production-shaped `cf-connecting-ip` header by default, and
> the password-reset suite proves spoofed `X-Forwarded-For` values do not create separate rate-limit
> buckets. No schema, migration, API contract, shared-contract, or OpenAPI change. Merged after green CI
> and deployed to production as Worker `035f196c-e11b-4507-81d7-b5320b42ff2b` (remote D1 unchanged at
> `0012`); smoke-tested SPA, `/api/v1/health`, and a protected route (401 without auth).
>
> **Web design-system reconciliation completed and deployed (PRs #69 + #70, 2026-06-16).** The web app
> now fully adopts the consolidated design system: `tokens.json` re-vendored from the source of truth
> (new primitives, `bg/live`, `radius.sheet`, corrected state colors, default BPM 120→122), Tailwind
> mappings for the `state.*`/`segment.*` channels, the danger channel corrected across 11 components (was
> borrowing the intensity ramp), the three OFL fonts self-hosted (Google Fonts CDN removed, CSP tightened
> to `font-src 'self'`, full per-family `*-OFL.txt` bundled), explicit provider connection states, Live on
> the `bg/live` surface, and an opt-in `[data-theme="light"]` token block. A high-effort code-review pass
> also fixed four pre-existing broken `--rf-*` token references. No schema, migration, API contract,
> shared-contract, or OpenAPI change. PR #69 (the reconciliation) shipped first as Worker `ce1b41e9`, then
> PR #70 (the OFL license bundle) as Worker `d4613501-c176-49cf-ad44-2e3f166bf3c8` (remote D1 unchanged at
> `0012`); both smoke-tested — SPA, `/api/v1/health`, a protected route (401), the self-hosted font assets,
> and the three OFL license texts (`200 text/plain`).
>
> **Standalone design-system synthesis completed (2026-06-15).** A reviewable reference package now
> lives at the workspace root in `ritmofit-design-system-final/`. It consolidates canonical tokens and
> guidance, adds a first-class Library-to-Builder creation flow, and includes framework-free mockups for
> marketing, Library, Builder, Live, share cards, iOS direction, sign-in, and explicitly future-facing
> Explore/Teams surfaces. This does not alter production components, API contracts, schema, migrations,
> or deployment state. Production adoption remains a separate reviewable implementation phase. **The
> canonical design system is still the in-repo [`../ritmofit_design_system/`](../ritmofit_design_system/);**
> the workspace-root `ritmofit-design-system-*` directories and HTML mockups are exploration artifacts,
> not the source of truth.
>
> **Pre-launch blocker remediation deployed (2026-06-14).** PR #45 shipped four audited launch fixes:
> production OAuth callbacks use the canonical web origin; shares and team grants require a verified
> target identity; Dashboard class detail is keyed by class/request and rejects stale responses; and
> provider disconnect purges clear unprovenanced artwork while retaining exhausted duties in a durable
> failed state. Remote D1 is migrated through `0009` (`failed_at` plus the active-queue index), and Worker
> version 46 (`aa26e286-c517-444a-952f-d5e410c9439f`) is live at 100%. Health, SPA, protected-route,
> code-split asset, and missing-state SoundCloud callback smokes passed; the callback now returns to
> `https://ritmofit.studio`.
>
> **Production transactional email verified (2026-06-14).** Resend verifies
> `ritmofit.studio`; public DNS resolves the sending MX/SPF/DKIM records and DMARC policy.
> Worker secret-only version 48 (`5bcf4a47-5795-4832-b8b0-bde95d651b3d`) supplies a
> sending-only, domain-restricted `RESEND_API_KEY` and explicit `EMAIL_FROM`. A real
> Gmail-alias signup received and completed email verification (`email_verified = 1`);
> the password-reset email also arrived, opened the valid reset form, and completed the
> password change. The temporary production account and its cascaded auth rows were
> removed after the test. The transactional-email launch blocker is closed.
>
> **Pre-launch hardening + verification (2026-06-15).** Three web-focused PRs: **#51** an accessible
> `Dialog` primitive (focus trap/return, `inert` background) adopted across all five dialogs, real form
> labels, and narrow-width (390 px) layout fixes; **#52** a dialog focus guard (keep focus inside when an
> in-dialog control is removed) plus committed Playwright browser smokes (`apps/web/smoke/`: narrow-width
> 18/18, functional 16/16) and a deploy/rollback runbook (`deployment-runbook.md`); **#53** release-gate
> hardening — Prettier boundary so `format:check` is green, the four dev/build-only `esbuild`/`vite` audit
> advisories dispositioned via `pnpm-workspace.yaml`, and both wired into CI (no deploy — tooling only).
> #51/#52 are live; Worker `1eb04d11-b676-43b5-a7be-7b62ffe83f6a` at 100%, remote D1 through `0010`.
> **0 launch blockers remain**; the Follow-Up Verification Checklist in `../REVIEW.md` is now green except
> a vite 5→6 upgrade (to clear the ignored advisories) and owner-only GitHub branch protection. Remaining
> SHOULD-FIX backend items: add the remaining lookup/cleanup indexes and broaden Worker/D1 integration
> tests.
>
> **Web hardening — class-library pagination deployed (2026-06-15, PR #54).** `GET /classes` now resolves
> ownership, direct/team shares, duplicate-path access rank, deterministic ordering, and optional
> keyset pagination inside D1. The web library loads 30 classes at a time; the unparameterized full-array
> response remains compatible with the current iOS client. Migration `0011` adds owner/share lookup
> indexes. Remote D1 migrated through `0011`; Worker `86c996ff-4b75-4ea0-bf8e-0ed59910c125` is live at
> 100% (supersedes `1eb04d11`). Post-deploy smoke: SPA `200`, `/health` `200`, `/classes` `401` (incl.
> `?limit=5`), 6/6 security headers present.
>
> **Backlog batch deployed (2026-06-15, PRs #55–#61).** The overnight hardening backlog merged to `main`
> and the runtime/schema changes shipped together. **#57** adds the `track_provider_ids.track_id` lookup
> index and the `rate_limit.last_request` pruning index via migration `0012` (index-only); **#56**
> lazy-loads/async-decodes non-critical album art; **#58** renders a 404 view for unknown SPA paths;
> **#60** adds owner-only inline class rename. **#55**/**#61** add choreography write-path and team-share
> detail-access Worker/D1 integration tests (suite 21 → 28); **#59** rewrites the README as a real entry
> point and drops the stale root `.dev.vars.example`. Remote D1 migrated through `0012`; Worker
> `7505f9aa-3655-4bef-b6b3-1b2085d627eb` is live at 100% (supersedes `86c996ff`). Gates green (api 175 +
> web 95 unit, 28 integration, build, OpenAPI no-drift, audit:ci). Post-deploy smoke: SPA `200`
> (`index-CMFEcIls.js`), `/health` `200`, `/classes` `401`, 6/6 security headers present. Remaining
> SHOULD-FIX: broaden the integration matrix (provider callback config, disconnect purge SQL, password
> reset) and the deferred LiveMode RAF memoization + Better Auth trusted client-IP header.
>
> **Web design-system build (builder UI) underway (2026-06-12).** The rich planning UI M1 deferred is
> now being built in vertical slices — the difference between the data-flow skeleton and the designed
> surface in [`../ritmofit_design_system/`](../ritmofit_design_system/). Slices 1–4 are merged (PR #8)
> and **deployed** (Worker version `4afed022`, no schema change): (1) the energy-arc **intensity ribbon**,
> (2) low-noise **song rows** (44px art, Martian-Mono BPM, intensity bars), (3) the **track inspector**
> (edit intensity/BPM/notes, remove), (4) **cue + placed-move authoring**. Also wired **vitest into
> `apps/web`** (geometry unit test). Slices 5–6 added drag/keyboard reorder and inline-edit of cues/moves
> (PRs #9–#10). **Slice 7** assembles it all into the spec'd **full 3-pane `09` layout** (library · class
> workspace · sticky inspector, with a class-header summary) — purely presentational, no schema/API/shared
> change; `pnpm test` = api 159 + web 17 = **176** *(merged PR #13, **deployed** 2026-06-12, Worker
> version `810f25d3`)*. **Slice 8** adds the **cue color picker** (rationed palette, no plasma; tags the
> existing `cues.color`; deployed, Worker `74a94ec5`). **Slice 9** adds **custom user-moves** (create +
> place reusable moves from the inspector; web-only — the `/user-moves` routes + run-payload name
> resolution already existed; *merged PR #17, **deployed 2026-06-12**, Worker `511af62c`*). **Slice 10**
> adds the **timeline-marker strip** beneath the ribbon (proportional track blocks + ▲ cue / ◆ move markers
> on a shared time axis; *merged PR #19, **deployed 2026-06-12**, Worker `ca91c8c5`*). **Slice 11** makes
> the timeline's blocks + markers **clickable/keyboard-selectable** (open a track in the inspector,
> cross-highlight its row; *merged PR #21, **deployed 2026-06-13**, Worker `755e3489`*). **Slice 12** makes
> a cue/move **marker click focus its row** in the inspector (*merged PR #23, deployed, Worker `802ebe48`*).
> **Slice 13** adds a **custom-moves manager** (rename / description / delete via a dialog from the Moves
> section; web-only over the existing `/user-moves` routes; *merged PR #25, **deployed 2026-06-13**, Worker
> `cc437560`*). **Slice 14** adds the signature **on-beat pulse** — the Live "Now" cue card breathes on the
> track's beat (CSS, reduced-motion-safe; *merged PR #27, **deployed 2026-06-13**, Worker `9a298d21`*).
> **Slice 15** adds the All-Out **"drop"** — a plasma glow bloom + cue crossfade on all-out cue advances in
> Live (CSS, reduced-motion-safe; *merged PR #29, **deployed 2026-06-13**, Worker `c3a502c0`*). **Slice 16**
> adds the **segment band** — a new `class_sections` table (**migration `0006`**) + fixed `segmentType` enum,
> full-stack (shared + CRUD routes + additive run-payload `sections[]` + a `SegmentBand` under the timeline);
> this is the first builder slice that **does** change schema + contract (*merged PR #31, **deployed
> 2026-06-13**, Worker `14d363cf`; remote D1 migrated to `0006`*). Slices 7–15 were no schema/API/shared change.
> **Slice 17** adds **stable cue/move `id`s to the run-payload** — an **additive** contract change (no
> schema/migration; `schemaVersion` stays 1) so the timeline marker→row focus correlates by id and two
> cues/moves at the same `anchorMs` disambiguate (closes the slice-12/16 caveat) — and hardens the
> contract iOS Phase 2 consumes; `pnpm test` = api 159 + web 49 = **208** (*merged PR #33, **deployed
> 2026-06-13**, Worker `7edfda8a`, no schema/migration*).
> Deferred: the planning-timeline pulse, the playhead/tap-to-seek, segment icons/drag-resize, custom-move
> `baseMoveId`/`template` editing, and a run-payload `id` on `sections[]` (symmetry, if iOS wants it). See
> `milestones.md` for the full slice log.
>
> **Music frontend (the "M2 frontend") complete + deployed (2026-06-13).** M2's provider backend had
> shipped with **no UI** (tracks were hand-typed as Title/Artist/ms); that gap is now closed. **S1**
> track search → import → add (provider-picked, debounced, 44px song cards); **S2** provider-connection
> settings (connect/disconnect, clear states); **S3** "search my likes" (token-spending); **S4** a BPM
> lookup button. Then, when real credentials were first set, two **prod-only** bugs surfaced (the mock
> path never exercised live `fetch`/limits) and were fixed: a Workers `Illegal invocation` from passing
> the **bare global `fetch`** to adapters (→ a bound `fetch` wrapper) and **Spotify rejecting `limit=25`**
> with 400 "Invalid limit" (→ 10); provider failures now also map to **502** (typed `ProviderError`), not
> 500. **All three providers verified live in prod** (SoundCloud / Spotify / Apple Music — real search +
> import + album art; secrets set via `wrangler secret`, Apple developer-token minted by the new
> `apps/api/scripts/apple-dev-token.mjs`). `pnpm test` = api 159 + web 53 = **212**. PRs #35–#37; latest
> Worker after the error-mapping fix. **Open:** SoundCloud per-user *Connect* OAuth round-trip needs the
> redirect URI registered + a browser login to confirm (provider *search* via app-token is verified).
>
> **iOS Phase 2 underway — near complete (2026-06-15).** The native live surface in `ritmofit-ios`
> (built against this same backend/run-payload) has merged slices **1–10 plus slice 11 partials** to
> `main` (PRs #5–#13); only VoiceOver, error-boundary review, and a launch screen remain. iOS status is
> tracked in `ritmofit-ios/ritmofit_dev_plan/BUILD_ORDER.md`, the source of truth for that repo — this
> plan does not re-track iOS slices. The web *backend* build order is done; the web *UI* design-system
> build continues.
>
> **Web hardening — track-duration Live guard deployed (2026-06-14).** PR #49 adds
> class-specific `class_tracks.duration_ms_override` (migration `0010`), letting owners/editors repair an
> unknown or incorrect provider/library duration without mutating another user's private track.
> Sequencing, anchor validation, copies, and the run-payload use the effective duration
> (`override ?? track.duration_ms`). The builder labels missing durations, offers an `m:ss` correction
> in the inspector, and blocks Live mode until every track has a positive duration. Unit/component
> tests (241), Worker/D1 integration tests (17), CI, and fresh-D1 migration verification passed.
> Remote D1 was migrated through `0010` before Worker
> `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` deployed at 100%. Health, SPA, auth enforcement,
> security-header, main-bundle, and Live-mode chunk smokes passed.
>
> **Web hardening — Live provider handoff deployed (2026-06-14).** PR #50 adds explicit
> provider-app/site handoff links for the active track in Cue-by-Cue and Full List views, using the
> run-payload's existing `providerRefs`. A web-only validator accepts Spotify
> track URIs and provider-owned HTTPS links for Spotify, Apple Music, and SoundCloud while suppressing
> null, malformed, cross-provider, and unsafe stored values. This does not embed, mix, or control
> playback and does not change schema, migrations, API behavior, shared contracts, or OpenAPI.
> Typecheck, lint, 246 unit/component tests, 17 Worker/D1 integration tests, the production web build,
> and OpenAPI drift verification passed. A local browser pass confirmed both Live views, 44px handoff
> targets, provider order/labels, external-link attributes, and suppression when no trusted URI remains.
> CI passed; merged `main` deployed as Worker `babcb3fe-9f7c-4e17-9e65-ab0c16b7784f` at 100%.
> Remote D1 remains through `0010`. Production health, SPA, auth enforcement, security headers, exact
> main/Live asset hashes, and browser runtime/CSP smokes passed.
>
> **Design system — audited final package integrated + deployed (2026-06-17).** PR #74 reconciled the
> in-repo `ritmofit_design_system` with the audited `ritmofit-design-system-final` as a union merge:
> `tokens.json` gains an oklch heat gradient and a light-theme sticky-header token (`headerLight`), now
> wired through the app emitter so `[data-theme="light"]` overrides the topbar; `build-tokens.mjs` /
> `lint-tokens.mjs` gain spacing-scale emission + a guard while keeping the web copy's `--check` / prose
> lint tooling; specs + README reconciled. No schema/API/migration change. `npm run verify`, typecheck,
> lint, **322** unit (web 147 + api 175) + **42** Worker/D1 integration tests, the web build, and OpenAPI
> no-drift passed; merged `main` deployed as Worker `12aa76f9-3a3f-4fc3-8950-f8096434dd31` at 100% (remote
> D1 unchanged through `0012`). Prod CSS verified SHA-256-identical to a fresh build; a live browser render
> confirmed the heat gradient, oklch bloom, and warm-white light header. A post-merge **integration audit**
> (9 dimensions + live render) found the token pipeline, emitters, tooling, and prod artifact clean, and
> surfaced three doc-accuracy issues fixed in PR #75 (docs-only, no redeploy): stale `light.html`
> "no light variant" copy, the brief's class-naming convention (the app uses an `rf-` component namespace,
> the mockups bare names), and a "web uses fluid `clamp()`" type claim true only of the mockups.

---

## From milestones.md — builder-UI / music-frontend / post-launch hardening log

## Web design-system build (builder UI) — in progress

Not a numbered milestone: this is the **rich planning UI M1 deferred** ("layered on after the data flow
works"), turning the functional-but-skeleton builder into the surface specified in
[`../ritmofit_design_system/`](../ritmofit_design_system/). Built in small vertical slices on top of the
existing backend/run-payload — **no schema, API-contract, or shared-package change**. Slices 1–4 merged in
**PR #8** and **deployed** (2026-06-12, Worker version `4afed022`):

- ✅ **Slice 1 — energy-arc ribbon** (`IntensityRibbon`): the signature staircase area graph; height
  encodes each track's intensity zone (grayscale-safe, color is reinforcement), plasma kiss at all-out,
  static (reduced-motion-safe). Pure `computeRibbonSegments` helper. Also **wired vitest into `apps/web`**
  + a geometry unit test (root `pnpm test` now runs api 159 + web 5 = **164**).
- ✅ **Slice 2 — low-noise song rows** (`SongRow`): 44px album art, title/artist, BPM in Martian Mono,
  intensity as bars+label. Extracted the shared `IntensityReadout` out of `LiveMode` (one definition of
  the redundant-encoding rule).
- ✅ **Slice 3 — track inspector / detail editor** (`TrackInspector`): select a row → edit intensity,
  display-BPM override, notes; remove the track. Edits reshape the ribbon + rows live. Gated on
  owner/edit access. Added `updateClassTrack` / `deleteClassTrack` (existing `PATCH`/`DELETE
  /class-tracks/:id`).
- ✅ **Slice 4 — cue + placed-move authoring** (`ChoreographyEditor`): add/list/delete cues (anchor +
  text) and placed moves (a `GET /moves` library move or freeform `nameOverride`, anchored, optional
  intensity; honors the at-most-one-reference invariant). Added the cue/move/library client fns.
- ✅ **Slice 5 — drag + keyboard reorder of the track list** (merged, PR #9): the ordered song rows
  reorder by dragging a dedicated grip handle (kept off the selection button so click-to-select and drag
  never collide) and by keyboard (↑/↓ on the focused grip — native DnD isn't keyboard-operable). Persists
  via the existing `POST /classes/:id/tracks/reorder` (edit access) and reloads the detail so the ribbon +
  per-track offsets recompute; optimistic order with rollback on failure; view-only shows no grip. New
  pure `moveItem` helper (`lib/reorder.ts`, unit-tested) + `reorderTracks` client fn. No
  schema/API-contract/shared change.
- ✅ **Slice 6 — inline-edit existing cues & placed moves** (merged, PR #10): the `ChoreographyEditor`
  cue/move rows gain an **Edit** affordance (one row editable at a
  time, seeded from the persisted row, Save/Cancel) on top of slice 4's add/list/delete. Cues edit
  anchor + text; placed moves edit anchor + library-pick/custom-name + optional intensity. Backed by the
  existing `PATCH /cues/:id` + `PATCH /class-track-moves/:id` (edit access; the move route re-validates
  the at-most-one-reference invariant on the merged result). Switching a move's reference nulls the
  others; a "Keep current move" sentinel preserves a non-listable `userMoveId` untouched. `updateCue` +
  `updatePlacedMove` client fns; no schema/API-contract/shared change. `pnpm test` = api 159 + web 11 = **170**.
- ✅ **Slice 7 — the full 3-pane `09` layout**: replaced the 2-column inline-inspector builder with the
  spec'd workstation — a **persistent top bar**, then a `xl:grid-cols-[266px_1fr_340px]` grid (collapses
  to one stacked column below `xl`): a sticky **class library** rail (left), the **class workspace**
  center column (a new `ClassHeaderCard` with title + visibility + derived summary stats → energy ribbon
  → track list → add-track), and a **sticky right-hand inspector** (the `TrackInspector` + its nested
  cue/move authoring, with its own scroll and a "select a track" placeholder). The header summary
  (**track count · assembled total · avg BPM**, label+number not color alone) is derived from the
  existing run-payload via a pure, unit-tested `lib/class-summary.ts` (`avgBpm` + `formatDuration`) — no
  new data. Existing components were re-parented untouched; the workspace is keyed by class id so opening
  another class clears the track selection. No schema/API-contract/shared change. `pnpm test` = api 159 +
  web 17 = **176**.
- ✅ **Slice 8 — cue color picker**: cues can be tagged with a color in the inspector's `CuesSection`
  (add + inline-edit), persisted to the existing `cues.color` (no schema/API/shared change — the column,
  route, and run-payload were already wired). A new accessible `CueColorPicker` (radio-group, text-labelled
  swatches, cyan selected-ring) offers a **None** option + the rationed copper/cyan/amber/ember/bone
  palette and **never plasma** (`02-color-system.md`); rationing is enforced in the picker. A stored color
  outside the palette renders as a trailing "current" swatch so editing never silently drops it. Cue rows
  show a small color dot (decorative — time + text still carry the meaning). Palette + `tagLabel` live in
  pure, unit-tested `lib/cue-colors.ts`. A PR-review pass swapped the picker's `radiogroup`/`radio` roles
  for an `aria-pressed` toggle `group` (no arrow-key pattern to honor). `pnpm test` = api 159 + web 22 =
  **181**. **Merged PR #15, deployed 2026-06-12** (Worker version `74a94ec5`; no schema/migration).
- ✅ **Slice 9 — custom user-moves**: instructors can create reusable custom moves and place them from the
  inspector's `MovesSection`. The backend (`GET/POST /user-moves` owner-scoped; placed-move routes already
  validate an owned `userMoveId`; run-payload already resolves user-move names) needed **no change** — this
  is web-only: new `listUserMoves` / `createUserMove` client fns; `MovesSection` loads the caller's user
  moves, lists them as a "Your moves" `<optgroup>` beside the global "Library", and a **"＋ New custom
  move…"** option creates-and-places in one Add (then selects the new move so a repeat Add re-uses it).
  Picker values are source-prefixed (`m:`/`u:`) to disambiguate the two UUID spaces — a pure, unit-tested
  `lib/move-pick.ts` (`parseMovePick`/`pickForPlacement`). `nameOf` now resolves user-move names (was
  `(move)`). This also **retired the `KEEP` sentinel** (user moves are listable now) and **fixed the
  `TODO(select-fallback)`** (a fallback `<option>` for an unresolved id when the library/user-moves fetch
  fails). No schema/API-contract/shared change. `pnpm test` = api 159 + web 30 = **189**. **Merged PR #17,
  deployed 2026-06-12** (Worker version `511af62c`; no schema/migration).
- ✅ **Slice 10 — timeline-marker strip**: a thin **timeline** band beneath the energy ribbon that shares
  its time axis — proportional numbered **track blocks** with **cue (▲)** and **placed-move (◆)** markers at
  their absolute time (`trackStart + clamp(anchorMs, 0, trackDuration)`). Cues/moves are **distinct shapes**
  (not color alone, 09); cue markers carry the cue's color tag, move markers the intensity color — both
  decorative, with shape + position + a `time — text/name` title/aria carrying the meaning. New
  `TimelineStrip` component + a pure, unit-tested `computeTimeline` (same duration-share math as
  `computeRibbonSegments`, so the strip lines up under the ribbon; null/zero-duration tracks drop their
  block + markers). Rendered inside the ribbon card in `Dashboard`. **Static — no playhead** (a Live /
  on-beat concern, deferred); read-only this slice. No schema/API-contract/shared change. `pnpm test` =
  api 159 + web 37 = **196**. **Merged PR #19, deployed 2026-06-12** (Worker version `ca91c8c5`; no
  schema/migration).
- ✅ **Slice 11 — timeline selection**: the timeline strip's track blocks and cue/move markers are now
  **clickable + keyboard-operable** — selecting one opens that track in the inspector and cross-highlights
  its `SongRow` (the open track's block is ringed, `aria-pressed`). `computeTimeline` carries each
  block/marker's `classTrackId` + `position`; `TimelineStrip` gained optional `selectedTrackId` +
  `onSelectTrack` (a plain select, not toggle), with a non-interactive fallback preserved. `Dashboard`
  wires `onSelectTrack={setSelectedTrackId}`. Marker hit areas are padded around the glyph. No
  schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #21, deployed
  2026-06-13** (Worker version `755e3489`; no schema/migration).
- ✅ **Slice 12 — focus a cue/move from its marker**: clicking a timeline **cue (▲) / move (◆)** marker now
  selects the track *and* scrolls the matching inspector row into view with a brief highlight flash (clicking
  a track block still just selects). Markers carry the in-track `anchorMs`; `onSelectTrack` gained an optional
  `{ kind, anchorMs }`; `Dashboard` holds a `markerFocus` (`+ nonce` so re-clicking re-flashes) and threads it
  through `TrackInspector` to `CuesSection`/`MovesSection`. A shared `useFlashFocus` hook scrolls + transiently
  rings the row whose `anchorMs` matches (correlated by `anchorMs` since run-payload cues/moves carry **no
  id**). No schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #23,
  deployed 2026-06-13** (Worker version `802ebe48`; no schema/migration).
- ✅ **Slice 13 — manage custom moves**: a `CustomMovesDialog` (opened via a **Manage…** button in a track's
  Moves section) lists the caller's custom moves and lets them **rename**, edit the **description**, and
  **delete** (inline two-step confirm; deleting a referenced move is safe — the server snapshots its name
  into placements' `nameOverride`). Web-only: added `updateUserMove`/`deleteUserMove` client fns over the
  existing owner-scoped `PATCH`/`DELETE /user-moves/:id`. On a change, `MovesSection` refreshes the picker
  + this track's placements and bubbles `onChanged` (`TrackInspector` wires it to the class-detail reload,
  so the ribbon/timeline move names stay current). Creation stays in the picker; **`baseMoveId`/`template`
  editing deferred**. No schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**.
  **Merged PR #25, deployed 2026-06-13** (Worker version `cc437560`; no schema/migration).

- ✅ **Slice 14 — on-beat pulse (Live HUD)**: the focal **"Now" cue card** in Live mode breathes one cycle
  per beat (`--rf-beat = 60s / --rf-bpm`, `onBeat` easing `cubic-bezier(0.4,0,0.2,1)`) while playing — the
  design system's signature tempo cue (`10-rhythm-system.md`). CSS-driven (`rf-beat-pulse` keyframes in
  `index.css`, transform + box-shadow only); `LiveMode` adds the class + inline `--rf-bpm` to the Now card
  when `playing && displayBpm != null`. **Exactly one pulsing element**, and **fully removed under
  `prefers-reduced-motion`** (a user loses affect, not information — the cue stays legible). No
  schema/API-contract/shared change. `pnpm test` = api 159 + web 39 = **198**. **Merged PR #27, deployed
  2026-06-13** (Worker version `9a298d21`; no schema/migration).

- ✅ **Slice 15 — the All-Out "drop"** (10 §5, the one big motion spend): in Live mode, while the **live
  track's intensity is `all_out`**, each cue advance blooms a one-shot **plasma glow** (the `peak-glow`
  token) behind the "Now" card and the cue text **cross-fades in**. Rationed to all-out tracks (a handful
  of times per class); layers with the slice-14 beat pulse. CSS-driven (`rf-drop-bloom` + `rf-drop-in`
  keyframes, re-triggered by remounting the bloom/text on the current cue); **degrades to an instant,
  glow-free swap under `prefers-reduced-motion`**. No schema/API-contract/shared change. `pnpm test` =
  api 159 + web 39 = **198**. **Merged PR #29, deployed 2026-06-13** (Worker version `c3a502c0`; no
  schema/migration).
- ✅ **Slice 16 — segment band (fixed enum)** — *the first design-system-build slice that changes schema +
  the contract.* A new **`class_sections`** table (**migration `0006`**) holds time-anchored segment bands;
  a fixed `segmentType` enum (`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`, lower_snake; labels/tints
  presentation-only). Full stack: shared `classSection` schemas + enum; CRUD routes (`GET/POST
  /classes/:id/sections`, `PATCH`/`DELETE /sections/:id`) class-scoped via a new `requireSectionAccess`
  (view reads, edit writes); the run-payload gains an **additive** `sections[]` (`schemaVersion` stays 1);
  OpenAPI regenerated. Web: a `SegmentBand` under the timeline tiles bands by start (pure, unit-tested
  `computeSegmentBands`; each band is **label + tint dot**, never color alone) + an edit-gated add/retime/
  retype/delete editor. **Start is a free anchor** (no bound to the assembled duration — it shifts as
  tracks change; render clamps + tiles). Deferred: Material-Symbol icons, drag-resize, track-range binding.
  `pnpm test` = api 159 + web 44 = **203**. **Merged PR #31, deployed 2026-06-13** (Worker version
  `14d363cf`; **remote D1 migrated to `0006` first** — additive `class_sections` table).
- ✅ **Slice 17 — stable cue/move ids in the run-payload** — *an additive contract change (no schema/
  migration).* The run-payload's cues and placed moves now carry a stable **`id`** (the existing
  `cues.id` / `class_track_moves.id` PKs, already selected during assembly — no new queries);
  `schemaVersion` stays **1**. Shared `runPayloadCue`/`runPayloadMove` schemas gain `id: uuidSchema`;
  OpenAPI regenerated (+two `id` fields only). Web: the timeline **marker→inspector-row focus** now
  correlates by **id** (pure, unit-tested `resolveFlashRowId`: exact id match → first-row-at-same-anchor
  fallback for legacy/changed ids), so **two cues/moves sharing an `anchorMs` disambiguate** — closing the
  slice-12/16 caveat. `id` threads through `TimelineMarker`/`computeTimeline` → `onSelectTrack` →
  `Dashboard` `markerFocus` → `Cues`/`MovesSection`. This also hardens the contract iOS Phase 2 consumes.
  `pnpm test` = api 159 + web 49 = **208**; typecheck (4 pkgs) · lint · web build green. **Merged PR #33,
  deployed 2026-06-13** (Worker version `7edfda8a`; **no schema/migration** — additive contract).

- ✅ **Slice 18 — Live timeline playhead/seek + segment drag-resize** (PR #73, deployed 2026-06-16):
  closes three of the deferred-backlog items below. The builder's static `TimelineStrip` is brought into
  Live mode as the transport **scrubber** — a new `LiveTimeline` reuses `computeTimeline()` for the
  proportional track blocks + cue (▲) / move (◆) markers, fills the played portion, and draws a moving
  **playhead** at the current class time; it replaces the plain `<input type=range>` with an accessible
  `role="slider"` (aria value text; pointer click/drag + ←/→ · PageUp/Dn · Home/End), seeking the existing
  virtual prompter clock only (no audio — the three music rules hold). Each segment boundary becomes a
  **drag-resize handle** (accessible slider) that re-times `startOffsetMs` via the existing
  `PATCH /sections/:id`, clamped between neighbors (1s min gap) so a drag can't reorder/collapse bands,
  committing on pointer-up/Enter/blur and reverting on failure; the numeric `SegmentEditor` stays the
  precise/secondary path. Adds a per-type inline-SVG **energy-arc icon** (label + icon + tint, never color
  alone; no font/CDN, so `font-src 'self'` is unaffected). Web-only: no schema, migration, API,
  shared-contract, or OpenAPI change. `pnpm test` = api 175 + web 147; CI green. **Deployed** in Worker
  `db6265f2-4ed0-48f0-8b8b-4c03801c0247` (alongside the additive API PR #72); remote D1 unchanged at `0012`.

**Deferred (flagged in code):** custom-move **`baseMoveId`/`template`** editing, the **playing-track pulse
in the planning timeline** (no "playing" state in the builder), and segment-band **track-range binding**
(snapping boundaries to track starts). *(Slice 18 closed the timeline **playhead** / tap-to-seek and the
segment-band **icons** + **drag-resize** items.)* The run-payload's
`sections[]` still carries **no id** (sections aren't part of marker→row focus; a symmetry follow-up if
iOS wants it). *(The slice-12/16 **marker→row `anchorMs` disambiguation caveat** was **resolved in slice
17** — cues/moves now carry ids; the PR #10 `TODO(select-fallback)` was resolved in slice 9.)*

---

## Music frontend ("M2 frontend") — built + deployed, all providers live (2026-06-13)

M2 shipped the provider **backend** with no UI — tracks were hand-entered (Title/Artist/ms). This wired
the music layer into the builder and took it to **real catalogs in prod**.

- ✅ **S1 — track search & import** (PR #35): provider-picked, debounced search → low-noise **44px song
  cards** → one-click import-and-add (`GET /providers/:p/search` → `POST /providers/track-import` → add by
  `trackId`). Manual entry kept as a de-emphasized fallback. `lib/providers.ts` (labels/order — SoundCloud
  first — + enum-drift guard); `TrackSearch.tsx`.
- ✅ **S2 — provider connections** (PR #36): `ConnectionsDialog` (top-bar **Connections**) — connect /
  disconnect with clear connected/disconnected state; mock seam links inline, live flow redirects to the
  authorize URL; disconnect is confirmed (triggers the 7-day metadata purge).
- ✅ **S3 — "my likes"** (PR #36): a **Search / My-likes** toggle in `TrackSearch` (`GET /providers/:p/likes`,
  spends the user token).
- ✅ **S4 — BPM lookup** (PR #36): a **Look up BPM** button in the inspector (`POST /tracks/:id/bpm-lookup`,
  never Spotify). S5 (album art on rows, empty/disconnected states) was already satisfied by existing code.
- ✅ **Prod hardening** (PR #37) — two bugs the mock path never exercised, found once **real creds** were
  set and fixed live: (1) **`TypeError: Illegal invocation`** on every provider — the **bare global `fetch`**
  passed to adapters loses its `this` in the Workers runtime (miniflare tolerated it); fixed with
  `lib/fetch.ts` `boundFetch` at all 8 call sites. (2) **Spotify search 400 "Invalid limit"** — Spotify's
  client-credentials search now rejects `limit=25` despite the documented 0–50; lowered to **10**. Also:
  adapters now throw typed **`ProviderError`** so provider failures map to **502** (logged), not an opaque
  500; the Apple developer token is minted by the new **`apps/api/scripts/apple-dev-token.mjs`** (ES256 JWT
  from the untracked `.p8`).
- **Verified live in prod** (`ritmofit.studio`): **SoundCloud**, **Spotify**, and **Apple Music** all return
  real search results and import with album art; throwaway test accounts deleted after each check. Secrets
  set via `wrangler secret put`. `pnpm test` = api 159 + web 53 = **212**; typecheck (4) · lint · build green.
- **Open:** the SoundCloud **per-user Connect** OAuth round-trip needs its **redirect URI registered**
  (`https://ritmofit.studio/api/v1/providers/soundcloud/callback`) + a browser login to confirm end-to-end
  (provider *search* via the app token is verified). Spotify/Apple are **search-only** by design.

---

## Post-launch web hardening

- ✅ **D1-ordered class-library pagination**: `GET /classes` now resolves ownership, direct shares,
  team shares, duplicate-path access rank, deterministic `(updated_at DESC, id DESC)` ordering, and
  optional keyset pagination inside D1. The web library loads 30 at a time with an accessible
  continuation control; unparameterized requests keep the legacy full-array contract for iOS.
  Migration `0011` adds owner/share lookup indexes.
- ✅ **Track-duration Live guard** (PR #49, deployed 2026-06-14): migration `0010` adds
  `class_tracks.duration_ms_override`; sequencing, anchor validation, copies, and the run-payload use
  the class-specific override before the library duration. The builder accepts `m:ss`, flags missing
  durations, and blocks Live mode until every track is timed. Remote D1 is through `0010`; Worker
  `0e9ab61b-acb8-480c-a45d-36ae455dc6c7` is live at 100%.
- ✅ **Live provider handoff** (PR #50, deployed 2026-06-14): Cue-by-Cue and Full List
  expose large, keyboard-accessible "Open in Provider" links for the active track. The links use the
  existing run-payload `providerRefs`; a provider-specific web validator accepts Spotify track URIs
  and trusted Spotify/Apple Music/SoundCloud HTTPS hosts, suppressing malformed or untrusted values.
  Playback remains wholly in provider applications/sites. Web-only; no schema, migration, API,
  shared-contract, or OpenAPI change. Typecheck, lint, 246 unit/component tests, 17 Worker/D1
  integration tests, web build, and OpenAPI drift verification passed; a local browser pass covered
  both Live views plus trusted and suppressed-link states. CI passed; Worker
  `babcb3fe-9f7c-4e17-9e65-ab0c16b7784f` is live at 100%, with remote D1 unchanged through `0010`.

---
