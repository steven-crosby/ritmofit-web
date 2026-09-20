# Instructor-UX build pass — diagnose the creation journey, ship one slice

> **INTERACTIVE, attended, local-only, implements.** Run this in a coding-agent session with a
> browser available and the owner reachable for one plan gate. It diagnoses the instructor creation
> journey against **Simple. Stupid. Swift.**, then implements the smallest coherent correction and
> opens a PR. Its counterpart, [`02-challenge-pass.md`](./02-challenge-pass.md), is report-only and
> runs **after** this pass's slice has landed — do not run both in one session.

<!-- Authored by Claude Opus 5 (Claude Code), 2026-09-20. -->

Read [`00-frame.md`](./00-frame.md) in full first. It routes to the canonical principle and carries
the two instructors, scope boundary, shipped baseline, fixtures, and verification floor. Everything
below assumes it.

## Step 1 — Build the judgment frame (~20 min, before the browser)

Read in this order:

1. `AGENTS.md` — authoritative, overrides everything on conflict.
2. `00-frame.md` (this pack).
3. `ritmofit_design_system/01-design-principles.md` … `11-library-guidelines.md`, plus
   `ritmofit_design_system/ritmofit-design-system.md` §3, §4, §5.2, §9, and §14. Do not skip files
   because scope is narrow; they cross-reference. **Quote rules, never paraphrase from memory** — canon
   text changes.
4. `ritmofit_dev_plan/DEVELOPMENT_PLAN.md` › current operating focus, and `decisions.md` (D20,
   D21, D22, D23).
5. The most recent `docs/audits/*/run-decisions.md`. An owner-deferred item is context, not a find.

Then read the actual implementations in `00-frame.md` §4 — the shipped scaffold, plan-block,
assignment, and clip-window behavior. Do not work from an older handoff's description of them.

## Step 2 — Stand the app up and build the fixtures

Follow `00-frame.md` §5 exactly. Build `UXF-1` through `UXF-5` **through the UI, as the
instructor**, not by seeding the database — how it feels to create them is itself the first
finding. Time `UXF-1` and `UXF-2` to first useful state.

If something confuses you while building fixtures, that is data. Write it down before you learn the
answer — you only get to be a first-time user once per surface.

## Step 3 — Walk the journey twice, once per instructor

Walk all eight journey steps as the **new instructor**, then again as the **experienced
instructor** trying to move fast. Screenshot as you go.

For each screen and state, run the six questions. For each interaction, commit **before** acting to
what you expect will happen, then check **after** whether what changed is unmistakable without
hunting. Record every failure as:

```
[surface] · [journey step] · question # that fails · what a real instructor would be unsure of
· evidence (screenshot / computed style / file:line) · beginner impact · expert impact
```

Give these their own attention, because they are where the journey most plausibly breaks:

- **Scaffold vs empty.** Is the empty path obviously available and clearly subordinate, or hidden?
  Does a scaffold announce that it is *structure, not a finished class*? Can an expert treat it as
  a lazy starting point and aggressively modify it, or does it feel like a wizard's output?
- **Plan blocks.** Does an empty block read as intentional teaching structure or as something
  broken? Does the block's own language survive question 3 for a recently certified instructor?
- **Planned versus actual.** Planned block time, assigned music time, usable playback window,
  underfill, overflow — can she distinguish all five at a glance, and does she know which one an
  edit just changed? These must stay conceptually distinct.
- **Playback window.** Setting a track to begin at 0:25 and end early is the named test case.
  Today it is typed duration text in `Dashboard.tsx` › `TrackInspector`. Is that discoverable and direct, or is it
  editing hidden metadata? Whatever is proposed — handles, inline controls, an inspector, overlap
  or stacking — those are options, not requirements: pick the simplest interaction that
  communicates the relationship immediately and works inside provider constraints. **Nothing in
  the UI may imply Ritmo modifies the provider's audio.**
- **False confidence.** Is derived or provisional content visually distinguishable from
  instructor-authored content? A class that *looks* ready when it is not is a blocker, not polish.
- **The next step.** At each resting state, is the most useful next action obvious without reading?

## Step 4 — Optional: fork code review for the surfaces you touched

