# Deployment preflight for #518/#519 — 2026-10-12

Status: prepared; compile/infrastructure checks pass. Fresh local browser smoke is partial because
Chrome DOM automation could not attach and the Mac locked during the native fallback.
Owner authorized deployment, Git publication and cleanup after preparation. Browser coverage disposition
is pending while the Mac remains locked; deployment has not run. Human audible acceptance stays open.

## Release identity and scope

- Candidate: main `4fd1ecd2e00967b0c14df295e28ae8fcf068b987`, synchronized with origin/main and GitHub main when checked.
- #518 squash `ed00aed`: Live short-screen teaching and visible completion.
- #519 squash `dbc8afb`: Builder refresh/session ownership, Live return and scoped deletion guards.
- #520 squash `4fd1ecd`: verification and session records only.
- Recorded deployed source: `6eeccc0`. The application diff to candidate is exactly
  Dashboard.tsx, Dashboard.test.tsx, LiveMode.tsx and LiveMode.test.tsx.
  API, shared contracts, schema/migrations, auth/provider adapters, playback runtime,
  configuration, lockfile and dependencies are unchanged.
- Source is tracked-clean. Existing untracked .claude/ and these local preflight records are
  preserved and excluded from the 832-input Worker bundle and the static assets directory.

## Completed checks

