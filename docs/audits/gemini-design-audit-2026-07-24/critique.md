# Phase 1: Brutal Product & Design Critique

**Audit Run ID:** gemini-design-audit-2026-07-24  
**Agent:** gemini  
**Baseline Branch:** audit/gemini-2026-07-24  
**Baseline Commit:** 3cd14c6775b212c407c2fd8e39a55449410549ca  
**Product Scope:** Solo-First Creator Workstation (D20/D21)  

---

## A. Verdict

- **Strongest product asset:** The core conceptual model linking class timelines with provider music playback. Structuring choreography directly over real audio clip windows (`start_offset_ms`, `duration_ms`) inside `ChoreographyEditor` creates a unified creative environment that sets Ritmo Studio apart from generic tools.
- **Most damaging workflow friction:** Rigid modal and context switches during creation. When an instructor wants to add choreography or adjust a track, they are forced through multi-step dialogs and isolated sub-panes instead of fluid inline interactions across discovery and building.
- **Most generic/defaulted design behavior:** Heavy reliance on standard card grids, uniform dark-grey containers, and standard tabular forms. The interface lacks visual hierarchy and athletic energy, often resembling an administrative SaaS tool rather than an expressive creator instrument for rhythm fitness.
- **Most important Live pressure risk:** High-density, small-font UI elements and low-contrast controls in `LiveMode`. In a dark studio environment, instructors need high-glanceability cues, bold typography, and intuitive single-tap targets that require zero cognitive load.
- **Coherent premium creative instrument verdict:** *Not yet.* While the backend domain model and playback integrations are technically strong, the visual design system feels unpolished and fragmented. It suffers from dense information layouts, generic SaaS styling, and inconsistent spacing token usage.

---

## B. Workflow Findings

### Scenario 1: Start a Class from a Discipline / Template
- **Finding ID:** `WF-01` (`code-confirmed`, `CLS-01`, `BLD-01`)
- **Current Behavior:** Creating a new class forces the user through a modal dialog to select a discipline (Cycle, Pilates, HIIT) and title before seeing an empty builder canvas.
- **Consequence:** Breaks creative momentum. Instructors often prefer starting from music or a template structure before naming the class.

### Scenario 2: Begin from Provider Playlist / Liked-Music Shelf
- **Finding ID:** `WF-02` (`code-confirmed`, `MUS-01`, `MUS-03`)
- **Current Behavior:** Browsing playlists in `MusicView` opens `PlaylistBrowserDialog`, requiring bulk-import into a new class or manual track-by-track additions.
- **Consequence:** Disconnects playlist browsing from class structure preview. The user cannot see how a playlist maps onto a class timeline before committing to an import.

### Scenario 3: Turn Single Track Discovery into a Class
- **Finding ID:** `WF-03` (`code-confirmed`, `MUS-01`, `MUS-02`)
- **Current Behavior:** Track search in `TrackPreview` allows manual playback but requires multi-click navigation to add the track to an active or new class.
- **Consequence:** High friction for impulse class creation around a single hero track.

### Scenario 4: Resume Class to Reorder Tracks & Add Choreography
- **Finding ID:** `WF-04` (`code-confirmed`, `BLD-02`, `BLD-03`)
- **Current Behavior:** Reordering tracks in `ReorderableTrackList` and editing cues in `ChoreographyEditor` happen in separate visual panes with cramped timelines.
- **Consequence:** Choreographing an entire class feels disjointed. Instructors cannot see the overall class energy arc while fine-tuning individual track cues.

### Scenario 5: Rehearse / Preview & Resolve Readiness Before Live
- **Finding ID:** `WF-05` (`code-confirmed`, `LIVE-01`, `BLD-01`)
- **Current Behavior:** Readiness issues (e.g. missing provider auth or unanchored cues) are surfaced as small text badges in `LivePreflight` without direct inline resolution shortcuts.
- **Consequence:** Instructors are forced to exit Live Preflight, return to Classes/Builder or Connections, fix the issue, and navigate back.

