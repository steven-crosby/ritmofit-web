# Builder trim preservation — round r20261021, lane 1

The Track inspector preserves an untouched authored clip end when other track details are saved. Previously a stored 1250ms end was reparsed from its whole-second display and sent as 1000ms; a stored 499ms end or tight 1250..1500ms window could block an unrelated save.

The edited display value still uses the existing positive `m:ss` contract. Clearing clip end resets it to `null`; the effective end follows **Track length**. No new upper bound or fractional-entry UI is introduced. The help text states blank-start and blank-end behavior separately.

## Verification

[Verification receipt](./verification.json) identifies the exact source/test hashes and commands. Before the source fix, all five selected preservation regressions failed; after the fix, the full Dashboard test file passed 143/143. Tests cover notes/BPM-only saves, sub-second and tight windows, deliberate positive end edits, blank reset, permissive above-length raw ends, malformed/zero rejection and focus. Existing Dashboard tests retain start/downbeat/placement precision, inverted-window handling and failed-server-save draft coverage.

The first attempted regression command included an argument separator and selected broader web tests. That run was stopped (130); it is not counted as verification. Ignored local logs retain the original output. The receipt records the corrected focused result.

Root's [browser receipt](./browser.json) records 13 passing checks in local Chrome against local Worker/D1, with matching before/after source hashes and no page errors. Notes-only saves retained 499/1250/1500ms ends after persisted re-read and reload; invalid zero focused its field and retained the draft without a write; deliberate whole-second edit and blank reset persisted. The form remained operable with reduced motion; desktop 1440px and narrow 390/320px layouts had no horizontal overflow. Screenshots: [desktop](./builder-1440.png), [390px](./builder-390.png), [320px](./builder-320.png).

The initial root browser harness used an exact text locator that overlooked the Saved glyph; its corrected locator passed without a product change. Root's initial build encountered in-progress test annotations; the later production web build passed on the final hashes. Root reports that independent source review found no defects.

The root-coordinated [full gate](./full-gate.json) passed all 13 commands on its first attempt, from 12:18:09Z to 12:19:23Z on 2026-10-21, with unchanged final source/test hashes. This includes format, workspace types, lint, design-system verification, theme self-test/check, root tests, Worker/D1 integration, web build, OpenAPI generation/no diff, contract parity and dependency audit. Raw per-command logs were not retained separately: their shared paths were overwritten by the following lane's run. No aggregate test totals are attributed to this gate; the separately evidenced focused Dashboard result remains 143/143.

Native 200% zoom is **NOT_ASSESSED**. CUA could not address the isolated QA Chrome process without targeting Steven's personal Chrome window. Only the Window menu was opened and dismissed; no zoom command was issued. The real-Chrome 320px layout passed, which does not establish native zoom acceptance. No real-provider, audible, screen-reader or device acceptance is claimed. Production was not checked by this lane. Publication and hosted CI remain pending.

## Ownership

Product edits: `apps/web/src/components/Dashboard.tsx` and `Dashboard.test.tsx` only. Shared helpers, tokens/styles, provider/playback, API, schemas and migrations remain outside this lane.
