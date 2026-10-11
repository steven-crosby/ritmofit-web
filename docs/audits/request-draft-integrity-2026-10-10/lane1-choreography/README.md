# Choreography request and draft integrity — 2026-10-10

Lane 1 on base `ba92ceaf25a7b470eec23c33766df2658be287fb` fixes deterministic cue and move request races. No playback or provider API behavior changed.

## Reproductions and resulting behavior

- An older initial cue or placed-move read could replace the newer post-write list, or show a stale error. Only the latest mounted row read now applies its result or error.
- Add completion erased text/time typed while the write was pending. Inline Save also closed a newer editable draft. Form revisions now let completion clear or close only the submitted draft; replacement text, time, color, selector, and intensity remain editable.
- Delayed Save/Delete restored focus after the user moved elsewhere. Focus-event revisions now let the deliberate later focus choice win, including a later blur to the body. Existing Cancel, unchanged Save, and next-row/last-row Delete restoration continue to pass.
- Creating a reusable move could replace a newer picker draft, and an older initial user-move read could hide the created option. Creation retains the submitted placement reference while selecting it only for its unchanged draft; the latest user-move read owns the picker list. Existing retry reuse after placement failure is covered.
- Late writes still finish after section unmount, but local state, refresh, focus, and captured parent callbacks are suppressed. This prevents an old callback from reloading a previously selected class. No remote cancellation is claimed.
- A confirmed write followed by a failed local refresh still notifies the mounted parent; its local error remains the refresh error. Rejected writes retain editable input.

The Dashboard inspector is keyed by song ID. This work does not assume same-instance reuse across song selection, alter parent loading, or change API contracts, snapping, clip bounds, color values, intensity values, or move-reference policy.

## Retained automated evidence

| Receipt                                                  | Source stage                                                   | Result                              |
| -------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| [before-fix.json](./before-fix.json)                     | Unchanged base source, first request/draft/focus regressions   | 13 failed, 18 passed                |
| [lifecycle-before-fix.json](./lifecycle-before-fix.json) | After core request/draft/focus fix, before lifecycle/color fix | 7 failed, 31 passed                 |
| [user-move-before-fix.json](./user-move-before-fix.json) | Before latest user-move read fix                               | 1 failed, 20 passed                 |
| [after-fix.json](./after-fix.json)                       | Current source and tests                                       | 44 passed in 3 suites               |
| [source-sha256.json](./source-sha256.json)               | Verified files                                                 | SHA-256 per source/test file        |
| [full-gate.json](./full-gate.json)                       | Orchestrator verified the frozen lane source                   | All 12 repository gate steps passed |

Receipts retain assertion names/status/counts from actual Vitest JSON reports, with machine paths and bulky rendered DOM diagnostics omitted. The suites are [cue tests](../../../../apps/web/src/components/CuesSection.test.tsx), [move tests](../../../../apps/web/src/components/MovesSection.test.tsx), and the existing [helper tests](../../../../apps/web/src/components/ChoreographyEditor.test.ts).

Commands run:

```sh
pnpm --config.verify-deps-before-run=false --filter @ritmofit/web exec vitest run src/components/ChoreographyEditor.test.ts src/components/CuesSection.test.tsx src/components/MovesSection.test.tsx
pnpm --config.verify-deps-before-run=false --filter @ritmofit/web exec tsc --noEmit
./node_modules/.bin/eslint apps/web/src/components/ChoreographyEditor.tsx apps/web/src/components/CuesSection.test.tsx apps/web/src/components/MovesSection.test.tsx
./node_modules/.bin/prettier --check apps/web/src/components/ChoreographyEditor.tsx apps/web/src/components/CuesSection.test.tsx apps/web/src/components/MovesSection.test.tsx
git diff --check
```

Focused tests, web typecheck, scoped ESLint, formatting, and diff whitespace checks passed. The pnpm configuration flag suppresses automatic dependency freshness installation for the round's shared dependency symlinks. The initial default invocation aborted an install prompt without running tests; no install or dependency edit was performed.

## Orchestrator full gate and browser evidence

The orchestrator independently passed all 12 CI-equivalent gate steps against the frozen lane source using `pnpm_config_verify_deps_before_run=false`: formatting, recursive typecheck, lint, design-system verification, theme classes, unit tests, API integration tests, production web build, OpenAPI regeneration, OpenAPI no-diff check, contract parity, and audit. Counts were web 1104, API 486, music 30, and API integration 184. Audit exited 0 with the existing ignored low and moderate advisories. The compact command/exit receipt is [full-gate.json](./full-gate.json).

The shared browser run paired unchanged main against actual candidate source and reproduced all three original round failures, including this lane's stale cue snapshot and cue-draft erasure. All 12 candidate behavior scenarios passed; eight exercise choreography: stale cue snapshot, newer cue Add draft, newer move Add draft, newer inline cue Save draft, delayed cue Save focus ownership, unchanged keyboard cue Save restoration, delayed move Delete focus ownership, and unmounted cue parent-callback suppression.

Synthetic Blink/CDP keyboard and mouse events exercised actual components with controlled API responses. The shared page and measured cue/search panel overflow checks passed at 1200×900, 390×844, 320×568, 844×390, and 600×304. This is a component integration harness, not an authenticated whole-app audit. The 600×304 check is a compact viewport equivalent only: actual native Chrome 200% zoom was unavailable because app control timed out. No actual zoom acceptance is claimed. The parent-authored [integration packet](../integration-audit/README.md) retains shared browser evidence and screenshots.

## Remaining verification and authority

Combined Git-tree/CI verification still awaits separately authorized commit, push, and PR work; the current shared harness integrates source through external imports. Independent review is coordinated by the orchestrator. No production, human-listening, provider-playback, or device/audio acceptance follows from these checks. No stage, commit, push, PR, merge, deployment, production data mutation, or cleanup is authorized or performed by this lane.
