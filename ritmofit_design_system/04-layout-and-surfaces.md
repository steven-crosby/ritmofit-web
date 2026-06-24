# 04 — Layout & Surfaces

How depth, geometry, and space work. Values in [`tokens.json`](./tokens.json).

## The surface model (resolving Material vs Glass)

Material expresses elevation with **opaque layers + shadow**; Liquid Glass with **translucency + blur**.
RitmoFit uses **both, by surface job**, never mixing them on one element:

- **Glass surfaces** — navigation bars, overlays, popovers, the live-mode HUD, focused panels. Depth =
  backdrop blur + translucent warm-ink fill + a 1px inset highlight. Minimal shadow.
- **Solid surfaces** — the class builder, forms, dense lists, anything edited for long stretches. Depth =
  stepped background tokens (`base` → `raised` → `overlay`) + a subtle translucent border. No blur.

**Never** put dense editable data on glass, and never stack glass on glass.

### Glass recipe (from tokens)

- fill: `surface.glass.fill.default` `rgba(26,23,18,0.70)`
- blur: `surface.glass.blur.default` 20px (subtle 12 / strong 32)
- border: `rgba(251,247,240,0.12)`; inset highlight: `rgba(251,247,240,0.06)`
- Opaque fallback (`bg/overlay`) when `backdrop-filter` is unsupported.

### Resting depth model

Planning surfaces use four explicit roles:

- **Canvas:** `bg/base`, with no border or shadow.
- **Workbench:** `bg/sunken` + `border/subtle`, for ribbons and inspectors.
- **Contained:** `bg/raised`; add a border only when it communicates a real boundary or selection.
- **Elevated:** `bg/overlay` + `shadow/lifted`, reserved for overlays, dragging, and floating trays.

Borders belong to boundaries, inputs, focus, warnings, and errors—not every object. Resting surfaces do
not cast shadows. Planning headers are opaque so scrolling content never bleeds through them.

### Solid recipe

- fill: `bg/raised` (cards) or `bg/overlay` (elevated)
- border: `border/subtle` (8%) default, `border/default` (14%) when more definition needed
- shadow: only for lifted/dragged states (`shadow.lifted`), not at rest
- `shadow.peak-glow` is reserved for the Live "drop" only — not a general elevation tool

## Radius scale (bigger containers, smaller controls)

| Token     | px  | Applies to                             |
| --------- | --- | -------------------------------------- |
| `sheet`   | 24  | Major sheets, Live hero cards          |
| `panel`   | 20  | Main panels, large overlays            |
| `card`    | 16  | Cards and substantial contained groups |
| `input`   | 12  | Fields, selects, ordinary buttons      |
| `control` | 10  | Song rows and compact controls         |
| `pill`    | 999 | Chips, toggles, and compact tags only  |

Reads natural both on a desktop monitor and under iOS Liquid Glass, which favors large soft rounded
panels — without looking toy-like on web.

## Spacing

4px base grid. Tokens `space.1`…`space.8` (4, 8, 12, 16, 24, 32, 48, 64). Generous space around
information-bearing elements; tighten only in deliberate dense-mode contexts.

## Atmosphere — derived, not decorative

The earlier draft proposed a two-orb radial gradient behind the app. That's the default "AI SaaS hero"
background and it's banned here. If a planning surface wants texture, derive it from the data: a very
low-contrast **beat-grid / bar texture** behind the timeline, aligned to the class's bars. Decoration
that comes from the content beats decoration that comes from Dribbble. Default is no background texture
at all.

## Layout patterns by mode

- **Planning (web-primary):** timeline-first with a detail editor on the side. Main = the energy ribbon +
  class timeline + song list; right = the selected track's cues/moves/intensity editor. A creative
  workstation, not a multi-track DAW.
- **Live (iOS-primary):** single-focus, huge `data-hero` type, glass HUD over minimal content, current
  cue prominent, next cue queued, timecode + BPM always visible — and pulsing on the beat.
- **Search/discovery:** music-forward — artwork present but **bounded**; results scannable by
  title/artist/BPM. No tempo pulse here.
- **Edit:** structured forms on solid surfaces, no glass, form-friendly spacing.

## Responsiveness

Web reflows from side-by-side planning down to a stacked single column on narrow viewports. Touch targets
≥ 44×44pt on all platforms. Keyboard focus visible everywhere (cyan focus ring).

### Breakpoint ladder

The mockup breakpoints (`mockups/theme.css`), each collapsing multi-column layouts toward a single column:

| Max-width | What changes                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------- |
| 1180px    | Builder class rail becomes a compact toolbar and the work area narrows to main + inspector.              |
| 900px     | Marketing / share / auth / Library / Builder / Live HUD go single-column; the app-header wraps and the nav becomes a full-width horizontal scroller. |
| 680px     | Builder toolbar wraps to two rows; paired class actions remain two-up; remaining 2-ups collapse.         |
| 480px     | Small-screen floor: the Live header wraps and the `data-hero` BPM stacks under the cue text so big type never fights a narrow column. |

`html` sets `min-width: 320px` as the supported floor; touch targets stay ≥ 44×44pt and the focus ring is
visible at every width.

> QA note: verify the 320px floor and 200% browser zoom in a **real browser** — the headless screenshot
> tooling used here did not reliably set a sub-default layout viewport, so those two checks are manual.
