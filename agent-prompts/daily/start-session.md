# Start-session — orient before a Ritmo Studio work session

<!-- Codex, 2026-10-27: Made RF orientation mandatory in every mode and defined revision, failure and execution transitions. -->
<!-- Claude Code, 2026-10-27: Ready as the owner's queue, draft-PR claims, RF-cited merges count as recorded. -->

> **INTERACTIVE.** Use this whenever Steven starts a work session in `ritmofit-web` — any tool
> (Codex, Claude Code, Cursor), local or cloud, solo or as one lane of a parallel round, even the
> third session of the day. It establishes the current state and proposes a plan. It waits for
> approval before editing unless the owner already handed off the scope (a brief, a direct ask, or
> a task in Ready). Pair it with [`close-session.md`](./close-session.md).

## Goal

Establish an accurate, low-noise baseline — including what other sessions and lanes left owed
forward — identify the highest-priority open work for the objective, and produce a concise plan.
Do not edit files or begin implementation during orientation.

## Orient mode

Pick one before deep reads; every mode still ends with **one** recommended next action (step 10).

1. **Clear objective** — baseline + plan for that objective (default path).
2. **Reorient / no objective** — baseline + strongest next candidate + at most one question.
3. **Deploy-only** — skip steps 7–8; go to the production evidence bar (step 9) and runbook
   preflight; propose the deploy or say what blocks it.
4. **Lane** — you were started from a lane brief by
   [`../orchestrate-parallel-round.md`](../orchestrate-parallel-round.md). Read the brief first;
   do steps 1–6 against your own checkout and assigned scope; RF orientation in step 6 is mandatory;
   skip production (step 9) unless the brief asks;
   check every file in your plan against the brief's ownership table and list any shared-zone
   request explicitly. Return the plan the brief asks for, not a broad baseline.

## Workflow

1. Read `AGENTS.md` first. On conflict, `AGENTS.md` wins.
2. Confirm the checkout, then inspect the tree:
   - repo root (`git rev-parse --show-toplevel`) and `git remote -v` — expect
     `steven-crosby/ritmofit-web`
   - `git branch --show-current`, `git status -sb`, `git fetch origin` before trusting upstream
     sync; note local branches/upstreams when relevant
   - if the tree is dirty, surface unrelated dirty files before proposing work (never discard,
     overwrite, stash, or silently include them)
3. **Open PRs** — with `gh pr list --state open` or the session's GitHub integration. Note drafts,
   failing/pending checks, conflicts, and branches that may already contain the work. If no GitHub
   access exists, say so; do not guess.
4. **Handoffs** — read every file in `ritmofit_dev_plan/handoffs/` on `origin/main`, plus every
   handoff file changed in an open PR's head (in-flight lanes). For each `status: open` handoff,
   note its next action, owner decisions, and touched shared zones, and whether it bears on this
   session. Flag as **stale** any handoff older than 14 days whose PR or branch is closed. Do not
   edit or delete handoffs during orientation. Rules: `ritmofit_dev_plan/handoffs/README.md`.
5. **Unrecorded merges** — list `origin/main` commits since the newest `HISTORY.md` deploy entry.
   For each code commit, find its PR (GitHub's commit → pull-request lookup; a squash subject may
   omit `(#N)`). A merge is recorded when an RF record's evidence cites that PR (CI's RF-trace step
   requires this for product changes), or HISTORY or a handoff names it. Surface the rest, and report
   the merged-but-undeployed PRs as `main` ahead of production. A
   commit with no associated PR is a direct push: report it, do not fix it.
6. **RF orientation — every mode, including Lane and Deploy-only.** Read
   `ritmofit_dev_plan/tasks/README.md`, then run `pnpm tasks:check` and inspect the board and relevant
   `ritmofit_dev_plan/tasks/RF-*.json` records. The records are canonical; the board is generated.
   - **Revision boundary:** name the checkout branch/HEAD whose records were validated. Fetching
     does not update the checkout. Compare task files with fetched `origin/main`, for example
     `git diff --name-status HEAD..origin/main -- ritmofit_dev_plan/tasks ritmofit_dev_plan/tasks.md`.
     Read relevant upstream records with `git show origin/main:<repo-relative-path>`, and inspect
     task-record changes in relevant open PR heads. Distinguish intentional lane changes from a
     stale baseline; do not overlay records from different revisions or silently switch/reset/pull.
     State which revision supports the proposed action; local validation does not certify upstream.
   - **Stale board only:** if `tasks:check` reports generated-board drift but records load through
     `pnpm tasks list` / `pnpm tasks show RF-N`, use those records read-only. Include regeneration
     in the approved work; do not edit generated Markdown by hand or regenerate during orientation.
   - **Invalid records or evidence paths:** report the failing RF IDs/paths and stop work that
     depends on them. Inspect the JSON and owning sources read-only; propose repair. Independent
     orientation can continue. Missing tooling/dependencies are an explicit environment limitation,
     not a reason to install packages during orientation or fall back to an external board.
   - **Selection:** link the RF task for the objective and inspect its scope, acceptance,
     prerequisites, blocker, next action and evidence. With no objective, the **Ready** column is the
     owner's queue: take its highest-priority task that no open PR already claims (a Ready task is
     already the owner's confirmation; report which one you took). Reconcile live PRs and dated handoffs.
     Existing In progress work needs a deliberate resume/ownership reconciliation, not a second
     concurrent claim; an open draft PR whose head moves the task to In progress is a claim. If no
     task exists, propose creating one after approval; it starts in Backlog. Who may set Ready is
     defined once in `AGENTS.md` › "Working Agreement". Surface missing
     plans and acceptance evidence instead of inventing them. Numbering is not priority, and a
     copied approval never grants authority. The only status that grants execution is a Ready set
     under `AGENTS.md` › "Working Agreement"; no status grants publication or merging.
   Do not edit during orientation.
   Then read `INBOX.md` (surface open `- [ ]` lines with their likely
   home; route nothing now), then the current-focus block of
   `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`, and the newest `ritmofit_dev_plan/HISTORY.md` entry when
   deployment state or recent work matters — not the whole file. Read
   `ritmofit_dev_plan/archive/` material only if the objective is explicitly historical.
