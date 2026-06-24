# 02 — Color System

All values live in [`tokens.json`](./tokens.json); this explains the _roles_ and rules. **Dark-first.**
A complete warm **light** palette now fills every semantic `light` slot (cream surfaces, espresso text,
copper/cyan/cyan-state stepped to their deepest existing steps for contrast on a light ground). It is
**opt-in** — the web emits it under `[data-theme="light"]`, iOS as `RFColorLight` — so dark stays the
default and the dark-first surfaces are unaffected. Surfaces and text are AA-clean (espresso text on cream
is ~7:1+; tertiary uses `ink-500` for AA). The generated light theme includes semantic surfaces,
glass, header, and shadow variants. Live intentionally remains dark:

1. **Live mode stays dark** in both themes (`bg/live`, a performance surface for dim rooms).
2. **Bright accent channels as _small_ text on light — RESOLVED.** The light theme maps the interactive
   channel to `cyan-700` and caution to `amber-600` (the deepened steps), and the eyebrow to
   `copper-600`/`brand-strong`. With those, copper eyebrows (4.63:1) and cyan links (5.30:1) clear AA for
   small text, and the amber caution graphic (3.16:1) clears the ≥3:1 graphics bar — all **verified by
   `scripts/check-contrast.mjs` (LIGHT)**, which gates against regression. The token layer is complete.

## Channels (the mental model)

The palette is organized by **what a color is allowed to mean**, not by hue:

| Channel          | Hue family            | Allowed to mean                                      | Never means                                    |
| ---------------- | --------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| **Surface**      | warm espresso ink     | background depth                                     | interaction                                    |
| **Text**         | bone (warm off-white) | content                                              | interaction                                    |
| **Brand**        | copper / orange       | identity, primary actions, warmth                    | "this is a generic control"                    |
| **Interactive**  | cyan / blue           | "you can act on this" — controls, links, focus, info | brand identity, segment type                   |
| **Peak**         | plasma (hot magenta)  | maximum energy — All-Out glow, Live sprint pulse     | a control, a brand fill, or meaning on its own |
| **Caution**      | amber                 | warning (with icon)                                  | brand, interaction                             |
| **Danger / Hot** | ember (red-orange)    | destructive (with icon), top of intensity ramp       | generic accent                                 |

The most important rule: **copper = identity, cyan = interaction, plasma = peak. Never swapped.**

## Surfaces & text

- `bg/base` `#0B0A08` — app background (warm espresso black, not pure black; carries studio warmth).
- `bg/raised` `#1A1712` — cards, solid editing surfaces.
- `bg/overlay` `#241F18` — elevated/solid popovers.
- `text/primary` `#FBF7F0` (bone-50), `text/secondary` `#C9BEAA`, `text/tertiary` `#9E927E`.
- On copper/cyan/plasma fills, text flips to `text/on-accent` `#0B0A08` (ink) for contrast.

## Brand — copper

- `brand/primary` `#E07E3C` — primary buttons, key accents, display-moment warmth.
- `brand/strong` `#C8682A`, `brand/muted` `#7A3B12` for pressed/quiet variants.
- Copper sits in the warm range so the intensity ramp grows out of it naturally.

## Interactive — cyan

- `interactive/default` `#3AC0D4`, `hover` `#74D6E5`, `pressed` `#17A2B8`.
- `focus-ring` `#74D6E5` — visible keyboard focus everywhere.
- Secondary/tertiary actions, links, toggles, sliders, and the info state.

## Peak — plasma (the reserved heat accent)

A hot magenta — `peak/glow` `#FF2E88`, `peak/bright` `#FF6AAE`. This is the synthesis's distinctive
addition and it earns its place by **scarcity**:

- **Where it appears (the complete allowlist):** (1) All-Out intensity glow; (2) the Live sprint/drop
  pulse; (3) the Zone 4 kiss in an energy ribbon; and (4) marketing/share artwork derived from actual
  class peaks. It is never generic brand atmosphere.
