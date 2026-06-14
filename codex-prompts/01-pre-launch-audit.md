# RitmoFit Web Pre-Launch Audit

## Role and Context

You are a senior web, backend, security, and release-readiness engineer operating from the root of the
`ritmofit-web` repository. RitmoFit helps rhythm-based fitness instructors connect music services,
build choreographed classes from playlists, map timing, cues, and segments, and run classes live.
The product should be reliable, legible, fast, intuitive, and music-first.

Verify the actual stack and implemented features from the repository. Do not assume a framework,
provider integration, deployment platform, or feature exists merely because it is mentioned here.
Read and follow `AGENTS.md` before proceeding.

## Goal

Perform a comprehensive pre-launch audit without fixing application code. Create or update
`REVIEW.md` as the authoritative checklist, preserving useful existing content and clearly marking
stale or resolved findings.

## Workflow

1. Inspect `package.json`, lockfiles, directory structure, README and planning docs.
2. Inspect frontend configuration, routes, entry points, components, state management, and styling.
3. Inspect API entry points, routes, authentication, authorization, error handling, and integrations.
4. Inspect shared contracts, database schemas, migrations, seeds, and data-access patterns.
5. Inspect test configuration and coverage, CI/CD workflows, environment examples, and deployment
   configuration, including Wrangler/Cloudflare or any Vercel/Netlify configuration actually present.
6. Inspect the implemented instructor workflow: authentication, provider connection, track discovery
   or import, class construction, choreography, persistence, and live-class use.
7. Inspect scripts before running them. Run only safe, non-destructive checks that materially improve
   confidence, such as typechecking, linting, unit tests, integration tests, and builds when their
   scripts are understood.
8. Record every command and result in `REVIEW.md`.

Review these areas:

1. Frontend UI and UX
2. API and backend logic
3. Data layer and state management
4. Testing and CI/CD
5. Performance
6. Security and production readiness
7. RitmoFit's core instructor workflow

## Rules

- Do not fix code during this audit.
- Do not deploy, alter production state, modify secrets, install packages, or run destructive
  migrations.
- Do not expose secret values in output.
- Distinguish verified defects from risks, missing evidence, and future enhancements.
- Prioritize core functionality, build/run health, critical flows, safe auth/data handling,
  predictable deployment, and usability without hand-holding.
- Do not let cosmetic polish obscure blockers.

## Required Output

Structure `REVIEW.md` with:

- Audit date, branch, commit, and scope.
- Verified architecture and deployment summary.
- Commands run and concise outcomes.
- Findings grouped as `BLOCKER`, `CORE`, `SHOULD-FIX`, and `NICE-TO-HAVE`.
- Each finding must include evidence, user impact, affected files or subsystem, and a concrete
  verification or acceptance condition.
- Core workflow coverage matrix.
- Security, migration, configuration, and deployment risks.
- Open questions and unverified areas.
- Current launch recommendation.

## Final Chat Response

Report:

1. Audit completed and `REVIEW.md` location.
2. Counts by severity.
3. Highest-priority blocker or risk.
4. Commands run and any checks not run.
5. Recommended next prompt.

Do not begin fixes.
