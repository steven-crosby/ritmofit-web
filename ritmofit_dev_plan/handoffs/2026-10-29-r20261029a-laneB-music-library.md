---
date: 2026-10-29
tool: Claude Code (local)
lane: lane-b-music-library
branch: feat/rf-132-music-library
head: c390910
base: 4206c8c
prs: ['#665 (open, owner-gated)']
status: open
---

# RF-132: Music Songs loads the whole library, search reaches all of it, "Library order" label

## Done

- [#665](https://github.com/steven-crosby/ritmofit-web/pull/665): cursor paging on
  `GET /providers/:provider/likes` (bare-array body, `X-RitmoFit-Next-Cursor` header), Apple Music
  server-side library search (`?q=`), Load more and 1,000-song search auto-load on Music › Songs,
  the Create class subset note, and "Recents" relabeled "Library order". OpenAPI and `api.md`
  updated. Not merged (Lane sessions never merge).

## Tasks

- [RF-132](../tasks/RF-132.json): final state set in #665.
- [RF-148](../tasks/RF-148.json): new Backlog, live Spotify paging check, depends on RF-92.
- [RF-149](../tasks/RF-149.json): new Backlog, TrackSearch likes mode past the first page.

## In flight

- #665 awaits CI on its final head and the owner's `owner-approved` (provider code is owner-gated).

## Restart context

- Owner decisions (2026-10-29, relayed by the orchestrator) are recorded as `observation` evidence
  on RF-132: Spotify narrowing, "Library order", the 1,000-song bound, implementation authority.
- The likes cursor reuses the class-list header name (`CLASS_LIST_NEXT_CURSOR_HEADER`), which
  `apps/api/src/index.ts` already exposes, so no frozen file changed.
- SoundCloud cursor validation is origin-only (`api.soundcloud.com`, no credentials), not
  path-pinned: SoundCloud's spec examples show more than one `next_href` path form. Apple cursors must
  be `/v1/me/library/songs?…` subpaths, and Apple search follows only `/v1/me/library/search?…`.
- After deploy, the owner checks on real accounts: Apple Music Songs shows Load more past 200 and
  finds a song past "Angel" by search; SoundCloud Songs loads more. Spotify stays RF-148.

## Verification

- Run on the `c390910` tree (heavy gates under the shared gate lock):
  `format:check`, `owner-gate:test`, `rf-trace:test`, `tasks:test`, `tasks:check` pass;
  `pnpm -r typecheck` pass (after typing the test mocks); `pnpm lint` pass; design-system verify and
  theme-classes (with selftest) pass; `pnpm test` pass (music 30, web 1550, api 615);
  `test:integration` pass (43 files, 247 tests); web build pass (entry 176.09 kB gzip, budget 180);
  `openapi` then `git diff --exit-code` clean; `contract-parity` pass; `audit:ci` pass (ignored
  advisories only).
- Skipped: `pnpm --filter @ritmofit/e2e e2e` (with `E2E_PORT=8799`) could not launch, because the
  Playwright Chromium headless shell is not installed on this machine. Installing it is a download, so
  it was not done; CI runs the e2e step.

## Production as observed

- Not checked from this environment.

## Shared zones touched

- `apps/api/openapi/openapi.json` and the likes path in `generate-openapi.ts` (assigned to this lane).
  `Dashboard.tsx` (Music parts, assigned). No `packages/shared`, `index.ts`, migrations or
  auth/db/errors helpers.

## Notes for other lanes / iOS

- The likes contract change is additive: no `cursor` gives the first page, and the body is unchanged.
  iOS does not call `/likes`; its OpenAPI snapshot lists the path, so a later, separate iOS PR
  refreshes the snapshot.
