# Phase 1 critique

## Verdict

Ritmo already contains the right functional loop—find music, shape a class, rehearse, and run—but the current interface reads as a sequence of capable forms rather than one instructor workstation. The largest design debt is not missing decoration. It is weak task hierarchy: Builder makes every tool equally present, provider truth changes vocabulary by surface, and Live sometimes gives absence/error copy the strongest position in the room.

The product is most convincing where it behaves like a purpose-built instrument: the intensity ribbon, ordered track stack, cue timing, and Live clock. It is least convincing where generic cards, repeated bordered sections, and explanatory chips obscure those instruments.

## What is worth preserving

- The current top-level shell—Classes, Music, Live, Account—is recognizable and appropriate for D20/D21. No new IA is necessary.
- The provider-authorized model is honest and technically constrained. Search, library access, and playback already exist as separable capabilities in code.
- Builder contains unusually complete authoring data: class order, duration, intensity, BPM, cue, movement, clip window, notes, and free placement.
- Live supports preflight, prompter-only operation, active transport, pause, and a full list. This is real operational depth, not a concept screen.
- The design-system palette, type families, focus color, and intensity language are distinctive enough to build on.

## Highest-impact failures

### 1. Builder has no stable task hierarchy

**Observed.** The populated desktop Builder stacks class metadata, readiness, long issue chips, timeline, track list, discovery tools, and inspector controls into one long reading column. At 390px the user traverses multiple sections before reaching the current edit. At 200%-equivalent reflow the page becomes extremely tall. Multiple current controls are below 44px.

**Consequence.** Reordering, fixing readiness, auditioning, and scoring all compete. The instructor must repeatedly reconstruct context: which class, which track, what is playing, and what remains unsafe.

**Proposal.** Keep the current shell, but establish a sticky Class Pulse, compact readiness jumps, a composed track workbench, a task-focused inspector, and a persistent preview rail.

### 2. The class has data but not a memorable shape

**Observed.** Intensity exists, but it is locally rendered rather than functioning as a persistent orientation instrument across Classes, Builder, summary, and Live.

**Consequence.** A 45-minute class is hard to scan as a performance arc. The product feels like track administration even when the underlying data describes choreography.

**Proposal.** Promote a derived-but-confirmable Class Pulse using only order, duration, and instructor-entered effort. It must never imply provider-audio analysis.

### 3. Music sourcing forces too much context switching

**Observed.** Search, likes, playlist import, URL import, and songs-by-move are separate reachable tools with inconsistent list and confirmation behavior. The mock provider exposed an empty playlists branch but not a realistic populated one.

**Consequence.** The product supports several legitimate starts but visually behaves as if each were an isolated utility. Selection continuity is weak.

**Proposal.** Use one source-list row language and one persistent selection tray in both Music and Builder. Browsing a playlist should precede import; starting a new class and adding to an open class should be explicit sibling actions.

### 4. Provider state is technically important but linguistically vague

**Observed.** Mock connection failed until a local encryption key was configured even though mock providers were enabled; the UI only reported that connections were not configured. Apple authorization showed reconnecting before returning to disconnected. Catalog, library, and playback readiness are not consistently distinguished across Music, Connections, Account, preflight, and runtime.

**Consequence.** An instructor cannot tell whether to reconnect, authorize, subscribe, retry, or proceed prompter-only.

**Proposal.** Share a provider-capability matrix: icon + state label + consequence + recovery action. Never rely on color alone.

**Supplemental real-account playback check (2026-07-19).** In the signed-in production UI, SoundCloud and Apple Music reported connected while Spotify reported expired. An existing SoundCloud-linked class track entered real playing state, paused correctly, and stopped correctly. `Resume` remained visually and semantically paused after two bounded attempts instead of returning to `Pause`; no console error explained the failure. No class, library, or connection data was changed. This upgrades resume/recovery from a hypothetical risk to an observed defect.

### 5. Live is not consistently designed for pressure

**Observed.** The active run can place “No cue set” in the hero position even when readiness is otherwise satisfied. Under reduced motion the current active state lacks the design-system-required static “Now playing” fallback. Error and warning language competes with the cue hierarchy.

**Consequence.** The most time-sensitive workspace can foreground absence rather than the next useful action.

