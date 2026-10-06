# Studio Aesthetic Critique

## The Verdict

Ritmo Studio is no longer a generic dark SaaS shell, but the shipped product still feels like a
careful dashboard trying to become a creator workstation. The design system knows what it wants:
warm espresso surfaces, copper identity, cyan interaction, scarce plasma, and the class energy arc as
the signature. The live app partially realizes that language in marketing and the builder, but loses
nerve in the highest-stakes surfaces: Builder still reads as stacked cards, and Live mode is too
small, centered, and polite to feel stage-ready. Grade: **B-**.

## Central Identity Problem

Ritmo Studio's shipped UI has the vocabulary of a rhythm-first creator workstation, but not always the
sentence structure. The palette, typefaces, and artifacts are specific; the composition too often falls
back to "surface, card, controls" instead of letting class shape and live state organize the screen.

## The Single Biggest Aesthetic Failure

The product under-amplifies its own signature: the class shape exists, but it is not yet the governing
composition. In shipped builder screenshots (`apps/web/smoke/shots/s4-start-from-move.png`,
`apps/web/smoke/shots/library-desktop.png`), the energy arc is present but visually secondary to
forms, card chrome, and action clusters. In the intended builder mockup
(`/tmp/ritmofit-critique-shots/mockup-builder.png`), the class shape anchors the center, track rows
inherit its rhythm, and the inspector feels like part of a workstation. This matters because the
energy ribbon is the one Ritmo Studio artifact no generic music or fitness app owns.

## North-Star Scorecard

| Surface             | Spotify                                                               | Logic Pro                                               | MainStage                                  | Overall |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ | ------- |
| Marketing           | 4 - polished, music-adjacent, with a credible product artifact        | 3 - confident but more campaign than workstation        | 2 - not a performance surface              | 4       |
| Auth/Login          | 3 - quiet and branded, but emotionally flat                           | 3 - clean, low-noise form                               | 2 - no live/stage relevance                | 3       |
| Dashboard / Builder | 3 - visually coherent but not pleasurable to browse                   | 3 - data-rich, but card stack weakens workstation poise | 2 - not tuned for glanceable command       | 3       |
| Library / Explore   | 2 - class rail and provider tabs do not yet feel like a music library | 3 - structured and scannable                            | 2 - little performance confidence          | 2       |
| Dialogs             | 2 - functional overlays, little product identity                      | 2 - loading/empty states feel modal-generic             | 2 - small, polite, not stress-optimized    | 2       |
| Live Mode           | 2 - static and sparse                                                 | 3 - clear information model                             | 2 - too small and centered for stage trust | 2       |
| Mobile / Narrow     | 2 - usable but oversized top actions crowd the hierarchy              | 2 - density becomes bulk, not precision                 | 2 - live readability not proven            | 2       |

Summary: Ritmo Studio currently lands most like a thoughtfully branded operations app; it fails most like
MainStage because the performance state is not visually dominant enough.

## Surface-by-Surface Critique

### Marketing

First five seconds: the desktop marketing page feels legitimately designed. The actual screenshot
(`/tmp/ritmofit-critique-shots/actual-marketing-desktop.png`) carries the mockup's promise while
adding a product tutorial artifact, which is better than a static illustration. The page uses the
brand-front heat register without breaking the plasma rules, and the copy correctly frames the product
as instructor authorship rather than passive listening. Protect this surface's restraint.

Weakness: mobile evidence (`apps/web/smoke/shots/failure.png`) compresses the hero into a much more
ordinary stack; the top action row consumes first-viewport attention, and the product artifact becomes
too low in the scroll. This is a responsive hierarchy issue, not a brand issue.

### Auth/Login

First five seconds: quiet, competent, forgettable. The login screenshot
(`/tmp/ritmofit-critique-shots/actual-login-desktop.png`) uses the right palette and avoids cliche,
but the big empty field around the form drains momentum after the stronger marketing page. It is
better than over-decorated auth, but it does not yet feel like the door into a creator studio.

