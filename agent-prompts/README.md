# agent-prompts (ritmofit-web)

A library of reusable, paste-and-go prompts for working on **ritmofit-web** (the React/Vite
SPA plus its Cloudflare Worker + D1 API). The default use is Steven's day-to-day loop:
start a focused personal session, do the work, then close it cleanly. The same library also
contains optional remote/background maintenance prompts for ephemeral agents that leave
reviewable draft PRs or short operational reports under this repo's
[`agent-reports/`](../agent-reports/). Reports are **repo-local and git-tracked** — every
ritmofit-web report stays in this repo; the sibling iOS repo keeps its own archive. There
is no shared workspace-level report folder.

> This is the **web-scoped** copy of the library; the sibling **iOS** repo (`ritmofit-ios`)
> keeps its own copy. `remote-prompts/technical/api-contract-parity` reads the iOS contract surface, vendored
> read-only in [`ios-snapshot/`](../ios-snapshot/) — so it needs **no sibling iOS checkout**.
> `remote-prompts/technical/content-consistency` runs its web-internal checks always and only compares copy
> against iOS when a live `ritmofit-ios` checkout is present. Both branch only in this repo.

## How to use

### Personal sessions

1. At the start of any work block, paste `daily/start-session.md`.
2. Review the baseline and plan. For substantial work, confirm the plan before implementation.
3. At the end of the work block, paste `daily/close-session.md`.

Use these prompts repeatedly throughout the day. They are interactive and expect a person in
the loop; they do not run unattended, merge, deploy, or make owner decisions.

### Remote/background runs

The `remote-prompts/` prompts are written for a **remote ephemeral sandbox** — an isolated,
throwaway cloud container that clones the repo fresh and is discarded when the session ends.
They assume no human is watching, so they only ever leave durable output (a pushed branch,
a draft PR, or a committed report). The local launch below — an isolated worktree on your own
machine — is an equivalent way to run the same prompts when you don't have a hosted sandbox.

1. Keep the Mac awake. Confirm GitHub authentication and Node/pnpm before leaving.
2. Launch an isolated agent worktree on this repository (the `claude` CLI shown here is the
   reference launcher). Everything the prompts read is in-repo — reports under
   `agent-reports/`, the API this repo owns, and the iOS client source for the parity prompts
   in `ios-snapshot/` — so no `--add-dir` to a sibling repo is needed:

   ```bash
   cd /path/to/ritmofit-web
   claude --worktree --permission-mode acceptEdits
   ```

   Configure the agent's permissions in advance for the required Git, GitHub CLI, build,
   test, and agent-report commands. Do not use `--dangerously-skip-permissions` on a
   networked development machine.
3. Paste `remote-prompts/daily/changed-code-sentinel.md` into the session.
4. After it finishes, run `remote-prompts/daily/command-brief.md` from this repo. Its 10-minute timebox
   keeps the full workflow within one hour.
5. Review the command brief and draft PRs. Agents never merge or deploy.

Every remote prompt inherits [`remote-prompts/00-house-rules.md`](remote-prompts/00-house-rules.md)
and **leaves a pushed branch**: isolated worktrees, one draft PR maximum, deduplication,
verification, a 45-minute timebox, and validated agent reports. The technical prompts and
`doc-drift` open a draft PR for the highest-value safe fix (`doc-drift` docs-only); `security`,
`dependency-freshness`, and `observability` open a draft PR for low-risk fixes and keep
auth/major-upgrade/infra decisions report-only. The briefs (`command-brief` and the planning
prompts) push their validated agent report on a branch with no code PR, and `pr-triage` pushes
safe rebases of trivially-stale green `auto-maintenance` branches (use `REPORT-ONLY` for a pure
read-only pass). No prompt ever merges, deploys, migrates the remote D1, or changes secrets.

## Folder
- `daily/` — **interactive**, person-in-the-loop prompts that run on your own machine:
  - `start-session` — interactive orientation before a personal work block.
  - `close-session` — interactive cleanup, verification, PR/deploy hygiene, and handoff.
