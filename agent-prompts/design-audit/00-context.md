# Ritmo Studio — UI/UX Polish Audit · Shared Context

**Pack version:** 3 (polish-first).  
**Product name in all audit copy:** **Ritmo Studio** (not “RitmoFit” except when quoting legacy strings in the app).

Every pass (01–04) must read this file first. Do not restate sacred mission language at full length in later prompts; reference this document.

---

## Mandate (locked)

**Polish the current shell so it feels premium.**  
Do **not** redesign information architecture or invent a new Classes / Music / Live / Account layout model unless a finding is catastrophic *and* the owner explicitly re-opens redesign. Prefer hierarchy, density, density-of-action, copy, state language, spacing, tokens, and component consistency **inside** the existing shell.

---

## Success ranking (locked)

When recommendations conflict, rank by:

1. **Faster class build** (primary) — fewer steps, less scan cost, clearer primary actions, less cognitive load on Discover → place → choreograph → ready.
2. **Pitch-deck gorgeous** (secondary) — premium, distinctive, non-generic; loses when it fights (1).
3. **Proud to teach from Live** (tertiary) — instructor confidence under pressure; still required quality bar for Live work.

**Live usage context today:** The on-screen UI is **instructor-only**. The class does not see what the instructor sees. Do not optimize primarily for “presenting to the room.”

**Future (out of implement scope for this pack):** A room / audience Live view on a large display may exist later. In **01 only**, include a short **“Future: room / audience display”** note (vision crumbs only). Do **not** add mockup or backlog implement items for it.

---

## Core mission (sacred)

Ritmo Studio is a **movement-first creative tool for rhythm fitness instructors**. It helps instructors discover, shape, and perform the class hidden inside the music — with the clarity of Nike, the pulse of the club, and the restraint of a premium studio instrument.

- **Core insight:** The instructor is a **creator** designing a physical music experience, not a coach merely running a workout. Rhythm classes synthesize HIIT and choreography. The product’s job is to help the instructor discover the class the way a sculptor finds form in marble, or a jazz musician finds a phrase in improvisation.
- **Audience order:** Instructors (producers) first. Members (consumers) second.
- **Cultural voice — 90/10 rule:** Latin culture is personal, not decorative (family roots). **90%** ambient Latin energy (rhythm, heat, percussion, confidence, movement; Spanish-rooted naming used lightly). **10%** intentional Latin moments (earned easter eggs). Never costume-like, never “tropical,” never party-gimmick.
- **Movement model:** Design system is movement-first and **modality-agnostic** (spin today; Pilates / yoga / barre later). Current UI may stay spin-focused; the system must not paint into a corner.
- **“Nike”:** Physical confidence, brutal clarity, campaign-grade phrasing — **tone/voice**, not visual imitation.
- **Playfulness:** Club athletic + creator swagger, with Nike restraint. Confident and physical; never loose or gimmicky.

If it sounds like LMFAO or Pitbull, it is not Ritmo Studio.

---

## Challengeable vs sacred

| Layer | Status |
| --- | --- |
| Core mission, principles above, producers-first, 90/10 discipline, modality-agnostic system | **Sacred** — do not abandon |
| Prior “sacred cows” such as warm orange/dark lock, “never look like Spotify,” fixed accent recipes | **Challengeable** — critique may recommend change if it better serves mission + faster class build |

---

## Product frame (D20 / D21)

- **Solo-first.** Individual instructor experience only.
- **Web-first** product definition; iOS follows contracts later.
- **Creator workstation shell:** Classes · Music · Live · Account (plus Login; Connections as music-connect surface).
- Community / Teams / Explore merchandising / shares / public class pages: **dormant** — ignore even if code remains in the tree.

---

## Surfaces

### In scope

| Surface | Role in polish |
| --- | --- |
| Login | Entry, trust, beta clarity |
| Classes | Library, open/create, recency, templates |
| Music | Resting shelves, browse entry, connection truth |
| Connections | Provider connect/reconnect/disconnect |
| Builder / track list | Placement, ordering, free vs sequential |
| Timeline / choreography | Cues, moves, segments, clip window, density |
| Track search / likes / playlists | Discover and add music into the class |
| Track preview | Clip-aware preview |
| Live preflight | Readiness before go-live |
| Live run | Glanceability, safety, recovery |
| Account | Profile, music connection summary |

