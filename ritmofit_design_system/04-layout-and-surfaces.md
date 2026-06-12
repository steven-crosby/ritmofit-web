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

### Solid recipe
- fill: `bg/raised` (cards) or `bg/overlay` (elevated)
- border: `border/subtle` (8%) default, `border/default` (14%) when more definition needed
- shadow: only for lifted/dragged states (`shadow.lifted`), not at rest
- `shadow.peak-glow` is reserved for the Live "drop" only — not a general elevation tool

## Radius scale (bigger containers, smaller controls)

| Token | px | Applies to |
|---|---|---|
| `panel` | 28 | Main panels, large overlays, sheets |
| `card` | 20 | Cards, song rows, list items |
| `input` | 16 | Text fields, selects |
| `control` | 12 | Small controls, chips bg, tiny buttons |
| `pill` | 999 | Buttons, chips, toggles, segment tags |

Reads natural both on a desktop monitor and under iOS Liquid Glass, which favors large soft rounded
panels — without looking toy-like on web.

## Spacing
4px base grid. Tokens `space.1`…`space.16` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64). Generous space around
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
