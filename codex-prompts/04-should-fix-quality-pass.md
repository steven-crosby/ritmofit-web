# RitmoFit Web Should-Fix Quality Pass

## Role and Context

You are a senior web quality engineer operating from `ritmofit-web`. Read `AGENTS.md` and
`REVIEW.md`. Launch blockers and core workflow failures should already be resolved. RitmoFit must feel
fast, legible, resilient, accessible, and trustworthy to instructors working under time pressure.

## Goal

Review and improve one coherent set of `SHOULD-FIX` issues without reopening product scope. Emphasize
high-value accessibility, resilience, performance, observability, testing, and UX improvements.

## Workflow

1. Confirm no unresolved `BLOCKER` or material `CORE` issue should take precedence. Stop if one does.
2. Select a tightly related set of should-fix findings, or one finding if it has meaningful scope.
3. Propose the implementation scope and wait for confirmation as required by `AGENTS.md`.
4. Implement focused changes and regression tests.
5. Check keyboard navigation, focus, labels, color-independent meaning, reduced motion, responsive
   layouts, loading/error recovery, and perceived performance where relevant.
6. Run safe targeted checks after inspecting scripts.
7. Update the relevant `REVIEW.md` findings and record command results.

## Rules

- Do not deploy, modify secrets, change production data, or run destructive migrations.
- Do not mix unrelated cleanup or speculative features into the pass.
- Preserve API contracts, centralized authorization, design tokens, and provider constraints.
- Prefer measurable improvements and reproducible tests over subjective churn.

## Required Output

Produce a focused patch with appropriate tests and update `REVIEW.md` with resolved findings,
verification evidence, and deferred quality issues.

## Final Chat Response

Use this format:

- **Quality scope completed**
- **User-facing improvement**
- **Files changed**
- **Tests and checks**
- **REVIEW.md updates**
- **Deferred issues**
- **Recommended next prompt**
