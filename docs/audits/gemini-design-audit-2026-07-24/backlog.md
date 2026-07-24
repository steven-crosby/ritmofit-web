# Ranked Backlog & Proposal Specification

**Audit Run ID:** gemini-design-audit-2026-07-24  
**Agent:** gemini  
**Baseline Branch:** audit/gemini-2026-07-24  
**Baseline Commit:** 3cd14c6775b212c407c2fd8e39a55449410549ca  

---

## Polish Thesis

Transform Ritmo Studio into a high-energy, athletic creator workstation that dramatically accelerates class building through fluid inline music discovery, clear timeline visuals, and a pressure-ready Live prompter.

---

## Ranked Findings

| ID | Title | Source Status | Type | Surface IDs | Scenario Outcome | Evidence | Current Canon Relationship | Likely Files | Effort / Risk | Priority | Prototype Coverage | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P0-01` | High-Glanceability Live Mode & Prompter UI | new | layout / a11y | `LIVE-01`, `LIVE-02`, `LIVE-03` | Live safety | `critique.md` Sec C.5 | proposed canon change | `LiveMode.tsx`, `LiveTimeline.tsx` | M / Med | P0 | `VIEW-LIVE-01`, `VIEW-LIVE-02` | Large cues, high contrast, 44px+ touch targets, instant pause/resume |
| `P0-02` | Integrated Builder Timeline & Energy Arc | new | layout / visual | `BLD-01`, `BLD-02`, `BLD-03` | Faster build | `critique.md` Sec C.4 | proposed canon change | `ChoreographyEditor.tsx`, `TimelineStrip.tsx` | L / Med | P0 | `VIEW-BLD-01`, `VIEW-BLD-02` | Unified timeline showing intensity curve, track clips, and cues in one view |
| `P0-03` | Multi-Entry Class Creation & Template Launch | new | workflow | `CLS-01`, `CLS-02`, `MUS-01` | Faster build | `critique.md` Sec B (WF-01) | app drift | `Dashboard.tsx`, `TrackSearch.tsx` | S / Low | P0 | `VIEW-CLS-01`, `VIEW-MUS-01` | Instant class creation from templates, playlists, or single tracks in 1 click |
| `P1-01` | Athletic Studio Design System & Kinetic Palette | new | token / visual | All surfaces | Premium craft | `critique.md` Sec D | proposed canon change | `tokens.css`, `index.css` | M / Low | P1 | All views | Kinetic amber/cyan accent system, elevated dark surfaces, crisp typography |
| `P1-02` | Provider Music Substrate & Audio Clip Inspector | new | component | `MUS-01`, `MUS-02`, `MUS-03` | Premium craft | `critique.md` Sec C.3 | app drift | `TrackPreview.tsx`, `TrackSearch.tsx` | M / Med | P1 | `VIEW-MUS-01`, `VIEW-MUS-02` | Clear provider attribution, active clip window editor, and seamless auditioning |
| `P1-03` | Persistent Navigation & Stage Readiness Header | new | navigation | `CLS-01`, `BLD-01`, `LIVE-01` | Clearer recovery | `critique.md` Sec C.6 | app drift | `Dashboard.tsx`, `ClassHeaderCard.tsx` | S / Low | P1 | All main views | Top stage bar showing active class, provider status, and instant Live jump |
| `P2-01` | Custom Moves & Songs-by-Move Inspector Polish | new | component | `BLD-04`, `BLD-05` | Faster build | `critique.md` Sec C.4 | none | `CustomMovesDialog.tsx`, `SongsByMoveDialog.tsx` | S / Low | P2 | `VIEW-BLD-03` | Streamlined move editing and quick reverse search overlays |
| `P2-02` | Account Workspace & Music Connections Status | new | layout | `ACC-01`, `ACC-02` | Clearer recovery | `critique.md` Sec C.6 | app drift | `AccountDialog.tsx`, `ConnectionsDialog.tsx` | S / Low | P2 | `VIEW-ACC-01` | Unified account settings page with visual provider connection cards |
| `PDR-01`| Inline Music Search Within Builder Canvas | new | workflow | `BLD-01`, `MUS-01` | Structural change | `critique.md` Sec G | proposed canon change | `Dashboard.tsx`, `TrackSearch.tsx` | L / High | product-decision-required | Annotated in `VIEW-BLD-01` | Direct track search panel inside Builder without switching workspaces |

---

## Scenario Map

- **Scenario 1 (Template Launch):** Addressed by `P0-03`, `P1-01`.
- **Scenario 2 (Playlist / Likes Sourcing):** Addressed by `P0-03`, `P1-02`.
- **Scenario 3 (Single Track Discovery):** Addressed by `P0-03`, `P1-02`, `PDR-01`.
- **Scenario 4 (Class Reorder & Choreography):** Addressed by `P0-02`, `P2-01`.
- **Scenario 5 (Rehearsal & Readiness):** Addressed by `P1-03`, `P2-02`.
- **Scenario 6 (Live Execution & Pressure):** Addressed by `P0-01`, `P1-03`.

---

## Dependency & Collision Map

1. **Shared Foundation:** `P1-01` (Design Tokens & Color System) must precede all surface-level UI implementations.
2. **Navigation & Shell:** `P1-03` (Persistent Navigation & Header) provides the container for primary destination views.
3. **Workspace Slices:**
   - Classes & Creation: `P0-03`
   - Music & Discovery: `P1-02`
   - Builder & Choreography: `P0-02`, `P2-01`, `PDR-01`
   - Live Mode & Prompter: `P0-01`
   - Account & Auth: `P2-02`

---

## Kill / Defer List

- **Excluded:** Dormant Explore merchandising, Teams, Public Sharing, and Collaborator workflows (per D20/D21 solo-first rule).
- **Excluded:** Decorative ambient background animations or unconstrained custom audio processing (per music platform rules).
