---
date: 2026-10-23
tool: Cursor
lane: solo
branch: cursor/live-cue-teaching-dd2c
head: d9c13e2b2e11d576559ab67ff79f485960ad0780
base: 82b5b9d
prs: ['#556']
status: open
---

# Cue-by-Cue teaching reading is up for review

## Done

- Live Cue-by-Cue reads the current cue's stored hold: hero, `formatCueDurationLabel` countdown, `durationMs` bar, cue BPM, and `CUE_INTENSITY_LABEL`.
- Upcoming cues sit beside the hero from 1024px (equal columns; phone-width is 430px) and stack at 390.
- No payload, OpenAPI, contract-parity, builder, or library change.

## In flight

- https://github.com/steven-crosby/ritmofit-web/pull/556 on `cursor/live-cue-teaching-dd2c`. Not merged. Not deployed.

## Next action

Review the Cue-by-Cue PR. Merge only after that review. Do not deploy in this slice.

## Blockers and owner decisions

- None. The teaching-screen plan was already confirmed, including the countdown-size check.

## Verification

- Run: the repo gate (format, typecheck, lint, design-system verify, theme-classes, unit tests, API integration, web build, OpenAPI diff, contract parity, audit) passed.
- Browser: mounted Cue-by-Cue at 1440×900, 1280, 1024, and 390×844. Countdown was `15s` at the start, `5s` at 10s elapsed, and `0s` at 20s. Screenshots are in the session media folder, not the repo.

## Production as observed

- Not checked from this environment. This slice does not deploy.

## Shared zones touched

- none

## Notes for other lanes / iOS

- iOS stays halted. The four cue fields remain the existing allowlisted contract lag. This screen does not add `note` or `createdAt`.
