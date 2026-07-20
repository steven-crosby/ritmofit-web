# Surface inventory

Run: `2026-07-19-full-product-preview`
Baseline: `origin/main` at `addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`
Scope: D20/D21 public entry plus active solo product only. Explore, Teams, sharing/public classes, collaborators, community, pricing, and subscriptions are excluded.

Evidence labels:

- **observed** — reached in the local app with disposable accounts and mock providers.
- **code-confirmed** — mounted or reachable in the current render/component tree, but the exact state could not be induced honestly.
- **inferred** — proposed behavior derived from adjacent observed states; never counted as current behavior.
- **not-checked** — explicitly unreviewed.

Every row below is either a primary surface or a materially different `must-mock-state`. Every row has a navigable prototype anchor and desktop/mobile proposed capture. The `current` filenames omit `-desktop/-mobile` below for brevity.

| ID      | Class           | Current evidence | Surface/state                                       | Current source/component                          | Prototype          |
| ------- | --------------- | ---------------- | --------------------------------------------------- | ------------------------------------------------- | ------------------ |
| PUB-01  | primary         | observed         | Public entry                                        | `App.tsx`, `MarketingPage.tsx`                    | `mockups/#PUB-01`  |
| PUB-02  | primary         | observed         | Sign in / sign up                                   | `Login.tsx`                                       | `mockups/#PUB-02`  |
| PUB-03  | must-mock-state | observed         | Recovery request                                    | `Login.tsx`                                       | `mockups/#PUB-03`  |
| PUB-04  | primary         | observed         | Privacy                                             | `PrivacyPage.tsx`                                 | `mockups/#PUB-04`  |
| PUB-05  | must-mock-state | observed         | Reset-password completion                           | `ResetPassword.tsx`                               | `mockups/#PUB-05`  |
| PUB-06  | must-mock-state | observed         | Not found                                           | `NotFound.tsx`                                    | `mockups/#PUB-06`  |
| PUB-07  | must-mock-state | code-confirmed   | Invitation-required signup rejection                | `Login.tsx`, API private-beta gate                | `mockups/#PUB-07`  |
| SYS-01  | must-mock-state | code-confirmed   | Authenticated app loading                           | `App.tsx`, `Dashboard.tsx`                        | `mockups/#SYS-01`  |
| SYS-02  | must-mock-state | code-confirmed   | Update available                                    | `UpdatePrompt.tsx`                                | `mockups/#SYS-02`  |
| SYS-03  | must-mock-state | code-confirmed   | Render/stale-chunk recovery                         | `ErrorBoundary.tsx`, lazy reload path             | `mockups/#SYS-03`  |
| CLS-00  | must-mock-state | observed         | First-run tutorial                                  | `OnboardingVideoDialog.tsx`, `TutorialVideo.tsx`  | `mockups/#CLS-00`  |
| CLS-01  | primary         | observed         | Populated class library                             | `Dashboard.tsx`, `LibraryRail.tsx`                | `mockups/#CLS-01`  |
| CLS-02  | must-mock-state | observed         | Fresh signed-in account                             | `Dashboard.tsx`                                   | `mockups/#CLS-02`  |
| CLS-03  | must-mock-state | observed         | Empty class and start choices                       | `Dashboard.tsx`, `ChoreographyEditor.tsx`         | `mockups/#CLS-03`  |
| CLS-04  | primary overlay | observed         | Class summary                                       | `ClassSummaryView.tsx`, `Dialog.tsx`              | `mockups/#CLS-04`  |
| CLS-05  | must-mock-state | code-confirmed   | Initial class-library load failure                  | `Dashboard.tsx` library error/retry path          | `mockups/#CLS-05`  |
| MUS-01  | must-mock-state | observed         | Music home disconnected                             | `Dashboard.tsx` `MusicWorkspace`                  | `mockups/#MUS-01`  |
| MUS-02  | primary         | observed         | Music home connected/mixed                          | `Dashboard.tsx` `MusicWorkspace`                  | `mockups/#MUS-02`  |
| MUS-03  | primary overlay | observed         | Liked tracks selection                              | `Dashboard.tsx`, `Dialog.tsx`                     | `mockups/#MUS-03`  |
| MUS-04  | must-mock-state | observed         | Class-created confirmation                          | `Dashboard.tsx`                                   | `mockups/#MUS-04`  |
| MUS-05  | primary         | code-confirmed   | Saved playlist detail, populated                    | `Dashboard.tsx` provider playlist path            | `mockups/#MUS-05`  |
| MUS-06  | primary         | observed         | Catalog search and selection                        | `TrackSearch.tsx`, `Dashboard.tsx`                | `mockups/#MUS-06`  |
| MUS-07  | must-mock-state | code-confirmed   | Provider status unavailable with last-known sources | `Dashboard.tsx` `ProviderConnectionsLoadState`    | `mockups/#MUS-07`  |
| CONN-01 | must-mock-state | observed         | All providers disconnected                          | `ConnectionsDialog.tsx`                           | `mockups/#CONN-01` |
| CONN-02 | primary overlay | observed         | Mixed connection/recovery states                    | `ConnectionsDialog.tsx`                           | `mockups/#CONN-02` |
| BLD-01  | primary         | observed         | Populated Builder                                   | `Dashboard.tsx`, `ChoreographyEditor.tsx`         | `mockups/#BLD-01`  |
| BLD-02  | primary         | observed         | Track inspector essentials                          | `ChoreographyEditor.tsx`, cue/move sections       | `mockups/#BLD-02`  |
| BLD-03  | must-mock-state | observed         | Inspector advanced fields                           | `ChoreographyEditor.tsx`                          | `mockups/#BLD-03`  |
| BLD-04  | primary         | observed         | Free-placement timeline                             | `TimelineStrip.tsx`, `SegmentBand.tsx`            | `mockups/#BLD-04`  |
| BLD-05  | must-mock-state | observed         | Preview ready                                       | `TrackPreview.tsx`                                | `mockups/#BLD-05`  |
| BLD-06  | must-mock-state | observed         | Preview playing                                     | `TrackPreview.tsx`                                | `mockups/#BLD-06`  |
| BLD-14  | must-mock-state | observed         | Preview paused                                      | `TrackPreview.tsx`                                | `mockups/#BLD-14`  |
| BLD-15  | must-mock-state | observed         | Preview resume failed                               | `TrackPreview.tsx`, real-account SoundCloud check | `mockups/#BLD-15`  |
| BLD-16  | must-mock-state | observed         | Preview clip complete                               | `TrackPreview.tsx`                                | `mockups/#BLD-16`  |
| BLD-07  | primary         | observed         | Add music — search                                  | `TrackSearch.tsx`                                 | `mockups/#BLD-07`  |
| BLD-08  | primary         | observed         | Add music — likes                                   | `Dashboard.tsx` provider library path             | `mockups/#BLD-08`  |
| BLD-09  | must-mock-state | observed         | Saved playlists empty                               | `Dashboard.tsx` provider playlist path            | `mockups/#BLD-09`  |
| BLD-10  | primary         | observed         | Playlist URL import                                 | `Dashboard.tsx` import path                       | `mockups/#BLD-10`  |
| BLD-11  | primary overlay | observed         | Custom moves library empty/manage                   | `CustomMovesDialog.tsx`                           | `mockups/#BLD-11`  |
| BLD-12  | must-mock-state | observed         | Songs by move empty                                 | `SongsByMoveDialog.tsx`                           | `mockups/#BLD-12`  |
| BLD-13  | primary overlay | observed         | Songs by move results                               | `SongsByMoveDialog.tsx`                           | `mockups/#BLD-13`  |
| LIVE-01 | primary         | observed         | Live queue                                          | `Dashboard.tsx` `LiveWorkspace`                   | `mockups/#LIVE-01` |
| LIVE-02 | primary         | observed         | Preflight with blocked playback                     | `LivePreflight.tsx`                               | `mockups/#LIVE-02` |
| LIVE-03 | must-mock-state | observed         | Run ready                                           | `LiveMode.tsx`                                    | `mockups/#LIVE-03` |
| LIVE-04 | primary         | observed         | Run active                                          | `LiveMode.tsx`, `LiveTimeline.tsx`                | `mockups/#LIVE-04` |
| LIVE-05 | must-mock-state | observed         | Run paused                                          | `LiveMode.tsx`                                    | `mockups/#LIVE-05` |
| LIVE-06 | primary         | observed         | Full run-of-show list                               | `LiveMode.tsx`                                    | `mockups/#LIVE-06` |
| LIVE-09 | must-mock-state | code-confirmed   | Runtime playback failure/recovery                   | `LiveMode.tsx`, provider player path              | `mockups/#LIVE-09` |
| ACC-01  | primary         | observed         | Account workspace                                   | `Dashboard.tsx` `AccountWorkspace`                | `mockups/#ACC-01`  |
| ACC-02  | primary overlay | observed         | Account music connections                           | `AccountDialog.tsx`, `ConnectionsDialog.tsx`      | `mockups/#ACC-02`  |
| ACC-03  | must-mock-state | code-confirmed   | Account/profile status unavailable                  | `Dashboard.tsx` `AccountWorkspace`                | `mockups/#ACC-03`  |

