# Phase 4: approved implementation-agent prompts

This phase runs only after the owner has reviewed the phase 3 prototype and supplied dispositions. It creates
ready-to-paste prompts for later implementation sessions; it does not implement, commit, push, open product
PRs, merge, or deploy.

## Preconditions

- Phase 3 prototype and screenshots are complete.
- `run-decisions.md` contains owner dispositions for every proposed surface and backlog item.
- Every `revise` item has either been revised and re-approved or explicitly deferred.
- There are no unresolved owner notes that materially change product scope or direction.

If any precondition fails, stop and identify the exact missing decisions. Never infer approval from an
agent recommendation, an unchanged mockup, or silence.

## Outputs

```text
docs/audits/<run-id>/
  implementation-sequence.md
  implementation-prompts/
    01-<foundation-or-surface>.md
    02-<surface>.md
    ...
```

Generate only non-empty prompts. Use as few prompts as practical while keeping ownership disjoint, reviewable,
and safe to implement as small product PRs.

## Select the approved set

Include only backlog items with owner disposition `approve` or `approve-with-notes`. Apply the notes exactly.
Exclude `reject` and `defer`. A revised item enters the set only after its revision is approved.

Update the backlog or a short disposition appendix so every omitted ID has a clear reason.

## Build the implementation sequence

`implementation-sequence.md` must include:

1. Approved thesis and baseline commit.
2. Ordered implementation slices and why that order minimizes rework.
3. Dependency graph: shared tokens/primitives before dependent surfaces.
4. Ownership map with exact prompt IDs, likely files, and explicitly frozen files.
5. Collision map identifying prompts that must not run concurrently.
6. Parallelization recommendation based on disjoint checkouts and actual file ownership; do not assume four lanes.
7. Integration gates between dependent slices.
8. Final combined visual-regression and accessibility pass.
9. Explicitly deferred/rejected/product-decision-required items.
10. Permissions reminder: implementation, commit, push, PR, merge, and deploy are separate.

Prefer this shape when the approved work supports it:

1. Shared tokens and reusable primitives.
2. Shell/navigation and shared responsive behavior.
3. Classes and class creation.
4. Music, provider browse/search/playlists/preview, and connections.
5. Builder, timeline, choreography, and readiness.
6. Live preflight and runtime.
7. Account/auth/recovery.
8. Cross-surface reconciliation.

Combine or split only when the dependency and ownership evidence supports it.

## Every prompt must be executable

Write each file as a standalone prompt another coding agent can follow without rediscovering the audit.
Include:

1. **Role and outcome:** exact surface and instructor outcome.
2. **Authority:** implementation only; no commit/push/PR/merge/deploy unless separately granted.
3. **Baseline:** expected branch/commit and requirement to inspect live state before editing.
4. **Approved scope:** exact backlog IDs, owner notes, inventory IDs, and prototype anchors/screenshots.
5. **Behavior before appearance:** existing workflows and information that must remain intact.
6. **Files:** likely edits, required reads, owned files, shared/frozen files, and collision warnings.
7. **Implementation order:** small, testable vertical steps.
8. **Design translation:** tokens/components/states to implement; what is directional versus pixel-specific.
9. **Responsive and hostile cases:** desktop, 390px, 320px/zoom where relevant, long/dense content.
10. **Accessibility:** keyboard, focus, targets, contrast, reduced motion, redundant encoding, and Live-specific checks.
11. **State coverage:** populated, loading, empty, error, disconnected/offline, disabled, and recovery as relevant.
12. **Tests:** focused unit/component tests and exact repo gates proportional to the slice.
13. **Visual verification:** real-browser comparison with the approved prototype at required viewports; capture evidence.
14. **Acceptance criteria:** owner-tryable behavior and visual outcomes tied to each included backlog ID.
15. **Failure and stop conditions:** scope expansion, schema/provider/legal changes, contradictory canon, or overlapping work.
16. **Handoff:** changed files, verification, screenshot paths, remaining gaps, and unauthorized actions not taken.
17. **Suggested branch and PR title:** suggestions only, not permission.

## Global constraints in every prompt

- Follow current repository `AGENTS.md` and reverify current source before editing.
- Preserve D20/D21 solo-first, multi-entry creative flow and dormant community boundaries.
- Preserve official provider playback and music constraints.
- Keep schema/migrations out unless explicitly reopened.
- Use design-system sources and generation workflow for token changes.
- Do not over-literalize static prototype mechanics; preserve the approved hierarchy, behavior, states, and craft.
- Avoid drive-by refactors and unrelated cleanup.
- Do not declare completion without real-browser visual verification for non-trivial UI work.

## Prompt-quality audit

Before finishing:

- Every approved backlog ID appears in exactly one owning prompt, unless an explicitly documented shared
  foundation has downstream acceptance checks.
- No rejected/deferred item appears as an invitation to implement.
- Likely file ownership is disjoint enough for the proposed parallelism.
- Dependencies are ordered and integration gates are concrete.
- Each prompt can fail its acceptance checks; no verification theater.
- Final reconciliation checks the product as a whole rather than merely trusting isolated PRs.

Stop after reporting the prompt paths and recommended sequence. Product implementation requires a separate
owner request.