- `remote-prompts/` — prompts written to run **unattended in a remote ephemeral sandbox**
  (an isolated, throwaway cloud container). Each opens with a sandbox banner, and every one
  leaves its result as durable, committed-and-pushed output — a branch, a draft PR, or a
  git-tracked report — because the container is discarded when the session ends.
  - `remote-prompts/00-house-rules.md` — shared guardrails for every PR-producing prompt.
  - `remote-prompts/daily/`:
    - `changed-code-sentinel` — primary remote agent; reviews only the new commit delta.
    - `command-brief` — turns the sentinel result into an actionable handoff for this repo.
  - `remote-prompts/technical/` — code + design:
    - `stability`, `quality`, `design-system`, `security`, `performance`,
      `api-contract-parity`, `accessibility`, `test-coverage`, `dependency-freshness`,
      `content-consistency`, `observability`.
  - `remote-prompts/planning/` — productivity / dev-planning:
    - `pr-triage`, `next-slice-planner`, `roadmap-sync`, `release-readiness`, `doc-drift`.

## After-action reports

Every **remote** prompt archives a validated report to
[`agent-reports/`](../agent-reports/) (repo-local, git-tracked) and pushes it on its branch —
including the planning briefs, whose pushed report is now their durable deliverable. Only the
**interactive** daily prompts (where you are the record) skip the report. The mechanics live in
[`remote-prompts/00-house-rules.md`](remote-prompts/00-house-rules.md) §9 and
[`../agent-reports/README.md`](../agent-reports/README.md).

| Prompt | Report? |
|---|---|
| `remote-prompts/daily/changed-code-sentinel`, `remote-prompts/daily/command-brief` | **Yes** |
| all `remote-prompts/technical/*` audits | **Yes** |
| all `remote-prompts/planning/*` (`pr-triage`, `doc-drift`, `next-slice-planner`, `roadmap-sync`, `release-readiness`) | **Yes** |
| `daily/start-session`, `daily/close-session` | No — interactive |

The exhaustive reports are intentionally more than anyone reads daily; a later
reviewer/digest agent is meant to read the archive and surface only what matters.

## Suggested cadence

For the full reference schedule and trigger map, see [`SCHEDULE.md`](SCHEDULE.md).

| When | Run |
|---|---|
| Start any personal work block | `daily/start-session` |
| End any personal work block | `daily/close-session` |
| Remote/background commute run | `remote-prompts/daily/changed-code-sentinel`, then the command brief |
| Mon | `remote-prompts/planning/next-slice-planner`, then `remote-prompts/technical/stability` (deep) |
| Tue | `remote-prompts/technical/quality` (deep) + `remote-prompts/technical/test-coverage` |
| Wed | `remote-prompts/technical/design-system` (deep) + `remote-prompts/technical/accessibility` |
| Thu | `remote-prompts/technical/security` (deep) + `remote-prompts/technical/dependency-freshness` |
| Fri | `remote-prompts/planning/pr-triage` + merge the week's queue |
| Weekly | Contract parity, performance, content consistency, and roadmap sync |
| Monthly | `remote-prompts/planning/doc-drift` |
| Before a release | `remote-prompts/planning/release-readiness` |

The realistic daily minimum for personal work is `start-session` and `close-session`. Add
the sentinel and command brief when you want a remote/background agent pass. Run deep prompts
only when a session baseline, sentinel, or roadmap brief points to that dimension; avoid
routine audit churn.

## Operating model

Think of the prompts as a small set of specialist teams, each with a clear owner and trigger:

