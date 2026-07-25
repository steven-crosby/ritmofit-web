# Ranked design backlog — claude design audit, 2026-07-24

**Baseline:** `main` @ `9b188df7b38a607a208343cd7f73f7c7f4ee4bbe`
**This is a design recommendation set, not implementation approval.** Nothing here is authorized until the
owner records dispositions in `run-decisions.md`.

Backlog IDs are **per-run**. Cross-run traceability runs through the canonical surface IDs in every row.

---

## Polish thesis

Ritmo Studio has won its structural argument — readiness, Class Pulse, and the recovery grammar are
coherent from marketing page to Live runtime — so the next gain is not more structure but **distribution
and decisiveness**: put sourcing where the product says sourcing lives, make every ranked list answer the
instructor's actual question, and let each surface commit to one action instead of offering four equal
ones, so the path from "I need a class Thursday" to a runnable class loses its detours.

---

## P0 — material creation speed, comprehension, accessibility, or Live safety

### P0-01 · Make Music a sourcing workspace instead of a connection panel

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | workflow, layout |
| Surface IDs | MUS-01, MUS-02, MUS-03, MUS-05, MUS-06, CONN-01 |
| Scenario outcome | Faster build |
| Evidence | critique A (verdict), B4; `MUS-01-music-disconnected-desktop.jpg`, `MUS-02-music-mixed-desktop.jpg` |
| Canon relationship | **app drift** — `11-library-guidelines.md` specifies a source rail with search, saved playlists, recent imports, and provider filters |
| Likely files | `apps/web/src/components/Dashboard.tsx` (`MusicWorkspace`), `TrackSearch.tsx`, `ProviderCapabilityLedger.tsx` |
| Effort/risk | L / medium |
| Prototype coverage | `music-home` (disconnected + mixed, desktop and 390), `music-search`, `music-likes` |
| Acceptance | From Music, an instructor can search the catalog, see results, preview, select, and choose `Start class` or `Add selected` **without entering Builder first**; the surface never renders a screen whose only content is connection status |

Catalog search already exists and needs no connection (`✓ Browse catalog` is true even when disconnected).
Move the existing Add-music source model onto the Music workspace so the destination the product names
"Music" can actually browse music. Collapse the three provider cards into the compact rail the guidelines
describe, and give the released space to results.

### P0-02 · Rank Classes and Live by what the instructor is about to teach

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | workflow, layout |
| Surface IDs | CLS-01, LIVE-01 |
| Scenario outcome | Faster build, Live safety |
| Evidence | critique B7; `CLS-01-library-desktop.jpg`, `LIVE-01-queue-desktop.jpg` |
| Canon relationship | none (behavioral) |
| Likely files | `ClassRunOfShowShelf.tsx`, `LibraryRail.tsx`, `Dashboard.tsx` `organizeClasses` |
| Effort/risk | M / medium |
| Prototype coverage | `classes-home` (desktop + 390), `live-queue` |
| Acceptance | The most run-ready class is visible without scrolling on both Classes and Live; ordering is labelled and switchable, and a ready class is never pushed below classes that merely need work |

Today both surfaces sort by "next creative step", so the 10-track, fully-scored class appears in neither
the four priority cards nor the top of the Live queue. Teaching-readiness and work-remaining are both
legitimate orderings; the product must show which one is active and let the instructor flip it. See
`product-decision-required` PDR-01 for the ordering default.

### P0-03 · Give every card a primary action that names its actual next step

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | copy, component |
| Surface IDs | CLS-01, LIVE-01, CLS-04 |
| Scenario outcome | Faster build |
| Evidence | critique B8; `CLS-01-library-desktop.jpg` |
| Canon relationship | **app drift** — `05-components.md` "Only one primary per surface" |
| Likely files | `ClassRunOfShowShelf.tsx`, `ClassReadinessSummary.tsx`, `readiness.ts` |
| Effort/risk | S / low |
| Prototype coverage | `classes-home`, `live-queue` |
| Acceptance | No two cards on one screen show the same primary label unless their next step is genuinely identical; the readiness engine's known gap ("Tempo incomplete") supplies the verb ("Add tempo", "Add cues", "Run live") |

