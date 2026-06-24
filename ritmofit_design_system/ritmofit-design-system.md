# RitmoFit Design System — Implementation Brief

Version: 4.1.0 (2026-06-23)  
Audience: implementation agents and contributors working inside the RitmoFit web and iOS repositories  
Scope: Web app, marketing pages, class builder, live mode, iOS alignment, reusable tokens, and future-ready movement-first language

---

## 0. Implementation mission

You are implementing or refining the RitmoFit design system across the web app and iOS app/page.

RitmoFit is not a generic fitness planner, music app, SaaS dashboard, or playlist manager.

**RitmoFit is for instructors who are creators.**

The instructor is a producer, choreographer, coach, performer, and movement artist. RitmoFit helps them discover, shape, and perform the class hidden inside the music.

Internal north star:

> RitmoFit is a movement-first creative tool for rhythm fitness instructors. It helps instructors discover, shape, and perform the class hidden inside the music — with the clarity of Nike, the pulse of the club, and the restraint of a premium studio instrument.

Short brand truth:

> Find the class inside the music.

Implementers must preserve the existing system’s strongest mechanics while extending the brand language and implementation discipline.

---

## 1. Target brand model

### 1.1 The metaphor

The target is:

> If Fatboy Slim and Daddy Yankee became Pilates instructors and opened their own studio, then hired the Nike marketing team to build the brand.

The operative target is **Club Athletic + Creator Swagger + Nike restraint**. The metaphor sets creative
energy, not a discipline boundary: RitmoFit must feel native to salsa, samba, barre, yoga, conditioning,
cycle, Pilates, and movement practices that do not yet have a product template.

Implementation translation:

- **Fatboy Slim** = DJ creativity, sampling, groove, cheeky-but-smart creator energy.
- **Daddy Yankee** = Latin-rooted rhythm, heat, percussion, confidence, movement command.
- **Nike** = physical confidence, brutal clarity, campaign-grade phrases, and restraint.
- **Pilates instructor** = control, breath, flow, precision, form, tension and release.
- **Rhythm spin instructor** = cadence, resistance, climb, sprint, all-out effort, room control.

RitmoFit must synthesize these without becoming cheesy, tropical, ravey, or visually derivative.

### 1.2 Brand territory

Primary identity:

> Creator tool for rhythm-designed fitness.

Emotional territory:

> Club Athletic + Creator Swagger + Nike restraint.

Cultural flavor:

> Latin-rooted warmth, rhythm, percussion, confidence, and movement—implicit in the working tool and controlled on the brand-front. Builder and sign-in stay calm; marketing/share earn swagger through class shape, composition, copy, and copper/ember warmth. Plasma is reserved for real peaks and the Live drop.

Product posture:

> The app serves instructors first. Instructors are producers, not consumers.

Design behavior:

> Builder mode is mostly calm. Live mode earns the heat. Marketing and share artifacts carry the swagger.

Voice ceiling:

> Confident, rhythmic, physical, never party-fitness.

Taste boundary:

> If it sounds or feels like LMFAO or Pitbull, it does not match RitmoFit.

Avoid:

- Party-fitness clichés.
- Forced Spanglish.
- Bottle-service energy.
- Tropical costume language.
- Meme-y “turn up” copy.
- Generic SaaS productivity language.

Allow:

- Heat.
- Rhythm.
- Movement.
- Pulse.
- Control.
- Flow.
- Precision.
- Discovery.
- Creator confidence.
- Studio discipline.

---

## 2. Core product philosophy

RitmoFit is a creative instrument. It should feel less like filling out a workout spreadsheet and more like discovering sculpture inside marble or finding a jazz phrase inside a progression.

The class is not merely assembled. It is discovered.

Use this framing throughout product and marketing:

- The instructor **finds** the class inside the music.
- The instructor **shapes** the room.
- The instructor **scores** movement.
- The instructor **builds** the beat into a physical experience.
- The instructor **performs** with precision.

Implementation should prefer choices that make the workflow feel like creative discovery:

- Fast track auditioning.
- Visible BPM and structure.
- Low-friction cue placement.
- Energy arc/ribbon always close to the timeline.
- Clear relationship between music, movement, and effort.
- Live mode that helps the instructor lead, not stare at UI chrome.

---

## 3. Non-negotiable design principles

### 3.1 Built for creating, not consuming

Spotify makes listening effortless. RitmoFit makes authoring rhythm-driven classes effortless.

Do not overweight passive browse/feed patterns. Editing, structure, BPM, cues, movement, intensity, and timeline should have more visual importance than large album art.

Ask on every screen:

> Does this help the instructor build, discover, perform, or refine the class faster?

### 3.2 The interface keeps time

Tempo is not decoration. Tempo is a design material.

