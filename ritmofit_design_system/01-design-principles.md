# 01 — Design Principles

Eight principles. If a design choice doesn't serve one of these, cut it.

## 1. Built for creating, not consuming

Spotify's design makes _listening_ effortless; Ritmo Studio inverts the job — the instructor is _authoring_.
Editing affordances, precise data (BPM, timecodes, zones), and reorderable structure get the visual
weight, not oversized artwork or a passive browse-feed. Ask of any screen: does this help them _build_
faster?

Familiar before specialized (D21): the instructor still _browses and auditions_ provider libraries — liked
tracks, saved playlists, catalog search — the way they already do in a music app. That is not the passive
browse-feed this principle warns against; it is **sourcing raw material**, and every discovery path points
at a create action (`Start class`, `Add selected`). Weight still goes to authoring; discovery earns its
place by feeding it, never by becoming a recommendation firehose.

## 2. The interface keeps time

This is the principle that separates Ritmo Studio from every other dark workstation. It is a **rhythm**
product, so rhythm is a design material, not a theme. Tempo is a real token (`--rf-bpm` → `--rf-beat`);
the Live HUD and the playing track _breathe on the actual beat_. The class is shown as an **energy arc**,
not just a list. Expressiveness is _spent here_ — and rationed everywhere else. (Where and how: see
[`10-rhythm-system.md`](./10-rhythm-system.md).)

## 3. Color confirms, structure informs

Color is attitude and reinforcement, never the sole carrier of meaning. Information lives in **labels,
numbers, icons, position, and weight**; color makes it feel confident on top of that. This survives
colorblindness, low light, sweat, and glances. (Red/green avoidance is a personality guideline;
redundant encoding is the durable rule.)

State language follows the same discipline. Lead with the affirmative whenever the surface is ready to
act: "Ready — press play" beats "No cue set"; "Class shape ready" beats a quiet checklist. If something
is missing, name the next action without making absence the focal point.

## 4. One identity, one interactive language, one drop

Three reserved channels, never swapped:

- **Cyan** = "you can act on this." The _only_ interactive color — controls, links, focus, info.
- **Copper** = identity. Brand, primary actions, warmth.
- **Plasma** (hot magenta) = peak energy. Used ~1% of the time — All-Out glow, the Live sprint/drop, the
  Zone 4 ribbon kiss, and peak-derived marketing/share artwork. It is affect, never a control and never
  meaning-bearing on its own.

Keeping these separate is what lets the interface stay quiet while still feeling distinctly Ritmo Studio and
still landing a punch when the class peaks.

## 5. Surfaces match their job

**Glass** (moderate translucency + blur) for navigation, overlays, and the live-mode HUD — where depth
helps. **Solid** for dense editing — the class builder, forms, long lists — where blur taxes readability
over a long session. Never glass-on-glass for dense data.

## 6. Contrast — and tempo — scale with stakes

Planning mode is rich, layered, and mostly _still_: room to think. Live mode is the opposite — maximum
contrast, larger type, minimal chrome, and a visible pulse, glanceable from across a dim studio while
moving. The same tokens produce both; the _mode_ selects how hard to push them.

**Expressiveness scales with surface, too.** Working surfaces—including sign-in—stay cool and quiet.
Marketing and share artifacts may use copper/ember warmth, while plasma appears only at a real class
peak or the Live drop. Swagger comes from class shape, scale, copy, and composition—not generic glow.

Live at rest is still a performance surface. It should project readiness first: next cue, current or
provisional BPM, and class shape stay visible before playback starts. The instructor should feel the
room is set, not that the system is waiting to become useful.

## 7. Earn every element

Eliminate UI noise. Album art is small because it tells the instructor little about how to _use_ a
track — a creative trigger, not a focal point. Default to fewer chrome elements, quieter borders, more
breathing room around the things that carry information. Boldness is spent in one place per surface
(usually the primary action, the live readout, or the energy peak); everything around it stays
disciplined.

## 8. Alive at rest — derive, then refine

No signature surface ships empty, flat, or asleep by default. When the ideal state depends on data the
instructor has not hand-authored yet, show a **derived provisional** from data already in the system, then
make it easy to refine.

- The class shape starts from existing track intensity, order, duration, and sections; placed-move
  intensity refines it.
- Tempo can be provisional from a manual or approved tempo-provider path, never from Spotify metadata.
- Auto-banded structure comes from current tracks and `class_sections`, then remains editable.
- Provisional state is first-class: caution channel + icon + explicit label, never color alone.

Derive, never invent. Do not add visual certainty where the data does not exist; do not add schema by
implication. A provisional should feel useful, honest, and ready to be claimed by the instructor.

---

## Ritmo Studio decision filter

External references are useful only as shorthand. They do not decide the system.

When choices conflict, use this order:

1. Creator workflow and product truth.
2. Accessibility and studio readability.
3. Ritmo Studio color, typography, and rhythm rules.
4. Platform-native behavior.
5. Reference-brand resemblance.

The desired result is not "Spotify for fitness" or "Material with glass." It is a Ritmo Studio
instrument: warm, precise, movement-first, and unmistakably for instructors who build the class.