The form should stay calm. The fix is not more spectacle; it is a small class-shape or studio-context
cue so sign-in belongs to Ritmo Studio rather than any dark app with a copper logo.

### Dashboard / Builder

First five seconds: useful, warm, and somewhat heavy. The builder screenshot
(`apps/web/smoke/shots/s4-start-from-move.png`) has the right ingredients: class rail, summary,
energy arc, timeline, track list, provider search, inspector. The problem is that every ingredient
competes with similar visual mass. The eye does not instantly understand that the class shape is the
main object and the rest are tools around it.

The intended mockup (`/tmp/ritmofit-critique-shots/mockup-builder.png`) solves this with stronger
workstation grammar: left library, center class shape and track sequence, right inspector. The shipped
app has the same ideas but more card-island behavior. In code, the signature ribbon is technically
correct and accessible (`apps/web/src/components/IntensityRibbon.tsx:1`), but its shipped size and
placement do not yet make it the hero of building.

### Library / Explore

First five seconds: the shipped Library is a class manager with music styling, not yet a music
library. The actual screenshot (`apps/web/smoke/shots/library-desktop.png`) prioritizes class
creation and selected-class editing, while the intended mockup
(`/tmp/ritmofit-critique-shots/mockup-library.png`) prioritizes saved tracks, provider filtering,
selection, and "build class" momentum. This is the largest Spotify gap.

Given current launch scope, do not invent new backend capability here. But the existing class rail can
borrow more music-library fluency: stronger album-art collage treatment, better list density, and a
clearer bridge from saved music to builder.

### Dialogs

First five seconds: dialogs are serviceable but generic. `apps/web/smoke/shots/dialog-explore.png`
shows a correct dimmed backdrop and a warm panel, but the loading state has no Ritmo Studio-specific
structure. It could be any product's modal. Dialogs should inherit more of the music/choreography
language: empty/loading states that reference tracks, providers, class shape, or team/studio context,
without adding decorative animation.

### Live Mode

First five seconds: it is readable on a laptop, but it does not yet command the room. The shipped
image (`apps/web/smoke/shots/fn-live.png`) centers a modest cue card inside a huge dark field; the
most important state is smaller than the surrounding promise of a performance surface. The intended
mockup (`/tmp/ritmofit-critique-shots/mockup-live.png`) is much more convincing: huge current cue,
giant BPM, visible next cue, big timers, and a luminous All-Out state.

The implementation already has the right data and safeguards: `LiveMode` drives current/next cue,
track timers, intensity, provider handoff, section announcements, and reduced-motion-compatible
pulse/drop behavior (`apps/web/src/components/LiveMode.tsx:307`,
`apps/web/src/components/LiveMode.tsx:456`). The failure is visual scale and composition, not product
logic.

### Mobile / Narrow

First five seconds: usable, but chunky. `apps/web/smoke/shots/library-mobile.png` shows no obvious
catastrophic overlap, yet the top navigation buttons dominate the first screen and the selected class
card becomes a large control cluster. It feels like the desktop was made to fit, not like a native
narrow builder rhythm. The critique is density and ordering, not missing functionality.

## Design-System Critique

Tokens and primitives are not the problem. The system's channel model is strong: copper identity, cyan
interaction, plasma peak, warm espresso surfaces, and Azeret Mono for numerals. The weak point is
application hierarchy. Components tend to apply the right tokens at similar intensity, so buttons,
cards, fields, and panels compete instead of forming an instrument.

Typography also has more potential than the shipped surfaces spend. The docs call Azeret Mono the hero
face for data; Live mode should use that more dramatically for BPM, timers, and counts. The surface
model is likewise correct in principle, but Builder needs fewer independent cards and a clearer
"workbench" region. Motion is well-rationed and should stay that way.

## Shipped-vs-Intended Gap Report