- Current BPM becomes a runtime token.
- Beat duration derives from BPM.
- Live mode and the currently playing track may pulse on beat.
- The class shape is visible as an energy ribbon.
- Motion is rationed and meaningful.

### 3.3 Color confirms, structure informs

Color must never be the only carrier of meaning.

Every important state must include at least one non-color cue:

- label
- number
- icon
- position
- size
- weight
- bar count
- shape

### 3.4 One identity, one interactive language, one drop

Color channels are strict:

- **Copper** = brand identity, warmth, primary brand actions.
- **Cyan** = interaction, links, controls, focus, information.
- **Plasma** = peak affect only, the visual drop.

Never swap these meanings.

Plasma must never be a button, link, form control, focus ring, routine badge, or generic accent.

Plasma _is_ affect, but its allowlist is exact: All-Out glow, Live sprint/drop pulse, the Zone 4 kiss in an energy ribbon, and marketing/share artwork derived from actual class peaks. It is never generic atmosphere. Strip every plasma pixel and no information is lost.

### 3.5 Surfaces match their job

Use glass only where it helps transient hierarchy:

- nav bars
- overlays
- popovers
- Live HUD
- focused transient panels

Use solid surfaces for long editing:

- class builder
- inspector
- forms
- dense lists
- cue/move editing

Never put dense editable data on glass. Never stack glass on glass.

### 3.6 Contrast and tempo scale with stakes

Planning mode:

- rich
- calm
- mostly still
- structured
- editable

Live mode:

- high contrast
- large data type
- minimal chrome
- glanceable across a studio
- pulse allowed only where meaningful

Marketing/share cards—the **campaign / swagger register**:

- more swagger
- more campaign language
- more visual rhythm
- still premium and controlled

This register applies only to marketing and share/export. Sanctioned treatments are routed through tokens:

- **Warm display type** (`--rf-gradient-heat`, copper → ember) on a hero accent.
- **Ambient copper/ember bloom** (`--rf-bloom-heat`) behind the hero—derived, off-axis, low-alpha.
- **Peak class-shape artwork**—plasma may bloom only where the depicted class reaches Zone 4.

Hard boundary: none of this appears on Builder, sign-in, inspector, forms, dense lists, or Live-at-rest.

### 3.7 Earn every element

No decoration that does not serve rhythm, hierarchy, clarity, or brand recognition.

Do not add generic two-orb AI SaaS backgrounds. If texture is needed, derive it from rhythmic data such as beat grids, bars, timelines, or class shape.

---

## 4. Movement-first vocabulary

RitmoFit supports rhythm-led movement without a default discipline. A salsa, samba, Pilates, barre, yoga, HIIT, or cycle instructor should encounter the same authoring primitives and bring practice-specific language through templates or instructor-authored content.

> **Schema honesty:** the current `moves.template` enum (`cycle` / `hiit` / `sculpt` / `tread`) is an implementation constraint, not the product's definition of movement. A placed move may reference library data or use `name_override`. The UI calls these values current source tags, keeps moves icon + label led and color-neutral, and documents a schema TODO before adding new persisted disciplines.

The same rule applies to class sections. Stored `segmentType` keys keep their honest fallback labels
(Warm-up, Climb, Sprint, Recovery, Cool-down). A reviewed discipline template or an instructor-authored
section name may override the visible label; the system never relabels one persisted meaning as another.

### 4.1 Foundation language

Use platform-wide terms that work beyond spin:

- Class
- Track
- Phrase
- Cue
- Move
- Effort
- Flow
- Peak
- Release
- Shape
- Energy
- Section
- Sequence
- Timeline
- Instructor
- Creator

### 4.2 Spin-specific language

Allowed in spin-specific screens and templates:

- Ride
- Cadence
- Resistance
- Climb
- Sprint
- Recovery
- Warm-up
- Cool-down

Do not make spin terms foundational unless the file/screen is explicitly cycling-only.

### 4.3 Pilates / barre / yoga-ready language

Reserve room for:

- Breath
- Hold
- Pulse
- Control
- Align
- Extend
- Reset
- Flow
- Core
- Balance
- Release

### 4.4 Intensity labels

The database enum may remain:

- `none`
- `easy`
- `mod`
- `hard`
- `all_out`

Display labels should be movement-friendly:

| Enum      | Zone | Default display | Meaning                         |
| --------- | ---: | --------------- | ------------------------------- |
| `none`    |    0 | None            | no effort assigned              |
| `easy`    |    1 | Build           | warm entry, control, foundation |
| `mod`     |    2 | Push            | working effort, active flow     |
| `hard`    |    3 | Attack          | strong effort, drive, challenge |
| `all_out` |    4 | All Out         | peak effort, earned drop        |

Future class types may override labels while preserving the enum and zone structure.

Examples:

- Pilates Zone 1 = Build / Control
- Pilates Zone 2 = Flow
- Pilates Zone 3 = Burn
- Pilates Zone 4 = Peak / Hold