- **What it is:** pure affect — the visual "drop." It makes the peak of a class _feel_ like the peak.
- **What it is not:** never a button, never a link, never a focus ring, never the sole signal for any
  state. Strip the plasma and the meaning is still fully encoded by zone number + bar count + label.
- **Why magenta:** hot pink + copper + cyan is the reggaeton/tropical palette. It locks the Latin-rooted
  identity the earlier drafts named and abandoned — without tipping into theme-park saturation, because
  it shows up on roughly 1% of pixels.

> Discipline check: if plasma cannot be traced to a labeled class peak or the Live drop, it is a bug.

> **Cue tagging:** `cues.color` is a free hex in the data model, but the **cue-color picker excludes the
> plasma range** — instructors choose from copper / cyan / amber / ember / bone tags, not the reserved
> peak accent. Rationing is enforced in the picker, not the column. (Example payloads must not show a
> plasma cue color.)

## Intensity ramp (warm → hot → peak)

The DB enum is fixed: `none / easy / mod / hard / all_out`. Display uses Zone labels. The ramp grows from
copper into ember, and All-Out alone gets the plasma peak treatment. It reads under deuteranopia _because
it is never shown by color alone._

| Enum      | Zone | Display | Bar color  | Bars | Always also shown as | Peak treatment                   |
| --------- | ---- | ------- | ---------- | ---- | -------------------- | -------------------------------- |
| `none`    | 0    | None    | bone-500   | 0    | label "None"         | —                                |
| `easy`    | 1    | Build   | copper-200 | 1    | zone number + 1 bar  | —                                |
| `mod`     | 2    | Push    | copper-300 | 2    | zone number + 2 bars | —                                |
| `hard`    | 3    | Attack  | copper-400 | 3    | zone number + 3 bars | —                                |
| `all_out` | 4    | All Out | ember-500  | 4    | zone number + 4 bars | plasma glow (Live + ribbon peak) |

**Rule:** intensity renders with **at least** zone number + bar count + label. Color is the reinforcing
fourth channel; plasma is an optional fifth (affect only).

## Energy ribbon colors

The class's intensity-over-time graph (see [`09-class-builder-guidelines.md`](./09-class-builder-guidelines.md))
draws its gradient from the ramp: copper at low zones → ember high → a plasma kiss at peaks. **Height
encodes the zone; color only reinforces it** — read it in grayscale and the arc still tells the story.

## Segment track

Class section types use the current shared `segmentType` contract and `class_sections` data model.
They get their **own quiet tinted track**, deliberately distinct from the hot intensity ramp and the
cyan interactive channel. Segments are identified **icon + label first**; color is a small reinforcing
dot/tint, not a fill.

| Segment   | Tint       | Icon (Material Symbol)  |
| --------- | ---------- | ----------------------- |
| Warm-up   | amber-400  | `local_fire_department` |
| Climb     | copper-600 | `trending_up`           |
| Sprint    | ember-400  | `bolt`                  |
| Recovery  | violet-400 | `air`                   |
| Cool-down | bone-400   | `trending_down`         |

> Sprint's tint is in the hot family but is distinguished from "All Out intensity" by context (a section
> header with icon + word, not an intensity bar) and from cyan controls by never being interactive. If it
> ever feels ambiguous, push segments quieter, not louder.

## Semantic states (always icon-paired)

| State                | Color     | Mandatory icon |
| -------------------- | --------- | -------------- |
| Positive / success   | cyan-400  | `check_circle` |
| Caution / warning    | amber-400 | `warning`      |
| Danger / destructive | ember-400 | `error`        |
| Info                 | cyan-300  | `info`         |

**Success is cyan, not green** — it reads as "good/safe" without leaning on the green→red convention, and
keeps green out of the brand entirely.

## Contrast targets

Planning meets WCAG AA for text; Live targets AAA (see [`07-accessibility.md`](./07-accessibility.md)).
Borders use translucent bone (`subtle` 8%, `default` 14%, `strong` 24%) rather than hard lines, to keep
the warm-dark surfaces calm. Plasma is bright enough to glow on ink but is never used for small text.
