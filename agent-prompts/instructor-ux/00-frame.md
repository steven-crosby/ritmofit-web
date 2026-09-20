# Instructor-UX frame — the shared judgment lens

> Not a runnable prompt. This is the frame both passes inherit
> ([`01-build-pass.md`](./01-build-pass.md), [`02-challenge-pass.md`](./02-challenge-pass.md)),
> the same way every remote prompt inherits `remote-prompts/00-house-rules.md`. Read it in full
> before either pass. If it conflicts with `AGENTS.md`, stop and report the stale instruction; repair
> it only in a separately authorized docs change.

<!-- Authored by Claude Opus 5 (Claude Code), 2026-09-20. -->

## 1. Canonical judgment rule

Read and apply
[`ritmofit_design_system/01-design-principles.md` §0](../../ritmofit_design_system/01-design-principles.md)
verbatim. It supplies the six questions, ordered fix ladder, campaign-register boundary, and
correctness floors. If this frame conflicts with §0, stop and report the mismatch.

## 2. Who the work is for

Judge every finding against both, and never optimize one by crippling the other.

**New instructor.** Recently certified, with little or no experience planning and leading a whole
class solo. She should not need Ritmo's internal model or professional programming jargon before she
can make progress. Ritmo should give her enough trustworthy structure that she gets quickly to
choosing music, understanding musicality, and making the class her own.

> Target reaction: *"I understand what this class needs and what I should do next."*

**Experienced instructor.** Already builds classes, may be coming from StructClub or a spreadsheet.
She does not need to be taught her craft; she needs friction removed. Within minutes she should see
that Ritmo makes planning, editing, organizing, and preparing faster and more fluid while
preserving creative control.

> Target reaction: *"This gets me where I want faster without getting in my way."*

**Layer complexity, do not display it.** Expose what the current task needs; keep precision and
advanced controls nearby but subordinate; defer the irrelevant; never require navigating away just
to understand a term or a state; never make a beginner configure what she can safely accept and
edit later; never hide what an experienced instructor genuinely needs. Granularity on demand, not
permanently occupying the workspace.

## 3. Scope: the creation journey

Both passes walk this journey, in this order, and stay inside it:

1. Class creation entry (Classes home).
2. The scaffold-versus-empty choice.
3. Entry into the Builder.
4. Class structure and plan blocks.
5. Choosing and assigning music.
6. Understanding planned duration versus actual music duration.
7. Editing playback windows and other core song details.
8. Knowing the next meaningful step toward a usable class.

**Out of scope here:** Live Mode performance, the Music workspace as a destination, Account,
marketing/auth. Those belong to [`../live-ux-deep-dive.md`](../live-ux-deep-dive.md) (production,
canon + modern standards) or `../remote-prompts/technical/design-system.md` (canon drift). Live
*preflight* is in scope only as "the next meaningful step" endpoint of the journey.

**Deferred surfaces stay deferred.** Teams, sharing, publishing, Explore, public class pages,
collaborators, invites, social discovery — do not surface, polish, or reopen them (D20).

## 4. Current shipped baseline — inspect before judging

Recent work already shipped deterministic scaffolds, music-independent plan blocks, a readiness-
ranked Classes home, and Builder-clarity improvements. **Treat that as a baseline to challenge, not
functionality to recreate, and never build a competing class-generation system.**

Verify every path below with `ls`/`grep` before relying on it — this list is accurate as of
2026-09-20 and the tree moves:

| Journey step | Verified entry points |
|---|---|
| Creation entry, ranking | `apps/web/src/components/ClassesHome.tsx`, `lib/readiness.ts`, `lib/class-ordering.ts` |
| Scaffold vs empty | `components/CreateClassDialog.tsx` (185 ln), `lib/class-scaffold.ts` |
| Plan blocks | `components/ClassPlanBlocks.tsx`, `lib/class-scaffold.ts` (`planBlockFit`, `planFitLabel`, `planBlockActualMs`, `tracksForPlanBlock`, `unassignedClassTracks`) |
| Builder shell, track inspector | `components/Dashboard.tsx` (5161 lines; `TrackInspector` begins at L4457; clip-window inputs are at L4846–L4868), `components/ChoreographyEditor.tsx` |
| Music search and assignment | `components/Dashboard.tsx` (`ReorderableTrackList`), `components/TrackSearch.tsx`, `components/TrackPreview.tsx`, `components/SourceList.tsx` |
| Timing and shape | `components/TimelineStrip.tsx`, `components/IntensityRibbon.tsx`, `components/SegmentBand.tsx`, `components/IntensityReadout.tsx`, `lib/energy-arc.ts`, `lib/class-summary.ts` |
| Readiness / next step | `components/ClassReadinessSummary.tsx`, `components/ClassPulse.tsx`, `components/LivePreflight.tsx`, `lib/live-readiness.ts` |

