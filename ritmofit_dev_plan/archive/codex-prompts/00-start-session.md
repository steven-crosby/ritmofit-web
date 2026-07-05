# Ritmo Studio Web Start Session

## Role and Context

You are beginning a new engineering session from the root of the `ritmofit-web` repository. Ritmo Studio
is a choreography and class-management tool for rhythm spin instructors. This repository contains the
React planning surface and the authoritative Cloudflare Worker/D1 backend shared with the iOS app.

Read and follow `AGENTS.md` before taking action. Treat the repository, current trackers, Git state,
and deployed metadata as the source of truth. Do not assume an earlier milestone, prompt, or chat
summary is current.

## Goal

Establish an accurate, low-noise session baseline, identify the highest-priority open work, and ask
the owner what this session should accomplish. Do not edit files or begin implementation during this
orientation.

## Workflow

1. Read `AGENTS.md`.
2. Inspect the current working tree and repository state:
   - `git status -sb`
   - `git status --short`
   - current branch and recent commits
   - local branches and their upstream state
3. Inspect open pull requests with `gh pr list --state open`. Note drafts, failing or pending checks,
   and branches that may already contain the proposed work.
4. Read the current status sources:
   - `ritmofit_dev_plan/DEVELOPMENT_PLAN.md`
   - `REVIEW.md`
   - relevant sections of `ritmofit_dev_plan/milestones.md`
5. Identify:
   - unresolved launch blockers and core workflow issues
   - the next documented milestone or vertical slice
   - pending schema migrations, deployment verification, or operational work
   - stale or conflicting tracker statements
6. If deployment state matters to the likely next task, use read-only Wrangler commands to compare
   production with `main`. Do not deploy, apply migrations, modify secrets, or alter remote data.
7. Read additional planning or design-system documents only when they are relevant to the likely work.
   For UI work, include `ritmofit_design_system/README.md`.
8. Ask one focused question to confirm the session objective. If the owner has already supplied a
   clear objective, summarize the discovered context and propose the required plan instead.

## Rules

- Orientation is read-only. Do not edit, stage, commit, push, merge, deploy, install packages, or run
  migrations.
- Never discard, overwrite, or silently include existing worktree changes. Surface them and identify
  whether they appear related to the requested work.
- Do not run the full test suite merely to start a session. Run gates after scope is confirmed or when
  a targeted check is needed to understand the baseline.
- Do not expose credentials, tokens, cookies, authorization headers, private keys, or secret values.
- Preserve Ritmo Studio's provider constraints: no provider audio caching, no Spotify BPM, and no in-app
  playback mixing or embedding.
- Shared contracts originate in `packages/shared`; class-scoped routes require centralized
  authorization; D1 migrations are generated and never rewritten after application.
- For substantial work, follow the repository's plan-and-confirm requirement before editing.
- Use absolute dates when reporting status, deployments, or tracker conflicts.

## Required Output

Report a concise session baseline:

- **Git:** branch, clean or dirty, upstream sync, and recent relevant commit.
- **PRs:** open count and any item that affects this session.
- **Production:** whether deployed state appears aligned with `main`, when relevant and verifiable.
- **Trackers:** current milestone, unresolved blockers, and the strongest candidate for next work.
- **Risks:** existing changes, migration/deployment concerns, or missing evidence.
- **Direction needed:** one focused question for the owner, or a concise implementation plan if the
  objective was already explicit.

Do not begin implementation until the owner confirms the direction and, for substantial work, the
plan.
