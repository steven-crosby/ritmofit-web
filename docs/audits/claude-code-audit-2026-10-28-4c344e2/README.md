# Claude code audit — ritmofit-web @ 4c344e2

**Status: COMPLETE** (limits below). This was an audit-only review. No product code, RF records,
handoffs or board were changed.

| | |
| --- | --- |
| Repository | steven-crosby/ritmofit-web |
| Audited SHA | `4c344e2d895cde1af4f9deefe638c0374c24a750` (`main` = `origin/main`) |
| Started | 2026-10-28T05:29Z, cloud container, Linux |
| Toolchain | Node v22.22.0 (engines >=22.13, `.nvmrc` 22), pnpm 11.4.0 (engines >=11.4.0) |
| Worktree at start | clean, no tracked modifications |
| Open PRs at start | none, so there was no in-flight work to exclude |
| Prior audit | `docs/audits/codex-code-audit-2026-10-27-4e0b150/` (15 commits earlier). Its findings were treated as known. |
| Production alignment | **not checked** |

## Verdict

The codebase is in good shape for a solo hobby project. The CI-equivalent gate is fully green:
2,104 unit tests, 239 D1 integration tests, the e2e smoke at 2/2, no OpenAPI drift, and parity
green. Authz holds across all 83 mounted handlers. **No P0 or P1** survived the challenge pass.

The new defects cluster in three places:

1. **The newest code.** The FairPlay probe from #634/#636 never actually runs (AUD-002). That
   silently undermines the open P1 RF-29 iPhone check, which is waiting on this probe's output.
2. **Async seams the tests model with fakes.** A Live seek or resume during an in-flight provider
   start fails the class (AUD-001). Three Music and Classes dialogs act on stale or hidden requests
   (AUD-005, AUD-007, AUD-008).
3. **Error plumbing.** Database errors log bound parameters, including a live reset token and PII
   (AUD-003). Server-side schema failures come back as unlogged client 422s (AUD-011). And a block
   of the deploy self-check cannot fail (AUD-004), which contradicts RF-88's resolution.

The pattern behind the prior audit still holds: green tests prove what their fakes model. A
`vi.fn()` that ignores its receiver (AUD-002), a fake adapter with no lease (AUD-001) and a bash
subshell with a disabled `set -e` (AUD-004) each let a real defect pass.

## Highest-priority findings

| ID | Sev | New? | One line | Evidence |
| --- | --- | --- | --- | --- |
| AUD-001 | P2 | new | A Live seek, skip or pause→resume during an Apple or Spotify start puts the class in `error` and stops the clock | `repro/c-music-playback-repro.test.ts` |
| AUD-002 | P2 | new (affects RF-29) | The FairPlay probe calls `requestMediaKeySystemAccess` unbound, so it throws and `modern-access:` can never appear | `evidence/lead-cm02-chromium.txt` |
| AUD-003 | P3 | new | A D1 failure logs every bound value (reset token, emails, password hashes) | `repro/d2-quality-q01-reset-token-log.integration.test.ts` |
| AUD-004 | P3 | new; RF-88 wrong | `deploy.sh --self-check` passes a mutant that deploys `sha~1` | `repro/d1-tooling-deploy-selfcheck-mutation.sh` |
| AUD-005 | P3 | new | The saved-playlist dialog can create class "B" with A's songs | `repro/b-web-playlist-stale-tracks.repro.test.tsx` |

`findings.md` has all 14 accepted findings, 7 hardening items, and the status changes to known
items. D-10 is resolved. RF-91's call-site list is missing `authz.ts:288`. C-16 is promoted.

## Files

- `findings.md`: ranked, deduplicated findings with full records.
- `challenge-review.md`: challenge outcomes and rejected leads.
- `coverage.md`: subsystem coverage map and gaps.
- `verification.md`: baseline gate results and the repro index.
- `remediation-plan.md`: 8 RF-ready packets and the decisions needed from Steven.
- `NEXT_SESSION.md`: restart point, unfinished investigations, and unauthorized actions.
- `MANIFEST.md`: every file in the package.
- `lanes/`: lane briefs, the 5 specialist lane reports and the 3 challenger reports (long forms).
- `repro/` and `evidence/`: executable reproductions and sanitized logs. Test tokens are redacted.

## Method

- **Specialist lanes (5):**
  - A: API, authz, data.
  - B: web workflows.
  - C: music and playback.
  - D1: CI and deploy tooling.
  - D2: test quality, performance, dependencies and observability.
- **Challengers (3):** playback/web, API/tooling, and Q-01. Each ran in its own disposable
  worktree at `4c344e2` and re-ran the lane repros.
- **Lead:** owned the gate run, the real-Chromium CM-02 check, the code checks on CM-01, B-01 and
  T-01, deduplication against the prior audit and the RF board, and severity calibration.
- **Total:** 8 subagents.

## Material limits

- No real provider, no audible playback, no WebKit, Safari or iPhone, and no production or remote
  D1. AUD-001, AUD-002 and AUD-006 need device checks after a fix.
- The e2e smoke ran on preinstalled Chromium 1243, through a browser-path override in the
  disposable worktree, because the Playwright CDN is blocked.
- Local Miniflare D1 is not Cloudflare D1.
- The challengers are the same model family as the lanes: independent context, not independent
  judgment.
- Completion does not mean every line was verified or that no defects remain.