- All twelve canonical local gates pass on unchanged source hashes. Unit counts: web 1184,
  API 486, music 30; Worker/D1 integration 184. Format, types, lint, design system, theme classes,
  build, OpenAPI no-diff, iOS contract parity and dependency audit pass. `local-gate.json`
  retains commands, timings and logs. Integration-test/dev-email credential-shaped output was
  redacted from shareable logs; `log-redactions.json` records counts and before/after digests.
  CLI trailing whitespace was trimmed with before/after hashes in `log-normalizations.json`. Local Node 26.7.0, pnpm 11.4.0, Wrangler 4.99.0;
  hosted main CI uses Node 22 and also [passed](https://github.com/steven-crosby/ritmofit-web/actions/runs/38343711650).
- Web build produced `/assets/index-C1EvvyLa.js` with SHA-256
  `9c8ac2825d5c5a2cf17be7b831949e6e60fbac192f1388a5cb9573882a25bb95`. The isolated local Worker serves this exact entry.
- Worker deploy **dry run** passed: 35 static asset files, 2892.47 KiB bundle / 473.27 KiB gzip,
  DB/R2 and the two expected public-origin vars. No upload occurred. `build-artifact.json`
  identifies the prepared bundle/output hashes. [Wrangler dry-run semantics](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy).
- Current live Worker is `9563d726-bc4d-44f7-834a-d7dbcc388d19` at 100%.
  Three independent cache-busted SPA entries agree on `/assets/index-DyruxT0m.js`;
  served asset SHA-256 is `dde7b39711f6bc2f7cce1f9dc396c684854f95138d5ad90774b665f7928a529d`.
- Remote D1 reports **no migrations to apply**. No migration apply command is needed for this batch;
  none was executed remotely. BETA_ALLOWED_EMAILS exists by secret **name**; no secret values read.
- Baseline unauthenticated production checks: SPA/health 200; classes/explore/teams 401;
  health security headers present. These are pre-deploy baseline probes, not post-deploy evidence.
  Unauthenticated 401 alone does not prove every route is mounted.

## Rollback anchors

- Immediate rollback target: current Worker `9563d726-bc4d-44f7-834a-d7dbcc388d19`,
  version 182, current SPA `index-DyruxT0m.js`. Version details verified available.
  This reverses the proposed UI release while preserving the previously deployed provider batch.
- Older fallback: Worker `5f67d242-8956-42b7-9318-67b2797d3454`, verified available, historical
  #494 SPA `index-mZ1ypG4t.js`. Use only for a separately reviewed need to undo more of the older batch;
  its asset identity is historical here, not freshly served from that inactive version.
- A Worker rollback republishes code and bindings; it does not restore D1 data. No D1 data restore
  is part of this UI-only release. Do not execute either rollback without deployment/recovery authority.

## Browser checks and remaining setup

A fresh **local-only** Worker/D1/R2 stack serves the built SPA at http://127.0.0.1:8795.
Local migrations were applied to a new temporary database only; no production bindings/data were
used. Synthetic account/class/tracks are isolated. No credentials were saved to Chrome.
Native Chrome directly exposed its **Zoom: 200%** toolbar value, unlike the earlier owner-only
menu confirmation. Native AX and JPEG screenshots retain:

- local signup/onboarding dismissal and empty Cycle class creation;
- create-dialog Shift-Tab/Tab wrapping;
- two manual tracks and successful real API keyboard reorder;
- unsaved draft preservation and keyboard-only grip focus after refresh;
- Live preflight, prompter-only entry, More/timeline keyboard access and visible Complete after
  synthetic End-key seek. This is not a natural run or any provider/audio acceptance.

`native-browser-smoke.json` and JPEGs retain these observations. The browser's DOM automation
connection reports Debugger unattached; native controls were used as the documented alternative.
The Mac then locked before Full List/Exit and Music/Account/connection checks could finish.
No attempt to bypass the lock was made. Manual unlock is required to continue.

Still pending on this fresh built stack: Full List/Exit return, Music/Account navigation,
connection-dialog focus trap/return and the full measured viewport/overflow matrix from
[the browser-smoke contract](../../../apps/web/smoke/README.md). The legacy script was not run
through another browser-control mechanism. Numeric overflow/inert attributes were not newly measured.
Earlier source-identical component/narrow/native evidence remains in [the zoom packet](../native-browser-zoom-2026-10-12/README.md)
and the lane packets; it is not relabeled as a fresh full-stack smoke pass.

## Execution proposal — not run

Before any approved deploy, recheck candidate HEAD/main/origin/GitHub identity, source hashes,
production Worker/SPA, migration status and current BETA_ALLOWED_EMAILS name. Stop/reprepare on
unexpected drift; do not auto-apply unexpected migrations. Finish pending browser checks after unlock,
or obtain an explicit disposition for that actual coverage limit. Human listening stays open.

From the repository root, after separate deployment authorization:

```bash
pnpm --filter @ritmofit/web build
pnpm --filter @ritmofit/api run deploy
```

This targets the canonical apps/api/wrangler.toml and its production Worker, not the temporary
local-smoke config. Building is required because the API deploy script does not build the SPA.
Reconfirm the built entry equals `/assets/index-C1EvvyLa.js` for the pinned source, record the
new Worker version ID and verify it independently of the served SPA.

## Post-deploy smoke plan

1. Record deployment identity and traffic; require three consecutive cache-busted SPA entries
   matching the built index, and verify the JS/CSS asset responses and security/cache headers.
2. SPA and health must be 200; protected classes/explore/teams must be 401 without authentication.
   Run route-specific mounting checks from the canonical runbook/integration contracts; do not award
   mounting acceptance from a generic unauthenticated 401.
3. In an unlocked authenticated browser, inspect only named/tagged QA classes. Check Builder
   layout/selection, Live entry/Exit and completion/control visibility at relevant narrow sizes.
   Controlled write/recovery probes need explicitly scoped QA-fixture authority; no real instructor
   class edits or fixture deletion are implied by deployment.
4. Watch for new load/error/recovery behavior. If the new release fails its technical smoke, stop
   acceptance and use the exact approved rollback target; data restore/older fallback is separate.
5. Record release commit, PRs, Worker version, SPA identity, no-migration result, gate and smoke in
   HISTORY/DEVELOPMENT_PLAN plus an owned handoff. Git publication of those records remains a
   separate authority. Human audible Apple hand-over/Exit and SoundCloud pause/resume/Exit remain
   open until Steven listens; real-iPhone and the existing Live tab arrow-key gap also remain open.

## Boundaries and retained work

No deployment/upload, remote migration, secret/config change, production-data mutation or cleanup
was performed by this preflight. Owner subsequently authorized Git publication; this packet is being
published as a docs PR with the browser checks explicitly pending. Only local build/bundle artifacts,
fresh local-only test state and draft evidence were created. Both previously retained production
QA fixtures, lane/verification branches/worktrees/briefs and unrelated .claude/ remain untouched.
The local smoke stack/window and temporary database are retained for continuation after unlock.
The temporary location pointer is outside the repo; runtime secrets are not in this evidence packet.

## Subsequent authorization and refresh

Steven approved deployment, Git publication, cleanup and guided human audible checks. The Mac is
still locked. An explicit browser coverage disposition or unlock is pending before deployment.
Fresh candidate/source/production/migration/secret-name checks agree with the preflight baseline
(`authorization-refresh.json`). Production fixtures remain needed for human listening and will be
preserved. Cleanup candidates are the two finished managed lane worktrees and three finished
lane/verification branches; exact identities and preservation receipts must be recorded first.

## Cleanup execution — partial

The owner-approved cleanup removed only `codex/verification-zoom-provider-20261012` locally and
remotely after verifying its exact head `a4c909d`, merged #520, and complete-tree equality with
main squash `4fd1ecd`. Both absences are verified. The two managed lane archive calls were refused
because their worktrees are protected by a pinned task or workspace. No manual bypass was used;
both worktrees, their local/remote branches and untracked briefs remain. Primary `.claude/`, existing
tags, production QA fixtures and the local smoke state/server remain preserved. Exact baseline,
branch and preservation identities are in `cleanup-receipt.json`. Untracked briefs are excluded
from this PR; only their hashes and paths are recorded.