The readiness derivation already knows the specific gap. "Finish refinements" discards that knowledge on
three of four cards.

### P0-04 · Bring Live's glanceable labels up to the AAA target

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | token, a11y |
| Surface IDs | LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-02 |
| Scenario outcome | Live safety |
| Evidence | critique A, F1 (measured: 13/29 nodes at 5.84–6.70:1), F1b (ink on the copper primary measures 5.38:1 at the gradient's dark end) |
| Canon relationship | **app drift** against `07-accessibility.md` ("Live mode: AAA — text ≥ 7:1") |
| Likely files | `ritmofit_design_system/tokens.json`, `LiveMode.tsx`, `LiveTimeline.tsx` |
| Effort/risk | S / low |
| Prototype coverage | `live-run-ready`, `live-run-active`, `live-run-of-show` |
| Acceptance | Every text node on the Live runtime measures ≥ 7:1 (large display ≥ 4.5:1) against its composited background — **including the ink label on the transport primary, measured against both ends of its gradient** — verified by measurement rather than inspection |

Two changes, both token-level, neither a redesign:

1. Live supporting labels step from `text/tertiary` (`bone-400`) to `text/secondary` (`bone-300`). No new
   token is needed — measured **11.30:1** on the Live ground, against 6.79:1 today.
2. The Live-scoped primary runs `copper-400 → copper-300` instead of `copper-400 → copper-500`, so the ink
   label measures **7.04:1 at its darkest point** instead of 5.38:1. Planning surfaces keep the current
   copper primary unchanged.

Both are demonstrated in the prototype and re-measured there: 26 Live text nodes, 26 passing.

### P0-05 · Gate the Live AAA target in the design-system verifier

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | a11y, token |
| Surface IDs | LIVE-02–LIVE-06 |
| Scenario outcome | Live safety |
| Evidence | critique D2; `ritmofit_design_system/scripts/check-contrast.mjs:7,44-61` |
| Canon relationship | **canon gap** (tooling) — the documented AAA target has no gate |
| Likely files | `ritmofit_design_system/scripts/check-contrast.mjs` |
| Effort/risk | S / low |
| Prototype coverage | annotation only (not a visual surface) |
| Acceptance | `npm run verify` fails if a Live-channel text pair drops below 7:1; P0-04 cannot silently regress |

P0-04 without P0-05 will drift back. They should ship together.

### P0-06 · Make "Connect <Provider>" connect, and give the dialog's controls distinct names

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | interaction, a11y, copy |
| Surface IDs | MUS-01, MUS-02, CONN-01, CONN-02, ACC-02 |
| Scenario outcome | Clearer recovery |
| Evidence | critique B2, F8; `Dashboard.tsx:2857-2863`; `CONN-01-disconnected-desktop.jpg` |
| Canon relationship | **app drift** — `07-accessibility.md` accessible-name requirements |
| Likely files | `Dashboard.tsx`, `ConnectionsDialog.tsx` |
| Effort/risk | S / low |
| Prototype coverage | `music-home` (disconnected), `connections-dialog` |
| Acceptance | The provider-scoped button starts that provider's connection directly; if a dialog is genuinely required, the button says so ("Manage SoundCloud…"). No screen exposes two controls sharing the accessible name "Connect" |

### P0-07 · Never render a flat Class Pulse for a class that has tracks

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | component, state |
| Surface IDs | CLS-01, CLS-04, LIVE-01, LIVE-03, BLD-01 |
| Scenario outcome | Premium craft |
| Evidence | critique D5; `LIVE-01-queue-desktop.jpg` (Tuesday 6AM renders a flat slab) |
| Canon relationship | **app drift** — `10-rhythm-system.md` §4 and `09-class-builder-guidelines.md` both forbid a flat slab and require a derived provisional arc |
| Likely files | `ClassPulse.tsx`, `IntensityRibbon.tsx` |
| Effort/risk | M / low |
| Prototype coverage | `classes-home`, `live-queue`, `class-rehearsal` |
| Acceptance | A class whose tracks all carry one effort renders a documented warm-up → build → peak → release draft marked `auto`, never a uniform bar |

### P0-08 · Fix the duplicated empty-state sentence and the zero-size canvas error

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | component, state |
| Surface IDs | CLS-01, CLS-03, CLS-04, BLD-09 |
| Scenario outcome | Premium craft |
| Evidence | critique C (CLS-01), D6, D11; `ClassPulse.tsx:97` and `:160` |
| Canon relationship | **app drift** (defects) |
| Likely files | `ClassPulse.tsx`, `Dashboard.tsx` saved-playlist empty branch |
| Effort/risk | S / low |
| Prototype coverage | `class-empty`, `classes-home` |
| Acceptance | The empty Class Pulse states its invitation exactly once; the saved-playlists empty message appears once; no `createPattern` `InvalidStateError` appears in the console during a full Builder session |

---

## P1 — coherence, craft, and state quality

### P1-01 · Return the intensity control to the canon selection treatment

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | component, token |
| Surface IDs | BLD-02, BLD-03 |
| Scenario outcome | Premium craft |
| Evidence | critique C (BLD-01/02), D3; `BLD-02-inspector-desktop.jpg` |
| Canon relationship | **app drift** — `09-class-builder-guidelines.md`: neutral fill + 3px cyan bottom indicator |
| Likely files | `IntensitySegmentedControl.tsx` |
| Effort/risk | S / low |
| Prototype coverage | `builder-inspector` |
| Acceptance | The selected zone uses a neutral fill with a cyan indicator; copper is not spent on a radio option; zone number and label are visually separated ("Z1 Build"); the control does not orphan "Z4 All Out" on its own row at inspector width |

### P1-02 · Demote provider connect buttons to true secondaries

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | component, token |
| Surface IDs | MUS-01, MUS-02 |
| Scenario outcome | Premium craft |
| Evidence | critique C (MUS-01/02), D4 |
| Canon relationship | **app drift** — `05-components.md` secondary = neutral border/fill |
| Likely files | `Dashboard.tsx` provider card, shared button styles |
| Effort/risk | S / low |
| Prototype coverage | `music-home` (disconnected + mixed) |
| Acceptance | One copper primary per surface; provider connect actions read as secondary and no longer outweigh it |

### P1-03 · Compress the Live queue card to a scan unit

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | layout |
| Surface IDs | LIVE-01 |
| Scenario outcome | Live safety, faster build |
| Evidence | critique C (LIVE-01); `LIVE-01-queue-desktop.jpg` (~1.7 cards per 1440×1000) |
| Canon relationship | none |
| Likely files | `Dashboard.tsx` `LiveWorkspace` |
| Effort/risk | M / low |
| Prototype coverage | `live-queue` (desktop + 390) |
| Acceptance | At least four queue cards are visible at 1440×1000; full readiness detail is one disclosure away, not the resting state |

### P1-04 · Group and type the move picker by template

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | component, interaction |
| Surface IDs | BLD-11, BLD-12, BLD-13, BLD-02 |
| Scenario outcome | Faster build |
| Evidence | critique C (BLD-11/12/13), D8 |
| Canon relationship | **app drift** — `09-class-builder-guidelines.md` "grouped by the `template` enum" |
| Likely files | `ChoreographyEditor.tsx` move picker, `CustomMovesDialog.tsx`, `SongsByMoveDialog.tsx` |
| Effort/risk | M / low |
| Prototype coverage | `builder-moves` |
| Acceptance | Moves are grouped by discipline with the current class's template first; custom moves are a distinct group; near-duplicate seeded names are disambiguated at the point of choice. See PDR-03 on whether other disciplines are hidden or merely demoted |

### P1-05 · Replace claims the system cannot support with derived truth

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | copy, state |
| Surface IDs | ACC-01, PUB-02, CLS-05, CLS-02, CLS-03 |
| Scenario outcome | Clearer recovery |
| Evidence | critique C (ACC-01, PUB-02, CLS-05), E, D12 |
| Likely files | `Dashboard.tsx:2398,2440`, `apps/api/src/routes/auth.ts:22`, class-library error branch |
| Effort/risk | M / medium |
| Canon relationship | **app drift** (truthfulness) |
| Prototype coverage | `account`, `auth-signin`, `class-library-error` |
| Acceptance | "Profile verified" either reflects real identity verification or is renamed to what it measures; the invite-only claim is derived from the active gate; user-facing error copy never interpolates a raw upstream message; "Choose the strongest starting point" either ranks the options or stops promising a ranking |

### P1-06 · Reduce the mobile preamble before the class list

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | layout |
| Surface IDs | CLS-01, CLS-02 |
| Scenario outcome | Faster build |
| Evidence | critique C (CLS-01, desktop/mobile); `CLS-01-library-390.jpg` |
| Canon relationship | **app drift** — `09-class-builder-guidelines.md` warns the archive "must not become a large preamble before the work" |
| Likely files | `LibraryRail.tsx`, `Dashboard.tsx` |
| Effort/risk | S / low |
| Prototype coverage | `classes-home` (390) |
| Acceptance | At 390×844 at least one class is visible without scrolling; creation and filtering controls collapse behind a single explicit affordance |

### P1-07 · Unify the "open a class" vocabulary

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | copy, navigation-within-shell |
| Surface IDs | CLS-01, BLD-01 |
| Scenario outcome | Premium craft |
| Evidence | critique B9 |
| Likely files | `LibraryRail.tsx`, `ClassRunOfShowShelf.tsx`, `Dashboard.tsx` compact chooser |
| Effort/risk | S / low |
| Canon relationship | none |
| Prototype coverage | `classes-home`, `builder-workbench` |
| Acceptance | One verb opens a class everywhere; the compact chooser and the rail do not present two different models of the same list |

### P1-08 · Settle on one focus-ring treatment

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | token, a11y |
| Surface IDs | all active |
| Scenario outcome | Premium craft |
| Evidence | critique F3, D7 (measured: 3px `#74D6E5` outline vs 2px `#3AC0D4` box-shadow) |
| Canon relationship | **app drift** — `05-components.md` specifies `interactive/focus-ring` |
| Likely files | shared control styles, `tailwind.config.js` |
| Effort/risk | S / low |
| Prototype coverage | `foundations` |
| Acceptance | Every focusable control uses the same ring token, width, and offset |

---

## P2 — lower-leverage refinement

### P2-01 · Spend the empty regions on Live and Music

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | layout |
| Surface IDs | LIVE-03, LIVE-04, MUS-01 |
| Scenario outcome | Live safety, premium craft |
| Evidence | critique C (LIVE-03/04, MUS-01/02) |
| Effort/risk | M / medium |
| Canon relationship | none |
| Prototype coverage | `live-run-active`, `music-home` |
| Acceptance | While running, the next cue and time-to-next occupy space currently left empty; Music's lower viewport carries source content rather than void |

### P2-02 · Move schema vocabulary out of the creative path

| Field | Value |
| --- | --- |
| Source status | `new` |
| Type | copy |
| Surface IDs | CLS-01, CLS-02 |
| Scenario outcome | Premium craft |
| Evidence | critique E ("Pilates stores as the current Sculpt contract.") |
| Effort/risk | S / low |
| Canon relationship | none |
| Prototype coverage | `classes-home` |
| Acceptance | Template choice reads in instructor language; the enum note moves to documentation or a disclosure |

---

## Product-decision-required

| ID | Question | Why it cannot be silently decided | Prototype recommendation |
| --- | --- | --- | --- |
| PDR-01 | Should Classes and Live rank by teaching-readiness or by remaining work? | It changes what the product is *for* at rest — a building tool or a teaching tool — and both orderings are defensible (P0-02) | Default to teaching-readiness on Live and offer an explicit, labelled switch on Classes. The prototype shows both and marks the default as a proposal |
| PDR-02 | Should Music own catalog search, or should search stay in Builder and Music become an explicit entry surface? | Duplicating search across two destinations without a shared model risks divergent behaviour; the alternative changes what "Music" means in the nav (P0-01) | Music owns sourcing and shares one source-list component with Builder's Add music. The prototype demonstrates the shared component, not two implementations |
| PDR-03 | Should the move library hide other disciplines, or group them and demote them? | Hiding is more coherent; grouping preserves deliberate cross-discipline borrowing (P1-04) | Group with the class's template first and others collapsed — visible but not competing. Not hidden |

---

## Scenario map

| Scenario (`00-context.md`) | Backlog IDs |
| --- | --- |
| 1. Start from a discipline/template | P0-03, P1-05, P1-06, P2-02 |
| 2. Begin from a provider playlist or liked shelf | **P0-01**, P0-06, P1-02, PDR-02 |
| 3. Begin from a specific track | **P0-01**, PDR-02 |
| 4. Resume a class to place music and add choreography | **P0-02**, P0-03, P0-07, P0-08, P1-01, P1-04, P1-07, PDR-01, PDR-03 |
| 5. Rehearse and resolve readiness before Live | P0-02, P0-03, P0-07 |
| 6. Run, pause, recover, exit Live | **P0-04**, P0-05, P1-03, P2-01 |

No item narrows the product to one funnel. P0-01 and PDR-02 explicitly protect scenarios 2 and 3, which
today collapse into "go to Builder first".

## Dependency and collision map

| Layer | Items | Shared foundation | Collision risk |
| --- | --- | --- | --- |
| Tokens / verifier | P0-04, P0-05, P1-08 | `tokens.json`, `check-contrast.mjs`, shared control styles | Low; must land before the Live layout work so measurement is stable |
| Class Pulse component | P0-07, P0-08 | `ClassPulse.tsx` | **High** — both edit the same component; sequence them together |
| Readiness-derived copy | P0-03, P0-02 | `readiness.ts`, `ClassReadinessSummary.tsx` | Medium — P0-03 consumes the derivation P0-02 reorders |
| Source list | P0-01, PDR-02, P1-02 | `TrackSearch.tsx`, `Dashboard.tsx` `MusicWorkspace` | **High** — the largest single change; extract one source-list component first |
| Dashboard.tsx | P0-01, P0-02, P0-03, P0-06, P1-03, P1-05, P1-06, P1-07 | one 4,975-line file | **Very high** — nearly every item touches it; prompts must partition by workspace region, not by file |
| Live | P0-04, P1-03, P2-01 | `LiveMode.tsx`, `LiveTimeline.tsx` | Medium |
| Inspector | P1-01, P1-04 | `ChoreographyEditor.tsx`, `IntensitySegmentedControl.tsx` | Low |

`Dashboard.tsx` is the dominant collision surface. Any approved implementation should sequence
foundations (tokens, Class Pulse, source list) before workspace layout, and should not run two
Dashboard-touching slices in parallel.

## Kill / defer list

| Idea | Why excluded |
| --- | --- |
| Reviving Explore, Teams, sharing, collaborators, or public class pages | Dormant scope under D20; confirmed unreachable and deliberately left so |
| Any pricing, subscription, or upgrade surface | Out of the locked scope; the beta is non-monetized (D22) |
| Deriving BPM, waveforms, or energy from provider audio | Hard music constraint — never analyze or derive provider audio; never take BPM from Spotify |
| Caching or proxying provider artwork/audio to fill the empty regions | Same constraint; the empty space is a layout problem, not an asset problem |
| A new information architecture or a fifth destination | Explicitly outside pack scope; structural concerns are raised as PDRs instead |
| Ambient beat-synced motion on planning surfaces | `10-rhythm-system.md` limits the pulse to two surfaces; adding more would break the allowlist |
| Plasma as a general accent to add "energy" | Reserved for peak affect; the current implementation rations it correctly and should not be loosened |
| Schema or migration proposals (e.g. persisting Class Pulse) | Locked out of this pack; PDR-02 from the prior run already settled Class Pulse as derived-and-confirmable |
| A dense/DAW-style Builder mode | `09-class-builder-guidelines.md` explicitly defers it; the current friction is distribution, not density |
| Redesigning the recovery grammar | It is the strongest system work in the product; changing it would cost more than it returns |