Do not hardcode cycling-only labels globally.

---

## 5. Voice and copy system

### 5.1 Voice traits

RitmoFit copy should be:

- Rhythmic
- Physical
- Confident
- Clear
- Creator-first
- Warm
- Premium
- Direct
- Cheeky-but-smart (wit with control)

It should not be:

- Cheesy
- Party-coded
- Gimmicky
- Bro-y
- Generic SaaS
- Overly tropical
- Excessively motivational

On cheek: Fatboy Slim's half of the brand is _cheeky-but-smart_ (§1.1), so the voice is allowed a wink — dry, confident, a little playful. The line to hold: cheek is **wit with control** ("Cue the drop. Keep control."), never cheese, bro-energy, or party-coded copy. Land the joke in the _confidence_, not the _volume_. The brand-front gets the most latitude here; working-surface microcopy stays plain.

### 5.2 Copy rules

Prefer short active phrases.

Good verbs:

- build
- shape
- find
- cue
- score
- move
- drive
- flow
- drop
- release
- perform
- refine
- lead

Avoid generic SaaS verbs:

- manage
- optimize
- leverage
- streamline
- configure
- unlock productivity

Avoid party clichés:

- turn up
- party ride
- sweat party
- bring the fiesta
- club vibes only
- get lit

### 5.3 Approved tone examples

Good:

- Find the class inside the music.
- Build the beat. Move the room.
- Shape the room from the first track.
- Score movement with precision.
- Cue the drop. Keep control.
- Your playlist has a shape. Make it visible.
- Built for instructors who create.
- Every cue, on time.
- Rhythm in. Movement out.
- Lead the room without losing the beat.
- You bring the room. We'll keep time.
- Less playlist, more choreography.
- Anyone can press play. You build the room.

Too generic:

- Manage your fitness classes efficiently.
- Optimize your workout planning workflow.
- Create playlists and exercises in one dashboard.

Too cheesy:

- Turn up the sweat party.
- Bring the fiesta to every ride.
- Drop it like it’s hot in class.
- Let’s get lit and fit.

### 5.4 UI microcopy examples

Empty class:

> Start with a track. Shape the room from there.

No cues yet:

> Add the first cue. The structure will start to show.

Provider disconnected:

> Your music link dropped. Reconnect to keep building.

Unsynced change:

> Changes waiting to sync.

Saved:

> Class shape saved.

All-Out Live transition:

> Drop in.

Class complete:

> Class shape complete.

Share/export:

> Share the shape of the class.

Onboarding headline:

> RitmoFit is for instructors who are creators.

Onboarding subhead:

> Build rhythm-driven classes from the music up — track by track, cue by cue, beat by beat.

### 5.5 Latin-rooted easter eggs

Use Spanish-rooted naming lightly and intentionally. Treat it as an easter egg layer, not the main costume.

Allowed patterns:

- Ritmo as brand root.
- Occasional naming like `Pulso`, `Brasa`, `Clave`, `Compás`, `Fuego` where meaningful and restrained.
- Use Spanish-rooted terms only when they map to real rhythm, heat, or movement concepts.

Avoid:

- Random Spanish words for flavor.
- Forced Spanglish in UI controls.
- Cultural caricature.
- Fiesta/tropical clichés.

---

## 6. Color system

All implementation should route through tokens.

### 6.1 Color channels

| Channel            | Meaning               | Primary use                                        | Never use for                         |
| ------------------ | --------------------- | -------------------------------------------------- | ------------------------------------- |
| Surface            | warm espresso depth   | backgrounds, cards, overlays                       | interaction                           |
| Text               | warm bone             | content                                            | interaction alone                     |
| Brand / Copper     | identity, warmth      | primary action, brand marks                        | generic control state                 |
| Interactive / Cyan | actionable            | links, secondary buttons, focus, toggles           | brand warmth, segment meaning         |
| Peak / Plasma      | maximum energy        | All-Out glow, Live drop only                       | buttons, links, focus, generic accent |
| Caution / Amber    | warning               | caution state with icon                            | brand identity                        |
| Danger / Ember     | destructive/high heat | destructive actions with icon, high intensity ramp | generic accent                        |

### 6.2 Suggested token values

**`tokens.json` is authoritative for values; this block is illustrative only.**
The `:root` in `mockups/theme.css` is generated from `tokens.json` by
`scripts/build-tokens.mjs` (where `interactive/default` → `--rf-interactive` and
`peak/glow` → `--rf-peak`). The values below are kept in sync with that source.

