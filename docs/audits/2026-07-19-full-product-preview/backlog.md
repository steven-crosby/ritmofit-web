# Ranked design backlog

Rank is based on frequency × consequence × how long failure can remain silent. This is a design recommendation set, not implementation approval.

## P0 — blocks a coherent, pressure-ready product

| Rank | ID    | Title                                                              | Surfaces                                                                     | Recommendation                                                                                                            | Acceptance evidence                                                                                                                                       |
| ---: | ----- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | P0-01 | Give Builder a stable task hierarchy                               | BLD-01–10                                                                    | Sticky class orientation, compact readiness jumps, composed track stack, task inspector/drawer, persistent preview        | Reorder, score, preview, and add music without losing class/track context at desktop, 390, 320, and 200%                                                  |
|    2 | P0-02 | Make Class Pulse the shared class signature                        | PUB-01, CLS-01/04, BLD-01/04, LIVE-01/03/04                                  | Derived-but-confirmable energy arc from order, duration, and instructor effort only                                       | Same class reads consistently across library, authoring, rehearsal, and Live; provider audio is never analyzed                                            |
|    3 | P0-03 | Split track scoring into essentials and deliberate advanced detail | BLD-02/03/05/06/14–16/11                                                     | Keep effort, BPM, cue, movement, clip, note, and preview state near the selected track; disclose timing detail on demand  | A user can complete the common edit and traverse ready/playing/paused/complete without scanning the full advanced form                                    |
|    4 | P0-04 | Unify discovery and selection continuity                           | CLS-03, MUS-02–06, BLD-07–13                                                 | Shared source rows, preview behavior, selection tray, and explicit “start class” / “add to class” actions                 | Template, playlist, likes, track, movement, and existing-class starts all remain legitimate                                                               |
|    5 | P0-05 | Establish one Live pressure hierarchy                              | LIVE-01–06/09                                                                | Current cue/count → next cue → transport → time/effort, preserved through ready, active, paused, list, and failure        | No absence/error message displaces the active cue clock; prompter-only remains confident                                                                  |
|    6 | P0-06 | Use provider capability truth everywhere                           | MUS-01/02/07, CONN-01/02, BLD-09/10/15, LIVE-02/09, ACC-02                   | Separate catalog, library, and playback; pair state with consequence and recovery                                         | The same provider state reads identically in Music, Builder preview, Account, preflight, and runtime; failed status checks never become false disconnects |
|    7 | P0-07 | Enforce pressure-safe accessibility                                | all active; especially BLD/LIVE                                              | 44px mobile targets, visible focus, color-independent state, static reduced-motion playback label, resilient long content | 320px and 200% reflow without page overflow; key actions keyboard reachable; grayscale meaning survives                                                   |
|    8 | P0-08 | Create a named recovery-state grammar                              | PUB-03/05/06/07, SYS-01–03, CLS-05, MUS-07, CONN-02, BLD-15, LIVE-09, ACC-03 | Loading preserves layout; update/error states say what is safe, what changes, and where the user returns                  | Every failure has a safe primary action and does not imply data loss; contextual failures remain distinct from empty/disconnected states                  |

## P1 — strengthens comprehension and craft

| Rank | ID    | Title                                                            | Surfaces                         | Recommendation                                                                              | Acceptance evidence                                                                                             |
| ---: | ----- | ---------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
|    9 | P1-01 | Turn Classes into a run-of-show shelf                            | CLS-00–04                        | Prioritize recency, class shape, readiness, and next creative action over generic cards     | A library scan answers “what am I teaching and what is next?”                                                   |
|   10 | P1-02 | Treat Music as a sourcing workspace                              | MUS-01–06                        | Familiar provider shelves, browsable source detail, audition, and destination choice        | A playlist is inspectable before import; source provenance persists                                             |
|   11 | P1-03 | Clarify density, type, and data hierarchy                        | all workspaces                   | Bricolage for earned display, Sora for work, Azeret for time/data; reduce competing borders | Squint test preserves one focal action per surface                                                              |
|   12 | P1-04 | Replace generic/system copy with product-specific state language | public, providers, moves, errors | Short, truthful language tied to the instructor’s next action                               | No vague “not configured” where a concrete capability or recovery is known                                      |
|   13 | P1-05 | Create a genuine rehearsal/summary view                          | CLS-04, LIVE-01/06               | Read-only Class Pulse plus run-of-show, readiness, and rehearsal marks                      | Review does not require entering edit mode                                                                      |
|   14 | P1-06 | Make public/auth trust match the private creator product         | PUB-01–07, CLS-00/02             | Show the real creative loop, beta expectations, provider boundaries, and calm recovery      | Public entry and invitation rejection prove the product boundary without advertising dormant community features |
|   15 | P1-07 | Consolidate Account status                                       | ACC-01–03                        | Quiet profile/security surface using the shared provider ledger                             | Account does not reinterpret connection state or imply data loss during a failed load                           |

## P2 — polish after the structural work

| Rank | ID    | Title                                                   | Surfaces                  | Recommendation                                                                        | Acceptance evidence                                                                    |
| ---: | ----- | ------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
|   16 | P2-01 | Derive restrained class artwork from authored structure | Classes, Builder, summary | Use token-native shapes/pulse—not provider artwork synthesis—to aid scanning          | Artwork remains recognizably tied to class type/shape and never implies audio analysis |
|   17 | P2-02 | Add beat-aware microinteraction posture                 | public, Builder, Live     | Motion only for orientation and state change; static equivalents under reduced motion | No decorative ambient motion; reduced-motion meaning is complete                       |

## Product-decision-required

| ID     | Question                                                                                            | Why it cannot be silently decided                                                | Prototype recommendation                                                  |
| ------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| PDR-01 | Should mobile Builder expose a compact class chooser or hide the class rail entirely while editing? | This changes cross-class switching speed versus focused-task purity              | Use a compact horizontal chooser; do not introduce a new navigation model |
| PDR-02 | Is Class Pulse a derived preview that requires confirmation, or a canonical authored artifact?      | This affects data ownership, editing, persistence, and future iOS contract shape | Start derived and visibly “confirm”; no schema claim in this preview      |
| PDR-03 | Should provider playlists always be browsable before import?                                        | Current provider/API behavior and rate/authorization limits need verification    | Yes as the interaction goal; feasibility remains provider-specific        |

## Dependency order if later approved

1. P0-07 and P1-03 shared interaction/token rules.
2. P0-02 Class Pulse presentation and derivation contract decision.
3. P0-06 provider capability vocabulary.
4. P0-01/P0-03 Builder hierarchy and inspector.
5. P0-04 shared sourcing lists/selection tray.
6. P0-05 Live hierarchy.
7. P0-08 recovery grammar.
8. P1 and P2 surface refinements.

After the owner approved Phase 4, this dependency evidence was reconciled into `implementation-sequence.md` and six approved-only prompts under `implementation-prompts/`. Prompt generation does not authorize implementation.
