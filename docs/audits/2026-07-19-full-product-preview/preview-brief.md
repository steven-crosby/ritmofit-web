# Comprehensive preview specification

## Design thesis

Ritmo should feel like a creator workstation whose controls change with the instructor’s job:

1. **Find** — familiar music browsing and auditioning.
2. **Shape** — a visible class arc and ordered run-of-show.
3. **Score** — fast cues, movement, effort, BPM, and clip decisions.
4. **Lead** — a pressure-safe Live instrument.

The shell stays Classes / Music / Live / Account. The proposal changes hierarchy and shared component behavior, not the product IA.

## Signature system

- **Class Pulse:** the same class-shape instrument appears in public proof, library, summary, Builder, queue, and Live. It is derived only from track order, duration, and instructor-entered effort, marked `derived · confirm` until product ownership is decided.
- **Count strip:** restrained eight-count geometry appears only at entry/tutorial and rehearsal moments.
- **Track score:** consistent ordered rows combine track number, source identity, duration, manual BPM, and effort zone.
- **Pressure hierarchy:** Live always gives the largest type to the actionable cue/count, never to an error or absence.
- **Hardware palette:** espresso stage/floor surfaces, bone notes, copper primary actions, cyan controls/focus, amber rehearsal warnings, plasma only at a real class peak.

## Shared tokens and components

The prototype uses one CSS token layer in `mockups/preview.css`:

- Surfaces: floor → sunken → workbench → contained → raised.
- Spacing: 4px base with 8/12/16/24/32/48 steps.
- Type: Bricolage display, Sora workhorse, Azeret time/data.
- Controls: primary, secondary, quiet, danger, chip, icon button.
- Reusable patterns: header, class rail, Class Pulse, readiness state, track row, selection tray, preview rail, provider state, dialog, Live transport, recovery banner.

Proposed canon changes requiring approval:

1. Promote Class Pulse from a local intensity visualization into a cross-product orientation component.
2. Treat cyan as the control/focus/playback truth and copper as the primary authoring action, consistently.
3. Add a static `Now playing` label whenever reduced motion removes the active pulse.
4. Use raised depth only for dialogs, sticky selection/preview rails, and critical Live overlays.

## Coherent content model

The same story is used throughout:

- Instructor: Marisol Vega; fresh-account check: Sofía Ramos.
- Primary class: `Saturday Heat — 45`, Cycle, ten tracks, 40:50, average 127 BPM, runnable with two refinements, four prompter-only tracks.
- Secondary class: `Sunrise Source — Likes`, created from two provider likes, 7:00, needing creative scoring.
- Other templates/classes: Pilates `Core & Control` and HIIT `Drop Set — 30`.
- Active hostile track: `La Última Vuelta — Extended Rooftop Rehearsal Mix with Percussion Break`, by `Marisol Vega & The Very Long Collective Name`, 5:18, 132 BPM, Z4.
- Active cue: `Hands light. Hips lead.`; next cue: `Stand. Add resistance.`
- Providers: SoundCloud connected with observed playback, Spotify connected/mocked, Apple Music authorization needed.

## Surface specification

### Public and system

- Entry proves the creator loop with a real Class Pulse instrument, private-beta trust, and provider-authorized language.
- Auth preserves product context; recovery, reset, not-found, loading, update, and error use one safe-return grammar.
- Invitation rejection preserves entered intent and uses the API’s exact private-beta boundary instead of a generic authentication failure.
- Privacy clearly separates Ritmo-authored data from provider-owned audio/authorization.

### Classes

- Library cards prioritize class shape, readiness, last work, and next action.
- A failed library request is distinct from a genuinely empty account and keeps retry/new-draft actions separate.
- Fresh account and empty class expose several legitimate starts equally.
- Summary is read-only rehearsal: pulse, readiness, track score, and route to Builder.

### Music and connections

- Music home distinguishes sources and capability states.
- Likes, playlists, and search use one row and selection tray pattern.
- Playlist detail is browsable before import.
- Creation confirmation preserves provenance and routes into shaping.
- Connection rows always express catalog/library/playback consequence plus recovery.
- A failed provider-status request retains last-known sources as unverified rather than presenting a false disconnect.