```css
:root {
  --rf-bg-base: #0b0a08;
  --rf-bg-raised: #1a1712;
  --rf-bg-overlay: #241f18;
  --rf-bg-sunken: #12100c;

  --rf-text-primary: #fbf7f0;
  --rf-text-secondary: #c9beaa;
  --rf-text-tertiary: #9e927e;
  --rf-text-on-accent: #0b0a08;

  --rf-brand-primary: #e07e3c;
  --rf-brand-strong: #c8682a;
  --rf-brand-muted: #7a3b12;

  --rf-interactive: #3ac0d4;
  --rf-interactive-hover: #74d6e5;
  --rf-interactive-pressed: #17a2b8;
  --rf-focus-ring: #74d6e5;

  --rf-peak: #ff2e88;
  --rf-peak-bright: #ff6aae;

  --rf-caution: #f2b838;
  --rf-danger: #e8654f;

  --rf-border-subtle: rgba(251, 247, 240, 0.08);
  --rf-border-default: rgba(251, 247, 240, 0.14);
  --rf-border-strong: rgba(251, 247, 240, 0.24);
}
```

### 6.3 Plasma allowlist

Plasma appears only in:

1. All-Out intensity glow layered on top of ember.
2. Live-mode sprint/drop pulse.
3. Energy ribbon peak “kiss” at Zone 4.
4. Marketing/share-card artwork derived from class peaks.

Plasma must not appear on planning screens at rest except as a small peak within the energy ribbon.

### 6.4 Intensity rendering

Every intensity display must include at least:

- zone number
- bar count or height
- text label

Color reinforces only.

Compact row example:

- `Z3` + three bars + `Attack`

Full editor example:

- `Zone 3 · Attack` + 3 bars + warm ramp color

All-Out:

- `Zone 4 · All Out` + 4 bars + ember bar + optional plasma glow in allowed contexts

---

## 7. Typography

### 7.1 Families

Use three roles:

| Role    | Font                                    | Purpose                                  |
| ------- | --------------------------------------- | ---------------------------------------- |
| UI/body | Sora on web / SF Pro Text on iOS       | dense interface, labels, lists, forms    |
| Display | Bricolage Grotesque / SF Pro Display fallback | marketing, large titles, Live headers    |
| Data    | Azeret Mono / SF Mono fallback         | BPM, timecodes, zones, durations, counts |

The numbers carry the brand. BPM in a generic UI font is a bug.

Bricolage Grotesque runs at normal width with optical sizing enabled. Sora is not bundled as the
native iOS UI face; SF Pro Text preserves native expression there.

### 7.2 Type scale

| Token       | Web px | Weight | Tracking | Family        | Use                       |
| ----------- | -----: | -----: | -------: | ------------- | ------------------------- |
| display-lg  |  48/52 |    700 | -0.035em | Bricolage Grotesque | marketing hero            |
| display     |  34/40 |    700 |  -0.03em | Bricolage Grotesque | section hero, Live title  |
| title       |  24/30 |    600 |  -0.01em | Sora         | screen titles             |
| heading     |  18/24 |    600 |        0 | Sora         | card/group header         |
| body        |  15/22 |    400 |        0 | Sora         | default UI text           |
| body-strong |  15/22 |    600 |        0 | Sora         | list titles               |
| label       |  13/16 |    500 |  +0.01em | Sora         | labels, chips             |
| caption     |  11/14 |    500 |  +0.04em | Sora         | metadata, uppercase units |
| data-hero   |  88/84 |    700 |  -0.04em | Azeret Mono  | Live BPM                  |
| data-lg     |  28/30 |    600 |  -0.03em | Azeret Mono  | timeline readouts         |
| data        |  15/18 |    500 |  -0.02em | Azeret Mono  | inline BPM/timecode       |

### 7.3 Typography rules

- Sentence case for UI.
- Uppercase only for small units like BPM, DURATION, ZONE.
- Use weight and spacing before adding more font sizes.
- Data contexts always use Azeret Mono.
- Live mode uses large data type for glanceability.
- Respect Dynamic Type and browser zoom.

---

## 8. Layout and surfaces

### 8.1 Radius scale

| Token   |  px | Use                       |
| ------- | --: | ------------------------- |
| sheet   |  24 | major sheets               |
| panel   |  20 | main panels                 |
| card    |  16 | cards, contained groups       |
| input   |  12 | fields, selects, buttons      |
| control |  10 | track rows, compact controls  |
| pill    | 999 | chips, toggles, compact tags  |

### 8.2 Spacing

Use a 4px base grid.

Recommended tokens:

- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48
- 64

### 8.3 Surface recipes

Resting depth is strict: canvas = `bg/base`; workbench = `bg/sunken` + `border/subtle`; contained =
`bg/raised` with a border only when it clarifies a boundary; elevated = `bg/overlay` + `shadow/lifted`
for overlays, dragging, and floating trays. Resting surfaces do not cast shadows, and planning headers
remain opaque. Borders belong to boundaries, inputs, focus, warnings, and errors—not every object.

Solid card:

```css
background: var(--rf-bg-raised);
border: 1px solid var(--rf-border-subtle);
border-radius: var(--rf-radius-card);
```

Glass overlay:

```css
background: rgba(26, 23, 18, 0.7);
backdrop-filter: blur(20px);
border: 1px solid rgba(251, 247, 240, 0.12);
box-shadow: inset 0 1px 0 rgba(251, 247, 240, 0.06);
```

Fallback when backdrop-filter is unsupported:

```css
background: var(--rf-bg-overlay);
```

### 8.4 Mode layouts

Builder/web:

- Timeline-first.
- Energy ribbon near the top.
- Track list and class sequence central.
- Right-side inspector for selected track/cue/move.
- Keyboard-friendly.
- Mostly still.

Live/iOS:

- Single focus.
- Huge BPM/time/next cue.
- Minimal chrome.
- Glass HUD acceptable.
- On-beat pulse allowed only in defined areas.

Marketing:

- Larger display typography.
- More visual rhythm.
- Energy ribbon as brand artifact.
- Confident campaign copy.
- Still avoids generic SaaS gradient hero clichés.

---

## 9. Components

### 9.1 Buttons

Variants:

| Variant          | Fill                       | Text         | Use                          |
| ---------------- | -------------------------- | ------------ | ---------------------------- |
| Primary          | copper                     | ink          | one main action per surface  |
| Secondary        | neutral border/fill        | bone or cyan | Share, New class, secondary  |
| Inline action    | transparent, no border     | cyan + `+`   | add track/cue/move/library   |
| Ghost            | raised/overlay             | bone         | cancel, tertiary             |
| Destructive      | transparent, no border     | ember + icon | delete/remove                |

Rules:

- Only one primary per surface.
- Buttons use the 12px `input` radius; pills are tags/chips only.
- Focus ring always cyan.
- Disabled state reduces opacity and removes hover.
- Plasma is never a button.
- Touch/click target at least 44x44.

### 9.2 Chips and toggles

- Filter chips use raised surface.
- Selected controls use checked/pressed state plus shape and weight; cyan may confirm the interaction.
- Persistent location uses matching content headings plus weight or neutral fill, not cyan decoration.
- Segment tags include icon + label + small tint dot.
- Toggle “on” uses cyan plus knob position.

### 9.3 Inputs

- Solid surfaces only for long editing.
- Labels above fields.
- Focus ring cyan.
- Error = ember border + icon + message.
- Numeric data fields use Azeret Mono.

### 9.4 BPM readout

The signature data component.

Sizes:

- Inline: track rows/editor.
- Large: timeline/class summary.
- Hero: Live mode.

Hero readout may pulse on beat only in Live mode and only if reduced motion is off.

### 9.5 Track row / song card

Track row must be low-noise and structure-forward.

Required elements:

- Small album art, around 44pt.
- Title.
- Artist.
- BPM in Azeret Mono.
- Duration/timecode in Azeret Mono.
- Intensity zone with number + bars.
- Drag/reorder affordance where relevant.
- Selection state.
- Playing state indicator.

Rules:

- Album art is a creative trigger, not the focus.
- BPM and structure carry more visual weight than artwork.
- Currently playing row may pulse only on a small play indicator.
- Do not animate the whole list row.

### 9.6 Energy ribbon / class shape

The energy ribbon is a core brand artifact.

It represents intensity over time.

Rules:

- Height encodes zone.
- Color reinforces zone.
- Plasma appears only at Zone 4 peaks.
- It must be legible in grayscale.
- It updates when track or placed-move intensity changes.
- It is shareable: should work in screenshots/share cards.

Data inputs:

- Baseline from per-track intensity.
- Refinement from placed moves/cues with intensity and anchor time.

Do not invent nonexistent schema fields. If exact schema differs, map carefully and document assumptions in comments.

### 9.7 Cue and move markers

Cues and moves are separate concepts.

They must be visually distinct by:

- icon
- shape
- label
- placement

Do not distinguish cue/move only by color.

Cue color picker must exclude plasma range.

### 9.8 Provider connection states

Music providers are core to trust.

Catalog availability is not account connection. Current product capability is authoritative:

- Spotify and Apple Music support catalog search/import only.
- SoundCloud supports catalog search/import, user connection, and likes.

Show `catalog available` for catalog-only providers. Use the connection states below only when the
provider supports a user-account integration.

States must be explicit:

- connected
- reconnecting
- disconnected
- expired session
- permission issue
- provider error

Disconnected state copy:

> Your music link dropped. Reconnect to keep building.

Never show silent failure or dead-end empty state.

### 9.9 Share cards

Share cards may carry more swagger than the app.

Required share-card ingredients:

- class title
- instructor/studio identity if available
- energy ribbon/class shape
- duration
- track count
- peak count or All-Out markers if available
- RitmoFit mark/wordmark