| Rank | Gap                                                                      | Damage                                                                                    |
| ---- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1    | Live mode undershoots the intended MainStage composition                 | Highest; the product's performance promise feels least confident where stakes are highest |
| 2    | Builder treats class shape as a card section, not the central instrument | High; weakens the unique Ritmo Studio signature                                           |
| 3    | Library currently reads as class management more than music browsing     | High; Spotify lens is least satisfied                                                     |
| 4    | Dialog loading/empty states are generic                                  | Medium; polish gap across supporting surfaces                                             |
| 5    | Narrow navigation/action density crowds the first viewport               | Medium; mobile feels functional before it feels crafted                                   |

## Five Most Damaging Weaknesses

1. Live mode's visual scale does not match a performance surface.
2. The energy ribbon is present but not compositional enough.
3. The shipped Library does not yet deliver music-browsing pleasure.
4. Repeated dialog states feel generic and underspecified.
5. Narrow viewports preserve functionality but lose product hierarchy.

## What It Gets Right

- The color discipline is strong: copper, cyan, and plasma roles are mostly respected.
- The marketing page has a real point of view and avoids party-fitness cliche.
- The energy ribbon exists and is implemented as redundant, accessible structure.
- Live mode has the correct data architecture; it needs staging, not a conceptual rewrite.
- The app honors the music-provider rules: it prompts and hands off rather than pretending to play.

## Emotional Arc

Landing: confident and specific; "find the class inside the music" lands. Signing in: calm but drops
energy. Building: capable and warm, but the eye has to work to find the main musical object. Browsing:
functional, not yet pleasurable. Going live: trustworthy enough for testing, not yet visually brave
enough for a dark room with a class moving.

## Handoff To Stage 2

Do not prescribe a broad redesign. The foundation is good. The campaign should be a small set of
high-leverage moves that make existing surfaces honor their own design system: make Live mode a true
performance instrument, make the energy arc the builder's compositional anchor, make the class/library
rail feel more musical and less administrative, and give dialogs/loading states product-specific
language. Protect the marketing direction, color-role discipline, reduced-motion contract, provider
handoff model, and accessible redundant encoding. Avoid adding DAW complexity, new backend scope, or
plasma as decoration.

## Run Record

- Date/time: 2026-06-29 21:43 MDT.
- Git SHA inspected: `f78ef66196325913edaae583e93776bbf8b5984f`.
- Commands run: `pnpm format:check`; `pnpm --filter @ritmofit/api db:migrate:local`;
  `pnpm --filter @ritmofit/api db:seed:local`; `MOCK_PROVIDERS=true pnpm dev:api`;
  `pnpm dev:web`; `PLAYWRIGHT_BASE=/tmp/rf-smoke/package.json node apps/web/smoke/functional.smoke.mjs`
  (interrupted after hang); `PLAYWRIGHT_BASE=/tmp/rf-smoke/package.json node apps/web/smoke/narrow-width.smoke.mjs`
  (failed on stale sign-up selector); direct Playwright screenshot capture for marketing/login and
  mockups.
- Real screenshots reached: marketing desktop, login desktop, dashboard/builder, library desktop,
  library mobile, dialogs, live mode. Some builder/library/live/dialog evidence uses existing
  `apps/web/smoke/shots/` captures because the current smoke harness is stale.
- Mockups captured: `/tmp/ritmofit-critique-shots/mockup-builder.png`,
  `/tmp/ritmofit-critique-shots/mockup-live.png`,
  `/tmp/ritmofit-critique-shots/mockup-library.png`,
  `/tmp/ritmofit-critique-shots/mockup-marketing.png`,
  `/tmp/ritmofit-critique-shots/mockup-login.png`.
- Blockers: `narrow-width.smoke.mjs` waits for outdated text `Need an account? Sign up`; the
  functional smoke hung after producing fresh failure-stage screenshots.

No app source changes were made during this evaluation.