Shipped constants worth knowing before you call something arbitrary: scaffolds offer three
disciplines (`cycle`, `sculpt` → displayed **Pilates**, `hiit`), three durations (30/45/60, default
45), and produce seven plan blocks. Plan fit is a three-value verdict: `under` / `over` /
`on_plan`. The playback window is stored as `clipStartMs` / `clipEndMs` on the class track and is
currently edited as **typed duration text inputs** in `TrackInspector`.

**Preserve what already works.** Clear instructor-facing language, explicit next actions, visible
post-action state, deterministic scaffolds, a real empty path, music-independent plan blocks,
planned-versus-actual timing, real tracks rather than placeholder music or choreography, and the
existing provider-authorized playback/clip semantics. Do not churn a surface that already satisfies
the principle just to produce a diff.

## 5. Environment and fixtures

Both passes run against **local dev**, never production. Creation flows mean making and deleting
real classes; local D1 makes that free and keeps `ritmofit_dev_plan/prod-fixture-hygiene.md` out of
the loop entirely.

```bash
pnpm install --frozen-lockfile
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
pnpm dev:api    # http://localhost:8787
pnpm dev:web    # http://localhost:5173
```

Set `MOCK_PROVIDERS=true` in `apps/api/.dev.vars` (see `.dev.vars.example`) unless a finding
genuinely depends on live provider behavior. If it does, say so in the report and verify that one
thing against a real connection — `AGENTS.md` is explicit that API probes do not prove playback.

### Fixtures — build these, in this order, every run

Runs are only comparable if they see the same thing. Create, by hand through the UI, timing each:

| ID | What | Why it exists |
|---|---|---|
| `UXF-1` | A **scaffold** class: Cycle, 45 min, no music yet | The beginner's first minute; tests whether structure explains itself before music |
| `UXF-2` | An **empty** class, no scaffold | Tests whether the expert's freedom path is discoverable and not punished |
| `UXF-3` | `UXF-1` with music assigned to **some but not all** blocks | The real mid-build state: mixed underfill, overflow, and unassigned |
| `UXF-4` | One track in `UXF-3` with a **playback window** set to start at 0:25 and end before the source ends | The named test case: does trimming feel direct, or like editing hidden metadata? |
| `UXF-5` | A class deliberately **over** its planned duration in at least one block | Tests whether overflow is legible and correctable |

Record wall-clock time-to-first-useful-state for `UXF-1` and `UXF-2`. "Swift" is measurable; measure it.

## 6. Verification floor for both passes

Code inspection never settles a UX claim. Exercise the real running app.

- Desktop; **~390px**; **~320px** where relevant.
- Keyboard-only operation of every changed or challenged control; visible focus; focus placement
  after create, assign, trim, reorder, and delete.
- Meaningful labels and accessible names; reduced-motion behavior where motion is involved.
- Loading, empty, error, and permission states on every touched surface.
- For each important interaction, answer explicitly **before**: what do I expect this to do? and
  **after**: is what happened unmistakable?

**Known tooling gaps — do not burn the run fighting them.**

- Narrow-layout QA must use browser viewport emulation. Do not treat a resized or cropped headless
  window as proof of a 390px or 320px layout; see `AGENTS.md` and
  `ritmofit_design_system/04-layout-and-surfaces.md`. Fall back to
  `apps/web/smoke/narrow-width.smoke.mjs` as the authoritative narrow-width gate — locally only,
  never against production. Note the constraint in the report.
- `agent-prompts/browser-verification/` measures contrast, focus rings, horizontal overflow, and
  reduced motion over the DevTools Protocol. **Run its self-test first** — the two mistakes it
  guards against produce plausible wrong numbers, not obvious errors.
- When something looks visually wrong, use the available browser inspection tools to inspect
  computed styles and bounding rects rather than eyeballing a screenshot. A past run found a real
  `container-type: inline-size` collapse that way that code reading had missed.

**Side effects.** Local data means deletes are fine — exercise them, they are part of the journey.
Do not start real provider playback through speakers unless audio behavior is specifically in
scope. Never point either pass at `ritmofit.studio`.

## 7. What both passes never do

- Never reopen deferred community surfaces (D20).
- Never make schema, API, or architecture changes unless the UX correction genuinely requires one —
  and then say so in the plan and wait for the owner.
- Never re-report a finding the owner already dispositioned. Check the most recent
  `docs/audits/*/run-decisions.md` before writing anything up.
- Never claim a UX improvement from code inspection alone.
- Never report failures only. Include what survived the review so the result is calibrated; do not
  manufacture findings to justify the run.
