# 01 — Design Principles

Seven principles. If a design choice doesn't serve one of these, cut it.

## 1. Built for creating, not consuming

Spotify's design makes _listening_ effortless; RitmoFit inverts the job — the instructor is _authoring_.
Editing affordances, precise data (BPM, timecodes, zones), and reorderable structure get the visual
weight, not oversized artwork or a passive browse-feed. Ask of any screen: does this help them _build_
faster?

## 2. The interface keeps time

This is the principle that separates RitmoFit from every other dark workstation. It is a **rhythm**
product, so rhythm is a design material, not a theme. Tempo is a real token (`--rf-bpm` → `--rf-beat`);
the Live HUD and the playing track _breathe on the actual beat_. The class is shown as an **energy arc**,
not just a list. Expressiveness is _spent here_ — and rationed everywhere else. (Where and how: see
[`10-rhythm-system.md`](./10-rhythm-system.md).)

## 3. Color confirms, structure informs

Color is attitude and reinforcement, never the sole carrier of meaning. Information lives in **labels,
numbers, icons, position, and weight**; color makes it feel confident on top of that. This survives
colorblindness, low light, sweat, and glances. (Red/green avoidance is a personality guideline;
redundant encoding is the durable rule.)

## 4. One interactive language, one identity, one drop

Three reserved channels, never swapped:

- **Cyan** = "you can act on this." The _only_ interactive color — controls, links, focus, info.
- **Copper** = identity. Brand, primary actions, warmth.
- **Plasma** (hot magenta) = peak energy. Used ~1% of the time, for All-Out and the Live sprint only.
  It is affect, never a control and never meaning-bearing on its own.

Keeping these separate is what lets the interface stay quiet while still feeling distinctly RitmoFit and
still landing a punch when the class peaks.

## 5. Surfaces match their job

**Glass** (moderate translucency + blur) for navigation, overlays, and the live-mode HUD — where depth
helps. **Solid** for dense editing — the class builder, forms, long lists — where blur taxes readability
over a long session. Never glass-on-glass for dense data.

## 6. Contrast — and tempo — scale with stakes

Planning mode is rich, layered, and mostly _still_: room to think. Live mode is the opposite — maximum
contrast, larger type, minimal chrome, and a visible pulse, glanceable from across a dim studio while
moving. The same tokens produce both; the _mode_ selects how hard to push them.

**Expressiveness scales with surface, too.** Working surfaces (builder, inspector, forms, dense lists) stay
cool and quiet so a long session never tires the eye. Brand-front surfaces (marketing, share, login,
onboarding, the Live drop) run the **campaign / swagger register** — heat gradient, ambient bloom, a hotter
class-shape peak. Same palette, opposite volume. The discipline isn't "always restrained"; it's "restrained
where they _work_, loud where the brand _performs_." (Where and how: [`02-color-system.md`](./02-color-system.md)
and the drop in [`10-rhythm-system.md`](./10-rhythm-system.md).)

## 7. Earn every element

Eliminate UI noise. Album art is small because it tells the instructor little about how to _use_ a
track — a creative trigger, not a focal point. Default to fewer chrome elements, quieter borders, more
breathing room around the things that carry information. Boldness is spent in one place per surface
(usually the primary action, the live readout, or the energy peak); everything around it stays
disciplined.

---

## RitmoFit decision filter

External references are useful only as shorthand. They do not decide the system.

When choices conflict, use this order:

1. Creator workflow and product truth.
2. Accessibility and studio readability.
3. RitmoFit color, typography, and rhythm rules.
4. Platform-native behavior.
5. Reference-brand resemblance.

The desired result is not "Spotify for fitness" or "Material with glass." It is a RitmoFit
instrument: warm, precise, movement-first, and unmistakably built for instructors who create.
