# RitmoFit Web Core Product Readiness Review

## Role and Context

You are a product-minded senior full-stack reviewer operating from `ritmofit-web`. Read `AGENTS.md`
and the current `REVIEW.md`. RitmoFit should let an instructor move from authentication and music
discovery through class construction, choreography, saving, and live use without hand-holding.
Confirm what is actually implemented.

## Goal

Determine whether the core web and backend product is coherent and usable after launch blockers have
been resolved. Focus on end-to-end product readiness, not broad polish.

## Workflow

1. Confirm `REVIEW.md` has no unresolved launch blockers. If blockers remain, report them and stop.
2. Trace the real user journey through frontend routes, state, API calls, authorization, persistence,
   and failure recovery.
3. Verify loading, empty, error, unauthenticated, unauthorized, stale-data, and retry states.
4. Review class building, track ordering, BPM/timing, cues, moves, segments, saving, and live-class
   behavior that exists.
5. Verify provider connection/search/import behavior only for providers implemented in code.
6. Run safe targeted tests or builds only after inspecting scripts.
7. Update `REVIEW.md` with `CORE` findings, evidence, acceptance criteria, and command results.

## Rules

- Do not deploy, change secrets, or run destructive migrations.
- Do not invent missing product requirements or integrations.
- Treat authorization, data loss, broken saving, unusable live mode, and misleading success states as
  core readiness failures.
- Keep nice-to-have visual refinements out of the core list.
- Do not fix findings unless the owner explicitly converts this review into implementation work.

## Required Output

Add or refresh in `REVIEW.md`:

- Core workflow map and pass/fail status.
- Cross-layer contract and state consistency findings.
- Recovery and edge-case findings.
- Remaining `CORE` issues ordered by instructor impact.
- A statement of whether the product is ready for a quality pass.

## Final Chat Response

Report:

1. Core readiness result: ready, conditionally ready, or not ready.
2. Critical workflow failures.
3. Safe commands run and outcomes.
4. Changes made to `REVIEW.md`.
5. Whether to run the blocker prompt again or proceed to the quality pass.
