# Studio Pulse Check: finding dispositions

This ledger is the authoritative disposition for the 21 non-P0 findings in the 2026-09-13 live UX
audit. It converts every finding into scoped backlog work, an explicit owner decision, or an
acceptable/drop outcome. The source report remains evidence, not the planning queue.

The audit's P0 intensity-control collapse is tracked separately in
[PR #412](https://github.com/steven-crosby/ritmofit-web/pull/412), now merged to `main` and deployed
with [PR #414](https://github.com/steven-crosby/ritmofit-web/pull/414) and
[PR #415](https://github.com/steven-crosby/ritmofit-web/pull/415) as Worker `edaa62b0`
(recorded in [PR #416](https://github.com/steven-crosby/ritmofit-web/pull/416)).

## Run metadata

| Field | Value |
| --- | --- |
| Source report | [Studio Pulse Check](https://claude.ai/code/artifact/28aaf27a-434f-46c5-a163-f301c0ab2238) |
| Audit date | 2026-09-13 |
| Triage date | 2026-09-13 |
| Triage baseline | `main` at `ddf570f` |
| Findings in report | 22 |
| Findings in this ledger | 21 (the P0 is isolated in PR #412) |
| Live verification rule | One browser driver at a time; no parallel Chrome work |

## Disposition summary

| Disposition | Count | IDs |
| --- | ---: | --- |
| Backlog | 19 | SPC-01–04, SPC-06–21 except SPC-17 |
| Owner decision — resolved | 2 | SPC-05, SPC-17 |
| Accept and drop | 0 whole findings | One incorrect subclaim in SPC-06 is dropped; see its row |

The two findings originally flagged as out-of-scope and not independently re-verified were checked
before disposition. SPC-05 is a real docs-versus-code conflict. SPC-10 is a real destructive-control
consistency gap. SPC-06 is directionally correct, but its cited component and same-glyph claim are not.

## Finding ledger

| ID | Pri. | Surface | Finding and checked evidence | Disposition | Backlog scope / decision |
| --- | --- | --- | --- | --- | --- |
| SPC-01 | P1 | Auth | Error and success alerts rely too heavily on color; invalid fields do not receive a redundant error treatment. | **Backlog — AUTH-A11Y** | Add state glyphs and programmatic alert semantics; associate field errors and use an ember border/message without making color the only signal. Cover sign-in, sign-up, recovery, and reset. |
| SPC-02 | P2 | Auth | Password requirements are inconsistent: reset exposes a minimum while sign-up lacks the matching constraint/help. | **Backlog — AUTH-A11Y** | Define one password requirement in the shared validation path and expose the same hint, validation, and error copy on sign-up and reset. |
| SPC-03 | P3 | Auth | Password fields have no reveal/conceal control. | **Backlog — AUTH-A11Y** | Add labelled, keyboard-operable toggles that preserve focus and work with password-manager/autofill behavior. |
| SPC-04 | P3 | Auth | Switching auth modes changes the panel but does not move focus or announce the new heading. | **Backlog — AUTH-A11Y** | Focus the destination heading (or provide an equivalent announced transition) after an intentional mode switch; do not steal focus on initial render. |
| SPC-05 | P2 | Auth | **Re-verified after the audit:** `Login.tsx` uses the warm `rf-hero-glow`, while the design principles classify sign-in as a cool-and-quiet working surface. | **Owner decision — OD-01, resolved** | Auth remains a cool-and-quiet working surface. Remove the heat glow; warmth remains reserved for marketing and celebratory moments. Approved by Steven, 2026-09-13. |
| SPC-06 | P2 | Music / Account | **Corrected evidence:** the Connections dialog already applies the expired-state caution tone and uses distinct glyphs. The actual gap is in Dashboard's Music and Account connection headers, which hard-code tertiary text for “Session expired.” | **Backlog — PROVIDER-TRUTH** | Use the centralized connection-state tone in both headers and cover it with state-matrix tests. Drop the report's same-glyph subclaim as already correct. |
| SPC-07 | P2 | Music / Builder | `SourceList` and `ClassSummaryView` use a bare music-note character as missing-artwork fallback. | **Backlog — SOURCE-ARTWORK** | Replace the placeholder with the canonical artwork fallback/component, preserving accessible naming and provider/source context. |
| SPC-08 | P2 | Provider states | Connection-state marks are literal Unicode characters rather than the established icon system. | **Backlog — PROVIDER-TRUTH** | Move the glyphs to the icon system with stable sizing, alignment, accessible labels, and color-independent state names. |
| SPC-09 | P3 | Provider states | UI models four of six documented states; permission and provider-error remain a code TODO because the backend does not expose distinct signals. | **Backlog — PROVIDER-TRUTH** | Define the missing API-to-UI signals before adding display states; keep unavailable, disconnected, expired, permission, and provider-error semantically distinct. This may require a shared-contract/API slice. |
| SPC-10 | P2 | Classes | **Re-verified after the audit:** Dashboard class deletion uses bespoke bordered/tinted destructive buttons without the documented error icon. | **Backlog — DESTRUCTIVE-CONTROLS** | Adopt the canonical destructive treatment for initial and confirmation states, including icon, focus, busy/error behavior, and an automated interaction check. |
| SPC-11 | P1 | Builder | Cue/move save, cancel, and delete flows do not consistently restore focus to the invoking control or a stable successor. | **Backlog — BUILDER-A11Y** | Add deterministic focus restoration for save/cancel/delete, including the deleted-last-item case, and regression tests for keyboard flows. |
| SPC-12 | P2 | Builder | Choreography mutations surface raw `(e as Error).message` instead of the established `errMessage` normalization. | **Backlog — BUILDER-A11Y** | Route cue/move failures through the shared error vocabulary; retain actionable local context without leaking upstream text. |
| SPC-13 | P2 | Builder | Cue/move validation errors are visible but are not reliably announced. | **Backlog — BUILDER-A11Y** | Associate field errors, move focus to the first invalid field when appropriate, and use an alert/live region without duplicate announcements. |
| SPC-14 | P2 | Builder | The energy ribbon renders track baselines only. Code explicitly defers placed-move refinement while design docs describe the hybrid ribbon as current behavior. | **Backlog — ENERGY-RIBBON** | Implement placed-move refinement from the existing choreography data, then add visual/data-state coverage. If product no longer wants the hybrid model, resolve that as a separate owner decision and amend the docs instead. |
| SPC-15 | P3 | Builder | Custom-move inline Delete → Yes/No confirmation does not move focus to the destructive confirmation. | **Backlog — BUILDER-A11Y** | Focus “Yes” when confirmation opens, return focus on “No,” and choose a stable successor after deletion. |
| SPC-16 | P2 | Live | Timeline drag seeking calls the provider seek path on every pointer move. | **Backlog — LIVE-RUNTIME** | Separate preview position from provider commits; coalesce/throttle drag updates and commit on pointer-up/cancel, with keyboard seeking unchanged and tested. |
| SPC-17 | P2 | Live | The documented 88px BPM data hero is no longer the visual hierarchy in code; cue content is dominant while comments/docs still call BPM the hero. | **Owner decision — OD-02, resolved** | Keep the next cue as Live's visual hero and BPM prominent but subordinate; update the stale design documentation and code comments. Approved by Steven, 2026-09-13. |
| SPC-18 | P3 | Live | The virtual clock updates state on every animation frame at a level that re-renders the broad Live subtree. | **Backlog — LIVE-RUNTIME** | Isolate frame-rate state to the smallest timeline/readout boundary and profile before/after; preserve provider-authoritative playback and liveness behavior. |
| SPC-19 | P3 | Live | Disabled “Start class” lacks the documented reduced-opacity treatment. | **Backlog — LIVE-CONTROLS** | Apply the canonical disabled appearance (including the documented opacity target) while preserving native disabled semantics and readable contrast. |
| SPC-20 | Constraint | Responsive QA | The audit did not complete its sub-900px pass. The current broad narrow-width smoke is stale in several routes, and focused P0 checks also exposed a separate 10px overflow at 390px. | **Backlog — RESPONSIVE-QA** | Repair stale locators/fixtures, resolve the independently observed overflow, then run 1280/953/680/390/320 plus 200% zoom. Do not treat the focused P0 verification as a full responsive pass. |
| SPC-21 | P3 | Production data | A QA liveness-probe class is visible and top-ranked in the production account. | **Backlog — PROD-HYGIENE** | Inventory production fixtures, identify ownership, and add a cleanup/prevention runbook. Actual production deletion requires separate owner authorization and verification. |

## Scoped backlog slices

These are the implementation units carried into `DEVELOPMENT_PLAN.md`. Every backlog row above maps to
exactly one slice.

| Slice | Finding IDs | Likely surface | Acceptance boundary |
| --- | --- | --- | --- |
| AUTH-A11Y | SPC-01–04 | `Login.tsx`, reset-password UI, auth tests | Redundant status cues, one password contract, reveal controls, and announced mode transitions work by keyboard and screen reader. |
| PROVIDER-TRUTH | SPC-06, SPC-08, SPC-09 | Dashboard provider headers, Connections dialog, provider state contracts/tests | All supported states have correct tone/icon/name; missing states are implemented only after real backend signals exist. |
| SOURCE-ARTWORK | SPC-07 | Shared source/class summary artwork fallback | One accessible, source-aware fallback replaces bare note characters. |
| DESTRUCTIVE-CONTROLS | SPC-10 | Dashboard class deletion | Class deletion follows the canonical destructive control and confirmation behavior. |
| BUILDER-A11Y | SPC-11–13, SPC-15 | Cue/move editors and custom moves | Focus, normalized errors, and announcements pass keyboard-focused regression tests. |
| ENERGY-RIBBON | SPC-14 | Ribbon derivation/rendering and design docs | Rendered refinement matches placed moves, or a separately approved product decision changes the documented model. |
| LIVE-RUNTIME | SPC-16, SPC-18 | Live timeline/clock boundaries | Drag seek does not flood the provider; frame updates do not re-render the broad Live workspace. |
| LIVE-CONTROLS | SPC-19 | Live preflight/start control | Disabled treatment matches the documented component state without harming contrast. |
| RESPONSIVE-QA | SPC-20 | Narrow-width smoke and affected layouts | Stable automated coverage plus manual viewport/zoom evidence; no horizontal overflow in the tested surfaces. |
| PROD-HYGIENE | SPC-21 | Operations/runbook and production fixture workflow | Fixtures are identifiable and prevented from contaminating real queues; deletion stays separately authorized. |

## Resolved owner decisions

Steven approved both agent recommendations in chat on 2026-09-13. These resolutions define the
implementation direction but do not authorize an implementation slice by themselves.

| ID | Decision | Option A | Option B | Agent recommendation | Owner disposition / notes |
| --- | --- | --- | --- | --- | --- |
| OD-01 / SPC-05 | Is sign-in a cool working surface or a warm brand-front exception? | Remove the heat glow and preserve the cool-and-quiet principle. | Keep the glow and amend the principle to name auth as an exception. | **A** — sign-in is task-focused and should inherit the quiet shell. | **Resolved: A.** Approved by Steven, 2026-09-13. |
| OD-02 / SPC-17 | What is Live's primary data hero? | Keep cue-first hierarchy and update design docs plus stale code comments. | Restore BPM at the documented 88px hero scale. | **A** — the next teaching cue is more useful under pressure; BPM can remain prominent but subordinate. | **Resolved: A.** Approved by Steven, 2026-09-13. |

## Implementation status

| Slice / decision | Status | PR |
| --- | --- | --- |
| P0 intensity collapse | Merged and deployed | [#412](https://github.com/steven-crosby/ritmofit-web/pull/412) — Worker `edaa62b0`, recorded in [#416](https://github.com/steven-crosby/ritmofit-web/pull/416) |
| AUTH-A11Y (SPC-01–04) | Merged and deployed | [#414](https://github.com/steven-crosby/ritmofit-web/pull/414) — Worker `edaa62b0`, recorded in [#416](https://github.com/steven-crosby/ritmofit-web/pull/416) |
| OD-01 / SPC-05 (sign-in warmth) | Merged and deployed | [#414](https://github.com/steven-crosby/ritmofit-web/pull/414) — bundled with AUTH-A11Y since both touch `Login.tsx`/`ResetPassword.tsx` |
| SOURCE-ARTWORK (SPC-07) | Merged and deployed | [#415](https://github.com/steven-crosby/ritmofit-web/pull/415) — also fixed 4 uncited instances of the same pattern found in `Dashboard.tsx`; Worker `edaa62b0`, recorded in [#416](https://github.com/steven-crosby/ritmofit-web/pull/416) |
| DESTRUCTIVE-CONTROLS (SPC-10) | Implemented, not merged | [#417](https://github.com/steven-crosby/ritmofit-web/pull/417) |
| PROVIDER-TRUTH (SPC-06, SPC-08) | Implemented, not merged | [#418](https://github.com/steven-crosby/ritmofit-web/pull/418) — expired tone + icon-system marks. SPC-09 stays backlog. |
| RESPONSIVE-QA (SPC-20) | Implemented, not merged | [#419](https://github.com/steven-crosby/ritmofit-web/pull/419) — stale smoke locators, 390/320 overflow, 1280/953/680/390/320 + 200% zoom |

PR #414 also found that `rf-hero-glow` (the class OD-01 removes) is used on two surfaces the audit and
the decision never considered — `NotFound.tsx` and `ErrorBoundary.tsx`. Both were left unchanged:
neither is "sign-in," and OD-01 only resolved the auth surface. Whether utility/exception pages should
keep the warm treatment is an open question for a separate, explicit decision, not a rider on OD-01.

## Authorization boundary

- This ledger and the planning entries are triage, not implementation authorization for the remaining
  backlog slices.
- PRs #412 (P0), #414 (AUTH-A11Y + OD-01), and #415 (SOURCE-ARTWORK) are merged and deployed as
  Worker `edaa62b0` (recorded in PR #416).
- No merge, deploy, production-data deletion, schema change, or provider-contract change is authorized
  by this ledger. SPC-09 still needs a backend-signal design decision before any permission /
  provider-error UI.
