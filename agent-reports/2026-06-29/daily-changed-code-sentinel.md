---
prompt: daily/changed-code-sentinel
repo: ritmofit-web
agent: claude-opus-4-8
date: 2026-06-29
inspected_head: d2b7b4f7cd6db1522f99f960bec935509aaf9d79
inspected_range: ba6d627..d2b7b4f
completed: true
prs: []
---

# daily/changed-code-sentinel — 2026-06-29

## Summary

Inspected `ba6d627..d2b7b4f` on `main` (checkpoint from the 2026-06-28 sentinel
report; `ba6d627` is a clean ancestor of the current head — no history rewrite).
This is a large delta: Sessions 1–7 of the web launch-readiness push, 25
non-merge commits. The substantive code lands in five areas — (1) Library cards
with server-computed aggregates (`ClassListItem`: trackCount / totalDurationMs /
albumArtUrls via a new bounded `class-list-summary` query in `authz.ts`), (2) a
new caller-profile surface (`GET`/`PATCH /auth/me` + `updateUserProfileSchema` +
`AccountDialog`), (3) class-track copy-across-classes (`POST
/class-tracks/:id/copy`), (4) Live Mode section/energy-arc indicator
(`liveSectionAt` + a polite live region), and (5) segment-boundary "snap to
tracks" editing. I reviewed each change and its immediate callers against this
prompt's priorities (user-facing breakage, data loss, authorization, live-class
reliability, cross-client contract drift). **No PR-worthy regression found.** The
full CI-equivalent submission gate plus the iOS contract-parity gate are green on
the current head. Two informational notes carry forward (below); both belong to
other specialists, not a changed-code PR.

## Commands run + results

Full required submission gate on baseline `d2b7b4f`, all green:

- `pnpm install --frozen-lockfile` → ok (Node 22.22.2, pnpm 11.4.0)
- `pnpm format:check` → clean (Prettier, all matched files)
- `pnpm -r typecheck` → pass (4 projects: shared, music, web, api)
- `pnpm lint` → clean (ESLint)
- `pnpm test` → web 237 (38 files) + api 257 (29 files) unit tests pass (incl. new `class-list-summary.test.ts`, `AccountDialog.test.tsx`, `ClassSummaryView.test.tsx`, `CustomMovesDialog.test.tsx`, `relative-time.test.ts`, `LiveMode`/`SegmentBand`/`TimelineStrip` additions)
- `pnpm --filter @ritmofit/api test:integration` → 69 pass (15 files; incl. new `auth-profile.integration.test.ts`)
- `pnpm --filter @ritmofit/web build` → built (index JS 341.78 kB / gzip 100.10 kB)
- `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code openapi.json` → no drift
- `pnpm --filter @ritmofit/api contract-parity` → 7 allowlisted forward-compatible lags, "No untracked contract drift", exit 0
- `pnpm audit:ci` → exit 0 (5 documented/ignored advisories)

## Findings

- **[P3] iOS list/profile parity debt grows with the new web surfaces** — `packages/shared/src/entities/classes.ts:131` (ClassListItem), `apps/api/src/routes/auth.ts:48` (`PATCH /auth/me`)

  - Evidence: `GET /classes` now returns `ClassListItem` (adds `trackCount`, `totalDurationMs`, `albumArtUrls`) and a new `GET`/`PATCH /auth/me` profile surface landed (Session 5 account settings). Both are additive and forward-compatible — Swift `Codable` ignores unknown keys, so existing iOS decoding is not broken — but they widen the web↔iOS surface gap the D18 parity gate governs (`AGENTS.md:32-45`). The contract-parity gate only watches the run-payload, so it does not track these.
  - User impact: none today (additive, non-breaking on both surfaces). Future: iOS Library cards and account settings lack these capabilities until the parity backlog catches up.
  - Recommended owner: product / api-contract-parity + iOS (parity backlog in `ritmofit_dev_plan/web-ios-parity.md`)
  - Recheck next run? no (tracked for the parity specialist).