| Team | Prompt(s) | Use when |
|---|---|---|
| Daily workflow | `daily/start-session`, `daily/close-session` | You are opening or wrapping a personal work session. |
| Command center | `remote-prompts/daily/changed-code-sentinel`, `remote-prompts/daily/command-brief` | You want a remote/background pass: inspect recent change risk, then receive a short owner handoff. |
| Web reliability | `remote-prompts/technical/stability`, `remote-prompts/technical/performance` | Production behavior, runtime correctness, live-class reliability, or speed is the concern. |
| Product quality | `remote-prompts/technical/quality`, `remote-prompts/technical/test-coverage` | You want maintainability cleanup or a stronger regression net without changing product behavior. |
| Design systems | `remote-prompts/technical/design-system`, `remote-prompts/technical/accessibility`, `remote-prompts/technical/content-consistency` | UI fidelity, WCAG behavior, terminology, or cross-surface copy consistency needs attention. |
| Platform/API | `remote-prompts/technical/api-contract-parity` | The backend contract, OpenAPI output, or iOS decode compatibility may have drifted. |
| Security & supply chain | `remote-prompts/technical/security`, `remote-prompts/technical/dependency-freshness` | Secrets, auth/session risk, CVEs, or dependency upgrade posture needs review. |
| Observability | `remote-prompts/technical/observability` | Logs, health checks, smoke coverage, or deploy evidence may be too thin to diagnose production issues. |
| Product planning | `remote-prompts/planning/roadmap-sync`, `remote-prompts/planning/next-slice-planner` | You need to decide what to build next or turn a priority into a bounded slice. |
| Release management | `remote-prompts/planning/release-readiness`, `remote-prompts/planning/pr-triage`, `daily/close-session` | You are preparing to ship, clear maintenance PRs, or wrap up a human-led session. |
| Documentation ops | `remote-prompts/planning/doc-drift` | Docs, plans, or setup instructions may no longer match the repo. |

## Decision guide

- **I am starting work:** use `daily/start-session`.
- **I am stopping work:** use `daily/close-session`.
- **I only have one unattended run:** use `remote-prompts/daily/changed-code-sentinel`; add
  `remote-prompts/daily/command-brief` when you want the summary before reviewing.
- **Recent code changed and I want regression coverage:** use `remote-prompts/daily/changed-code-sentinel`.
- **I need to choose the next product slice:** use `remote-prompts/planning/roadmap-sync`, then
  `remote-prompts/planning/next-slice-planner`.
- **I am about to release or cut a milestone:** use `remote-prompts/planning/release-readiness`, then
  `remote-prompts/planning/pr-triage`.
- **The app feels broken or brittle:** use `remote-prompts/technical/stability`.
- **The app feels slow:** use `remote-prompts/technical/performance`.
- **A production issue would be hard to detect or diagnose:** use
  `remote-prompts/technical/observability`.
- **The UI looks off or inconsistent:** use `remote-prompts/technical/design-system`.
- **Keyboard, screen reader, contrast, or motion behavior is the risk:** use
  `remote-prompts/technical/accessibility`.
- **The web API may break iOS:** use `remote-prompts/technical/api-contract-parity`.
- **Copy or terminology differs between web and iOS:** use `remote-prompts/technical/content-consistency`.
- **Auth, secrets, logs, or dependency CVEs are the risk:** use `remote-prompts/technical/security`.
- **Packages are getting stale but not necessarily vulnerable:** use
  `remote-prompts/technical/dependency-freshness`.
- **You want useful tests without behavior changes:** use `remote-prompts/technical/test-coverage`.
- **You want cleanup without behavior changes:** use `remote-prompts/technical/quality`.
- **Docs look stale:** use `remote-prompts/planning/doc-drift`.

## Running it "in the background while commuting"
- Disable sleep for the run or use a machine that remains awake.
- The normal run is one isolated worktree on this repository, so the source checkout stays
  untouched.
- Agents may push branches and open draft PRs. They may not merge, deploy, apply remote
  migrations, or change secrets.
- A completed run must produce an agent report based on this repo's
  [`agent-reports/AGENT_REPORT_TEMPLATE.md`](../agent-reports/AGENT_REPORT_TEMPLATE.md) that
  passes `./agent-reports/validate-agent-report.sh agent-reports/YYYY-MM-DD/<file>.md`.
