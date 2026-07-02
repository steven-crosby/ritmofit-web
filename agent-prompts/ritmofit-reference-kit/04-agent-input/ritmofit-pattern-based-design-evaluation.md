# RitmoFit Pattern-Based Design Evaluation

## Executive Summary

RitmoFit already reads as a premium rhythm-fitness authoring tool on desktop. The strongest surfaces are `ritmofit_design_system/mockups/builder.html`, `live.html`, and `marketing.html`: they understand that the product is about shaping and performing a class, not passively browsing music. The energy ribbon is the clearest product signature; it makes the class visible as a rhythmic arc and keeps RitmoFit from becoming a generic playlist manager.

The system is strongest where it follows its own rules: copper for identity and primary action, cyan for interaction, plasma for peak affect, small artwork, weighted BPM, dense-but-readable track rows, and a dramatic Live HUD. The desktop Builder has the right mental model: class rail, class shape, ordered track sequence, and selected-track inspector.

The main weakness is responsive execution. At a 390px mobile viewport, `builder.html` clips content horizontally, and `live.html` clips the giant BPM readout. That is a serious issue because mobile glanceability and Live readability are core promises. The second weakness is that a few components borrow Spotify-adjacent shapes too literally: ordinary buttons and nav states use pill geometry more broadly than the design-system component guidance allows. The third weakness is state clarity in dense rows: the current/playing item needs a visible text label, not only a pulsing dot.

## What RitmoFit Should Borrow as Principles

- Persistent availability of class controls from Spotify's player model, but translated to instructor tasks: pause, reset, seek, exit Live, and preview should stay close to the user's locus of work.
- Dense list scanning from Spotify playlist tables: title, artist/provider, duration, BPM, intensity, and state should align predictably so instructors can scan without reading every row.
- Unmistakable active-item treatment from Spotify's current-track state, but with redundant encoding: label, shape, position, weight, and iconography, not hue alone.
- Queue/up-next visibility from Spotify's queue panel, translated to Live: current cue, next cue, and time-to-next should always be visible without making the instructor parse a full playlist.
- Mobile now-playing focus: one large current state, reduced chrome, large controls, and minimal competing hierarchy.
- Library organization patterns: filters, saved sources, and repeat-use workflows should help instructors retrieve usable music and templates quickly.
- Pricing/onboarding clarity: confident copy, one primary action, and low-friction account entry.

## What RitmoFit Must Avoid Copying

- Spotify green, Spotify's exact rounded controls, consumer playback hierarchy, album-art-first browsing, and passive listening assumptions.
- A discovery-first home page that buries authoring. RitmoFit's first task is to build and run classes.
- Oversized album art in Builder or Live. Artwork can trigger memory, but BPM, time, movement, cue, and class shape are more important.
- Color-only active states. Spotify can lean on green as a brand/state shorthand; RitmoFit explicitly cannot.
- A generic SaaS pricing-card or dashboard composition that makes the product feel like any subscription tool.
- Ambient glow, plasma, or motion as decoration. Heat must come from class peaks and Live moments.

## Builder Mode Evaluation

`ritmofit_design_system/mockups/builder.html` has the correct desktop architecture. The class rail, class header, energy ribbon, segment band, track sequence, and right inspector map well to the design-system brief in `09-class-builder-guidelines.md`. The Builder feels like a workstation for creating, not a music library for consuming.

Playlist density is generally good. Rows are compact, album art is small, BPM is strongly weighted in the data face, and each row carries title, artist, provider, duration, intensity, and reorder affordance. This borrows the right lesson from Spotify playlist density: predictable alignment and restrained metadata. The rows are slightly crowded on desktop, especially where title/provider truncation, intensity, BPM, and alternate-modality metrics compete in the same line.

Segment structure is present and quiet. The segment chips use label plus dot, so they do not compete with the intensity ribbon. The energy ribbon is the strongest element in the Builder. It is specific to RitmoFit, visually ownable, and immediately communicates the class as an arc rather than a list.

Cue hierarchy is mostly clear. Timeline markers use distinct shapes for cues and moves, and the inspector separates Cues from Moves. In the track list, however, the currently playing state is too quiet compared with the selected state. The cyan dot is accessible to assistive tech via `aria-label`, but visually the screen still relies too much on dot + motion. A compact visible "Now" or "Playing" label would make the state survive reduced motion, color-blind scanning, and quick glances.

