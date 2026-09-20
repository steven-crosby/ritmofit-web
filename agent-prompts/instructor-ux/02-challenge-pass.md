# Instructor-UX challenge pass — try to prove the journey still fails

> **INTERACTIVE, attended, local-only, REPORT-ONLY.** Run this in a fresh coding-agent session —
> ideally with a different model or tool than the one that ran
> [`01-build-pass.md`](./01-build-pass.md) — after that pass's slice has **landed on `main`**. This
> pass makes **no product code edits, no commits, and no PR**. Its only deliverable is a
> conversation-owned findings report. The separation reduces self-review bias by giving the landed
> behavior a fresh evaluation.

<!-- Authored by Claude Opus 5 (Claude Code), 2026-09-20. -->

Read [`00-frame.md`](./00-frame.md) in full first — canonical-principle route, the two instructors,
scope, shipped baseline, fixtures, and verification floor.

## Your job

Not to redesign Ritmo Studio. Not to confirm the last slice worked.

**Your job is to try to prove that the current instructor experience still violates Simple. Stupid.
Swift.** Be skeptical of anything that technically works but still requires interpretation, memory,
unnecessary reading, hidden knowledge, or extra clicks.

Pre-commit, before you touch the browser, to what would change your verdict. If nothing conceivable
would, you are not testing — you are decorating.

### Excuses that do not clear a finding

Do not excuse confusion because:

- she could eventually figure it out;
- the terminology is technically accurate;
- there is a tooltip somewhere;
- the information is useful eventually;
- the feature has tests;
- the design matches the data model;
- an experienced developer understands it.

The interface is for instructors, not for the implementation.

## Step 1 — Inspect what actually shipped

Do not work from assumptions, from `01-build-pass.md`'s report, or from an older handoff. Read the
current implementations yourself — `00-frame.md` §4 lists the verified entry points; confirm the
paths still exist. Explicitly cover: deterministic scaffold creation, the empty-class path, class
entry and navigation, the Builder shell, readiness and next-step guidance, plan blocks, track
assignment, planned-versus-actual duration, playback-window/clip behavior, and inspector states.

Then read the last pass's PR and the most recent `docs/audits/*/run-decisions.md`. Recently shipped
work is a **baseline to challenge, not functionality to recreate**, and an owner-deferred item is
context rather than a fresh finding.

## Step 2 — Rebuild the fixtures and attack the journey

Build `UXF-1`…`UXF-5` per `00-frame.md` §5, yourself, through the UI. Then walk all eight journey
steps as the **new instructor** and again as the **experienced instructor**, repeatedly trying to
make the interface fail one of the six questions.

Hunt these failure classes specifically:

1. **Irrelevant visibility** — on screen because it might matter eventually, not because it helps
   now. Can it be removed, deferred, collapsed, or revealed contextually?
2. **Copy compensating for design** — the interface explains an awkward interaction instead of
   making it obvious. Do not propose more helper text; propose simplifying or removing first.
3. **Vocabulary leakage** — terminology that makes sense to the codebase, not to an instructor.
   (Watch canonical §0's schema-honesty floor: prefer instructor language, but never relabel one
   persisted meaning as another.)
4. **Ambiguous affordances** — looks informational but is clickable, looks clickable but is not,
   an unexplained icon, or no indication of consequence.
5. **Weak post-action feedback** — she clicks, drags, selects, trims, saves, assigns, or removes,
   and must search the interface to find out what happened.
6. **Hidden next step** — state is represented accurately but the most useful next action is not
   apparent.
7. **Excessive ceremony** — a common action needs unnecessary dialogs, navigation, setup,
   confirmation, or bookkeeping the interface could safely do for her.
8. **Beginner/advanced collision** — beginner guidance permanently consumes workspace, or blocks
   expert manipulation. Look for progressive-disclosure opportunities.
9. **Timing ambiguity** — she cannot immediately distinguish planned block time, actual assigned
   music time, usable playback window, underfill, overflow, start/end crop, or the effect of
   moving or editing music.
10. **False confidence** — a class looks ready, complete, or meaningful because placeholder or
    derived information is visually indistinguishable from instructor-authored content.

For every important interaction, state **before**: what do I think this will do? and **after**: is
what happened unmistakable? Both answers go in the evidence.

## Step 3 — Verify in the real browser

The review is incomplete without exercising the running app. Run the full floor in `00-frame.md`
§6: desktop, ~390px, ~320px where applicable, keyboard-only operation of challenged controls, focus
transitions after important actions, reduced motion where applicable. Honor the documented tooling
gaps — run the `browser-verification` self-test before trusting its numbers, and do not fight
`resize_window` if it floors out.

Capture concrete evidence. A finding without a screenshot, a computed style, a timing, or a
`file:line` is an opinion.

## Step 4 — Rank and cluster

Classify each finding **Blocker · Friction · Polish** and prioritize the first two. Do not spend
the pass on aesthetics while a comprehension or workflow problem stands. Where several findings
share a root cause, say so and name the root — that is what the next build pass should correct.

Record everything, but recommend the **smallest coherent correction with the highest leverage**,
not a sprawl of unrelated tweaks. Prefer subtraction: for every addition you would propose, ask
whether deletion, consolidation, clearer hierarchy, or better state presentation solves it more
simply.

**Calibrate.** Report what genuinely works alongside what fails. A pass that finds nothing real is
a legitimate outcome and should say so plainly rather than manufacturing findings to justify the
run.

## Step 5 — Deliver (conversation-owned report only)

Publish one HTML artifact when the current tool supports it; otherwise deliver equivalent structured
Markdown in the conversation. No commits, no PR, nothing written to `agent-reports/` or
`docs/audits/`.

**Remaining failures** — for each important issue: surface and workflow · which of the six
questions fails · beginner impact · experienced-instructor impact · severity · recommended
correction · evidence.

**Verified as working** — what survived the attack, so the next reader can calibrate.

**Root causes** — the small number of underlying problems the findings cluster into.

**Final challenge.** End by answering both of these with evidence, not assertion:

> Could a first-time instructor get meaningfully into class creation without needing someone to
> explain Ritmo Studio?

> Could an experienced instructor move quickly without feeling trapped inside beginner scaffolding?

If the evidence is mixed, say exactly where and why. Do not close with a generic statement that the
UX is improved.

The purpose of this pass is not to prove the implementation is good. It is to find where it still
makes the instructor think about the software instead of the class.

## Hand-off

Findings from this pass feed the **next** `01-build-pass.md` run, at the owner's call. If the owner
wants one fixed now, that is a separate session with its own plan gate — not an extension of this
one. Report-only means report-only.
