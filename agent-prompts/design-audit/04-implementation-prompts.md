# Phase 4: proposed implementation prompts, and closeout

This phase turns the prototype into ready-to-paste prompts for later implementation sessions, then closes
the run. It does not implement, run Git commands, open PRs, merge, or deploy.

**These prompts are proposals, not authorized work.** They are generated from the agent's own
recommendations, before the owner has judged anything. Nothing here may be executed until the owner
records dispositions in `run-decisions.md`. Every generated prompt states this in its own header.

## Preconditions

- Phases 1–3 are complete and their quality gates passed.
- The prototype demonstrates the backlog items the prompts will describe.
- No production code changed during the run.

If a precondition fails, fix it or report the gap. Do not write prompts for directions the prototype never
showed — an owner cannot approve what they cannot see.

## Outputs

```text
<run-folder>/
  implementation-sequence.md
  implementation-prompts/
    01-<foundation-or-surface>.md
    02-<surface>.md
    ...
  shared-foundations-contract.md   # required when prompts share primitives
  run-decisions.md                 # owner ledger, dispositions blank
  README.md                        # owner entry point for the whole deliverable
```

Generate only non-empty prompts. Use as few as practical while keeping ownership disjoint, reviewable, and
safe to implement as small product PRs.

## Select the proposed set

Include P0, P1, and any P2 needed for the proposed product to be coherent. Exclude anything marked
`product-decision-required` from the prompt set — list those separately as owner decisions. Every backlog
ID must end up either owned by exactly one prompt or explicitly listed as excluded, with the reason.

## Shared foundations contract

When two or more prompts depend on the same new primitive — a state grammar, a shared component, a token
addition, a layout shell — write `shared-foundations-contract.md` and make prompt 01 own it. It must state:

- Which backlog IDs the foundation covers.
- The exact exported components or tokens, and their semantics.
- The state matrix consuming surfaces must honor rather than fork.
- Accessibility behavior the foundation guarantees, and what callers must supply.
- Which prompts consume it, and what they are forbidden from redefining.

Downstream prompts reference this contract instead of restating it. This is what keeps parallel
implementation from producing five dialects of the same state.

## Build the implementation sequence

`implementation-sequence.md` must include:

1. Proposed thesis and baseline commit.
2. Ordered implementation slices and why that order minimizes rework.
3. Dependency graph: shared tokens and primitives before dependent surfaces.
4. Ownership map with exact prompt IDs, likely files, and explicitly frozen files.
5. Collision map identifying prompts that must not run concurrently.
6. Parallelization recommendation based on disjoint file ownership; do not assume a fixed lane count.
7. Integration gates between dependent slices.
8. Final combined visual-regression and accessibility pass.
9. Deferred and `product-decision-required` items, with what the owner must decide.
10. Permissions reminder: owner disposition, implementation, commit, push, PR, merge, and deploy are all
    separate grants.

Prefer this shape when the proposed work supports it:

1. Shared tokens and reusable primitives.
2. Shell/navigation and shared responsive behavior.
3. Classes and class creation.
4. Music, provider browse/search/playlists/preview, and connections.
5. Builder, timeline, choreography, and readiness.
6. Live preflight and runtime.
7. Account/auth/recovery.
8. Cross-surface reconciliation.

Combine or split only when dependency and ownership evidence supports it.

## Every prompt must be executable

Write each file as a standalone prompt another coding agent can follow without rediscovering the audit, and
without knowing which agent produced it. Include:

1. **Authorization banner:** this prompt is a proposal from run `<run-folder>`; it may not be executed
   until the owner has recorded `approve` or `approve-with-notes` for its backlog IDs in
   `run-decisions.md`. Name the IDs it depends on.
2. **Role and outcome:** exact surface and instructor outcome.
3. **Authority:** implementation only; no commit, push, PR, merge, or deploy unless separately granted.
4. **Baseline:** expected branch/commit and the requirement to inspect live current state before editing.
5. **Scope:** exact backlog IDs, canonical surface IDs, and prototype anchors and screenshots.
6. **Behavior before appearance:** existing workflows and information that must remain intact.
7. **Files:** likely edits, required reads, owned files, shared/frozen files, and collision warnings.
8. **Implementation order:** small, testable vertical steps.
9. **Design translation:** tokens/components/states to implement; what is directional versus pixel-specific.
10. **Responsive and hostile cases:** desktop, 390px, 320px and zoom where relevant, long/dense content.
11. **Accessibility:** keyboard, focus, targets, contrast, reduced motion, redundant encoding, and
    Live-specific checks.
12. **State coverage:** populated, loading, empty, error, disconnected/offline, disabled, and recovery.
13. **Tests:** focused unit/component tests and the exact repo gates proportional to the slice.
14. **Visual verification:** real-browser comparison against the prototype at the required viewports, with
    captured evidence.
15. **Acceptance criteria:** owner-tryable behavior and visual outcomes tied to each included backlog ID.
16. **Failure and stop conditions:** scope expansion, schema/provider/legal changes, contradictory canon,
    or overlapping work.
17. **Handoff:** changed files, verification, screenshot paths, remaining gaps, and unauthorized actions
    not taken.
18. **Suggested branch and PR title:** suggestions only, not permission.

## Global constraints in every prompt

- Follow the repository `AGENTS.md` and reverify current source before editing.
- Preserve D20/D21 solo-first, multi-entry creative flow and dormant community boundaries.
- Preserve official provider playback and the music constraints.
- Keep schema and migrations out unless explicitly reopened.
- Use design-system sources and the token generation workflow for token changes.
- Do not over-literalize static prototype mechanics; preserve the proposed hierarchy, behavior, states,
  and craft.
- Avoid drive-by refactors and unrelated cleanup.
- Do not declare completion without real-browser visual verification for non-trivial UI work.

## Prompt-quality audit

Before closeout:

- Every included backlog ID appears in exactly one owning prompt, unless a documented shared foundation
  carries downstream acceptance checks.
- Excluded and `product-decision-required` items appear nowhere as an invitation to implement.
- Likely file ownership is disjoint enough for the proposed parallelism.
- Dependencies are ordered and integration gates are concrete.
- Each prompt can fail its acceptance checks; no verification theater.
- Final reconciliation checks the product as a whole rather than trusting isolated PRs.

## Closeout

1. Copy `run-decisions-template.md` to `<run-folder>/run-decisions.md` and pre-fill it per the
   instructions in that template: run metadata, every surface ID, every backlog ID, prototype anchors,
   owning prompt, and the agent's concise recommendation. Leave every owner disposition and note blank.
   The agent may recommend; it may never self-approve.
2. Write `<run-folder>/README.md` with the ten items listed in the pack `README.md`, "Deliverable shape".
3. Verify with `git status --porcelain` that nothing changed outside `<run-folder>/` and
   `agent-prompts/design-audit/surface-ids.md`. Run no other Git command.
4. Measure the run folder size and confirm it is within budget.
5. Stop the local dev servers started in phase 0b.
6. Report to the owner: deliverable path, prototype open command, coverage counts, evidence gaps, fixture
   deviations, folder size, and the decisions the owner now owes.

Product implementation requires a separate owner request, made after dispositions exist.