Tone:

- campaign-grade
- rhythm-forward
- premium
- not consumer-party

Example share copy:

> Built from the beat. Shaped for the room.

---

## 10. Rhythm system

### 10.1 Tempo token

Web:

```css
:root {
  --rf-bpm: 122;
  --rf-beat: calc(60s / var(--rf-bpm, 120));
}
```

iOS:

```swift
let beatDuration = 60.0 / bpm
```

Expose current BPM to the view layer when a track is playing.

### 10.2 Pulse allowlist

Pulse appears only in:

1. Live HUD BPM/current cue card.
2. Currently playing track indicator in planning timeline.

No other element pulses.

### 10.3 Pulse treatment

Live HUD:

- scale 1.0 to 1.06
- subtle luminance breath
- duration = beat duration
- on-beat easing

Planning playing indicator:

- scale 1.0 to 1.03
- faint border/luminance breath
- duration = beat duration

### 10.4 Pulse restrictions

Never pulse:

- dense lists at rest
- forms
- search results
- static marketing unless explicitly animated media
- more than one element per screen
- anything under reduced motion

### 10.5 The one drop

All-Out cue advance in Live mode may use:

- beat-aligned cross-fade
- brief plasma glow bloom
- no layout shift
- no confetti
- no party animation

Reduced motion fallback:

- instant state change
- no glow bloom
- static All-Out label remains

---

## 11. Accessibility

Accessibility is non-negotiable and central to brand trust.

### 11.1 Colorblind-safe requirements

RitmoFit must not use red/green meaning conventions.

Every meaning-bearing color requires non-color redundancy:

- icon
- label
- number
- shape
- position
- bar count

Success is cyan + check icon, not green alone.

Danger is ember + error icon + label.

Warning is amber + warning icon + label.

### 11.2 Contrast

Planning:

- WCAG AA minimum for text.

Live:

- Target AAA where practical because instructors read while moving in dark studios.

### 11.3 Motion

If `prefers-reduced-motion` or iOS Reduce Motion is enabled:

- remove tempo pulse entirely
- remove drop glow animation
- keep static labels/indicators
- keep energy ribbon static
- lose no information

### 11.4 Input access

- Minimum target: 44x44 pt/px equivalent.
- Keyboard focus visible everywhere.
- Focus ring cyan.
- Forms have labels and error messages.
- Timeline/cue editing must have keyboard-accessible alternatives where feasible.

### 11.5 Screen readers

Energy ribbon needs textual summary.

Example:

> Class energy shape: 45 minutes, 4 peak efforts, highest zone All Out, cooldown in final 5 minutes.

Cue markers should announce:

> Cue at 1:24, Zone 3 Attack, “Increase resistance.”

---

## 12. Web implementation guidance

### 12.1 Source of truth

Prefer this order:

1. `tokens.json` or equivalent design-token source.
2. Generated CSS custom properties.
3. Component styles consuming variables.
4. No hardcoded color/type/radius values inside component files unless explicitly local and documented.

For the current web product, `ritmofit_design_system/tokens.json` is consumed by
`apps/web/scripts/generate-tokens.mjs`, which emits `apps/web/src/styles/tokens.css`. The mockup
generator in this package is a reference-package tool; do not replace the product generator without a
separate architecture decision.

### 12.2 CSS architecture

Create or maintain:

- global tokens
- typography utilities
- surface utilities
- button/component classes
- motion utilities
- reduced-motion overrides
- accessibility/focus styles

Suggested CSS utility names:

```css
.rf-surface-solid
.rf-surface-glass
.rf-text-primary
.rf-text-secondary
.rf-data
.rf-data-lg
.rf-data-hero
.rf-button-primary
.rf-button-action
.rf-button-ghost
.rf-button-danger
.rf-focus-ring
.rf-intensity-zone
.rf-energy-ribbon
.rf-tempo-pulse-live
.rf-tempo-pulse-playing
```