## Current capture coverage

- 83 PNGs in `screenshots/current/`: desktop and 390×844 mobile for every observed primary surface, plus 320px and 200%-equivalent Builder/Live/dialog evidence and material state captures.
- Two disposable accounts: Marisol Vega (populated) and Sofía Ramos (fresh).
- Populated fixtures: four classes across Cycle/Pilates/HIIT, one dense ten-track class, one class created from provider likes, cues, a custom movement, manual BPM, linked and manual tracks, and mixed provider readiness.
- Hostile fixture: a long multilingual title and long artist name in the dense class.
- Creation entries exercised: template/empty class, provider likes, specific-track search/preview, existing-class resume/timeline, movement-led search, and rehearsal/Live.
- Supplemental signed-in production check: SoundCloud and Apple Music were already connected; an existing SoundCloud-linked track started, paused, and stopped without changing account content. Resume remained in the paused state after two bounded attempts. Personal library contents were not captured into the audit.
- 102 PNGs in `screenshots/proposed/`: all 51 prototype inventory rows at desktop and 390 mobile, including the complete preview and contextual recovery sequences.

## Explicit evidence gaps

- Populated provider playlist detail is code-confirmed but not observed because the mock provider returned zero playlists.
- Apple Music consent completion was not observed; authorization/reconnecting and failure-to-connect were observed.
- Runtime playback failure, PWA update, stale-chunk recovery, and render failure are code-confirmed but were not induced in the current app.
- Real-account SoundCloud resume is an observed gap: the control remained `Resume` and did not return to playing state; the underlying provider/widget cause is not yet isolated.
- Invitation rejection plus Classes, Music, and Account load failures are code-confirmed and proposed, but were not induced for current screenshots.
- Native browser 200% zoom was approximated with a 640 CSS-pixel viewport; current Builder and Live were also captured at that reflow width.
- No dormant community surface was reviewed because it is outside the locked D20/D21 scope.
