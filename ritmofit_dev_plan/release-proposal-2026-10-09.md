# Deliberate release proposal — 2026-10-09

Status: prepared for owner decision; nothing deployed. Natural desktop #494 acceptance and human listening remain prerequisites in the approved sequence.

## Recommended two-batch order

| Batch                     | Exact source / contents                                                                                                                                                                     | Presentation and playback scope                                                                                                                                                                                                                                    | Approval state                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| A — Apple provider guards | Candidate `0afa5c8cb1f0267ef4893b80d3584752902a2c42`, branch `codex/release-apple-guards-20261009`: production source `e712274` plus already-reviewed #495 (`8dc2e24`) and #499 (`5aaa8c5`) | Only `packages/music/src/apple-music.ts` production code changes. API tests and original handoff snapshots travel with the reused commits. Frontend/runtime/schema/config remain at the deployed baseline; SPA build produces the same `assets/index-mZ1ypG4t.js`. | Owner must explicitly approve this candidate and its isolated release-branch exception to the runbook's main-only preflight. |
| B — remaining web changes | Current main application source `0ec1d10` plus this documentation reconciliation; capture the exact final main SHA at deployment preflight                                                  | Includes #501 async transport-read handling and #503/#504 Builder/Live presentation. Provider guards from batch A remain included. No schema/API/auth/migration changes in these slices.                                                                           | Separate release decision after batch A smoke; fresh main build and exact source identity required.                          |

Batch A is a composition of code already merged through #495/#499, not new provider implementation and not a proposed rollback of main. It is retained separately so provider changes can ship on their own as AGENTS.md requires. The local candidate is published as a reviewable branch; do not merge that old-frontend composition into main. Its historical handoff snapshots are not current release authority; this proposal and the round-close handoff govern the candidate.

## Verified candidate A preparation

- Baseline-to-candidate application delta is exactly `packages/music/src/apple-music.ts` plus its API test file. The production module matches current main's Apple guards byte-for-byte; no other application, shared-contract, migration, design-token, dependency, or configuration delta.
- Full repository gate passed: format, all-workspace typecheck, lint, design-system/theme checks, unit tests (web 1047, API 486, music 30), API integration 184, web build, OpenAPI regeneration/no diff, contract parity, dependency audit. The audit retains the two existing ignored advisories.
- SPA entry `assets/index-mZ1ypG4t.js` matches the recorded production entry. Worker bundling via `wrangler deploy --dry-run` exited successfully without deployment. These are local candidate checks; no candidate Worker version or live provider result exists yet.
- Remote D1 migration list on 2026-10-09 succeeded on retry with no migrations to apply. Secret-name check confirmed `BETA_ALLOWED_EMAILS`; no secret value was read or changed. Repeat both required preflight checks immediately before the approved deployment.

## Deployment and rollback gate

Current rollback anchor is Worker `5f67d242-8956-42b7-9318-67b2797d3454`, deployed #494 source `e712274`, SPA `assets/index-mZ1ypG4t.js`. Both fresh QA classes were created on that schema and remain tagged; no migrations are proposed or applied.

After explicit batch-A approval, revalidate clean candidate/source identity, migrations, secret names, build output, and rollback anchor; follow `deployment-runbook.md` for actual publication. Retain the new Worker version and three consecutive cache-busted SPA matches, plus health/protected-route/headers smoke and real authenticated Apple browse/import checks. No audio analysis, downloading, proxying, caching, or crossfading is introduced.

Batch B needs its own exact source/build/rollback preflight and approval. Targeted real SoundCloud asynchronous-transport verification remains relevant to #501; its automated tests and Apple’s synchronous transport do not establish that provider's live behavior. Spotify remains tabled. After the final delivered web build, repeat relevant Apple natural listening acceptance and then actual iPhone Safari investigation; earlier #494 results cannot be relabeled as acceptance of a later release.

No batch is automatically authorized by code merge, a green gate, fixture creation, or this document. The close-session request authorizes completed Git branch/worktree cleanup. This unfinished candidate remains retained; its disposition and production-fixture deletion remain separate owner decisions.