If the walk produced findings whose cause is not visible from the browser and the current tool
supports isolated read-only subagents, launch **at most three**. Assign one disjoint file set from
`00-frame.md` §4 to each, with: its own scope and what the others own; read full source, not just
tests; the specific canon rules that apply, quoted; `file:line` + severity + the rule + a concrete
fix for every finding; what is done well; and a 600–900 word budget. The primary agent remains
responsible for validating and consolidating their findings.

Skip this step entirely if the browser walk already explains what you found. Motion is not progress.

## Step 5 — Rank, cluster, and choose one slice

1. Classify every finding: **Blocker** (stops or seriously misleads her) · **Friction**
   (understandable but slower than necessary) · **Polish** (already clear; refinement only).
2. Prioritize Blocker and Friction. Do not spend the pass on spacing while a comprehension problem
   stands.
3. Find the **shared root causes** — several findings usually trace to one. Correcting the root is
   the high-leverage move; scattering one-off tweaks across the app is not.
4. Choose the **smallest coherent set of changes** with the highest journey impact. One finished
   vertical slice beats many superficial tweaks. Prefer subtraction: for every proposed addition,
   ask whether deletion, consolidation, clearer hierarchy, or better state presentation solves it
   more simply.

## Step 6 — Plan gate (required)

Stop and present the plan. `AGENTS.md` › Working Agreement requires owner confirmation before
substantial work, and UI/design-system changes are substantial. The plan names:

- the confusion points you **actually observed**, with evidence;
- which of the six questions each one violates;
- the proposed correction, and **why it is simpler than the current behavior**;
- likely files and surfaces;
- any API, schema, shared-contract, or provider implication (and if there is one, why the UX
  correction genuinely requires it);
- what you are deliberately **not** doing, and why;
- the verification approach.

Wait for confirmation. Do not pre-implement while waiting.

## Step 7 — Implement

- Smallest durable change; existing `ritmofit_design_system` tokens and established components.
- Preserve accessibility; include loading, empty, error, and permission states.
- Add focused regression coverage where it has value (`*.test.tsx`, `*.integration.test.ts`).
- Honor canonical §0's correctness floors — a simplification that drops a non-color cue, misuses a
  channel, invents a persisted field, or relabels a stored meaning is a regression, not a fix.
- Do not rewrite already-good shipped behavior to make it different.

## Step 8 — Verify

Run the full verification floor in `00-frame.md` §6 against the changed workflow, with before/after
evidence for every material visual change. Then run the CI-equivalent gate from `AGENTS.md` ›
Verification, PRs, And Commits, in full — do not invent a shorter substitute unless the owner
authorizes one. `pnpm --filter @ritmofit/web theme-classes` matters here specifically: `tsc` and
ESLint cannot see a Tailwind colour utility, because a class is a string.

## Step 9 — Deliver

**PR** for the slice: small Conventional Commit (`feat(web):` / `fix(web):`), behavior and risk
explained, verification listed, before/after screenshots, and any contract implication for future
iOS called out.

**Conversation-owned findings report** — publish a single HTML artifact when the current tool
supports it; otherwise deliver equivalent structured Markdown in the conversation. Include an
executive summary, the ranked findings table (surface · journey step · failing question · severity ·
beginner impact · expert impact · disposition), screenshots that carry evidence, and the untouched
backlog. Do **not** write it to `agent-reports/`, which is reserved for unattended remote runs, and
do not add a `docs/audits/` folder.

Then report to the owner, tightly:

1. Problems found
2. Changes made
3. Beginner impact
4. Experienced-instructor impact
5. Browser verification performed
6. Automated verification performed
7. Remaining violations of Simple / Stupid / Swift
8. Anything intentionally deferred, and why

Include the `UXF-1` / `UXF-2` time-to-first-useful-state numbers, before and after if the slice
touched that path.

Judge success by **reduced cognitive and interaction friction** — not by the number of UI changes
or lines of code. A pass that removes three things and ships nothing new can be the best outcome.

## What this pass does not do

- It does not deploy. Merging is not deploying (`AGENTS.md` › Security And Deployment).
- It does not audit Live Mode performance, the Music workspace, Account, or marketing — see
  `../live-ux-deep-dive.md`.
- It does not grade its own work. That is `02-challenge-pass.md`, run later, by a fresh session.