- **[P3 → being addressed] Documented CI-equivalent gate list still omits `contract-parity` (and `design-system verify`)** — `AGENTS.md:142-152`
  - Evidence: carried over from the 2026-06-28 sentinel. The documented local gate block still does not include `pnpm --filter @ritmofit/api contract-parity` or the design-system verify step that CI runs. **Open draft PR #147 (`[codex] Clean up launch process guidance`) explicitly syncs the CI-equivalent gate docs**, so this is in flight, not an open gap to act on.
  - User impact: none directly; process gap — a contributor running only the documented gate could push iOS DTO drift that fails only in CI.
  - Recommended owner: doc-drift (web) — covered by PR #147.
  - Recheck next run? no (resolved once #147 merges; re-verify then).

Reviewed and cleared (no regression):

- **Library-card aggregates** (`apps/api/src/lib/authz.ts:262`, `apps/api/src/lib/class-list-summary.ts`) — page-scoped: a single bounded `IN (classIds)` query over the page's classes (≤ page limit), correctly guarded against `IN ()` when the page is empty. `totalDurationMs` reuses the run-payload's own `effectiveDurationMs` + `computeClassTimeline`/`computeFreeTimeline` by timeline mode, so a card's runtime matches the opened header. Album art is distinct, in track order, capped at `CLASS_LIST_ITEM_ART_LIMIT` (4). Pure aggregation is unit-tested.
- **`PATCH /auth/me`** (`apps/api/src/routes/auth.ts:48`) — no mass-assignment: `updateUserProfileSchema = userSchema.pick({ displayName, imageUrl }).partial()`, and Zod strips unknown keys, so an attacker cannot patch `email`/`id`/timestamps through the spread into `db.update(users).set(...)`. Scoped to `c.get('userId')`; identity/provider links stay under Better Auth. Integration-tested.
- **Class-track copy** (`apps/api/src/routes/class-tracks.ts:371`) — requires `edit` on **both** source (`requireClassTrackAccess`) and target (`requireAccess`). Notably hardens against a private-ref leak: foreign tracks are cloned into the caller's library and foreign `user_move` names are snapshotted into `name_override`, so a later unshare cannot leave the copier reading another user's private metadata. Owned refs preserved.
- **Live Mode section indicator** (`apps/web/src/components/LiveMode.tsx:135`) — `liveSectionAt` defensively re-sorts sections by `startOffsetMs`, returns null before the first section / for a section-less class; the section announcement uses a _polite_ `aria-live` region kept separate from the assertive cue stream so it never cuts off a cue, and re-announces only on boundary change (text derived from section type alone). Surfaced for accessibility specialist; no regression.
- **Segment "snap to tracks"** (`apps/web/src/components/SegmentBand.tsx:111`) — pure `trackBoundaries`/`snapToTrackStart`/`adjacentBoundary` helpers; snapping only offered when interior track starts exist, numeric editor stays exact, keyboard arrows snap accessibly. Unit-tested.
- **bpm-lookup 503 copy + provider `playlistImport` capability** (`apps/api/src/lib/music/bpm-lookup.ts:35`, `packages/shared/src/enums.ts`) — user-facing wording + an additive `ProviderCapabilities.playlistImport` flag (Spotify-only). Behavior-preserving; matrix stays provider-honest. Surfaced for content-consistency, not regression.
- **seed.sql cycle vocabulary** (`apps/api/src/db/seed.sql`) — 7 additive `INSERT OR IGNORE` moves with valid UUIDs; idempotent, no migration impact.

## Blockers

None. The full required gate plus the iOS contract-parity gate ran to completion
and the run finished inside the timebox. One open PR (#147, docs-only) was checked
for dedup; it covers the carried-over doc gap, so no changed-code PR overlaps it.

## Next recommended action

No changed-code regression PR is warranted this run. Land PR #147 to close the
documented-gate doc gap, then have the `api-contract-parity` / parity specialist
record the new `ClassListItem` card fields and the `/auth/me` profile surface in
`ritmofit_dev_plan/web-ios-parity.md` so the D18 backlog reflects the Session 1–7
web additions.
