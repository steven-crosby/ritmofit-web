# Orchestrate a parallel agent round (web)

> **Paste this into a fresh session at the workspace container that holds the `ritmofit-web`
> checkouts, to run concurrent lane-agents across them.** In this dynamic **you are the orchestrator,
> not a product-code builder**: map state, recommend the builder count, partition the work, write each
> lane's brief, reconcile plans, enforce owner gates, review reports, drive authorized merges, and
> clean up only the round-owned state. Use native delegation when it can provide enough isolated
> builders; otherwise give the owner session-ready briefs to relay and accept their reports back.
> Do **not** write product code yourself in this role.
>
> **Active builders** means agents editing product code. It excludes the orchestrator, reviewers,
> CI monitoring, and the serialized browser verifier.
>
> Canonical context lives in this repository's [`AGENTS.md`](../AGENTS.md) and the workspace container's
> routing guide. This file is the provider-neutral canonical runbook for the durable orchestration
> method and merge discipline; it must not depend on provider memory or a provider-specific command
> deployment. On conflict, `AGENTS.md` wins.
>
> **Companion:** the iOS repo keeps its own `agent-prompts/orchestrate-parallel-round.md` for the
> `ritmofit-ios` clones. The *method* is shared; the partitions, verification gate, and close-out are
> **not** — do not transplant iOS steps into a web round, or vice versa. The key asymmetry: web has a
> real CI merge gate and a deploy step; iOS has neither, and gates on a local Xcode build instead.

## Workspace layout — discover it, never assume it

The checkouts live under one or more **non-git workspace containers** (running `git` at a container
root fails). On a split-layout machine there is one container per product — a `ritmostudio-web`-style
directory holding the `ritmofit-web` checkouts, and a `ritmostudio-ios`-style sibling holding the
`ritmofit-ios` clones — but **`ritmofit-ios` clones can also sit inside the web container**, and the
names, locations, and count all change over time.

Per `AGENTS.md`, nothing committed here hardcodes an absolute or home-directory path. Resolve the
container from wherever you were pasted and discover the live set:

```bash
# From a workspace container root:
find . -mindepth 1 -maxdepth 3 -type d -name ritmofit-web -exec test -e '{}/.git' ';' -print
find . -mindepth 1 -maxdepth 3 -type d -name ritmofit-ios -exec test -e '{}/.git' ';' -print
```

Repeat in each sibling container before concluding what exists. Consequences to respect:

- These are **independent clones of one repo**, on different branches, possibly carrying different
  uncommitted work. A change in one is invisible to the others until pushed and pulled through `origin`.
- Never move a change between checkouts by copying files — go through git.
- **A `ritmofit-ios` clone found inside the web container is a shared resource.** A concurrent iOS
  round may claim it as a lane. Confirm it is idle before touching it, and never assume it is yours.
- If an iOS round is running at the same time, the two rounds contend for the **machine** (CPU, RAM)
  even though their serialized resources differ — browser profiles and local ports here, simulator
  devices and DerivedData there. Coordinate the total builder count across both, not per round.

## The proven partitions — disjoint file clusters, not just "different features"

Two lanes editing the same file, especially a collision magnet, risk conflicts and silent bad
auto-merges. Give every collision-magnet file a **single owner**. Disjoint files reduce textual
conflicts; they do not guarantee semantic compatibility, so every updated branch still needs the
combined CI gate.

### Three builders — default

| Lane  | Clone                             | Owns                                                                                                                                                    |
| ----- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | first selected eligible checkout  | **SPA** — the entire `apps/web/` tree                                                                                                                   |
| **2** | second selected eligible checkout | **Class / choreography / run-payload back end** — `apps/api` class cluster plus its `packages/shared/src/entities`                                       |
| **3** | third selected eligible checkout  | **Provider / music integration + auth lifecycle back end** — `packages/music/`, `apps/api/src/lib/music/`, provider routes, `packages/shared/src/entities/music.ts` |

### Four builders — conditional acceleration mode

Use four only when Step 1 finds a fourth eligible checkout **and** orientation finds two worthwhile,
independent front-end slices. If either condition fails, recommend three; never invent work to fill a
lane.

