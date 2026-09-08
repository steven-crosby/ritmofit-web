# Start-session — orient before a Ritmo Studio work session

> **INTERACTIVE.** Use this whenever Steven is starting a personal work session in
> `ritmofit-web`, even if it is the second or third session of the day. This is a
> co-development prompt, not an unattended maintenance run. It establishes the current
> state, proposes a plan, and waits for approval before editing.

## Goal

Establish an accurate, low-noise session baseline, identify the highest-priority open work
that affects the requested objective, and produce a concise plan. Do not edit files or
begin implementation during orientation.

## Orient mode

Before deep reads, fork by session intent (still end with **one** recommended next action — step 9):

1. **Clear objective** — baseline + plan for that objective (default path through the Workflow).
2. **Reorient / no objective** — baseline + strongest next candidate + at most one question (still one recommended action).
3. **Deploy-only** — skip design-system and API/schema deep reads (steps 6–7); go to production evidence bar (step 8) + runbook preflight evidence; propose deploy or say what's blocking.

## Workflow

1. Read `AGENTS.md` first. On conflict, `AGENTS.md` wins.
2. Confirm this is the intended `ritmofit-web` checkout before trusting status, then inspect
   the tree:
   - `pwd` — expect the repo root for this checkout
   - `git remote -v` — expect `steven-crosby/ritmofit-web`
   - `git branch --show-current`
   - then `git status -sb`; note recent commits and local branches/upstreams when relevant
   - if the tree is dirty, surface unrelated dirty files before proposing work (do not discard,
     overwrite, stash, or silently include them)
3. Inspect open pull requests with `gh pr list --state open` when GitHub access is available.
   Note drafts, failing or pending checks, and branches that may already contain the work.
4. Drain the breadcrumb catcher: read `INBOX.md`. Surface any open `- [ ]` breadcrumbs so
   they don't rot in chat. For each, note its likely home (see the routing table in
   `INBOX.md`) and whether it bears on this session's objective. Do not route or delete
   lines during orientation — that happens at close-session; just make them visible.
5. Read the current status sources:
   - the current-focus / backlog block of `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`
   - the newest entry in `ritmofit_dev_plan/HISTORY.md` when deployment state, recent work,
     or blockers matter — not the whole file
   - `agent-prompts/remote-prompts/daily/command-brief.md` output or recent agent reports
     only when the owner points to them
   - `ritmofit_dev_plan/milestones.md` only if the objective is milestone definition
   - `ritmofit_dev_plan/web-launch-readiness.md` only if the objective is a launch deferral
     or a documented post-launch leftover (the file is not the current product gate)
6. For UI work, read `ritmofit_design_system/README.md` plus the specific token/component
   guidance that applies.
7. For API, schema, shared-contract, auth, music-provider, or iOS-impacting work, inspect the
   relevant shared schemas, routes, migrations, OpenAPI output, authorization helpers, and
   parity docs before proposing changes.
8. If deployment state matters to the likely next task (a deploy candidate, `main` may be
   ahead of production, or the objective is reorient/status), compare production to `main`
   with this **evidence bar** — all read-only:
   - `git fetch origin` before treating local upstream sync as current
   - live Worker version via `wrangler deployments status` (from `apps/api`, or
     `pnpm --filter @ritmofit/api exec wrangler deployments status`)
   - served SPA entry hash: **three consecutive** cache-busted fetches of `/` (see
     `ritmofit_dev_plan/deployment-runbook.md`); one agreeing fetch is not enough
   - state plainly: production matches `main`, or `main` is ahead (name the tip and any
     undeployed merges), or evidence is incomplete
   Do not deploy, apply remote migrations, modify secrets, or alter remote data.
9. Ask at most one focused question, and only when the objective cannot be safely
   inferred. If the owner already supplied a clear objective, summarize the discovered
   context and propose the plan. End with **one** recommended next action (the strongest
   candidate), not an unranked menu of options. Brief alternatives only if they materially
   change the outcome; still lead with the recommendation (matches AGENTS.md: direct,
   decisive, recommended choice first).

## Rules

- Orientation is read-only. Do not edit, stage, commit, push, merge, deploy, install packages,
  run migrations, or change secrets.
- Never discard, overwrite, stash, or silently include existing worktree changes. Surface them
  and say whether they appear related to the requested work.
- Do not run the full test suite merely to start a session. Run gates after scope is confirmed,
  or run targeted checks only when needed to understand the baseline.
- Follow `AGENTS.md` for music constraints, shared contracts/authz/migrations, and D20 iOS-parity posture. In the baseline, call out only the impacts that change this session's plan (do not restate the full rules).
- For substantial work, follow the repository's plan-and-confirm requirement before editing.
- Use absolute dates when reporting status, deployments, or tracker conflicts.

## Required output

Lead with the one decision that matters for this session. Keep the fields below, but collapse
routine "clean / empty / no impact" items into a single short aside unless something is dirty,
risky, or decision-relevant.

- **Git:** branch, clean or dirty, upstream sync, and recent relevant commit.
  *(usually collapsible when clean+synced)*
- **PRs:** open count and any item that affects this session.
- **Production:** when checked — match / ahead / unknown, with live Worker version and
  served SPA entry hash. Do not claim alignment from docs alone.
- **Trackers:** current milestone/slice, unresolved blockers, and strongest candidate for
  next work.
- **Breadcrumbs:** open items in `INBOX.md`, each with its likely home, or "inbox empty."
  *(usually collapsible when inbox empty)*
- **Cross-surface:** expected web/iOS contract or design impact, or no cross-surface impact.
  *(usually collapsible when no impact)*
- **Risks:** existing changes, migration/deployment concerns, missing evidence, or open
  questions.
- **Plan:** one recommended next action and the confirmation needed — not a picker.
  For implementation work, include likely files, schema/API/frontend impact, and
  verification. For deploy, merge, or no-code work, say that plainly — do not invent a
  file list.

Pair with `agent-prompts/daily/close-session.md` when wrapping up. Default to a light close
unless code, contracts, schema, or deployment behavior changed.