### 12.3 Reduced motion CSS

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }

  .rf-tempo-pulse-live,
  .rf-tempo-pulse-playing {
    animation: none !important;
    transform: none !important;
    box-shadow: none !important;
  }
}
```

### 12.4 Marketing page guidance

Homepage should explicitly communicate:

- RitmoFit is for instructors who are creators.
- Find the class inside the music.
- Movement-first, not spin-only.
- Music provider connection is central.
- Energy ribbon/class shape is the signature artifact.

Hero copy option:

Headline:

> Find the class inside the music.

Subhead:

> RitmoFit helps rhythm fitness instructors build, cue, and perform movement-first classes from the music up.

CTA:

> Start building

Secondary CTA:

> See class shape

Avoid homepage language that sounds like generic project management.

---

## 13. iOS implementation guidance

### 13.1 Token parity

Create Swift equivalents for:

- color roles
- type roles
- spacing
- radius
- motion duration/easing
- intensity zones

Example structure:

```swift
enum RFColor {
    static let bgBase = Color(hex: "0B0A08")
    static let bgRaised = Color(hex: "1A1712")
    static let textPrimary = Color(hex: "FBF7F0")
    static let brandPrimary = Color(hex: "E07E3C")
    static let interactive = Color(hex: "3AC0D4")
    static let peakGlow = Color(hex: "FF2E88")
}
```

The current iOS repository vendors `design-tokens/tokens.json` and emits
`RitmoFit/RitmoFit/Core/DesignSystem/RFTokens.swift`. Sync the canonical JSON, then regenerate; never
copy or edit generated Swift by hand.

### 13.2 Native expression

Do not force web CSS aesthetics into iOS.

iOS should feel native while preserving:

- warm dark surfaces
- copper/cyan/plasma channel discipline
- Azeret Mono for data
- Bricolage Grotesque/display role where bundled
- large Live readouts
- reduced-motion behavior
- energy ribbon/class shape

### 13.3 Live mode

Live mode is iOS-primary.

Prioritize:

- current track
- current cue
- next cue
- BPM
- elapsed/remaining time
- intensity
- emergency clarity

Reduce:

- navigation chrome
- artwork size
- editing controls
- secondary metadata

### 13.4 Dynamic Type

Support Dynamic Type. Large type should reflow rather than clip.

Data readouts may need responsive scaling, but must remain readable and stable.

---

## 14. Class builder behavior

### 14.1 Builder mental model

Building the playlist is building the class.

Avoid treating playlist import and class authoring as disconnected workflows.

Flow:

1. Connect provider.
2. Search/import tracks.
3. Arrange sequence.
4. Assign intensity and sections.
5. Add cues and moves.
6. Preview class shape.
7. Perform in Live mode.
8. Share/export.

### 14.2 Builder hierarchy

Most important visual elements:

1. Energy ribbon/class shape.
2. Track sequence/timeline.
3. BPM/time/duration data.
4. Selected cue/move editor.
5. Music provider status.
6. Artwork, small and bounded.

### 14.3 Empty states

Empty states should invite creative action.

Examples:

- Start with a track. Shape the room from there.
- Search your music library to find the first phrase.
- Add a cue. The class shape will start to show.

### 14.4 Error states

Provider or sync failures must be clear and recoverable.

Bad:

> Error 403.

Good:

> Your music link dropped. Reconnect to keep building.

Then show a clear reconnect action.

---

## 15. Brand moments

Brand moments are limited and intentional.

### 15.1 Allowed brand moments

| Moment                        | Treatment                           |
| ----------------------------- | ----------------------------------- |
| first track added             | subtle ribbon/structure reveal      |
| playing track changes         | small on-beat indicator retimes     |
| All-Out cue in Live           | one beat-aligned plasma drop        |
| class reaches target duration | calm class-shape completion state   |
| share/export                  | energy ribbon becomes hero artifact |
| provider reconnect success    | cyan check pulse, no confetti       |

### 15.2 Brand moment restrictions

- No confetti.
- No endless background animations.
- No multiple pulsing elements.
- No plasma in ordinary planning UI.
- No party-mode language.
- No motion that conveys required information.

---

## 16. Implementation tasks

Use this checklist to audit and implement.

### 16.1 Design token audit

- Locate existing token files, theme files, CSS variables, Swift constants.
- Consolidate values to source-of-truth tokens where possible.
- Replace hardcoded color values with named tokens.
- Ensure copper/cyan/plasma roles are enforced.
- Ensure data font utilities exist.
- Ensure radius/spacing tokens exist.

### 16.2 Web component audit

Check and update:

- Button variants.
- Inputs/forms.
- Track row/song card.
- BPM readouts.
- Intensity displays.
- Energy ribbon.
- Timeline/cue markers.
- Provider connection states.
- Empty states.
- Marketing hero.
- Share/export cards if present.

### 16.3 iOS component audit

Check and update:

- Color constants.
- Type roles.
- Live mode layout.
- Builder layout.
- Track row/card.
- BPM readout.
- Intensity display.
- Energy ribbon equivalent.
- Reduced motion handling.
- Dynamic Type support.

### 16.4 Copy audit

Search for generic phrases and replace with creator-first language.

Replace phrases like:

- Manage your classes.
- Optimize your workflow.
- Create workouts.
- Playlist dashboard.

With phrases like:

- Build rhythm-driven classes.
- Find the class inside the music.
- Shape the room from the first track.
- Score movement with precision.
- Built for instructors who create.

### 16.5 Accessibility audit

- Confirm color is never sole meaning carrier.
- Check all focus states.
- Check reduced-motion behavior.
- Check text contrast.
- Check touch targets.
- Check keyboard navigation.
- Check screen reader labels for timeline/ribbon/cues.

---

## 17. Acceptance criteria

An implementation change is successful when:

### Brand/product

- The product explicitly says or implies: RitmoFit is for instructors who are creators.
- The homepage/marketing page uses creator-first, movement-first language.
- The product feels like a creative rhythm tool, not generic SaaS.
- The language avoids party-fitness clichés.

### Visual system

- Copper, cyan, and plasma roles are not mixed.
- Plasma appears only in the allowlist.
- Data values use Azeret Mono or approved data font fallback.
- Album art is bounded and not dominant in builder workflows.
- Energy ribbon/class shape is prominent where applicable.

### Interaction

- Builder is calm and usable.
- Live mode is high-contrast and glanceable.
- Pulse is beat-derived and rationed.
- Reduced motion removes pulse without removing meaning.
- Provider failures are clear and recoverable.

### Accessibility

- No red/green-only semantics.
- Every color-coded state has a redundant cue.
- Focus states are visible.
- Contrast meets target.
- Touch targets are adequate.
- Dynamic Type/browser zoom does not break core workflows.

### Engineering

- Tokens are centralized.
- Component styles consume tokens.
- Schema assumptions are documented.
- No invented data fields are silently introduced.
- Web and iOS share roles even when native implementation differs.

---

## 18. Suggested implementation prompt

Use this prompt at the repo root or workspace root.

```text
You are working in the RitmoFit repository. Implement and/or refine the RitmoFit design system using the attached/available design-system brief.