### Builder

- Desktop keeps a class rail and workbench. Mobile uses a compact horizontal class chooser, not a long vertical preamble.
- Class Pulse and compact readiness stay above the track score.
- The essentials inspector is a task surface; advanced timing is a separate disclosed state.
- Discovery opens within class context and shares the Music selection language.
- Preview state is persistent, explicitly playing/paused, provider-labeled, and tied to the selected row.
- Timeline focus spends width on placement but remains a class tool, not a DAW.
- Custom moves and Songs by Move preserve modality-neutral language and honest empty states.

### Live

- Queue answers what is teachable next and what risks remain.
- Preflight groups ready versus fix/choose-prompter-only decisions.
- Ready state names the first action.
- Active and paused preserve current cue, next cue, effort, and time.
- Full list is a compact score with current position.
- Runtime failure leaves cue/clock intact and offers retry, reconnect, and continue-without-music.

### Account

- Quieter than creation workspaces; identity, defaults, provider summary, security, and privacy form one status ledger.
- Connection management reuses the same capability component and words as Music and Live.
- Account-load failure keeps identity context, disables unsafe edits, and states that no setting changed.

## Responsive behavior

- Desktop target: 1280×800 capture; preview capture shell uses 1440×1000 so annotation controls remain visible.
- Primary mobile target: 390×844 treatment.
- Fragile checks: 320px actual viewport and 640 CSS-pixel 200%-equivalent reflow.
- Builder mobile: single work column, horizontal class chooser, full-width task inspector, wrapped controls, nested horizontal timeline only where necessary.
- Live mobile: cue dominates; secondary metrics stack; transport remains persistent.
- Dialog mobile: full-width contained sheet with 44px controls.

## State matrix

| State                                        | Demonstrated in prototype                                                |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Populated                                    | Classes, Music, Builder, summary, Live, Account                          |
| Empty                                        | fresh account, empty class, saved playlists, custom moves, songs by move |
| Loading                                      | SYS-01                                                                   |
| Update                                       | SYS-02                                                                   |
| Error/recovery                               | PUB-07, SYS-03, CLS-05, MUS-07, CONN-02, BLD-15, LIVE-09, ACC-03         |
| Disconnected                                 | MUS-01, CONN-01                                                          |
| Mixed/authorization                          | CONN-02, ACC-02                                                          |
| Preview ready/playing/paused/failed/complete | BLD-05/06/14/15/16                                                       |
| Live ready/active/paused                     | LIVE-03/04/05                                                            |
| Hostile content                              | BLD-01/02/03/04 and Live active context                                  |
| Reduced motion                               | LIVE-04 static `Now playing` fallback                                    |

## Feasibility map

- Existing components support the proposal’s information requirements: `Dashboard`, `ChoreographyEditor`, `ClassReadinessSummary`, `TimelineStrip`, `TrackPreview`, `TrackSearch`, `ConnectionsDialog`, `LivePreflight`, `LiveMode`, `ClassSummaryView`, `AccountDialog`.
- Shared visual implementation can stay in the existing design-token/component model; no schema or API change is inherently required for hierarchy, density, targets, copy, or provider-state presentation.
- Class Pulse persistence/editability and playlist pre-browse behavior require product/provider decisions before implementation. They are explicitly PDR-02/PDR-03.
- The Builder preview is specified as a five-state model: ready, playing, paused, resume-failed, and clip-complete. The failure state preserves class/track/elapsed context, says the edit is safe, and offers bounded restart, stop, and provider-status actions.
- The real-account check did not isolate provider/widget versus app-layer responsibility for resume. That seam blocks a causal implementation claim, but not the feasibility of honest state detection and recovery presentation.
- No proposal requires provider-audio caching, download, proxy, decoding, analysis, remixing, or derivative audio.

## Direction reference

`mockups/assets/builder-direction-reference.png` was generated from the current Builder only as a composition prompt. The useful extracted decisions were a persistent class-shape instrument, compact readiness, a calm track stack, and a persistent preview rail. Invented text/data in that image were rejected; the HTML prototype is the source of truth.
