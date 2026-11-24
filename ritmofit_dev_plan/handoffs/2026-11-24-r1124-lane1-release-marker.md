---
date: 2026-11-24
tool: Claude Code (desktop, Neo), round 1124 web Lane 1
lane: lane-1-release-marker
branch: feat/rf-244-release-marker
head: 1cac363
base: ddc811d
prs: ['#796 (draft)']
status: open
---

# Round 1124 web Lane 1: deploys tag what they shipped, `pnpm release:status` says what is due, `deploy.sh` enforces deploy-alone (RF-244)

## Done

- [#796](https://github.com/steven-crosby/ritmofit-web/pull/796) (draft, owner-gated, `needs-owner`),
  for [RF-244](../tasks/RF-244.json). It is not merged; a Lane never merges.
  - `scripts/deploy.sh` tags each deploy `deploy/<UTC YYYY-MM-DDTHHMMZ>-<sha7>` after every
    post-deploy check passes, and pushes only that ref. Exit 3 means the deploy stands but the tag
    did not reach origin.
  - `scripts/deploy.sh` runs a deploy-alone guard before it builds anything; `--allow-batch` lets a
    batch through on the owner's word.
  - `pnpm release:status` (`scripts/release-status.mjs`) prints the newest tag, the merges since and
    the verdict.
  - Tests: new `deploy.sh --self-check` cases, `scripts/release-status.test.mjs` (CI step and
    AGENTS.md gate), and the deploy-script vitest wrapper.
  - Docs: the runbook, start-session steps 5 and 9, close-session §5, and AGENTS.md (Security And
    Deployment, Commands, What CI proves, gate list).
- Filed in the same PR: [RF-245](../tasks/RF-245.json) (backfill the `1eed288` tag, then the first
  real tagged deploy) and [RF-246](../tasks/RF-246.json) (owner-gate does not cover
  `scripts/release-status.mjs`).

## Tasks

- [RF-244](../tasks/RF-244.json): this lane's task.
- [RF-245](../tasks/RF-245.json): RF-244's post-merge acceptance; the conductor's.
- [RF-246](../tasks/RF-246.json): owner-gate coverage for the guard script.
- [RF-243](../tasks/RF-243.json): `apps/api/src/lib/deploy-script.test.ts` now has a 60 s timeout,
  which covers that record's deploy-script case. RF-243 was not edited.

## In flight

- #796 waits for the conductor's final review and the owner's `owner-approved`.

## Restart context

**Backfilling the first tag (for the conductor, after #796 merges; RF-245).** The 2026-11-23 deploy
of `1eed288` (HISTORY) becomes the first tag. The tag's date is the Worker's creation time from
HISTORY. From a clean checkout of `main` on the Neo:

```bash
cat > /tmp/deploy-1eed288.txt <<'MSG'
deploy 1eed288 to production

commit: 1eed288364985e0aed7ada55ac24d0c1e77b80a4
deployed: 2026-11-24T02:37:16Z
worker version: 515bc8fb-24fd-4ff7-b8be-6f7c28aa1e85
rollback version: fedc7fbf-1bc2-46cd-a90a-3059505e0a7b (100%)
spa entry: assets/index-CFKeSijz.js
since: none
batch: backfilled from HISTORY's 2026-11-23 entry; #789 shipped with #790 and #792 before the guard existed
MSG
GIT_COMMITTER_DATE=2026-11-24T02:37:16Z git tag -a deploy/2026-11-24T0237Z-1eed288 \
  1eed288364985e0aed7ada55ac24d0c1e77b80a4 -F /tmp/deploy-1eed288.txt
git push origin refs/tags/deploy/2026-11-24T0237Z-1eed288
pnpm release:status
```

- This is the first tag ever pushed to the repo: no tag existed locally or on origin on
  2026-11-24. A tag ruleset or permission problem would show here first. If one shows, the
  script's exit 3 path is what a deploy would hit.
- Expected `pnpm release:status` afterwards: the newest tag `deploy/2026-11-24T0237Z-1eed288`, the
  merges since (`#795` and the PRs after it, #796 included), and "Verdict: nothing to ship". #796
  changes only scripts, CI, docs, records and a test, none of which ship.
- Rehearsed in a scratch clone of this repo (no push), 2026-11-24. With a tag on `b9e8141`,
  `release:status` gives two steps for the 2026-11-23 range: `scripts/deploy.sh f87c728` (#789
  alone, provider / playback, carrying docs #787 and #788), then `scripts/deploy.sh 1eed288` (#790
  and #792, carrying #791, #793 and #794). `--guard 1eed288` refuses with exit 1, and `--allow-batch`
  records `batch: allowed by --allow-batch (#789 with #790, #792)`. With a tag on `1eed288`, the
  verdict for `ddc811d` is "nothing to ship".
- Not verifiable before a real deploy: wrangler's output formats against production. The version
  IDs come from `WRANGLER_OUTPUT_FILE_PATH`'s `type: "deploy"` entry and from the `(NN%) <uuid>`
  lines of `wrangler deployments status`. Both formats were read in the installed wrangler 4.99
  source. Either one falls back to `unknown`, with a warning, and never blocks the tag.

## Verification

- **The full AGENTS.md gate, on the Neo on 2026-11-24**, run on the final code at load 2 to 8, with no
  iOS build running. Every step passed on its first run:
  - format:check; owner-gate:test (22); rf-trace:test (5); release-status:test (6); tasks:test (11)
  - tasks:check; typecheck; lint; design-system verify; theme-classes and its self-test
  - `pnpm test`: web 1837, API 698, music 30
  - integration: 277 tests in 44 files
  - web build, with the entry at 178.87 kB gzip, within the 180 kB budget
  - e2e: 4 of 4
  - openapi with no diff; contract-parity; audit:ci (2 findings, both on the ignore list)
- **Lane checks:** `bash scripts/deploy.sh --self-check` passed, including nine new cases. The
  vitest wrapper `apps/api/src/lib/deploy-script.test.ts` passed in 1.7 s.
- **Owner-gated paths:** piping the changed files to `node scripts/owner-gate.mjs` lists
  `.github/workflows/ci.yml`, `package.json` and `scripts/deploy.sh` as CI / deploy /
  infrastructure, and `AGENTS.md`, `start-session.md` and `close-session.md` as agent rules. That is
  expected: the PR needs `owner-approved`.
- **Mutations:** each change below turned a case red, and none was committed.
  - `deploy.sh --self-check`: the guard always passing; `git push --tags`; exit 1 in place of 3;
    tests counted as shipped; no step split.
  - `release-status:test`: no `--no-renames`; no local-only warning; no tag-name filter; no fetch.
- **Skipped:** running `scripts/deploy.sh` for real, any wrangler command, and creating or pushing a
  real tag, all out of scope by brief. The script's upload path, its wrangler output parsing and the
  real tag push are therefore unproven until RF-245.

## Production as observed

- Not checked from this lane; production was out of scope.

## Shared zones touched

- `apps/api/src/lib/deploy-script.test.ts`: the brief assigned it to this lane, although `apps/` is
  frozen otherwise. It is a test and does not ship.
- `scripts/owner-gate.mjs` is imported, not changed. `.github/scripts/pr-gates.sh` is untouched.

## Notes for other lanes / iOS

- close-session §5 now runs the iOS `node scripts/release-status.mjs` when an iOS checkout is at
  hand, next to `pnpm release:status`. It assumes iOS Lane 2's script prints its own verdict
  ("iPhone/Mac upload due" or "nothing to ship").