Editing affordances are clear in the inspector: intensity picker, manual BPM, creator note, cues, moves, add actions, and remove. The inspector feels high-confidence and avoids DAW complexity. The complexity ceiling is appropriate for a v1 mockup: it supports choreography without becoming a full nonlinear editor.

The biggest Builder issue is mobile. At 390px, the rendered screenshot clips text and controls horizontally. `theme.css` defines desktop Builder columns at lines 1552-1555 and mobile collapses at lines 2493-2497, but several child structures retain width pressure: track rows use many auto columns at lines 1062-1067, class metrics stay dense, and the Live/Builder display type can exceed the available inline size. The mobile Builder must become a true single-column workbench, not a desktop grid squeezed into a phone viewport.

## Live Mode Evaluation

`ritmofit_design_system/mockups/live.html` is the most emotionally distinctive product surface. The current cue card, giant BPM, All Out plasma glow, persistent transport, and next cue panel all support an instructor-facing performance moment. It feels like a rhythm-fitness tool, not a consumer music player.

Current state clarity is strong on desktop: "Now · Zone 4 · All Out", four bars, "Drop in.", "Attack · standing drive", and `138 BPM` create a clear hierarchy. The current cue is unmistakable. Next cue visibility is also strong; the right panel shows "Next cue in 0:18" and the upcoming instruction. The persistent transport at the bottom matches the class-control principle without copying Spotify's exact player.

The main Live problem is mobile clipping. In the 390px screenshot, the `138` BPM readout is cut off on the right edge. This is a high-severity issue because Live mode must be glanceable while moving. The likely contributors are the large data type in `.live-bpm strong` at lines 1884-1890 and the animation applied to the entire `.current-cue` via `.tempo-pulse-live` at lines 1900-1901. The responsive fallback at lines 2657-2670 tries to stack and reduce the BPM, but the rendered result still overflows. The pulse should target an inner element or reserve safe space, and the mobile BPM should be measured against the 320px floor.

Motion discipline is mostly good. The pulse is only on Live and the currently playing Builder indicator, and `prefers-reduced-motion` suppresses it at lines 2673-2692. The All-Out glow is allowed by the color system. The design should ensure the pulse never causes layout clipping or causes the current cue card to grow beyond its viewport.

Low cognitive load is good on desktop but weaker on mobile because the viewport becomes a vertical stack with clipped data. The next cue remains visible, but the bottom transport and time readout push important context down. A mobile Live layout should prioritize current cue, BPM, next cue countdown, and pause as a stable first screen.

## Marketing / Website Evaluation

`ritmofit_design_system/mockups/marketing.html` is strong. The first viewport shows the literal offer, "Find the class inside the music.", and the class-shape artifact is visible immediately. The copy is instructor-specific: "track by track, cue by cue" and "You build the room" are better than generic fitness or SaaS language. The page feels premium because it has restraint: one large idea, one artifact, and three grounded workflow cards.

`ritmofit_design_system/mockups/index.html` is not really a marketing page; it is a design-system gallery. That is fine for the mockup package, but it should not be evaluated as the product homepage. The actual public marketing direction appears to be `marketing.html`.

`ritmofit_design_system/mockups/login.html` is polished and quiet. The desktop split layout keeps the class-shape motif nearby without overloading the sign-in task. On mobile, the story panel is hidden at `theme.css` lines 2523-2529, leaving a clean but generic sign-in form. That improves task focus, but it also removes most of the music-first identity. A compact, non-plasma class-shape cue or short creator-specific line near the form would preserve brand memory without making sign-in decorative.

`ritmofit_design_system/mockups/explore.html` correctly labels itself as future-facing and separates public class shapes from the instructor's saved Library. The cards use mini-shapes well and avoid consumer album browsing. `teams.html` is similarly restrained and properly secondary to the core workflow. Both need the same mobile overflow QA as Builder because screenshots show the same narrow-column/empty-right-space pattern.

## Design System Alignment

Overall alignment is strong. The mockups use the correct dark-first surface model, self-hosted type roles, small artwork, data numerals, energy ribbon, redundant intensity labels, and reserved color channels. Builder uses solid surfaces for dense editing, while Live uses high-contrast performance treatment. Marketing and share-like artifacts spend more swagger than working surfaces, which matches the design-system brief.

The most important alignment issues:

