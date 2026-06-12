# 01 — Design Principles

Seven principles. If a design choice doesn't serve one of these, cut it.

## 1. Built for creating, not consuming
Spotify's design makes *listening* effortless; RitmoFit inverts the job — the instructor is *authoring*.
Editing affordances, precise data (BPM, timecodes, zones), and reorderable structure get the visual
weight, not oversized artwork or a passive browse-feed. Ask of any screen: does this help them *build*
faster?

## 2. The interface keeps time
This is the principle that separates RitmoFit from every other dark workstation. It is a **rhythm**
product, so rhythm is a design material, not a theme. Tempo is a real token (`--rf-bpm` → `--rf-beat`);
the Live HUD and the playing track *breathe on the actual beat*. The class is shown as an **energy arc**,
not just a list. Expressiveness is *spent here* — and rationed everywhere else. (Where and how: see
[`10-rhythm-system.md`](./10-rhythm-system.md).)

## 3. Color confirms, structure informs
Color is attitude and reinforcement, never the sole carrier of meaning. Information lives in **labels,
numbers, icons, position, and weight**; color makes it feel confident on top of that. This survives
colorblindness, low light, sweat, and glances. (Red/green avoidance is a personality guideline;
redundant encoding is the durable rule.)

## 4. One interactive language, one identity, one drop
Three reserved channels, never swapped:
- **Cyan** = "you can act on this." The *only* interactive color — controls, links, focus, info.
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
Planning mode is rich, layered, and mostly *still*: room to think. Live mode is the opposite — maximum
contrast, larger type, minimal chrome, and a visible pulse, glanceable from across a dim studio while
moving. The same tokens produce both; the *mode* selects how hard to push them.

## 7. Earn every element
Eliminate UI noise. Album art is small because it tells the instructor little about how to *use* a
track — a creative trigger, not a focal point. Default to fewer chrome elements, quieter borders, more
breathing room around the things that carry information. Boldness is spent in one place per surface
(usually the primary action, the live readout, or the energy peak); everything around it stays
disciplined.

---

### How the references map

| Reference | What we take | What we leave |
|---|---|---|
| **Material** | Token structure, component states, accessibility logic | Heavy opaque elevation/shadow stacks |
| **Liquid Glass** | Moderate translucency, rounded geometry, soft motion, native hierarchy | Heavy glass on dense editing surfaces |
| **Spotify** | Contrast, color confidence, music-first rhythm, dark-first | Green as a brand accent; consumption-first layout |
| **Latin / reggaeton color** | Hot pink + copper + cyan energy; the *ritmo* | Loud, gradient-soaked maximalism; theme-park saturation everywhere |