Core brand truth: RitmoFit is for instructors who are creators. It is a movement-first creative tool that helps rhythm fitness instructors discover, shape, and perform the class hidden inside the music.

Brand target: Club Athletic + Creator Swagger + Nike restraint. Latin-rooted warmth, rhythm, percussion, confidence, and movement should be present lightly and intentionally, never as costume or cliché. If copy or visuals feel like LMFAO or Pitbull, they do not match RitmoFit.

Product behavior: Builder mode is calm and precise. Live mode earns the heat. Marketing/share artifacts carry more swagger. The app serves instructors/producers first, not consumers.

Implementation priorities:
1. Audit existing tokens, theme files, CSS variables, Swift constants, and component styles.
2. Centralize design tokens for color, typography, radius, spacing, surfaces, motion, and intensity roles.
3. Enforce color-channel discipline: copper = brand identity, cyan = interaction/focus/info, plasma = peak affect only.
4. Ensure BPM/timecode/zone/duration data use the data typography role, preferably Azeret Mono or approved fallback.
5. Implement or preserve the rhythm system: BPM-derived beat token, rationed tempo pulse, reduced-motion fallback, and energy ribbon/class shape.
6. Refine web and iOS UI so Builder is calm, Live is high-contrast and glanceable, and marketing copy is creator-first.
7. Replace generic SaaS or party-fitness copy with RitmoFit voice: rhythmic, physical, confident, clear, creator-first.
8. Preserve accessibility: color is never sole meaning carrier, focus is visible, reduced motion removes affect not information, touch targets are at least 44x44, Live mode targets high contrast.
9. Do not invent schema fields silently. If a desired visual needs unavailable data, derive from current data or leave a documented TODO.
10. Provide a concise implementation summary and list of changed files.

Before editing, inspect the repository structure and identify the relevant token/theme/component files. Then make focused, reviewable changes.
```

---

## 19. Suggested follow-up prompt for auditing only

Use when you want an implementation agent to evaluate before editing.

```text
Audit the RitmoFit repo against the RitmoFit design-system brief.

Do not make code changes yet.

Return:
1. Current alignment score from 1-10.
2. File-by-file findings.
3. Token/theme gaps.
4. Component gaps.
5. Copy/voice gaps.
6. Accessibility gaps.
7. Web/iOS alignment gaps.
8. Recommended implementation plan in small commits.
9. Risks or schema assumptions to verify.

Use the core truth: RitmoFit is for instructors who are creators. Builder mode is calm, Live mode earns the heat, marketing/share artifacts carry the swagger.
```

---

## 20. Suggested follow-up prompt for implementation

Use after the audit.

```text
Using the completed audit and the RitmoFit design-system brief, implement the highest-impact design-system changes in small, reviewable commits.

Prioritize:
1. Token centralization.
2. Copper/cyan/plasma role enforcement.
3. Typography roles, especially data typography for BPM/timecodes/zones.
4. Builder calmness and hierarchy.
5. Live-mode glanceability.
6. Energy ribbon/class shape visibility.
7. Creator-first copy.
8. Accessibility and reduced-motion compliance.

Do not introduce unrelated product features. Do not silently alter database schema. Document any TODOs where visual goals depend on unavailable data.

After changes, summarize files changed, design-system rules implemented, and any remaining gaps.
```
