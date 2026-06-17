# 07 — Accessibility

Targets: WCAG AA across the app, **AAA for Live mode**, plus reduced motion, Dynamic Type, and
keyboard-first desktop workflows. The owner is red/green colorblind; that informs direction but the
**redundant-encoding habit** below is the durable requirement, and it benefits everyone (low light,
sweat, glances, motion).

## The core rule: redundant encoding

**No meaning is ever carried by color alone.** Every meaning-bearing color is paired with at least one
non-color channel:

| Meaning                          | Non-color channels (always present)            |
| -------------------------------- | ---------------------------------------------- |
| Intensity                        | zone number + bar count + label (+ color)      |
| Segment type                     | icon + label (+ small color dot)               |
| Success / error / caution / info | icon + word (+ color)                          |
| Selected / active                | shape (outline/fill change) + weight (+ color) |
| Destructive action               | icon + word (+ ember color)                    |
| Cue vs move on timeline          | distinct shape/icon (+ position)               |
| Class energy (the ribbon)        | **graph height** (+ gradient color)            |
| Peak / All-Out                   | zone number + 4 bars + label (+ plasma glow)   |

If you can't describe a state without naming its color, it isn't encoded accessibly yet. **Plasma is the
clearest test of this:** it is pure affect — strip it and the intensity is still fully readable. That is
the rule, not the exception.

## Contrast

- **Planning / general:** WCAG AA — body text ≥ 4.5:1, large text/UI ≥ 3:1 against its surface.
- **Live mode:** AAA — text ≥ 7:1; large display ≥ 4.5:1. Live leans on `display`/`data-hero`,
  maximum-contrast bone-on-ink, minimal glass over content.
- Verify copper-on-ink and cyan-on-ink for their text size; use ink text on copper/cyan/plasma **fills**.
  Don't place small copper or plasma text on dark surfaces below AA. Plasma is for glow, not body text.

## Color independence checks

- Success is **cyan, not green**, always icon-paired — the green→red convention is absent by design.
- The intensity ramp (copper→ember→plasma) is legible under deuteranopia _because_ zone number + bars
  carry it.
- The energy ribbon reads in grayscale because **height** encodes the zone, not hue.
- Run designs through a deuteranopia/protanopia simulation as a check — but the redundant channels are
  the bar, not the simulation pass.

## Motion (and tempo) safety

Respect `prefers-reduced-motion` / iOS Reduce Motion fully (see [`06-motion.md`](./06-motion.md) and
[`10-rhythm-system.md`](./10-rhythm-system.md) §6): durations → instant, transforms → opacity, **tempo
pulse and the drop fully suppressed**, playing state shown statically. A user who disables motion loses
zero information — only affect. The energy ribbon, being static, remains the accessible read of class
shape.

## Type & Dynamic Type

- Web: relative units; layouts reflow at browser zoom up to 200% without loss of content/function. The
  Martian Mono data face must scale with the rest — never pin it to fixed px.
- iOS: support Dynamic Type categories; the type scale maps to text styles. Live mode's scale multiplier
  stacks sensibly with Dynamic Type.

## Keyboard (desktop-first workflows)

- Everything operable by keyboard; logical tab order; visible cyan focus ring at all times.
- The class builder supports keyboard reorder, add-cue, and track-to-track navigation — instructors plan
  fast on a laptop.
- Shortcuts for high-frequency actions (add track, add cue, play/pause preview, reorder), documented.

## Targets & input

- Touch targets ≥ 44×44pt; pointer targets comfortable.
- Don't rely on hover to reveal essential information (must be reachable on touch and keyboard).

## Live-mode specific

Designed for use under stress, motion, sweat, low light: maximum contrast, large glanceable type,
current/next cue unmistakable, persistent BPM + timecode. The pulse aids focus but is never the only cue
— the numbers and labels stand on their own with motion off. No essential action behind small targets or
hover.
