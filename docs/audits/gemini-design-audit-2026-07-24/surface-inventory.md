# Active-Product Surface Inventory

**Audit Run ID:** gemini-design-audit-2026-07-24  
**Agent:** gemini  
**Baseline Branch:** audit/gemini-2026-07-24  
**Baseline Commit:** 3cd14c6775b212c407c2fd8e39a55449410549ca  
**Scope Model:** Solo-First Creator Workstation (D20/D21)  

---

## Active Surfaces & State Inventory

| ID | Surface / State | Entry Path | Active? | Scenario(s) | Current Evidence | State Class | Preview Requirement | Coverage | Notes / Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PUB-01` | Public Marketing Landing Page | `/` (Signed out) | Yes | 1, 2, 3 | `MarketingPage.tsx` | default | `primary` | code-confirmed | Public front door & CTA entrance |
| `PUB-02` | Public Auth (Sign In / Sign Up) | `/?auth=signin` / `signup` | Yes | 1, 2, 3 | `Login.tsx` | default / error | `primary` | code-confirmed | Account creation & login modes |
| `PUB-03` | Password Reset Page | `/reset-password` | Yes | Recovery | `ResetPassword.tsx` | default | `must-mock-state` | code-confirmed | Out-of-band email reset lander |
| `PUB-04` | Privacy Policy Page | `/privacy` | Yes | Legal | `PrivacyPage.tsx` | default | `reference-only` | code-confirmed | Static compliance surface |
| `PUB-05` | 404 Not Found Page | `/unknown-route` | Yes | Recovery | `NotFound.tsx` | error | `must-mock-state` | code-confirmed | Unmatched path recovery shell |
| `CLS-01` | Classes Workspace — Library | Dashboard -> `classes` | Yes | 1, 4, 5 | `Dashboard.tsx` (`ClassesView`) | populated | `primary` | code-confirmed | Main instructor class library |
| `CLS-02` | Classes Workspace — Empty State | Dashboard -> `classes` (0 classes) | Yes | 1 | `Dashboard.tsx` (`EmptyClassesView`)| empty | `must-mock-state` | code-confirmed | First-run instructor prompt |
| `CLS-03` | Classes Workspace — Error / Loading | Dashboard -> `classes` (Network fail)| Yes | Recovery | `Dashboard.tsx` | loading / error | `must-mock-state` | code-confirmed | Data fetch failure state |
| `CLS-04` | Class Summary Read-Only Preview | Classes -> Card -> Preview | Yes | 4, 5 | `ClassSummaryView.tsx` | default | `must-mock-state` | code-confirmed | Quick inspection modal |
| `MUS-01` | Music Workspace — Shelves & Search | Dashboard -> `music` | Yes | 2, 3 | `Dashboard.tsx`, `TrackSearch.tsx` | populated | `primary` | code-confirmed | Music substrate & search workspace |
| `MUS-02` | Music Workspace — Track Preview | Music / Builder -> Track Select | Yes | 3 | `TrackPreview.tsx` | active-playback | `must-mock-state` | code-confirmed | Provider-authorized clip window |
| `MUS-03` | Saved Playlists Browser Dialog | Music -> Shelf Card -> Playlist | Yes | 2 | `TrackSearch.tsx` | default | `must-mock-state` | code-confirmed | Multi-provider playlist import modal |
| `MUS-04` | Create Class From Likes Dialog | Music -> Liked Shelf -> Create | Yes | 2 | `Dashboard.tsx` | default | `must-mock-state` | code-confirmed | Bulk creation from liked tracks |
| `BLD-01` | Builder — Header & Readiness | Dashboard -> Classes -> Open Class | Yes | 1, 4, 5 | `Dashboard.tsx`, `ClassHeaderCard.tsx`| populated | `primary` | code-confirmed | Class summary & energy ribbon |
| `BLD-02` | Builder — Track List & Timeline | Class Builder -> Center Column | Yes | 4 | `Dashboard.tsx`, `TimelineStrip.tsx` | default / reorder | `primary` | code-confirmed | Track reordering & timeline mode |
| `BLD-03` | Builder — Choreography & Cues | Class Builder -> Selected Track | Yes | 4 | `ChoreographyEditor.tsx`, `SegmentBand.tsx`| populated | `primary` | code-confirmed | Cue/move placement & intensity |
| `BLD-04` | Builder — Custom Moves Dialog | Class Builder -> Custom Moves | Yes | 4 | `CustomMovesDialog.tsx` | default | `must-mock-state` | code-confirmed | User vocabulary manager |
| `BLD-05` | Reverse "Songs by Move" Search | Builder -> Move Inspector -> Find | Yes | 3, 4 | `SongsByMoveDialog.tsx` | default | `must-mock-state` | code-confirmed | Move-to-music discovery tool |
| `LIVE-01` | Live Mode — Preflight Readiness | Dashboard -> `live` | Yes | 5, 6 | `LivePreflight.tsx`, `ClassRunOfShowShelf.tsx`| default | `primary` | code-confirmed | Pre-run check & class queue |
| `LIVE-02` | Live Mode — Prompter & Execution | Live Preflight -> Launch Class | Yes | 6 | `LiveMode.tsx`, `LiveTimeline.tsx` | running | `primary` | code-confirmed | In-studio prompter & pulse |
| `LIVE-03` | Live Mode — Pause & Disconnect | Live Mode -> Pause / Loss | Yes | 6 | `LiveMode.tsx` | paused / error | `must-mock-state` | code-confirmed | Pressure recovery & warnings |
| `ACC-01` | Account & Settings Workspace | Dashboard -> `account` | Yes | Account | `Dashboard.tsx` (`AccountView`) | default | `primary` | code-confirmed | Profile, preferences & security |
| `ACC-02` | Music Connections Overlay | Navigation / Account -> Connections| Yes | 2, 5 | `ConnectionsDialog.tsx` | default / reconnect | `must-mock-state` | code-confirmed | Spotify/Apple/SoundCloud auth |
| `DORM-01`| Dormant Explore Surface | `ExploreDialog.tsx` | No | Excluded | `ExploreDialog.tsx` | dormant | `excluded-dormant` | code-confirmed | Deferred community surface |
| `DORM-02`| Dormant Teams Surface | `TeamsDialog.tsx` | No | Excluded | `TeamsDialog.tsx` | dormant | `excluded-dormant` | code-confirmed | Deferred team surface |
| `DORM-03`| Dormant Class Sharing Surface | `ShareDialog.tsx` | No | Excluded | `ShareDialog.tsx` | dormant | `excluded-dormant` | code-confirmed | Deferred sharing surface |

---

## Inventory Summary Counts

- **Total Active Primary Surfaces:** 8 (`PUB-01`, `PUB-02`, `CLS-01`, `MUS-01`, `BLD-01`, `BLD-02`, `BLD-03`, `LIVE-01`, `LIVE-02`, `ACC-01`)
- **Total Must-Mock State Surfaces:** 12 (`PUB-03`, `PUB-05`, `CLS-02`, `CLS-03`, `CLS-04`, `MUS-02`, `MUS-03`, `MUS-04`, `BLD-04`, `BLD-05`, `LIVE-03`, `ACC-02`)
- **Reference-Only Surfaces:** 1 (`PUB-04`)
- **Excluded Dormant Surfaces:** 3 (`DORM-01`, `DORM-02`, `DORM-03`)