- Button geometry drifts from the component guidance. `05-components.md` says ordinary buttons use `input` radius and pills are reserved for chips/tags, but `.button` uses `var(--rf-radius-pill)` in `theme.css` line 628. This makes controls more Spotify-like than the system intends.
- Login uses a peak/plasma bar in the class-shape preview (`login.html` line 28, `.rf-bg-peak`). The design-system README says working surfaces, including sign-in, should stay cool and quiet; plasma should be peak affect or marketing/share artwork derived from class peaks. Sign-in should not casually spend the peak channel.
- The visible playing state in Builder is weaker than the selected state. The design docs require reduced-motion-safe playing state; the current visual treatment needs a visible static label.
- Responsive behavior does not meet the documented 320px floor in `04-layout-and-surfaces.md`. The mobile screenshots show clipping in the two surfaces where readability matters most.

Accessibility fundamentals are good: skip links, visible focus rings, labeled controls, icon-paired provider states, intensity bars plus labels, and `prefers-reduced-motion` handling are present. The remaining accessibility work is mostly about visible redundant state and mobile clipping.

## Specific Findings

| Area | Finding | Severity | Why it matters | Recommended action |
|---|---|---|---|---|
| Live mobile | `live.html` clips the `138 BPM` readout at 390px. | High | Live mode must be readable from a moving, low-light context; clipped BPM breaks the core performance promise. | Rework the small-screen Live HUD: pulse an inner element, reduce/stack BPM with measured max-width, and verify 320px/390px/480px screenshots. |
| Builder mobile | `builder.html` horizontally overflows at 390px, clipping class metrics, ribbon copy, and controls. | High | Builder cannot be a reliable mobile or narrow-tablet surface if the main content is partially off-screen. | Add a true narrow layout: single-column sections, wrap metrics into chips, simplify row columns, and enforce `min-width: 0` on grid children. |
| Builder active state | The playing row uses a small cyan dot and pulse but no visible text label. | High | Current-track state should be unmistakable and reduced-motion-safe. | Add a visible compact "Now" or "Playing" label in the row; keep pulse as affect only. |
| Component geometry | `.button` uses pill radius for all buttons, contrary to `05-components.md`. | Medium | Over-rounded buttons push the UI toward Spotify/SaaS defaults and weaken the product's own geometry system. | Use `--rf-radius-input` for ordinary buttons; reserve pill radius for chips, tags, and compact filters. |
| Builder scan density | Track rows are useful but crowded when title/provider, intensity, BPM, alternate metrics, and grip all appear together. | Medium | Instructors need fast scan speed; crowded rows reduce confidence under time pressure. | Create a row sub-grid: primary metadata left, intensity/data right; hide alternate modality metrics unless the current modality needs them. |
| Live hierarchy | Next cue is visible but very large relative to the current cue side context. | Medium | The instructor needs upcoming information without it competing with "now." | Keep next cue prominent but make countdown the anchor; reduce copy scale slightly on desktop and mobile. |
| Login identity | Mobile login hides the entire story panel, leaving little music-first identity. | Medium | Onboarding should feel like RitmoFit, not a generic auth form. | Add a compact class-shape motif or creator-specific line near the mobile form, without plasma or motion. |
| Plasma discipline | Login uses `.rf-bg-peak` in its decorative class-shape preview. | Medium | Plasma is a scarce peak channel; spending it on sign-in weakens the Live drop and All-Out meaning. | Replace sign-in plasma with copper/ember or a quiet non-peak class-shape treatment. |
| Explore / Teams | Future-facing labels are clear, but these surfaces share the same narrow viewport clipping risk. | Medium | Future surfaces should not establish responsive patterns that core product screens cannot keep. | Run the same 320/390/480px QA and tune card/action wrapping. |
| Persistent preview in Builder | Builder has add/edit affordances but no obvious persistent audition or preview control. | Low | Instructors building from music often need quick auditioning without losing place. | Consider a compact Builder preview tray or row-level preview state, distinct from Live transport. |
| Marketing conversion | `marketing.html` is strong, but pricing/subscription comparison is not represented. | Low | The prompt includes subscription conversion; the current kit lacks a pricing surface to evaluate. | When pricing exists, use plan clarity and CTA hierarchy without generic SaaS cards. |
| Reference kit mapping | Uploaded references are opaque filenames in `reference_images/`. | Polish | Future audits will be faster and less subjective if references are named by pattern. | Rename or add a manifest mapping images to persistent player, dense list, active state, queue, mobile now-playing, onboarding, pricing, and library patterns. |

## Concrete Recommendations

