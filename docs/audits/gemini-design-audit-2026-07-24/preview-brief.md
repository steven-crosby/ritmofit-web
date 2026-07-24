# Comprehensive Preview Specification (Preview Brief)

**Audit Run ID:** gemini-design-audit-2026-07-24  
**Agent:** gemini  
**Baseline Branch:** audit/gemini-2026-07-24  
**Baseline Commit:** 3cd14c6775b212c407c2fd8e39a55449410549ca  

---

## 1. Product-Specific Craft Direction

### Domain Concepts
1. **Cadence (BPM):** The musical tempo driving movement velocity and pedal/body rhythm.
2. **Resistance / Intensity Level:** The physical load (Zone 1-5 recovery to max effort) mapped across tracks.
3. **Energy Arc:** The holistic class curve balancing warm-up, heavy climbs, sprints, and cool-down.
4. **Cue Anchor:** Precise timestamp offset (`anchor_ms`) where instructor calls or choreography shifts execute.
5. **Segment Band:** Audio clip window defined by `start_offset_ms` and `duration_ms` with assigned moves.

### Color World
- **Studio Obsidian (`#120c0a`):** Deep, warm espresso dark background for high-focus dark studio environments.
- **Kinetic Amber (`#f59e0b` / `#fbbf24`):** Primary athletic accent representing energy, rhythm, and active focus.
- **Electric Cyan (`#06b6d4` / `#22d3ee`):** Secondary pulse color for provider audio markers, BPM badges, and timing indicators.
- **Stage Crimson (`#e11d48` / `#f43f5e`):** High-priority warning, active studio timer, and max-effort climb highlight.
- **Elevated Glass Surface (`rgba(38, 26, 20, 0.7)`):** Warm glassmorphism card surfaces with subtle borders (`rgba(245, 158, 11, 0.15)`).

### Ritmo Signature Element
**"Energy Arc & Cue Anchor Ribbon":** An integrated timeline header across the Class Builder and Live Prompter that visually renders track intensity curves alongside color-coded choreography cue pins and live BPM markers. It provides an immediate visual signature unique to Ritmo Studio.

### Rejected Generic Defaults & Replacements
1. **Rejected:** Standard rectangular grey SaaS cards.  
   **Replacement:** Dynamic Athletic Cards featuring embedded energy arcs, provider badges, and high-glanceability metrics.
2. **Rejected:** Cold, generic dark-mode grey (`#1e1e1e`).  
   **Replacement:** Warm Studio Obsidian with subtle kinetic glow accents.
3. **Rejected:** Plain text cue tables.  
   **Replacement:** Interactive Visual Segment Bands with beat-anchored markers and move pills.

---

## 2. Coverage Contract & Prototype Views

| Prototype View ID | Surface / State | Inventory IDs | Desktop & Mobile? | Backlog IDs Demonstrated | Current Screenshot Reference |
| --- | --- | --- | --- | --- | --- |
| `VIEW-PUB-01` | Public Landing & Auth | `PUB-01`, `PUB-02`, `PUB-03`, `PUB-05` | Yes | `P1-01`, `P0-03` | `screenshots/current/PUB-01.png` |
| `VIEW-CLS-01` | Classes Workspace (Populated & Empty) | `CLS-01`, `CLS-02`, `CLS-03`, `CLS-04` | Yes | `P0-03`, `P1-01`, `P1-03` | `screenshots/current/CLS-01.png` |
| `VIEW-MUS-01` | Music Workspace & Playlists | `MUS-01`, `MUS-02`, `MUS-03`, `MUS-04` | Yes | `P1-02`, `P0-03` | `screenshots/current/MUS-01.png` |
| `VIEW-BLD-01` | Builder Workstation & Timeline | `BLD-01`, `BLD-02`, `BLD-03` | Yes | `P0-02`, `P1-01`, `P1-03`, `PDR-01` | `screenshots/current/BLD-01.png` |
| `VIEW-BLD-02` | Builder — Move & Song Search | `BLD-04`, `BLD-05` | Yes | `P2-01` | `screenshots/current/BLD-04.png` |
| `VIEW-LIVE-01`| Live Mode Preflight & Queue | `LIVE-01` | Yes | `P0-01`, `P1-03` | `screenshots/current/LIVE-01.png` |
| `VIEW-LIVE-02`| Live Mode Active Prompter | `LIVE-02`, `LIVE-03` | Yes | `P0-01`, `P1-01` | `screenshots/current/LIVE-02.png` |
| `VIEW-ACC-01` | Account & Provider Connections | `ACC-01`, `ACC-02` | Yes | `P2-02` | `screenshots/current/ACC-01.png` |

---

## 3. Prototype Information Architecture

The Phase 3 prototype will be delivered as a single-page navigable web application (`mockups/index.html`) with:
- **Persistent Header:** Top navigation featuring the Ritmo Studio logo, destination tabs (Classes, Music, Live, Account), view state switcher (Populated / Empty / Error), viewport switcher (Desktop / Mobile 390px), and an Annotation overlay toggle.
- **Before / After Comparison Drawer:** Slide-over panel enabling real-time side-by-side inspection of captured baseline screenshots against proposed UI views.
- **Interactive Workspaces:** Full click-through workflows allowing navigation between Class Library, Builder, Music Sourcing, Live Preflight, Active Prompter, and Account Settings.

---

## 4. Shared Component & Token Plan

- `preview.css`: Centralized CSS variables extending `tokens.css` with the Kinetic Amber palette, typography scales, glassmorphism panels, and energy ribbon styles.
- Reusable UI Components in `preview.js`:
  - `HeaderNav`: Persistent app shell navigation.
  - `ClassCard`: Dynamic class card with intensity sparkline and readiness indicators.
  - `EnergyRibbon`: Visual energy arc and cue pin timeline.
  - `TrackRow`: Music track item with provider icon, clip window preview button, and BPM badge.
  - `LivePrompter`: High-contrast, large-format studio cue runner.
  - `ConnectionsCard`: Provider auth status component for Spotify, Apple Music, and SoundCloud.

---

## 5. Hostile & Accessibility Plan

- **Hostile Content:** Fixtures will include ultra-long class titles ("Rhythm Cycle 45 - High-Velocity Underground Techno & Synthwave Ride"), dense tracklists (15+ tracks), and multi-cue segments.
- **Accessibility Verification:** High-contrast text labels (WCAG AA compliant), clear focus indicators, touch targets exceeding 44x44px for Live mode controls, and color-independent state indicators (combining icons with color coding).