| Lane  | Clone                             | Owns                                                                                                                                                  |
| ----- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | first selected eligible checkout  | **FE: Builder + Music workspace**, with sole ownership of `apps/web/src/components/Dashboard.tsx`                                                     |
| **4** | fourth selected eligible checkout | **FE: Live Mode + Account** — `LiveMode`, `LivePreflight`, `LiveTimeline`, account/connections/login/reset surfaces, and their directly-owned helpers |
| **2** | second selected eligible checkout | **class / choreography / run-payload core** back end                                                                                                  |
| **3** | third selected eligible checkout  | **provider / music integration + auth lifecycle** back end                                                                                            |

For four builders, Lane 1 owns `Dashboard.tsx`. Lane 4 routes any Dashboard wiring request through
Lane 1 and the orchestrator. Shared FE infrastructure such as `App.tsx`, `main.tsx`, `lib/api.ts`,
dialog/error infrastructure, playback helpers, and `styles/**` is frozen unless the batched plan gate
assigns exact lines to one owner.

For both partitions, `packages/shared` (except each back-end lane's owned entities), generated
`apps/api/openapi/openapi.json`, `apps/api/src/index.ts` route mounting, migrations, and
`apps/api/src/lib/{authz,auth,db,errors,types}.ts` are **frozen / coordinate** zones. Assign any
necessary touch to exactly one lane at the batched plan gate.

The cluster boundaries are stable, but feature-versus-harden roles change per round. Keep a lane
already carrying intentional in-progress work on its existing cluster; do not silently rebase,
rewrite, move, or repurpose that work.

## Step 0 — Machine and tool preflight

Before a long round:

- **Keep-awake:** while connected to AC, run the machine's keep-awake helper (for example
  `~/.local/bin/awake status`). The battery guard should force stay-awake on for AC and off for
  battery; if the observed state disagrees, stop and surface it.
- **Runtime:** verify the repository-required Node version and that Corepack/pnpm can run. Resolve a
  missing bare `pnpm` before launching builders; workspace scripts invoke it internally.
- **Browser/GUI:** discover the browser tooling actually available in the current session. Do not
  assume a particular MCP server or isolation flag. Shared browser profiles, GUI sessions, and the
  default local ports are serialized resources.
- **Concurrent rounds:** check whether an iOS round is active in a sibling container (Step 1's second
  discovery command plus its checkout states). If so, agree the combined builder count first.

## Step 1 — Map state and determine eligible checkouts

Discover every current checkout with the commands above. For each result, inspect its branch, status,
remote, HEAD versus `origin/main`, and any intentional owner/agent work without switching branches,
stashing, rebasing, resetting, cleaning, or overwriting files. Inspect open pull requests for the
`ritmofit-web` remote as well.

A checkout is eligible only when its current state can safely support the assigned lane:

- A clean `main` may fetch and fast-forward to `origin/main`, then create a fresh branch.
- Known historical untracked lane briefs may remain, but they must be inspected and never overwritten.
- A checkout with tracked modifications or unrelated active work is ineligible unless the owner
  explicitly assigns that work to this round.
- An intentional in-progress branch may continue only in its existing cluster and with its exact
  synchronization/merge plan stated in the brief. Do not silently rebase a published branch.

Record an eligibility table: checkout, branch, dirty files, ahead/behind state, intended cluster, and
eligible/blocked reason. This table determines whether four builders are currently possible.

## Step 2 — Find candidate work from live sources

Inspect, in this order:

1. Open PRs or unfinished round-owned branches that must be resolved first.
2. The selected primary checkout's `INBOX.md`.
3. `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` current focus and backlog/open items.
4. `ritmofit_dev_plan/milestones.md` and `ritmofit_dev_plan/web-launch-readiness.md`.
5. Current code and tests in each candidate cluster.
6. Prior lane briefs and follow-ups only as historical leads; verify every path and premise against
   the current tree before reusing it.

For a possible fourth builder, identify two concrete FE candidates and confirm that one fits
Builder/Music and the other fits Live/Account without shared-zone edits. If not, mark Lane 4
unavailable for this round.

## Step 3 — Ask the owner for builder count and theme

Ask only after Steps 1–2, so the choice includes a recommendation grounded in current evidence. Use
this shape:

> **How many active builders should this round use?**
>
> - **3 builders:** one unified SPA lane plus the two back-end lanes.
> - **4 builders:** split the SPA into Builder/Music and Live/Account, plus the two back-end lanes.
>
> I found `<N>` eligible checkouts and recommend `<3 or 4>` because
> `<specific checkout and work evidence>`. Four requires both a fourth eligible checkout and two
> worthwhile disjoint FE slices.

In the same exchange, ask for the round theme unless already supplied:

- **All-harden:** audit-first correctness fixes and coverage gaps; lowest merge risk.
- **All-feature:** self-contained D21 creator-loop slices; more value and design calls.
- **Mixed (common):** front-end value/polish plus back-end audit-first hardening.
- **Owner-specified goal:** partition the concrete objective across the selected clusters.

If the owner requests four but either eligibility condition fails, dissent once with the evidence and
offer: run three now, or separately authorize preparation of a clean fourth checkout. Do not repurpose
a dirty checkout or manufacture a slice.

## Step 4 — Write one ephemeral brief per selected checkout

Use a unique round identifier in each filename, for example
`agent-prompts/daily/start-r<round>-lane<N>-<role>.md`. Leave briefs untracked. Do not overwrite an
existing untracked file. Record the exact briefs created so cleanup can remove only those files after
their reports are captured.

Every brief includes, in this order:

1. **One-line role + "Do not implement until the batched plan is confirmed by the owner."**
2. **Git start state** — exact checkout, branch, HEAD, relationship to `origin/main`, and the safe
   branch-creation or synchronization command.
3. **The selected three- or four-lane table** so the agent knows every ownership boundary.
4. **Goal** — for hardening, audit first and propose the smallest useful fix/coverage slice; for a
   feature, propose one self-contained, demoable slice on the existing contract.
5. **Your files** — concrete current paths derived from the live tree, not copied blindly from a
   previous brief.
6. **What every other lane owns — do not touch.**
7. **Shared/frozen zones — coordinate, do not edit solo**, including that
   `apps/api/scripts/generate-openapi.ts` is a hand-maintained manifest that a no-diff regeneration
   does not fully validate.
8. **Explicitly out of scope** — other clusters; migrations without owner approval; dormant D20
   community surfaces; and the hard music constraints for music work.
9. **Required orientation reading** — `AGENTS.md` → `agent-prompts/daily/start-session.md` → current
   planning docs → relevant cluster code and tests.
10. **Planning requirements, verification plan, acceptance criteria, and required pre-edit output.**
11. **No-work exit** — if no safe, useful slice survives orientation, report that conclusion with
    evidence and remain idle.
12. **After-action schema** — branch, commit, PR, files changed, shared-zone touches, tests/checks
    run, skipped or failed verification, residual risks, deployment impact, and out-of-scope findings.

Hand the owner or delegated sessions the brief-to-checkout map and the preliminary explanation of why
the proposed ownership is disjoint. That explanation is provisional until Step 5 reconciles the plans.

## Step 5 — Reconcile every plan, then request implementation authority

Collect all lane plans before approving any implementation. Build one ownership matrix containing
every proposed file and shared-zone request. Verify risky findings against the actual code, resolve
overlaps, designate exactly one owner for every collision magnet, and reject work whose acceptance
test depends on another unplanned lane.

Present one concise combined packet to the owner:

- per-lane outcome, exact files, and acceptance test;
- cross-lane dependencies and planned merge order;
- schema/migration/API/auth/provider impact;
- verification and serialized browser-QA plan;
- risks, unresolved choices, and any idle lane;
- the exact authority requested now: implementation only, or implementation plus specified
  commit/push/PR actions.

Wait for confirmation. Do not infer merge, deployment, branch deletion, or other later external
actions from implementation approval.

## Step 6 — Review reports and run the authorized merge train

Review each after-action report against the actual diff, tests, and PR state. Do not rubber-stamp an
agent finding. Recheck that shared-zone edits match the approved ownership matrix and that skipped
verification is visible.

Before merging, present the PR list, combined risk, dependency-aware merge order, and current CI state;
request explicit merge authority. Re-read the repository's live merge settings and rules rather than
treating historical GitHub policy as immutable. Project history prefers merge commits, but confirm the
current allowed/enforced mechanisms.

For each authorized PR, sequentially:

1. Confirm the prior PR has merged and the next PR's head still belongs to this round.
2. If the PR is behind, update it onto the new `main` using the repository-approved mechanism.
3. If GitHub reports a conflict or dirty merge, stop; never force or assume disjoint ownership made it
   safe.
4. Wait for the combined `format · typecheck · lint · test · build · audit` check on the updated tree.
5. On green, merge with the owner-authorized method; on failure, return the PR to its owning lane.

The last green PR checks the combined merged tree, but still perform a post-merge sanity check on
`main`. Surface semantic surprises even when Git reports no textual conflict.

### Cleanup after merges

Present the exact local briefs, local checkout updates, and remote branches proposed for cleanup, then
request cleanup authority before acting.

- Recheck branch and status in **only the round-owned checkouts** before switching anything.
- Fast-forward an eligible round-owned checkout's `main` only when that does not disturb tracked,
  untracked, or intentional branch work.
- Delete only the ephemeral briefs created by this round, after their relevant decisions and results
  are recorded durably.
- Remote-branch deletion is a separate destructive action: list the exact merged branches and obtain
  owner authorization before deleting them.
- Once authorized, remote-branch deletion is a required round-close substep, not optional hygiene:
  delete each merged round branch, then verify it no longer appears in the remote branch list and record
  that result in the after-action report. Never delete a branch with an open PR or a tip not proven to be
  an ancestor of the intended `main`.
- Return each round-owned checkout to reusable state after its branch is merged and the owner authorizes
  cleanup: fast-forward `main`, delete the now-merged **local** lane branch, and verify a clean worktree
  on `main` at the same commit as `origin/main`. Do not use a broad cleanup command to achieve this;
  preserve or explicitly account for any non-round-owned files first.
- Never normalize every discovered clone merely because the round ended.

## Step 7 — Close the round: deploy, log, and record

1. **Post-merge sanity:** confirm all authorized lane PRs reached the intended state, the selected
   release checkout is clean and synced to the merged `main`, and any remaining open PRs or blocked
   lanes are reported.

2. **Deploy if warranted and explicitly authorized:** merging is not deploying. Follow the current
   `ritmofit_dev_plan/deployment-runbook.md` rather than duplicating its commands here. Before asking
   for production approval, present the release commit, migration/schema impact, current rollback
   anchor, remote migration state, required build, smoke plan, and any unavailable tooling. After an
   authorized deploy, record the Worker version and independently verify the served SPA asset, health,
   protected-route behavior, relevant handlers, security headers, and migration state.

3. **Log the release:** propose a thin docs PR when history or inbox state changed. Record the Worker
   version, release commit, PRs, migration result, rollback anchor, pre-deploy gate, post-deploy smoke,
   and only the `INBOX.md` breadcrumbs actually resolved by this round, in
   `ritmofit_dev_plan/HISTORY.md`. Treat docs edits, PR creation, merge, and any inbox deletion
   according to the owner's granted authority; docs-only changes still run the full combined CI check.

4. **Record durably:** put required continuation state in repository planning/history files, not
   provider-local memory. Promote only genuinely cross-project lessons when that maintenance is in
   scope.

5. **Surface what remains:** pending owner/live verification, failed or skipped checks, open PRs,
   parked findings, idle lanes, and unauthorized cleanup or deployment actions.

## Guardrails for this role

- **One active browser/GUI verifier at a time.** Maintain a serialized queue. In a four-builder round,
  the designated verifier may validate both FE slices; ownership can transfer explicitly, but two lanes
  must not contend for the same profile, GUI, or default local ports.
- Partition by **disjoint current file clusters**, never vague "different features."
- Use the **collect → reconcile → combined owner confirmation** gate before any lane edits.
- A fourth lane is optional capacity, not a quota. Idle is correct when no independent useful slice
  exists.
- Never move changes between clones by copying files; use reviewed git history.
- Never stash, reset, clean, rebase, overwrite, switch, delete, push, merge, or deploy beyond the
  authority explicitly granted for the exact target.
- Never claim a `ritmofit-ios` clone found in this container without confirming no iOS round owns it.
- Respect the non-negotiable music constraints and dormant-community D20 boundary.
- Keep durable status in the repository's `ritmofit_dev_plan/` (including `HISTORY.md`) and `INBOX.md`,
  not in scratch notes at the workspace container root.