7. For UI work, read `ritmofit_design_system/README.md` plus the token/component guidance that
   applies.
8. For API, schema, shared-contract, auth, music-provider, or iOS-impacting work, inspect the
   relevant shared schemas, routes, migrations, OpenAPI output, authorization helpers, and parity
   docs before proposing changes.
9. **Production evidence bar** (read-only), when deployment state matters — a deploy candidate,
   step 5 found undeployed merges, or the objective is reorient/status:
   - live Worker version via `pnpm --filter @ritmofit/api exec wrangler deployments status`
   - served SPA entry hash from **three consecutive** cache-busted fetches of `/` (see
     `ritmofit_dev_plan/deployment-runbook.md`); one agreeing fetch is not enough
   - state plainly: production matches `main`, `main` is ahead (name the tip and undeployed PRs),
     or evidence is incomplete (for example a cloud sandbox without Cloudflare credentials or
     network access to production) — never claim alignment from docs alone
   Do not deploy, apply remote migrations, modify secrets, or alter remote data.
10. Ask at most one focused question, and only when the objective cannot be safely inferred.
    Otherwise summarize the context and propose the plan. End with **one** recommended next action,
    not an unranked menu; brief alternatives only if they materially change the outcome.

## Rules

- Orientation is read-only: no edits, staging, commits, pushes, merges, deploys, package installs,
  migrations, or secret changes.
- Never discard, overwrite, stash, or silently include existing worktree changes.
- Do not run the full test suite merely to start a session; run gates after scope is confirmed, or
  targeted checks only when needed to understand the baseline.
- Follow `AGENTS.md` for music constraints, shared contracts/authz/migrations, and D20/D21 scope;
  call out only the impacts that change this session's plan.
- For substantial work, follow the plan-and-confirm requirement before editing. An owner hand-off
  (a [`delegate-task.md`](../delegate-task.md) brief, a direct ask, or an RF task the owner put in
  Ready) is that confirmation for its stated scope. An agent-created Backlog task is not.
- Use absolute dates. Treat handoffs, notes, and memory as leads to verify, not facts.

## After approval — before execution

This phase is outside read-only orientation. If the current ask already supplies approval for the
proposed scope, use it; do not ask again. Otherwise wait for the required scope confirmation.

1. Work on the appropriate branch. Select the existing RF task or create one with `pnpm tasks create`;
   refine its acceptance and next action before starting. Coordinate new IDs across concurrent lanes
   per the task README. Resolve relevant upstream/in-flight task differences through the normal git
   workflow before execution; validate the records in the checkout actually used for the work, not
   an invented combination of revisions. Read-only investigations may have their own bounded tasks.
2. Confirm the task's `dependsOn` records are Done and its blocking condition is resolved. If a
   prerequisite is not met, leave the task Backlog or Blocked with the actual reason and an unblock
   action; do not label it Ready/In progress or start dependent implementation.
3. Move the authorized task to `in_progress`, clear obsolete blocker/resolution fields, and put the
   session/branch plus concrete restart action in `nextAction`. Preserve historical evidence limits.
   Record updates can use `pnpm tasks update RF-N patch.json` or direct JSON edits.
4. Run `pnpm tasks:render` and `pnpm tasks:check`, commit, push the branch and open a **draft PR**
   (`gh pr create --draft`) as the visible claim. Add the PR URL to the record's evidence (kind
   `pr`) in the next commit; the task's final state lands in this same PR at close. RF-trace stays
   red on product changes until then; that is expected while the draft is in progress. Then execute the
   approved scope. Record material
   blockers and scope changes when they occur rather than waiting for close. These local transitions
   grant nothing beyond the standing grant in `AGENTS.md` › "Delegation And Merge Policy". Read-only-only sessions
   remain read-only unless recording their results is also authorized.

## Required output

Lead with the one decision that matters for this session. Collapse routine "clean / empty / no
impact" items into one short aside unless something is dirty, risky, or decision-relevant.

- **Git:** branch, clean or dirty, upstream sync, recent relevant commit.
- **PRs:** open count and any item that affects this session.
- **Handoffs:** open handoffs and the restart context that bears on this session, stale ones, or
  "none open". Next actions come from RF records.
- **Unrecorded merges:** merged-but-unrecorded code on `main` (with PR numbers), or "none".
- **Production:** when checked — match / ahead / unknown, with Worker version and SPA entry hash.
- **Tasks:** selected/proposed RF IDs, prerequisites, blockers, acceptance and next action;
  branch/HEAD inspected, upstream/PR differences, validation result and any stale-board fallback.
- **Trackers:** current focus, unresolved blockers, strongest candidate for next work.
- **Breadcrumbs:** open `INBOX.md` items with likely homes, or "inbox empty".
- **Cross-surface:** web/iOS contract or design impact, or none.
- **Risks:** existing changes, migration/deployment concerns, missing evidence, open questions.
- **Plan:** one recommended next action and the confirmation needed. For implementation work,
  include likely files, schema/API/frontend impact, and verification. For deploy, merge, or no-code
  work, say so plainly — do not invent a file list.
