# Prototype craft-pass log

**Run:** `claude-design-audit-2026-07-24` · **Baseline:** `main` @ `9b188df`

This folder is the phase-3 deliverable: a navigable proposal covering every `primary` and
`must-mock-state` row in `../surface-inventory.md`. It is a **review artifact**. It contains no
production code, changes no token source, and nothing in it is authorized for implementation until the
owner records dispositions in `../run-decisions.md`.

## Open it

```bash
python3 -m http.server 8099
```

Then open `http://127.0.0.1:8099/docs/audits/claude-design-audit-2026-07-24/mockups/index.html`.
Serving from the repository root matters — each view loads its current screenshot from
`../screenshots/current/` for side-by-side comparison.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Review shell and entry point |
| `preview.css` | Token layer (copied from `tokens.json`) + the proposed component system |
| `views.js` | Fixture data and all 23 view builders |
| `preview.js` | Index, viewport switch, per-view state switch, annotation toggle, comparison |

No `assets/` directory: every graphic is CSS or inline markup, so the folder stays portable and adds no
binary weight beyond the screenshots.

## Controls

- **Desktop / Mobile 390** — re-renders every view at the chosen width. Mobile is a designed stack, not a
  scaled desktop.
- **Backlog annotations** — toggles the `P0-…` badges so composition can be judged without review chrome.
- **Per-view state switches** — ordering on Classes, connection truth on Music and Connections,
  sequential vs free placement in Builder, running/paused/failed on Live.
- **"Show the current screenshot this replaces"** — a disclosure under each view. The current capture is
  never overlaid on the proposed UI, so the proposal is never contaminated by the thing it replaces.

## Coverage

23 views cover all 30 `primary` and 18 `must-mock-state` rows. Where several inventory rows share one
treatment they share a view but remain individually listed and anchored (for example `live-run` carries
LIVE-03, LIVE-04, LIVE-05, and LIVE-09 as switchable states).

Four rows carry an explicit amber **"Current behaviour not verified in this run"** note, so no proposal
looks better evidenced than it is: **MUS-05** (mock seam returns no playlists), **BLD-15 / BLD-16**
(preview failure and clip completion need real audio progression), **LIVE-09** (prompter-only mode never
requests a stream), plus **CLS-00 / SYS-02 / SYS-03** which are code-confirmed only.

---

## Adversarial craft pass

Each check was run against the built prototype, not against intent. Failures were fixed before the
proposed screenshots were captured.

### 1. Swap — would dashboard defaults make little difference?

**Revision, then pass.** The first Music build was still three provider cards in a row; swapping them for
any SaaS integration list would have changed nothing. Rebuilt so the surface leads with a search field and
a real result list, and connection status is demoted to one line per provider in the rail. The Live queue
had the same problem in reverse — four stacked detail cards — and became a scan row per class. What
remains would not survive being replaced by generic cards: the Class Pulse, the zone bars, and the
capability ledger all carry information no default component has.

### 2. Squint — is focal hierarchy clear without harsh borders?

**Pass.** Squinting each view leaves exactly one copper mass: `Run live` in Builder, `Start class` in the
Music tray, `Preflight` per queue row, `Pause` in Live. Borders are translucent bone at 8–14%, so
structure reads by surface step rather than by line weight.

### 3. Signature — visible in at least five relevant surfaces?

**Pass — eight.** The Class Pulse does real work in `pub-entry`, `pub-auth`, `classes-home`,
`class-empty`, `class-rehearsal`, `builder-workbench`, `live-queue`, and `live-run`. In each it is the
object being acted on or evaluated, never an illustration: it is the ranking evidence on Classes, the
editing target in Builder, the scan unit in the queue, and the position indicator in Live.

### 4. Token — coherent system or random values?

**Pass.** Every colour resolves to a value copied verbatim from `ritmofit_design_system/tokens.json`.
Spacing uses only the 4px scale; radii use only the six named steps. **Two deliberate proposals** are
marked in `preview.css` with the reason and the measurement:

- Live supporting labels re-map from `text/tertiary` to `text/secondary` (11.30:1 vs 6.79:1).
- The Live-scoped primary runs `copper-400 → copper-300` so its ink label measures 7.04:1 rather than
  5.38:1 at the gradient's dark end.