### 1. Immediate fixes

1. Fix mobile Live clipping in `live.html` / `theme.css`.
   - Verify `320px`, `390px`, and `480px` widths.
   - Keep `BPM`, current cue, next cue countdown, and Pause visible without horizontal scroll.
   - Apply tempo pulse to a contained inner element, not a layout container that can scale beyond the viewport.

2. Fix mobile Builder overflow.
   - Convert `class-metrics` into wrapping chips or a two-column metadata stack.
   - Collapse track rows into a clear mobile sequence: index/playing state, title, provider/duration, BPM, intensity.
   - Ensure all grid children use `min-width: 0` where text truncation is expected.

3. Add visible playing-state text to Builder rows.
   - Example: a compact "Now" label beside the playing dot.
   - Keep the dot/pulse as reinforcement only.

4. Change ordinary button radius from pill to input radius.
   - Preserve pill geometry for nav chips, filters, status pills, and tags.

5. Remove or cool down plasma usage in mobile/desktop login.
   - Keep the class-shape motif, but reserve peak magenta for Live All-Out and true marketing/share peak artifacts.

### 2. Next iteration improvements

1. Tighten Builder row hierarchy.
   - Give BPM a stable right-side lane.
   - Move provider/duration to secondary metadata.
   - Hide modality-specific alternate metrics unless active.

2. Tune Live next-cue hierarchy.
   - Make "Next cue in 0:18" the scannable anchor.
   - Keep upcoming instruction large enough for distance, but below current cue dominance.

3. Add a Builder audition pattern.
   - Borrow the persistence principle from Spotify's player bar, but translate it into class-building: current preview, quick pause, track position, and return-to-row.

4. Add explicit empty/error/permission screenshot states to the audit set.
   - `builder-states.html` exists and should be included in future report runs.

5. Add real pricing/onboarding reference surfaces when subscription flows are designed.
   - The current marketing page is strong, but plan comparison is not yet represented.

### 3. Larger design-system opportunities

1. Define a formal narrow-screen Builder pattern.
   - The docs describe the breakpoint ladder, but the current mockup needs a named mobile Builder grammar: class switcher, shape, selected track, and sequence as deliberate stacked modes.

2. Create a "current state" component spec shared by Builder, Library, and Live.
   - Include selected, playing, queued, completed, and next states.
   - Require visible labels for states that matter under reduced motion.

3. Formalize the class-shape artifact across Marketing, Builder, Explore, Share, and Login.
   - Decide where plasma is allowed, where only copper/ember is allowed, and where shape must stay neutral.

4. Add a reference-image manifest.
   - The uploaded images are useful, but opaque names slow down review. A small CSV could map each file to the prompt categories and "borrow / avoid" notes.

## Do Not Do List

- Do not make RitmoFit green, use Spotify's exact player controls, or copy Spotify's consumer nav hierarchy.
- Do not make album art the focal point of Builder or Live.
- Do not use plasma as a general brand glow, sign-in flourish, or button color.
- Do not represent intensity, provider state, selected state, or current state by color alone.
- Do not turn Builder into a DAW or spreadsheet. It should stay a choreography workstation with a clear complexity ceiling.
- Do not hide Live controls behind hover, small targets, or dense secondary menus.
- Do not make Explore the primary home mental model; creation remains the center of the product.
- Do not introduce generic SaaS pricing cards without the class-shape / instructor workflow story.

## Final Verdict

- Does RitmoFit feel premium? Yes on desktop. The energy ribbon, dark surface discipline, type choices, and Live HUD feel polished and ownable. Mobile clipping currently undercuts that premium feeling.
- Does it feel music-first? Yes, and more importantly it feels class-shape-first. BPM, cue, time, movement, and energy arc have more weight than artwork.
- Does it feel instructor-specific? Yes. The strongest copy and layouts speak to building and leading a room, not listening.
- Does it avoid becoming a Spotify clone? Mostly yes. It borrows mature interaction principles without copying green or consumer discovery. The main Spotify-adjacent drift is overuse of pill buttons and some nav/control geometry.
- What are the top 3 changes that would most improve the product?
  1. Fix mobile Live and Builder overflow, then verify at 320px, 390px, 480px, and 200% zoom.
  2. Strengthen current/playing state with visible labels and reduced-motion-safe encoding.
  3. Bring component geometry back into the RitmoFit system by reducing ordinary button roundness and reserving pill shapes for chips/tags.
