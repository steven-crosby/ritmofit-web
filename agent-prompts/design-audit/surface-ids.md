# Canonical surface IDs

This registry is what makes design-audit runs comparable across agents and across time. A surface keeps
its ID for the life of the product. Two runs describing `BLD-04` must be describing the same thing.

## Rules

1. **Bind, do not renumber.** If a surface still exists, reuse its ID even when the inventory order,
   naming, or classification changes.
2. **Append new surfaces** at the next free number in the right prefix, and add the row here as part of
   the run that discovered it. Adding rows to this file is the only edit a run makes outside its own
   deliverable folder.
3. **Retire, do not delete.** A surface removed from the product is marked `retired` with the run that
   observed the removal. Retired numbers are never reused.
4. **Reserved numbers stay reserved.** A number listed as reserved was used by an earlier draft; do not
   assign it to a new surface.
5. Classification (`primary`, `primary overlay`, `must-mock-state`) belongs to the run's
   `surface-inventory.md`, not here. It can legitimately change between runs; the ID cannot.
6. Component paths below are the last known mapping and are a starting point for tracing, not a
   substitute for it. Verify against the current render tree.

## Prefixes

| Prefix | Domain |
| --- | --- |
| `PUB` | Public entry, auth, recovery, legal, not-found |
| `SYS` | App shell lifecycle: loading, update, render/chunk recovery |
| `CLS` | Classes library, class creation, class summary, onboarding |
| `MUS` | Music workspace, provider shelves, search, import, playlists |
| `CONN` | Provider connection management |
| `BLD` | Builder: tracks, inspector, timeline, preview, moves |
| `LIVE` | Live queue, preflight, runtime, recovery |
| `ACC` | Account and profile |

## Registry

Baseline: established by run `2026-07-19-full-product-preview` at
`addaff3f6ce6c083bc46c2f10eaac7faaf09ea4b`.

| ID | Surface/state | Last known source | Status |
| --- | --- | --- | --- |
| PUB-01 | Public entry | `MarketingPage.tsx` | active |
| PUB-02 | Sign in / sign up | `Login.tsx` | active |
| PUB-03 | Recovery request | `Login.tsx` | active |
| PUB-04 | Privacy | `PrivacyPage.tsx` | active |
| PUB-05 | Reset-password completion | `ResetPassword.tsx` | active |
| PUB-06 | Not found | `NotFound.tsx` | active |
| PUB-07 | Invitation-required signup rejection | `Login.tsx`, private-beta gate | active |
| SYS-01 | Authenticated app loading | `App.tsx`, `Dashboard.tsx` | active |
| SYS-02 | Update available | `UpdatePrompt.tsx` | active |
| SYS-03 | Render / stale-chunk recovery | `ErrorBoundary.tsx`, lazy reload path | active |
| CLS-00 | First-run tutorial | `OnboardingVideoDialog.tsx`, `TutorialVideo.tsx` | active |
| CLS-01 | Populated class library | `Dashboard.tsx`, `LibraryRail.tsx` | active |
| CLS-02 | Fresh signed-in account | `Dashboard.tsx` | active |
| CLS-03 | Empty class and start choices | `Dashboard.tsx`, `ChoreographyEditor.tsx` | active |
| CLS-04 | Class summary | `ClassSummaryView.tsx`, `Dialog.tsx` | active |
| CLS-05 | Class-library load failure | `Dashboard.tsx` library error/retry path | active |
| MUS-01 | Music home disconnected | `Dashboard.tsx` `MusicWorkspace` | active |
| MUS-02 | Music home connected/mixed | `Dashboard.tsx` `MusicWorkspace` | active |
| MUS-03 | Liked tracks selection | `Dashboard.tsx`, `Dialog.tsx` | active |
| MUS-04 | Class-created confirmation | `Dashboard.tsx` | active |
| MUS-05 | Saved playlist detail, populated | `Dashboard.tsx` provider playlist path | active |
| MUS-06 | Catalog search and selection | `TrackSearch.tsx`, `Dashboard.tsx` | active |
| MUS-07 | Provider status unavailable, last-known sources | `ProviderConnectionsLoadState` | active |
| CONN-01 | All providers disconnected | `ConnectionsDialog.tsx` | active |
| CONN-02 | Mixed connection / recovery states | `ConnectionsDialog.tsx` | active |
| BLD-01 | Populated Builder | `Dashboard.tsx`, `ChoreographyEditor.tsx` | active |
| BLD-02 | Track inspector essentials | `ChoreographyEditor.tsx` | active |
| BLD-03 | Inspector advanced fields | `ChoreographyEditor.tsx` | active |
| BLD-04 | Free-placement timeline | `TimelineStrip.tsx`, `SegmentBand.tsx` | active |
| BLD-05 | Preview ready | `TrackPreview.tsx` | active |
| BLD-06 | Preview playing | `TrackPreview.tsx` | active |
| BLD-07 | Add music — search | `TrackSearch.tsx` | active |
| BLD-08 | Add music — likes | `Dashboard.tsx` provider library path | active |
| BLD-09 | Saved playlists empty | `Dashboard.tsx` provider playlist path | active |
| BLD-10 | Playlist URL import | `Dashboard.tsx` import path | active |
| BLD-11 | Custom moves library empty/manage | `CustomMovesDialog.tsx` | active |
| BLD-12 | Songs by move empty | `SongsByMoveDialog.tsx` | active |
| BLD-13 | Songs by move results | `SongsByMoveDialog.tsx` | active |
| BLD-14 | Preview paused | `TrackPreview.tsx` | active |
| BLD-15 | Preview resume failed | `TrackPreview.tsx` | active |
| BLD-16 | Preview clip complete | `TrackPreview.tsx` | active |
| LIVE-01 | Live queue | `Dashboard.tsx` `LiveWorkspace` | active |
| LIVE-02 | Preflight with blocked playback | `LivePreflight.tsx` | active |
| LIVE-03 | Run ready | `LiveMode.tsx` | active |
| LIVE-04 | Run active | `LiveMode.tsx`, `LiveTimeline.tsx` | active |
| LIVE-05 | Run paused | `LiveMode.tsx` | active |
| LIVE-06 | Full run-of-show list | `LiveMode.tsx` | active |
| LIVE-07 | — | — | reserved |
| LIVE-08 | — | — | reserved |
| LIVE-09 | Runtime playback failure / recovery | `LiveMode.tsx`, provider player path | active |
| ACC-01 | Account workspace | `Dashboard.tsx` `AccountWorkspace` | active |
| ACC-02 | Account music connections | `AccountDialog.tsx`, `ConnectionsDialog.tsx` | active |
| ACC-03 | Account/profile status unavailable | `Dashboard.tsx` `AccountWorkspace` | active |

Active surfaces: 51. Reserved: LIVE-07, LIVE-08 (used by a superseded draft of the 2026-07-19 inventory
and never published).

## Change log

| Date | Run | Change |
| --- | --- | --- |
| 2026-07-19 | `2026-07-19-full-product-preview` | Initial 51-surface inventory established |
| 2026-07-24 | pack v6 | Registry extracted from that run and made canonical |