Neither adds a new token value.

### 5. Composition — does density change intentionally by mode?

**Pass.** Discovery (Music) is airy: 44px art, generous row rhythm, one action pair. Creation (Builder) is
dense and structured: ten rows visible at once, tight vertical rhythm, inspector at fixed width. Live is
sparse and large: one 40px cue, one 64px BPM, four tiles, nothing else competing.

### 6. Content — one credible instructor story?

**Pass.** Every view uses the same fixture set as the captured current state: Marisol Vega, five classes,
`Sunrise Climb` at ten tracks / 35:57 / avg 127 BPM with one track missing tempo, two SoundCloud likes, an
expired Spotify session, and Apple Music unlinked. The long multilingual track title and long artist name
appear in Builder and the run of show. The 180-character cue and the `Hover Pulse` custom move both come
from the fixture recipe. No lorem ipsum, no invented provider content, no generated imagery.

### 7. State — are all the state treatments present?

**Pass.** Default, hover, focus, pressed (`aria-pressed`), and disabled are demonstrated on `foundations`.
Loading, update, and render recovery on `sys-states`. Empty on `class-empty` and Add music. Error on
`class-library-error` and the Live failure state. Disconnected, expired, and status-unavailable on
`music-home` and `connections-dialog`. Paused and playback-failed on `live-run`.

### 8. Responsive — designed treatment or cropped desktop?

**Revision, then pass.** The first mobile build was genuinely broken: the two-region layouts were declared
with inline `grid-template-columns`, which no `.frame.mobile` rule can override, so phone captures showed
a clipped desktop grid. Rebuilt as `.split` / `.split-r` / `.split-2` classes with real mobile rules.
The rail now follows the work rather than preceding it, so a class is visible without scrolling —
which is the point of P1-06. Verified: no horizontal overflow inside any view at 390.

### 9. Accessibility — does meaning survive greyscale and reduced motion?

**Pass, measured.** `foundations` carries a greyscale proof strip: the Pulse still reads by height and
hatching, zones by number + bar count + word, provider states by glyph + word. Reduced motion is honoured
by a global `prefers-reduced-motion` rule, and the prototype has no ambient animation to suppress.
Focus is a single 3px `#74D6E5` ring at 2px offset everywhere (P1-08).

Contrast was measured in-browser with the same compositing method used in the critique, upgraded to read
gradient stops: **26 of 26 Live text nodes now pass the AAA target**, lowest 7.04:1 (`Pause`), against
13 of 29 failing at 5.84–6.79:1 in the shipped build.

### 10. Feasibility — buildable on the current architecture?

**Pass, with one caveat recorded.** Every primitive maps to something that already exists: `ClassPulse.tsx`,
`ClassReadinessSummary.tsx`, `ProviderCapabilityLedger.tsx`, `IntensitySegmentedControl.tsx`,
`TrackSearch.tsx`, and the `StatusLabel` / `RecoveryState` contracts. The two token proposals are value
re-maps in `tokens.json`, not new architecture. Nothing here needs a schema change, a new route, or
provider-audio analysis.

**Caveat:** the Music sourcing workspace (P0-01) is the one item that is genuinely large. It needs the
source list extracted from `TrackSearch.tsx` into a component shared by Music and Builder's Add music.
`Dashboard.tsx` is 4,975 lines and is touched by most other backlog items, so this extraction should
happen first and alone. That sequencing is recorded in `../implementation-sequence.md`.

---

## Known gaps in the prototype itself

- **Not a working app.** Selection, ordering, and transport are illustrative; there is no backend, and
  none is implied.
- **The 320px floor and 200% zoom are demonstrated on the current build, not re-proved here.** The shipped
  app already passes both (critique F5); the prototype's mobile treatment is verified at 390 only.
- **Fonts fall back to system faces.** The prototype does not vendor Sora, Bricolage Grotesque, or Azeret
  Mono, so it renders in the fallback stack. Type *roles* are correct and inspectable; exact letterforms
  are not. This keeps the run folder free of font binaries.
- **MUS-05's populated playlist detail is drawn from the documented API shape, not from observed data** —
  see the amber note on that view.
