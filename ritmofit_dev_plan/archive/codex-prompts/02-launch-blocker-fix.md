# Ritmo Studio Web Launch Blocker Fix

## Role and Context

You are a senior full-stack engineer operating from the root of `ritmofit-web`. Read `AGENTS.md` and
`REVIEW.md`. Ritmo Studio's web product must safely support the instructor's planning workflow and its
authoritative backend. Verify the actual stack and implementation before acting.

## Goal

Select and fix exactly one unresolved `BLOCKER` from `REVIEW.md`. Prefer the highest-severity blocker
whose scope is sufficiently understood. Complete, verify, document, and stop.

## Workflow

1. Confirm the selected finding is reproducible or supported by current code and evidence.
2. Explain the blocker, affected user flow, likely root cause, and proposed files.
3. Identify schema, migration, API-contract, frontend, security, and deployment impact.
4. Present a concise implementation and verification plan. Wait for owner confirmation before coding
   when required by `AGENTS.md`.
5. Implement the smallest complete fix. Avoid unrelated cleanup.
6. Add or update focused regression tests.
7. Inspect scripts before running safe checks. Run the narrowest checks first, then appropriate
   typecheck, lint, test, integration, or build gates.
8. Update only the selected finding in `REVIEW.md` with the fix, evidence, command results, and
   residual risk.
9. Stop. Do not start another blocker.

## Rules

- Fix one blocker only.
- Do not deploy, modify secrets, rotate credentials, alter production data, or run destructive
  migrations.
- Do not rewrite an applied migration without explicit approval.
- Preserve shared contract and centralized authorization rules.
- Verify provider behavior rather than assuming Apple Music, Spotify, or SoundCloud support.
- Never log or expose tokens, cookies, authorization headers, or private keys.

## Required Output

The code change must include the minimum implementation and regression coverage required for the
selected blocker. `REVIEW.md` must state whether the blocker is `RESOLVED`, `PARTIALLY RESOLVED`, or
`STILL BLOCKED`, with verification evidence.

## Final Chat Response

Use this format:

- **Blocker addressed:** identifier and title
- **Result:** resolved, partial, or still blocked
- **Files changed:** concise list
- **Verification:** commands and outcomes
- **Review update:** what changed in `REVIEW.md`
- **Residual risk:** remaining concern, if any

End after this one blocker.
