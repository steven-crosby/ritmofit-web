# Start-session — orient before a RitmoFit work session

> **INTERACTIVE.** Use this whenever Steven is starting a personal work session in
> `ritmofit-web`, even if it is the second or third session of the day. This is a
> co-development prompt, not an unattended maintenance run. It establishes the current
> state, proposes a plan, and waits for approval before editing.

## Goal

Establish an accurate, low-noise session baseline, identify the highest-priority open work
that affects the requested objective, and produce a concise implementation plan. Do not edit
files or begin implementation during orientation.

## Workflow

1. Read `AGENTS.md` first. On conflict, `AGENTS.md` wins.
2. Inspect the current repository state:
   - `git status -sb`
   - `git status --short`
   - current branch, recent commits, and local branches/upstreams when relevant
3. Inspect open pull requests with `gh pr list --state open` when GitHub access is available.
   Note drafts, failing or pending checks, and branches that may already contain the work.
4. Drain the breadcrumb catcher: read `INBOX.md`. Surface any open `- [ ]` breadcrumbs so
   they don't rot in chat. For each, note its likely home (see the routing table in
   `INBOX.md`) and whether it bears on this session's objective. Do not route or delete
   lines during orientation — that happens at close-session; just make them visible.
5. Read the current status sources:
   - `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`
   - relevant sections of `ritmofit_dev_plan/milestones.md`
   - `ritmofit_dev_plan/HISTORY.md` when deployment state, recent work, or blockers matter
   - `agent-prompts/remote-prompts/daily/command-brief.md` output or recent agent reports when the owner
     points to them
6. For UI work, read `ritmofit_design_system/README.md` plus the specific token/component
   guidance that applies.
7. For API, schema, shared-contract, auth, music-provider, or iOS-impacting work, inspect the
   relevant shared schemas, routes, migrations, OpenAPI output, authorization helpers, and
   parity docs before proposing changes.
8. If deployment state matters to the likely next task, use read-only commands to compare
   production with `main`. Do not deploy, apply remote migrations, modify secrets, or alter
   remote data.
9. Ask one focused question only when the objective cannot be safely inferred. If the owner
   already supplied a clear objective, summarize the discovered context and propose the plan.

## Rules

- Orientation is read-only. Do not edit, stage, commit, push, merge, deploy, install packages,
  run migrations, or change secrets.
- Never discard, overwrite, stash, or silently include existing worktree changes. Surface them
  and say whether they appear related to the requested work.
- Do not run the full test suite merely to start a session. Run gates after scope is confirmed,
  or run targeted checks only when needed to understand the baseline.
- Preserve RitmoFit's music constraints: no provider audio caching, no Spotify BPM, and no
  in-app playback mixing or embedding.
- Shared contracts originate in `packages/shared`; class-scoped access requires centralized
  authorization; D1 migrations are generated and never rewritten after application.
- Surface parity is a hard gate: web and iOS are co-equal product surfaces. State parity impact
  in the plan and link any tracked follow-up when same-session parity is not landing.
- For substantial work, follow the repository's plan-and-confirm requirement before editing.
- Use absolute dates when reporting status, deployments, or tracker conflicts.

## Required output

Report a concise session baseline:

- **Git:** branch, clean or dirty, upstream sync, and recent relevant commit.
- **PRs:** open count and any item that affects this session.
- **Production:** whether deployed state appears aligned with `main`, when relevant and
  verifiable.
- **Trackers:** current milestone/slice, unresolved blockers, and strongest candidate for
  next work.
- **Breadcrumbs:** open items in `INBOX.md`, each with its likely home, or "inbox empty."
- **Parity:** expected web/iOS impact or no parity impact.
- **Risks:** existing changes, migration/deployment concerns, missing evidence, or open
  questions.
- **Plan:** goal, likely files, schema/API/frontend impact, verification steps, and the
  confirmation needed before implementation.

Pair with `agent-prompts/daily/close-session.md` when wrapping up.
