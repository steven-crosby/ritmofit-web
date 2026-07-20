# Implementation prompt 05: Live pressure hierarchy

## Role and outcome

Own Live queue, preflight, ready, active, paused, full-list, and playback-recovery presentation. Under teaching
pressure, the instructor must find the current cue/count, next cue, transport, time, and effort in one glance,
including when music is unavailable.

## Authority

Implementation only after separate owner authorization. No branch, commit, push, PR, merge, deploy, deletion,
cleanup, wake-lock/provider expansion, or other prompt without separate permission.

## Required reads and baseline

Read current `AGENTS.md`, especially music and real-browser playback rules; audit sequence/brief/backlog/
decisions/inventory; all LIVE current/proposed evidence; and landed prompt 01–03 contracts. Reverify current
`origin/main`. Audited baseline: `addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`; inspect drift first.

## Approved scope

- Owning ID: P0-05.
- Inventory/anchors: LIVE-01–LIVE-06 and LIVE-09.
- Direction: current cue/count → next cue → transport → time/effort, preserved through ready, active, paused,
  full list, and failure; prompter-only is confident, not degraded.
- Inherited acceptance: shared pressure-safe accessibility/recovery grammar, Class Pulse contract, and provider
  capability vocabulary.

## Behavior before appearance

Preserve run payload, preflight gating, readiness, cue timing, elapsed/remaining clocks, seeking, pause/resume,
provider handoff, wake lock, notes, timeline, exit/reset, focus management, and error boundaries. No error or
absence message may displace the active cue/clock. Never fake playback state.

## File ownership and collisions

Likely owned files:

- `apps/web/src/components/LiveMode.tsx` and tests
- `apps/web/src/components/LivePreflight.tsx` and focused tests
- `apps/web/src/components/LiveTimeline.tsx` and tests
- Live-launch/queue portions of `Dashboard.tsx` only if required, serialized with prompts 02–04/06
- Live-scoped `apps/web/src/index.css`

Consume but do not fork Class Pulse, provider capability, and recovery primitives. Playback adapters/runtime,
API/shared contracts/schema/migrations, dormant features, and P2 motion are frozen unless separately authorized.

## Implementation order

1. Re-derive Live state transitions and write assertions for cue/clock persistence through every transition.
2. Recompose queue and blocked/runnable preflight with ready versus fix/prompter-only grouping.
3. Recompose ready state around the first teaching action.
4. Recompose active/paused hierarchy with stable cue, next cue, transport, time, effort, pulse, and notes.
5. Build compact full-list score with current position and rehearsal marks.
6. Apply playback recovery without pausing/erasing the cue clock unless current behavior explicitly requires it.
7. Verify focus, wake-lock, exit, provider handoff, and error paths independently.

## Design translation

Live is an instrument, not a dashboard. Largest type belongs to actionable cue/count, never an error. Cyan marks
control/playback, amber warning, copper primary deliberate action. Use Class Pulse for orientation, not
decoration. No beat-aware ambient motion; reduced motion must be complete.

## Responsive and hostile cases

Desktop/large display, 390, direct 320, 640 CSS-pixel reflow. Test long cues/notes/titles, sparse data, ten/large
run lists, missing playback, provider reconnect, late state changes, paused/failure overlap, and device rotation/
viewport changes where the test surface supports it. Transport remains reachable without page overflow.

## Accessibility

Keyboard transport and exit, visible focus, 44px mobile controls, clear paused/playing labels, non-color provider/
warning meaning, reduced-motion static status, restrained live-region announcements, and focus restoration on
preflight/exit/recovery. Preserve current full-screen takeover semantics.

## State coverage

LIVE-01 queue, LIVE-02 blocked/warning preflight, LIVE-03 ready, LIVE-04 active, LIVE-05 paused, LIVE-06 full
list, LIVE-09 playback recovery; also empty payload, prompter-only, provider handoff, seek, wake-lock failure,
render recovery, and exit.

## Tests and gates

Extend focused LiveMode/LivePreflight/LiveTimeline tests. Run the complete Live suite, web suite, format,
typecheck, lint, design-system verify, web build, remaining CI-equivalent gate, and `git diff --check`.

## Visual and playback verification

Real-browser compare every LIVE anchor at desktop/mobile. Capture ready, active, paused, full list, and recovery.
With authorized playback, verify start, seeking, pause, resume, stop/exit, provider handoff/reconnect, and failure
as distinct capabilities. API probes do not substitute for audible playback.

## Acceptance criteria

- P0-05 hierarchy remains stable through all required states.
- No failure or missing-music message displaces current cue/count/clock.
- Prompter-only remains an affirmative runnable mode.
- Inherited provider/recovery/accessibility/pulse contracts are reused.
- Existing timing, playback, wake-lock, focus, and exit behavior remain correct.

## Failure and stop conditions

Stop for playback-runtime/provider/contract/schema changes, unexplained clock drift, contradictory preflight
semantics, or a need for beat-aware/P2 motion. Isolate provider/widget versus app failures before proposing a
behavioral fix.

## Handoff

Report changed files, state-transition invariants, tests/gates, screenshots, playback matrix, accessibility/
responsive results, remaining failures, and unauthorized actions not taken.

Suggested branch: `codex/live-pressure-hierarchy`  
Suggested PR title: `feat(web): refine live pressure hierarchy`