**Proposal.** Establish one pressure hierarchy—current cue/count, next cue, transport, time/effort—then preserve it through ready, active, paused, full-list, and playback-failure states.

## Cross-product craft findings

| Finding                                                      | Evidence                                        | Severity | Falsifier/check                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------- | -------- | -------------------------------------------------------------------------------- |
| Generic card repetition weakens product signature            | observed across public, Classes, Music, Account | P1       | Squint current captures; the same bordered-card rhythm dominates unrelated tasks |
| Readiness uses issue volume rather than decision compression | observed in dense Builder                       | P0       | Dense fixture generated multiple long fix chips                                  |
| Mobile is often stacked desktop, not task-shaped             | observed at 390 and 320                         | P0       | Track the distance from page start to selected-track edit                        |
| Controls below 44px are common                               | measured current Builder and Live               | P0       | DOM bounding boxes at 320 showed search/sort/tabs/chips/selects below 44px       |
| Long content can dominate actions                            | observed hostile title and artist               | P0       | Long title in track list, inspector, dialog, and Live states                     |
| Reduced-motion semantics are incomplete                      | observed current Live                           | P0       | `prefers-reduced-motion: reduce` removed motion but did not add “Now playing”    |
| Public promise is broader than the visible product proof     | observed public entry                           | P1       | Compare marketing hierarchy with the actual solo creator loop                    |
| Account repeats provider state rather than sharing it        | observed Account/Connections                    | P1       | Same provider can require interpretation in three surfaces                       |
| Loading/update/error recovery lacks a single product grammar | code-confirmed                                  | P0       | Compare `UpdatePrompt`, `ErrorBoundary`, auth loading, and provider failures     |

## Scenario findings

- **Template first:** available, but template choice does not preview the shape or next authoring task.
- **Provider likes first:** works end-to-end in mock mode and creates a class, but confirmation does not strongly bridge sourcing to shaping.
- **Specific track first:** search and actual SoundCloud preview worked in a real browser; selection should persist while choosing destination.
- **Playback controls:** real-account SoundCloud start, pause, and stop were observed; resume did not return to playing state and needs a focused regression check.
- **Playback recovery proposal:** the preview now distinguishes ready, playing, paused, resume-failed, and clip-complete; failure preserves the selected class/track and elapsed position while offering bounded restart, stop, and provider-status actions.
- **Existing class first:** resume, reorder, timeline, score, preview, and Live all exist; context is lost through vertical distance.
- **Movement first:** Songs by Move is valuable but reads like a hidden modal utility. It deserves equal status as an on-ramp, while remaining inside the current shell.
- **Rehearsal first:** preflight is robust, but the queue and ready state repeat readiness information instead of preparing the first action.

## Accessibility and hostile-content findings

- Current dialogs trapped focus and exposed `aria-modal`; the visible focus ring was cyan and approximately 3px.
- Current 320px Builder, Live, and dialog states did not show page-level horizontal overflow, but numerous controls were undersized.
- The proposed system retained text/icon labels for every status, added 44px minimum mobile targets, and passed 300px internal reflow after revision.
- Long multilingual title/artist content was exercised. Proposed list rows truncate secondary scanning text while inspectors preserve the full editing context.
- Design-system contrast verification passed all canonical dark/light semantic pairs. Prototype deviations use the same approved semantic palette.

## Console/network/font record

- Current local app: no persistent page-breaking console error was observed during the completed tour.
- Supplemental production-account SoundCloud playback: start/pause/stop state transitions were observable; resume stayed paused after two bounded attempts with no console warning/error. No credentials were typed or stored by the audit.
- The local API initially could not start because the Worker serves `apps/web/dist`; a fresh web build resolved it.
- Provider connection initially returned a configuration error until a disposable local encryption key was added. This is a developer-setup and recovery-copy finding, not a production claim.
- Prototype: no console warnings/errors after loading all 51 anchors; local WOFF2 fonts resolved from the repository.

## Product-boundary check

The critique and prototype do not surface Explore, Teams, public classes, sharing, collaborators, community discovery, pricing, or subscriptions. Existing dormant source is neither removed nor expanded. Spotify, Apple Music, and SoundCloud remain the audio owners; the proposal adds no caching, downloading, analysis, proxying, mixing, or derived provider audio.
