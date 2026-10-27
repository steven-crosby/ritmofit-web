---
date: 2026-10-27
tool: Codex (cloud)
lane: solo
branch: docs/macos-desktop-kickoff
head: 243626a
base: 7c627eb8158fe4b9865d654f0c8445e57b89b774
prs: []
status: open
---

# macOS reviewed plan and bounded first implementation prompt

## Done

- Added the [reviewed macOS plan](../macos-desktop-plan.md), the
  [12-finding adversarial review](../../docs/audits/macos-plan-2026-10-27/README.md),
  its original review target and source manifest.
- Added the [M0 kickoff prompt](../../agent-prompts/macos-desktop-kickoff.md) and
  discovery links in DEVELOPMENT_PLAN and the prompt index.
- Reconciled publication against `7c627eb`, including #633's broader audit and
  #634's MusicKit/FairPlay changes. No application code or dependency changes.

## In flight

- Owner requested PR creation and squash merge to main. At this handoff's creation,
  GitHub API calls return `Forbidden`; Git fetch works. PR creation/merge remains
  unverified until the API operation succeeds. The working branch is named above.
- The environment draft adds `api.github.com` while preserving package-manager
  presets; saving the draft alone does not apply the network policy. The tool
  reports review/save and publication are required in environment settings.

## Next action

Complete the requested PR/merge once GitHub API access works. Then start a fresh
agent session with `agent-prompts/macos-desktop-kickoff.md`, preferably on a
physical Mac, to review and implement the bounded M0 feasibility harness.

## Blockers and owner decisions

- GitHub API access is needed for PR creation and merge; do not push directly to
  main or infer write/API access from a successful fetch.
- Native proof needs Mac hardware/SDKs, authorized provider accounts, and later
  signing/notarization access. The prompt requires independent local prototype
  work to continue when those checks are blocked.
- No production runtime has been selected. Spotify and the Apple 5:18
  investigation remain tabled.

## Verification

- Passed this session: `pnpm format:check`, Markdown local-link and pinned-source
  reference validation, portable-path checks, JSON source-manifest parsing,
  all 12 review findings accounted for, and `git diff --check`.
- Full application/native/provider suites skipped: this PR changes only prose,
  links and a documentation manifest; no native implementation exists yet.
- Historical onboarding test counts in the plan are labeled with the original
  revision; they are not presented as new checks of today's main.

## Production as observed

- Not checked from this environment. No deployment, remote migration or
  production mutation was performed.
- Latest repository record at `7c627eb` reports Worker
  `df90f169-a51d-4476-bb9a-d4fbf6ab3663`, code `bf31706`, and SPA
  `assets/index-DvFKqouw.js`. That is recorded context, not fresh runtime evidence.
  This documentation PR does not alter application behavior.

## Shared zones touched

- Documentation and session prompt only; no schemas, OpenAPI, migrations, auth,
  playback, Dashboard or design-system changes.

## Notes for other lanes / iOS

- No contract changes or new iOS parity requirement. M0 must distinguish current
  web defects from failures introduced by a desktop runtime.
