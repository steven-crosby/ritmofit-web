# Prompt 02 implementation evidence

Captured 2026-07-20 from the local web and Worker development servers with mock providers enabled.
The disposable QA fixture contains one locally created Cycle class, three manual tracks, two scored efforts,
one unscored effort, and no provider-library content.

## Captures

- `CLS-02-fresh-desktop.jpg` — genuine fresh-account Classes state with four peer starting routes.
- `CLS-03-empty-class-desktop.jpg` — selected empty class with music, source, movement, and manual routes.
- `CLS-01-populated-desktop.jpg` — run-of-show shelf with a sparse, visibly derived Class Pulse.
- `CLS-01-populated-390x844.jpg` — populated Classes workspace at the primary mobile viewport.
- `CLS-01-populated-390x844-full.jpg` — complete populated Classes page at 390 px.
- `CLS-01-pulse-390x844.jpg` — mobile run-of-show shelf with Class Pulse and both next actions.
- `CLS-01-pulse-320x844.jpg` — direct 320 px Class Pulse and shelf reflow.
- `CLS-04-rehearsal-desktop.jpg` — read-only rehearsal with the same Pulse, readiness, and track score.
- `CLS-04-rehearsal-390x844.jpg` — contained mobile rehearsal dialog with Pulse and readiness.
- `CLS-05-unavailable-desktop.jpg` — blocked class-list request using the shared recovery grammar.

## Browser checks

- Populated retry recovered from the unavailable state to the same loaded class after the request block was
  removed.
- Ephemeral confirmation changed `aria-pressed` to `true` and reset after reload; no persistence was implied.
- At 390 px: no horizontal overflow; template, search, sort, shelf, Pulse, and rehearsal actions measure at
  least 44 px high.
- At direct 320 px (also the 640 px at 200% reflow equivalent): no horizontal overflow; the confirmation
  target measured 44 px high and the Pulse remained within the viewport.
- Pulse rectangles reported no animation or transition, and the browser console reported no errors after
  retry recovery.
- The rehearsal dialog is contained to the 390 px viewport, has no horizontal overflow, and exposes no visible
  sub-44 px controls.
- Responsive layout was verified from live DOM geometry, accessibility snapshots, and the valid mobile captures
  above. An earlier capture attempt used the wrong file extension and was discarded.

## Shelf request review

- The shelf enriches at most four recent classes and runs at most two read-only run-payload requests
  concurrently; focused tests lock both bounds.
- The endpoint and API contract are unchanged. `getClassShelfPayload` is a separately mockable name for the
  existing read-only run-payload request.
- Development React Strict Mode intentionally replays effects, so local Worker logs show duplicate development
  reads. Production performs one bounded enrichment pass per stable candidate set.

## Verification gate

The complete repository gate passed on 2026-07-20: format, workspace typecheck, lint, design-system token and
contrast verification, root tests, Worker/D1 integration tests (30 files / 149 tests), production web build,
OpenAPI regeneration with no drift, iOS contract parity, production dependency audit, and `git diff --check`.
The web suite passed 59 files / 599 tests. The dependency audit reported only the repository's explicitly
ignored findings.
