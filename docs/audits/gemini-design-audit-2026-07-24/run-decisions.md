# Owner Decisions: Full-Product Design Preview

**Audit Run ID:** gemini-design-audit-2026-07-24  
**Agent ID:** gemini  
**Baseline Branch:** audit/gemini-2026-07-24  
**Baseline Commit:** 3cd14c6775b212c407c2fd8e39a55449410549ca  
**Date:** 2026-07-24  
**Preview Agent:** gemini  

---

## Global Direction

| Question | Agent Recommendation | Owner Disposition (`approve` / `approve-with-notes` / `revise` / `reject` / `defer`) | Owner Notes |
| --- | --- | --- | --- |
| Product-wide thesis | Adopt Kinetic Studio Workstation model | | |
| Visual signature | "Energy Arc & Cue Anchor Ribbon" | | |
| Navigation / shell treatment | Persistent top stage bar | | |
| Typography & density | Sora + Azeret Mono, large Live cues | | |
| Color / depth / token direction | Studio Obsidian (`#120c0a`) + Kinetic Amber (`#f59e0b`) | | |
| Motion posture | High-clarity, reduced motion support | | |

---

## Surface Decisions

| Surface ID | Surface / State | Prototype Anchor | Current / Proposed Screenshots | Backlog IDs | Agent Recommendation | Owner Disposition | Owner Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PUB-01` | Public Landing Page | `VIEW-PUB-01` | `screenshots/current/PUB-01.png` | `P1-01` | `approve` | | |
| `PUB-02` | Public Auth (Login) | `VIEW-PUB-01` | `screenshots/current/PUB-02.png` | `P0-03` | `approve` | | |
| `CLS-01` | Classes Library | `VIEW-CLS-01` | `screenshots/current/CLS-01.png` | `P0-03`, `P1-01` | `approve` | | |
| `MUS-01` | Music Workspace | `VIEW-MUS-01` | `screenshots/current/MUS-01.png` | `P1-02` | `approve` | | |
| `BLD-01` | Class Builder Header | `VIEW-BLD-01` | `screenshots/current/BLD-01.png` | `P0-02`, `P1-03` | `approve` | | |
| `BLD-02` | Builder Track List | `VIEW-BLD-01` | `screenshots/current/BLD-02.png` | `P0-02` | `approve` | | |
| `BLD-03` | Choreography Editor | `VIEW-BLD-01` | `screenshots/current/BLD-03.png` | `P0-02` | `approve` | | |
| `LIVE-01` | Live Mode Preflight | `VIEW-LIVE-01` | `screenshots/current/LIVE-01.png` | `P0-01` | `approve` | | |
| `LIVE-02` | Live Mode Prompter | `VIEW-LIVE-02` | `screenshots/current/LIVE-02.png` | `P0-01` | `approve` | | |
| `ACC-01` | Account Workspace | `VIEW-ACC-01` | `screenshots/current/ACC-01.png` | `P2-02` | `approve` | | |

---

## Backlog Decisions

| ID | Title | Priority | Surfaces | Agent Recommendation | Owner Disposition | Owner Notes / Revision Requirement |
| --- | --- | --- | --- | --- | --- | --- |
| `P0-01` | High-Glanceability Live Mode & Prompter UI | P0 | `LIVE-01`, `LIVE-02`, `LIVE-03` | `approve` | | |
| `P0-02` | Integrated Builder Timeline & Energy Arc | P0 | `BLD-01`, `BLD-02`, `BLD-03` | `approve` | | |
| `P0-03` | Multi-Entry Class Creation & Template Launch | P0 | `CLS-01`, `CLS-02`, `MUS-01` | `approve` | | |
| `P1-01` | Athletic Studio Design System & Kinetic Palette | P1 | All surfaces | `approve` | | |
| `P1-02` | Provider Music Substrate & Audio Clip Inspector | P1 | `MUS-01`, `MUS-02`, `MUS-03` | `approve` | | |
| `P1-03` | Persistent Navigation & Stage Readiness Header | P1 | `CLS-01`, `BLD-01`, `LIVE-01` | `approve` | | |
| `P2-01` | Custom Moves & Songs-by-Move Inspector Polish | P2 | `BLD-04`, `BLD-05` | `approve` | | |
| `P2-02` | Account Workspace & Music Connections Status | P2 | `ACC-01`, `ACC-02` | `approve` | | |
| `PDR-01` | Inline Music Search Within Builder Canvas | PDR | `BLD-01`, `MUS-01` | `defer` | | |

---

## Revision Log

| Item / Surface | Requested Revision | Revision Artifact | Agent Summary | Final Owner Disposition | Final Notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

---

## Owner Gate

- [ ] I reviewed the product-wide direction.
- [ ] I reviewed all primary surfaces or explicitly deferred them.
- [ ] Every backlog item has a disposition.
- [ ] Required revisions have a final disposition.
- [ ] Phase 4 may generate implementation prompts from approved items only.
