# Owner Review Guide: Full-Product Design Preview

**Audit Run ID:** gemini-design-audit-2026-07-24  
**Agent:** gemini  
**Baseline Branch:** audit/gemini-2026-07-24  
**Baseline Commit:** 3cd14c6775b212c407c2fd8e39a55449410549ca  
**Draft PR:** `docs(audit): gemini design preview (2026-07-24)`  

---

## 1. Quick Start: Open the Navigable Prototype

Run from the repository root:
```bash
open docs/audits/gemini-design-audit-2026-07-24/mockups/index.html
```

Or serve via local HTTP server:
```bash
npx serve .
# Open http://localhost:3000/docs/audits/gemini-design-audit-2026-07-24/mockups/index.html
```

---

## 2. Design Thesis & 5 Consequential Proposals

### Thesis
Transform Ritmo Studio into a high-energy, athletic creator workstation that accelerates class building through fluid inline music discovery, clear timeline visuals, and a pressure-ready Live prompter.

### Top 5 Consequential Changes
1. **`P0-01` High-Glanceability Live Mode:** Ultra-bold cues, 4-rem timers, 44px+ touch controls, and high contrast for dark studio environments.
2. **`P0-02` Integrated Builder Timeline & Energy Arc:** Unified energy curve signature combining track waveforms, BPM indicators, and cue pin anchors in one view.
3. **`P0-03` Multi-Entry Class Building:** Single-click class creation from discipline templates, provider playlists, or individual hero tracks.
4. **`P1-01` Kinetic Amber & Studio Obsidian Palette:** High-vibrancy athletic design tokens replacing generic dark-grey SaaS styling.
5. **`P1-02` Provider Music Substrate Integration:** Streamlined auditioning and track clip window inspector for Spotify, Apple Music, and SoundCloud.

---

## 3. Recommended Review Sequence

1. **Classes Workspace (`VIEW-CLS-01`):** Inspect the main library, athletic cards, and populated/empty state toggles.
2. **Music Workspace (`VIEW-MUS-01`):** Test track search, provider audio auditioning, and playlist import entry points.
3. **Class Builder (`VIEW-BLD-01`):** Review the Energy Arc & Cue Anchor Ribbon signature, track score reordering, and choreography editor.
4. **Live Prompter (`VIEW-LIVE-01`):** Evaluate in-studio glanceability, large timer display, and single-tap control targets.
5. **Account & Connections (`VIEW-ACC-01`):** Check provider authentication status cards.

---

## 4. Recording Decisions

Please fill in your dispositions in [`run-decisions.md`](file:///Users/stevencrosby/repos/ritmofit-web/docs/audits/gemini-design-audit-2026-07-24/run-decisions.md) or respond in chat with your feedback for each item using:
- `approve`
- `approve-with-notes`
- `revise`
- `reject`
- `defer`
