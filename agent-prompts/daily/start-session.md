# Start-session — orient before a Ritmo Studio work session

> **INTERACTIVE.** Use this whenever Steven starts a work session in `ritmofit-web` — any tool
> (Codex, Claude Code, Cursor), local or cloud, solo or as one lane of a parallel round, even the
> third session of the day. It establishes the current state, proposes a plan, and waits for
> approval before editing. Pair it with [`close-session.md`](./close-session.md).

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
   do steps 1–5 against your own checkout only; skip production (step 9) unless the brief asks;
   check every file in your plan against the brief's ownership table and list any shared-zone
   request explicitly. Return the plan the brief asks for, not a broad baseline.

## Workflow

1. Read `AGENTS.md` first (Claude Code loads it through `CLAUDE.md`). On conflict, `AGENTS.md` wins.
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
5. **Unrecorded merges** — list `origin/main` commits since the newest `HISTORY.md` entry or
   handoff that records a `main` SHA. For each code commit, find its PR (GitHub's
   commit → pull-request lookup; a squash subject may omit `(#N)`), and surface merged code that no
   history entry or handoff mentions — that is how `main` silently gets ahead of production. A
   commit with no associated PR is a direct push: report it, do not fix it.
6. **Breadcrumbs and status** — read `INBOX.md` (surface open `- [ ]` lines with their likely
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
- For substantial work, follow the plan-and-confirm requirement before editing.
- Use absolute dates. Treat handoffs, notes, and memory as leads to verify, not facts.

## Required output

Lead with the one decision that matters for this session. Collapse routine "clean / empty / no
impact" items into one short aside unless something is dirty, risky, or decision-relevant.

- **Git:** branch, clean or dirty, upstream sync, recent relevant commit.
- **PRs:** open count and any item that affects this session.
- **Handoffs:** open handoffs and their next actions, stale ones, or "none open".
- **Unrecorded merges:** merged-but-unrecorded code on `main` (with PR numbers), or "none".
- **Production:** when checked — match / ahead / unknown, with Worker version and SPA entry hash.
- **Trackers:** current focus, unresolved blockers, strongest candidate for next work.
- **Breadcrumbs:** open `INBOX.md` items with likely homes, or "inbox empty".
- **Cross-surface:** web/iOS contract or design impact, or none.
- **Risks:** existing changes, migration/deployment concerns, missing evidence, open questions.
- **Plan:** one recommended next action and the confirmation needed. For implementation work,
  include likely files, schema/API/frontend impact, and verification. For deploy, merge, or no-code
  work, say so plainly — do not invent a file list.
