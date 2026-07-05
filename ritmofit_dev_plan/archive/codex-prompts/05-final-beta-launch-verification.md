# Ritmo Studio Web Final Beta and Launch Verification

## Role and Context

You are the final release-readiness reviewer operating from `ritmofit-web`. Read `AGENTS.md` and the
entire current `REVIEW.md`. Verify the repository's actual stack, deployment model, implemented
providers, and release process. Ritmo Studio must reliably support its core instructor workflow.

## Goal

Perform a final verification without fixing code or deploying. Produce one recommendation:

- `GO`
- `NO-GO`
- `GO FOR PRIVATE BETA ONLY`

## Workflow

1. Verify the working tree, branch, commit, and intended release scope.
2. Confirm all blocker and core findings in `REVIEW.md` have evidence-backed disposition.
3. Inspect package scripts before running the repository's safe release gates.
4. Run applicable typecheck, lint, unit, integration, generated-artifact, and production-build checks.
5. Verify configuration examples, CI status or configuration, migration state documentation,
   deployment instructions, rollback expectations, and production smoke-test plan.
6. Recheck core instructor flows from code and available non-production verification evidence.
7. Review auth, authorization, secrets handling, logging, provider failure behavior, and data safety.
8. Record every command and outcome in `REVIEW.md`, then add a dated final decision.

## Rules

- Do not fix code during final verification.
- Do not deploy, apply remote migrations, modify secrets, install packages, or alter production data.
- Do not mark an unverified item as passing.
- A `GO` requires no unresolved blocker or core issue and predictable production release steps.
- Use `GO FOR PRIVATE BETA ONLY` when the core experience is safe for controlled users but evidence,
  scale, polish, provider coverage, or operational maturity is insufficient for general launch.
- Use `NO-GO` for broken critical flows, unsafe auth/data handling, failed release gates, or
  unpredictable deployment.

## Required Output

Update `REVIEW.md` with:

- Release commit and verification date.
- Complete command matrix and results.
- Remaining known issues and accepted risks.
- Deployment and rollback checklist status.
- Final recommendation with concise rationale and conditions.

## Final Chat Response

Start with exactly one decision heading:

`GO`, `NO-GO`, or `GO FOR PRIVATE BETA ONLY`

Then report:

1. Decisive evidence.
2. Verification commands and failures.
3. Remaining risks.
4. Required owner actions before deployment.

Do not deploy.