### Scenario 6: Run, Pause, Recover & Exit Live Under Pressure
- **Finding ID:** `WF-06` (`code-confirmed`, `LIVE-02`, `LIVE-03`)
- **Current Behavior:** `LiveMode` uses a complex layout with small playback controls and multiple text panels competing for visual focus.
- **Consequence:** Increased risk of mistaken taps or missed cue timing during high-intensity studio instruction.

---

## C. Surface Critique

### 1. `PUB-01` & `PUB-02`: Public Marketing & Auth
- **Intent:** High-conversion entry point establishing brand value and seamless onboarding.
- **Issues:** Visual style feels generic. Dark background `#1a110d` lacks vibrancy and athletic polish; typography hierarchy is weak. Auth modal feels clinical rather than inviting.

### 2. `CLS-01`: Classes Workspace (Library)
- **Intent:** Primary command center for organizing, filtering, and launching classes.
- **Issues:** Uniform card grids make it difficult to distinguish recent, incomplete drafts from battle-ready classes. Class cards lack dynamic visual cues (e.g., energy pulse or visual timeline preview).

### 3. `MUS-01`: Music Workspace
- **Intent:** Music discovery hub integrating Spotify, Apple Music, and SoundCloud.
- **Issues:** Shelves present tracks as dense text rows. Provider branding is subdued, and audio clip preview controls feel disconnected from class building.

### 4. `BLD-01` to `BLD-03`: Class Builder & Choreography Editor
- **Intent:** The core workstation surface for structuring tracks, clip windows, cues, and moves.
- **Issues:** Timeline representation (`TimelineStrip`, `SegmentBand`) is cramped. Color encoding for intensity levels is muted. Cue entry requires multiple clicks per segment.

### 5. `LIVE-01` & `LIVE-02`: Live Mode Preflight & Prompter
- **Intent:** Mission-critical in-studio prompter designed for high pressure and quick scanning.
- **Issues:** Contrast targets in active studio lighting are insufficient. Timer and next-cue text lack bold visual prominence. Pause and exit actions are small touch targets.

### 6. `ACC-01` & `ACC-02`: Account & Connections Management
- **Intent:** User profile, discipline preferences, and provider auth status.
- **Issues:** Connection status for Spotify/Apple/SoundCloud is buried in a standard modal; auth health should be persistent and visible at a glance.

---

## D. System Critique

- **Tokens & Color:** Current tokens (`tokens.css`) rely heavily on dark warm tones (`#1a110d`, `#261a15`). Needs a high-vibrancy accent color scale (e.g. electric kinetic amber/cyan) for active beats and high-intensity cues.
- **Typography:** Uses Sora (UI) and Azeret Mono (Data/BPM). Font sizes in Builder and Live are too small (`11px` - `13px` range) for distance scanning.
- **Density & Spacing:** Compact desktop layouts feel cluttered; mobile treatments rely too much on horizontal scrolling without clear visual affordances.

---

## E. Brand & Voice

- Current copy uses generic administrative terms ("Manage", "Save Class", "Item Details").
- Should adopt crisp, athletic creator terminology ("Studio Workspace", "Choreograph", "Energy Profile", "Stage Readiness", "Run Class").

---

## F. Accessibility & Sustained-Use Comfort

- **Focus & Keyboard Navigation:** Keyboard focus rings are subtle and easily lost in dark mode.
- **Touch Targets:** Key touch targets in Live mode measure under 44x44px, violating mobile ergonomics under pressure.
- **Contrast:** Secondary metadata (`text-text-muted`) falls below 4.5:1 contrast ratios against dark backgrounds.

---

## G. Structural Findings Outside Polish (`product-decision-required`)

- `PDR-01`: Seamless inline track discovery within the Builder canvas to eliminate navigation back-and-forth between `MusicView` and `ClassWorkspace`.
- `PDR-02`: Unified Live Preflight overlay directly accessible from any workspace step without full-screen navigation lock-in.

---

## H. Evidence Ledger

- **Inventory Items:** 26 total (8 Primary, 12 Must-Mock, 1 Reference, 3 Dormant Excluded)
- **Baseline Commit:** `3cd14c6775b212c407c2fd8e39a55449410549ca`
- **Branch:** `audit/gemini-2026-07-24`
- **Execution Date:** 2026-07-24