### Explicitly out

Explore, Teams, shares, public class pages, marketing/landing, pricing/subscription merchandising, dormant community UI.

### P0 bias (build factory)

**In-class Builder path is the P0 factory:** Music → search/likes/playlists → place tracks → timeline/choreography → preview → ready.  
Shell polish (Classes list, Music resting, Account, Login) is **P0/P1 support** so the factory is easy to enter and trust. Live is **required quality** with 80/20 rules below, but does not outrank build-speed for backlog ordering unless Live is unsafe.

---

## Density and Live rules (locked)

- **Builder:** Prefer **airier / consumer (Spotify-ish)** density — scannable, breathing room, clear hierarchy — not dense Logic-pro engineering UI.
- **Live:** **80% glanceability/safety · 20% swagger.** When they conflict, safety wins.

---

## Reference interpretation (standards, not imitation)

- **Spotify:** mature music interaction patterns (persistent playback language, scan-friendly rows, active-track, library organization). Not a visual clone target — but **airier Builder** may honestly share *density* lessons with consumer music UIs.
- **Logic Pro:** simplified timeline precision and creative tooling for instructors, not audio engineers.
- **MainStage:** live performance readiness, glanceability, pressure-proof confidence.
- **Nike:** tone/clarity/phrasing only.

---

## Non-negotiable engineering constraints (all passes)

- No provider audio cache/proxy/decode/derivative; playback only via official SDKs/widgets.
- No Spotify BPM.
- No schema/migrations unless owner explicitly re-opens (not expected in polish).
- No reviving D20 community surfaces.
- Token / design-system / iOS token regen **allowed** when polish needs them.
- Do not edit production code in 01–03. Implement only after written owner decision and a separate implement authorization.

---

## Repo and evidence (locked)

| Item | Value |
| --- | --- |
| Code checkout | `ritmofit-web` monorepo (e.g. workspace `agent1/ritmofit-web`) |
| Run UI | `pnpm dev:web` (local) — primary evidence |
| Truth for UI | `apps/web/` |
| Design tokens | `ritmofit_design_system/` (+ generated web/iOS tokens) |
| Product decisions | `ritmofit_dev_plan/decisions.md` (D20/D21), `DEVELOPMENT_PLAN.md` |
| Audit outputs | Tracked under `docs/audits/<run-id>/` in **ritmofit-web** |
| Prompt pack location | `agent-prompts/design-audit/` in this repo (canonical). Workspace copy under `agent1/ritmofit-design-audit-prompts-v2` may lag. |

### Required viewports for screenshots

- **Desktop** (e.g. 1280×800 or similar)
- **Mobile** **390×844**

Both for every primary in-scope surface you can reach while signed in.

---

## Pipeline and human authority (locked)

```
01 Critique  →  02 Backlog  →  OWNER WRITTEN DECISION
     →  03 Mockups (P0 direction items only)
     →  OWNER WRITTEN DECISION
     →  Implement (separate authorization; multiple small PRs by surface)
```

- **Human-only decision first** — agents stop before production implementation.
- Owner decisions are **written in-repo** (see `owner-decision-template.md` and run folder `owner-decisions.md`).
- Chat “go” is not sufficient for leaving the audit phase.

### Implement shape (when later authorized)

**Multiple small PRs by surface**, e.g.:

- `polish/classes-…`
- `polish/music-…`
- `polish/builder-…` / `polish/timeline-…`
- `polish/live-…`
- `polish/account-…` / `polish/login-…`
- `polish/tokens-…` (if shared foundation)

Not one mega redesign PR.

---

## Run folder convention

Create one run directory:

`docs/audits/YYYY-MM-DD-polish/`

Suggested files:

| File | Producer |
| --- | --- |
| `critique.md` | 01 |
| `screenshots/` | 01 (and 03 if needed) |
| `backlog.md` | 02 |
| `mockup-brief.md` | 02 (only items needing mockups) |
| `owner-decisions.md` | Owner (use template) |
| `mockups/` | 03 |
| `implementation-briefs/` | 04 (after owner approve) |

---

## Agent-neutral language

This pack is for any coding agent (Grok, Codex, Claude, etc.). Do not assume a single vendor CLI.
