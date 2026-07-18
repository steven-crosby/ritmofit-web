# Ritmo Studio UI/UX polish audit — brutal critique

Run: `2026-07-18-polish`

Audit pack: v3

Code baseline: `728b148` (`main`)

Visual evidence: signed-in production at `https://ritmofit.studio` plus current-main local Login at
`http://localhost:5173`

Primary realism lens: Cycle; Pilates and HIIT dead ends are flagged where visible

## 1. Executive brutal critique

- **Strongest asset:** active Live is the first surface that feels like an instrument. The restrained
  black field, oversized cue area, persistent transport, and track/class clocks have credible studio
  presence. `screenshots/live-active-desktop-1280x800.png`
- **Signature asset:** the class-shape ribbon is product-specific and understandable without a manual.
  It makes intensity and track order visible in one object. It is currently carrying more of the brand
  promise than the surrounding workflow. `screenshots/timeline-choreography-desktop-1280x800.png`
- **Weakest surface:** Music is not yet a music library; it is a provider-status dashboard that opens
  unfiltered modal dumps. It is visually sparse at rest and operationally overwhelming after a click.
- **Most embarrassing risk:** Apple Music presents 68 playlists as **0 tracks** each, while Likes offers
  one primary action to create a class from **all 200 liked tracks**. A serious instructor will read the
  first as broken and the second as reckless. `screenshots/music-saved-playlists-desktop-1280x800.png`,
  `screenshots/music-liked-tracks-mobile-390x844.png`
- **Biggest class-build miss:** sourcing and authoring are still separate mental modes. Search lives
  below the existing stack, candidate rows cannot be auditioned in place, and mobile requires a long
  scroll past readiness, shape, segments, and the track list before the add loop becomes available.
- **Biggest clarity failure:** “Runnable · 2 to finish” and “2 of 2 classes ready for Live” describe
  classes with every BPM missing and no cues or moves. The implementation is correctly honoring the
  duration-only hard gate, but the words overstate readiness and contradict the visible warnings.
- **Mobile is responsive but not recomposed.** Nothing catastrophically overflows at 390px, yet the
  Builder becomes a tall report: destructive actions, readiness chips, charts, rows, search, and the
  inspector are serially stacked. The most frequent loop—find, audition, add, score—has no persistent
  access point.
- **The visual system is coherent but over-contained.** Warm espresso, copper, cyan, and the three-font
  hierarchy are distinctive. Repeated rounded cards, outlined subcards, pills, and resting shadows make
  the app feel assembled from components rather than shaped around each task.
- **Classes at rest wastes the desktop.** A 266px archive and a single generic card leave most of a
  1280px screen empty. The design-system promise of an “alive at rest” creator workstation is not met.
  `screenshots/classes-desktop-1280x800.png`
- **The code is more accessible than the pixels suggest:** semantics, focus restoration, status regions,
  and non-color state labels are thoughtful. But many real controls render below the system’s 44px mobile
  target, including 32px readiness fix chips, a 22px Rename button, and a 26px tag field.
- **Brand voice is restrained, not costume-Latin.** The natural class/music content carries cultural
  energy without the interface performing a stereotype. The leak is elsewhere: internal implementation
  copy such as “Pilates stores as the current Sculpt contract” breaks the premium illusion.
- **Verdict:** Ritmo Studio looks like a disciplined, well-themed private-beta workstation with one
  excellent Live surface. It does **not yet** feel like a premium creative instrument end to end because
  music selection, mobile authoring, and readiness truth still make the instructor translate the system.

## 2. Mission alignment scorecard

| Dimension                               | Score | Evidence and why it matters                                                                                       | What holds it back                                                                                                                     |
| --------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Movement-first creative tool            |  7/10 | Class shape, zones, segments, cues, and moves form real authoring language.                                       | The default class can reach Live with no authored movement, and the UI makes that absence feel like a secondary warning.               |
| Premium studio instrument               |  6/10 | Warm surfaces, disciplined type, and Live composition feel intentional.                                           | Overuse of cards/pills, generic resting panels, and long form-like Builder flows keep it in polished-beta territory.                   |
| Music-native interaction maturity       |  4/10 | Providers, artwork, duration, live preview, likes, playlists, and search all exist.                               | No in-row audition for candidates, no selection model, all-likes import, unsearchable 68-playlist dump, and false `0 tracks` metadata. |
| Class-build speed                       |  4/10 | Adding a single search result is direct once the instructor reaches it.                                           | Discovery is buried, repeated adds are scroll-heavy, preview is detached, and batch selection is absent.                               |
| Builder calm + airy scanability         |  5/10 | Rows are legible and artwork is appropriately bounded.                                                            | The header/readiness preamble is large, outlined groups accumulate, and mobile serializes every tool into one very long page.          |
| Live glanceability + pressure-readiness |  7/10 | Active Live has strong contrast, large cue/clock values, persistent transport, wake state, and official playback. | “No cue set” becomes the hero, tempo can be absent, and preflight language calls incomplete classes ready.                             |
| Nike-level clarity                      |  6/10 | “Find the class inside the music” and “Pick a class to run” are direct.                                           | “Runnable · 2 to finish,” duplicated Manage actions, and technical implementation copy muddy the action hierarchy.                     |
| Warm brand distinctiveness              |  7/10 | Espresso/bone/copper/cyan and characterful mono data create a recognizable world.                                 | Warmth is applied consistently, but task composition too often falls back to generic cards and bordered pills.                         |
| Latin 90/10 restraint                   |  8/10 | Cultural energy arrives through authentic music/class content, not decorative motifs.                             | The system has few earned product-level moments beyond user content; do not compensate by adding decorative Spanish.                   |
| Accessibility + sustained-use comfort   |  6/10 | Design-system contrast checks pass; state uses glyph + word; dialogs and focus paths are generally semantic.      | Many compact controls miss 44px on mobile, independent scrolling increases effort, and repeated low-contrast tertiary copy is tiring.  |
| Mobile-first usefulness (390×844)       |  5/10 | Navigation fits, cards reflow, Live remains usable, and no primary surface showed horizontal page overflow.       | Builder and Music become long documents; source rail clips; frequent actions are not sticky or locally available.                      |
| Overall aesthetic desirability          |  6/10 | Cohesive, restrained, and credible in screenshots—especially Live.                                                | Classes/Music resting screens are visually under-authored; the Builder is component-dense rather than compositionally confident.       |
| Overall UX credibility                  |  5/10 | The end-to-end loop runs, provider playback works, and error/expired states are explicit.                         | Misleading readiness, bulk-import extremes, false playlist counts, and discovery friction undermine trust.                             |

## 3. Surface-by-surface critique

### Login

**Intent:** establish trust and return an invited instructor to their workspace quickly.

**What works**

- Calm, compact, and consistent at both widths.
- The eyebrow is specific to the creator—not generic “Welcome back” copy.
- Fields are inset, labels exist for assistive technology, and error/notice states are implemented.

**What is weak**

- The large empty desktop field makes the form feel isolated rather than premium; there is no compact
  trust cue about provider playback, private beta access, or what waits after sign-in.
- “Need an account? Sign up” competes with “New accounts require an invitation.” It is logically true
  but feels like a trap until the user enters the flow.
- The surface is visually competent but could belong to many dark SaaS products after removing the
  eyebrow and logo.

**Evidence:** `screenshots/login-desktop-1280x800.png`,
`screenshots/login-mobile-390x844.png`; `apps/web/src/components/Login.tsx`.

### Classes

**Intent:** create, find, preview, and reopen a class with minimum scan cost.

**What works**

- Template-first creation is visible and the class cards expose duration and track count.
- Search and sort are present; cards are compact; artwork is bounded.
- Mobile keeps the shell navigation stable and the list readable.

**What is slow, generic, or confusing**

- Desktop uses most of the screen for a single generic message. The resting workspace is not alive,
  does not surface recent work, music readiness, or a fast continuation action, and fails its own design
  guideline.
- “Open a class to keep building” repeats what the archive already communicates and provides no direct
  action.
- Card primary behavior is implicit. The class body opens Builder while tiny “View · Copy” actions sit
  below; the click hierarchy is not visually obvious.
- “Pilates stores as the current Sculpt contract” exposes a database compatibility detail to an
  instructor.
- Recency is a sort option, not an information cue. Nothing explains what changed or what remains.

**A11y / mobile:** card footer actions appear 32px on desktop rules; compact tag/search controls elsewhere
use similar undersized patterns. At 390px the resting card moves below the archive, but it remains dead
weight.

**Evidence:** `screenshots/classes-desktop-1280x800.png`,
`screenshots/classes-mobile-390x844.png`; `Dashboard.tsx` (`LibraryRail`, `ClassCard`,
`WorkstationRestingState`).

### Music home

**Intent:** reveal available music and turn curiosity into a class or additions to an open class.

**What works**

- Provider truth is explicit: connected, expired, and reconnect paths are not hidden.
- The page uses familiar provider shelves and avoids community/recommendation creep.

**What is weak**

- It behaves as a connection-status dashboard, not a music workspace. Provider cards devote more weight
  to auth state than to playable source material.
- The Sources rail duplicates the three main provider cards and a second “Manage connections” action.
  On mobile the horizontal rail clips Apple Music, then the same information repeats vertically.
- Desktop has a large dead lower field. Connected Apple Music initially shows loading bars rather than
  recent/usable material; expired sources dominate with large connect buttons.
- There is no recent audition, recently used track, selection state, or clear “continue building” bridge.

**Evidence:** `screenshots/music-home-desktop-1280x800.png`,
`screenshots/music-home-mobile-390x844.png`; `Dashboard.tsx` (`MusicWorkspace`,
`ProviderShelfCard`).

### Connections

**Intent:** make provider capability and recovery trustworthy.

**What works**

- Status uses icon + text, not color alone.
- Reconnect and disconnect are provider-specific; destructive token-removal consequences are stated.
- The compact dialog is clearer than the page behind it.

**What is weak**

- The page and dialog repeat connection state and actions, producing two competing management models.
- Reconnect controls and the close control are visually below the 44px touch target standard.
- The dialog explains token deletion in legal/technical language at the moment an instructor is trying
  to get back to music.

**Evidence:** `screenshots/connections-dialog-desktop-1280x800.png`,
`screenshots/connections-dialog-mobile-390x844.png`; `ConnectionsDialog.tsx`.

### Builder / track list

**Intent:** arrange music, understand class shape, and move directly into scoring.

**What works**

- Track rows are genuinely scannable: small art, title, artist, effort bars, BPM state, reorder grip.
- The class-shape ribbon and segments are specific to the product.
- The three-pane desktop model keeps the selected-track inspector visible.
- Readiness chips jump to specific unfinished tracks.

**What is slow or confused**

- The header makes incomplete data the dominant first impression, then gives Run live the strongest
  action styling anyway.
- Cover upload, Rename, Add tag, Delete, Run live, metrics, and readiness all precede the creative
  instrument. On mobile, Delete becomes a full-width peer immediately above readiness.
- “Runnable · 2 to finish” is internally accurate but user-hostile: runnable sounds ready while two
  critical creative dimensions are empty.
- Every missing BPM becomes its own outlined chip, making six warnings louder than the class shape.
- The selected track inspector is useful on desktop but sits after the entire shape/list/search stack on
  mobile. Selecting a row does not bring the editor into local reach.

**A11y / mobile:** measured on the live 390px surface: Rename 22px high, tag input 26px, and readiness
fix chips 32px—below the documented 44px target. Title truncation, long warning chips, and large cover
chrome consume the first viewport.

**Evidence:** `screenshots/builder-track-list-desktop-1280x800.png`,
`screenshots/builder-track-list-mobile-390x844.png`; `Dashboard.tsx` (`ClassWorkspace`,
`ClassHeaderCard`, `ReorderableTrackList`).

### Timeline / choreography

**Intent:** turn tracks into a movement score by placing shape, segments, cues, and moves.

**What works**

- The ribbon is the clearest expression of the product’s purpose.
- Selected state is linked across ribbon, timeline, and track row.
- Cues and moves remain distinct concepts; intensity is redundantly encoded.
- Inspector exposes useful authoring fields and official-provider preview.

**What is weak**

- The central signature is visually surrounded by equally rounded/elevated cards; it does not own the
  composition as strongly as its importance warrants.
- Auto-segment labels truncate to fragments on mobile (`War…`, `R…`, `C…`), turning a semantic band into
  decorative colored ticks.
- The inspector reads like a long form—Intensity, BPM, Duration, Notes, Advanced, Save, Remove, Cues,
  Moves—rather than a scoring flow. Save is separated from the relevant edits and destructive Remove is
  persistently adjacent.
- Mobile selection does not reveal or summon the inspector; the user must keep scrolling and remember
  the selected track.
- There are keyboard mechanics for timeline/reorder controls, but no high-frequency authoring shortcut
  layer for add track, cue, preview, or track navigation despite the design-system claim.

**Evidence:** `screenshots/timeline-choreography-desktop-1280x800.png`,
`screenshots/timeline-choreography-mobile-390x844.png`; `TimelineStrip.tsx`, `SegmentBand.tsx`,
`ChoreographyEditor.tsx`, `Dashboard.tsx` (`TrackInspector`).

### Track search / likes / playlists

**Intent:** find, audition, select, and place music without leaving class-building context.

**What works**

- Search results are fast, compact, provider-attributed, and announce result count.
- Candidate rows show title, artist, duration, and one-step Add.
- Search loading and settled states are explicit; stale-result handling is tested.

**What is slow or broken-feeling**

- Search sits below all existing tracks. The more complete the class becomes, the farther away its next
  track is.
- Candidate rows link out to Apple Music but do not provide a quiet in-place audition. The only active
  preview belongs to the already-added track in the inspector, not the candidate being evaluated.
- Search is single-add only. Likes jumps to the opposite extreme: all 200 tracks, no selection,
  filtering, preview, ordering, or duration estimate.
- Playlist browse renders 68 rows with “0 tracks,” no search/filter, and an Open action. Unknown metadata
  is presented as confidently empty.
- Both dialogs are modal list dumps. The workflow promised by `11-library-guidelines.md`—select rows,
  preview, selection tray, Start class/Add selected—is not implemented.

**Evidence:** `screenshots/builder-track-search-ready-desktop-1280x800.png`,
`screenshots/builder-track-search-ready-mobile-390x844.png`,
`screenshots/music-liked-tracks-desktop-1280x800.png`,
`screenshots/music-liked-tracks-mobile-390x844.png`,
`screenshots/music-saved-playlists-desktop-1280x800.png`,
`screenshots/music-saved-playlists-mobile-390x844.png`; `TrackSearch.tsx`; `Dashboard.tsx`
(`LikesBrowserDialog`, `PlaylistBrowserDialog`).

### Track preview

**Intent:** audition the exact provider-authorized clip used by the class.

**What works**

- Real SoundCloud playback worked in Chrome and correctly transitioned Preview → Pause/Stop.
- Clip range is stated, provider ownership is explicit, and playback is not proxied.
- Failure/reconnect/authorization states exist in code.

**What is weak**

- Preview is visually detached from the search candidate decision; it appears only after a track is
  already in the class and selected.
- Preview controls use 36px minimum heights, below the mobile system floor.
- The provider label can mismatch the currently browsed provider because it correctly reflects the
  selected class track; the layout does little to distinguish “candidate source” from “class playback.”

**Evidence:** `screenshots/track-preview-active-desktop-1280x800.png`,
`screenshots/track-preview-active-mobile-390x844.png`; `TrackPreview.tsx`.

### Live preflight

**Intent:** prove provider playback and tell the instructor whether starting is safe.

**What works**

- The provider check is concrete per track and tests actual playable references.
- The dedicated preflight screen is calm, clear, and avoids setup complexity.
- “Run without music” is a strong recovery path.

**What is weak**

- The preceding Live workspace says “2 of 2 classes ready for Live” even while both visibly lack all
  tempo and choreography. This is the wrong umbrella word for duration-only eligibility.
- The dedicated screen says “Live ready” and “All 6 tracks can play hands-free,” but it does not carry
  forward the missing-tempo/no-cues warning. Provider readiness silently becomes total readiness.
- Six nearly identical rows consume most of the screen; a compact summary plus exceptions would reduce
  scan cost.

**Evidence:** `screenshots/live-preflight-desktop-1280x800.png`,
`screenshots/live-preflight-mobile-390x844.png`, `screenshots/live-run-desktop-1280x800.png`,
`screenshots/live-run-mobile-390x844.png`; `LivePreflight.tsx`, `Dashboard.tsx`
(`LiveWorkspace`, `LiveQueueCard`).

### Live run

**Intent:** keep the instructor oriented under movement, time pressure, and low light.

**What works**

- Best composition in the product: one dominant field, restrained support rail, large clocks, persistent
  transport, timeline, playback provider, and screen-awake state.
- Desktop and mobile both preserve the current/next/time hierarchy.
- Actual official SoundCloud playback started, paused, and stopped cleanly.

**What is weak or risky**

- “No cue set” becomes the largest object on the stage. It makes absence the hero, directly opposing the
  design-system rule to lead with affirmative useful state.
- “Tempo missing” is loud but arrives after the instructor has been told the class is ready.
- The mobile top bar crowds title, two-line Cue-by-Cue, Full List, and Exit into a shallow band.
- Track identity repeats in the cue field and lower track card while the missing creator instruction
  dominates both.

**Evidence:** `screenshots/live-active-desktop-1280x800.png`,
`screenshots/live-active-mobile-390x844.png`; `LiveMode.tsx`.

### Account

**Intent:** manage identity and understand provider/security ownership.

**What works**

- Provider status and account/security boundaries are clear.
- The lower settings surface is calm and readable at both widths.
- Account screenshots were framed to omit private email data.

**What is weak**

- “Default templates,” “Manual preview,” and “Solo-first” are read-only product facts styled like
  settings; they create an illusion of control.
- Music connection state duplicates Music home and Connections again.
- The 40px Manage and Privacy targets are below the documented mobile target.

**Evidence:** `screenshots/account-connections-desktop-1280x800.png`,
`screenshots/account-connections-mobile-390x844.png`; `Dashboard.tsx` (`AccountWorkspace`).

## 4. Design-system critique

### What is genuinely strong

- `tokens.json` expresses a coherent physical world: espresso ink, bone, copper identity, cyan
  interaction, amber caution, and rationed plasma.
- Typography has real roles: Bricolage for identity, Sora for work, Azeret Mono for time/BPM.
- State language is redundantly encoded and the semantic contrast matrix passes in dark and light.
- The class-shape ribbon is a legitimate product signature—not decorative theming.
- Token generation and iOS output are in sync; `npm run verify` passed.

### Drift and contradictions

- **Documented Library vs implemented Library:** `11-library-guidelines.md` specifies selectable rows,
  preview, a selection tray, Start class, and Add selected. Production implements single Add in Builder,
  all-200 Likes import, and whole-playlist creation.
- **Alive at rest vs empty panels:** Classes and Music leave large desktop voids and generic next-step
  copy rather than derived useful content.
- **Resting surfaces vs shadows:** `04-layout-and-surfaces.md` says resting surfaces do not cast shadows;
  planning components use `shadow-card` repeatedly.
- **One depth strategy per job is blurred:** raised fills, full outline borders, and shadows appear
  together on many planning cards. The result is visible component boundaries instead of quiet layering.
- **Touch target contract is not systemic:** numerous controls use `min-h-8`, `min-h-9`, `py-1`, or
  `py-1.5`, and live measurement confirmed sub-44px controls in Builder and Account.
- **Responsive guideline drift:** mobile technically reflows, but the high-frequency build loop is not
  recomposed. The selected inspector and Add track remain far from the active decision.
- **Keyboard guideline drift:** reorder, timeline, dialog, and live-seek mechanics exist, but the promised
  fast authoring shortcuts are absent.

### Token and iOS implications

The primary problems do **not** require a palette replacement. Likely shared-system changes are limited
to control-size primitives, surface/depth recipes, and reusable selection/preview tray patterns. If web
token values change, regenerate iOS tokens; workflow/layout components remain web-first and should not
force premature iOS parity.

## 5. Brand and voice critique

### Keep

- “Find the class inside the music.”
- “For instructors who build the class.”
- “Start with the music; shape the room.”
- “Pick a class to run.”
- The use of authentic instructor music/class names rather than decorative cultural styling.

### Tighten or remove

- **Internal:** “Pilates stores as the current Sculpt contract.” Remove from product UI.
- **Overclaims:** “Runnable,” “ready for Live,” and “Live ready” need separate meanings for playable,
  provider-ready, and creatively complete.
- **Generic dashboard:** “Personal workspace,” “Music home,” “Provider accounts,” and “Preflight checks”
  are serviceable but do not add creator energy.
- **Negative hero:** “No cue set” should not be the largest phrase in active Live. Lead with the track or
  a truthful provisional prompt, then show missing choreography as a warning.
- **Duplicated utility:** “Manage connections” appears in the rail, hero, Account, and dialog triggers.

The Latin 90/10 rule is being respected. Do not fix weak copy with decorative Spanish or club clichés.

## 6. UX and workflow critique — build path first

1. **Open/create class:** template selection is visible, but the creation rail feels like a form and the
   empty desktop workspace offers no meaningful continuation cue.
2. **Enter Music:** provider health dominates. Connected source material is behind secondary cards;
   expired providers receive equal or greater visual weight.
3. **Search/likes/playlists:** search is effective once reached. Likes and playlists abandon selection,
   preview, filtering, and honest metadata.
4. **Place tracks:** single-result Add is fast; every additional track repeats a long scroll on mobile.
5. **Shape class:** the ribbon gives immediate provisional value and is the strongest part of Builder.
6. **Choreograph:** selected-track editing is local on desktop and remote on mobile. The inspector feels
   like record maintenance rather than scoring.
7. **Preview:** class-track preview works with real provider playback but arrives after selection, not
   during discovery.
8. **Ready:** duration, tempo, choreography, and music are all shown, but the vocabulary collapses
   “can technically start” into “ready.”
9. **Live preflight:** provider playback is genuinely checked; creative incompleteness disappears from
   the decision surface.
10. **Live run:** pressure layout is strong, but absent cues and tempo become dominant failure messages
    only after the class starts.

The product is closest to an instrument from shape → preview → Live. It feels most like a form or admin
dashboard at Classes rest, provider management, bulk music browse, and selected-track editing.

## 7. Embarrassment audit

| Severity | Finding                                                                                             | Why it hurts                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Critical | Likes offers “Create class from 200 liked tracks” with no selection, preview, or duration estimate. | One click proposes an absurd class and signals the product does not understand instructor intent. |
| High     | 68 Apple Music playlists all display “0 tracks.”                                                    | Looks like broken provider integration even when tracks may simply be uncounted.                  |
| High     | “2 of 2 classes ready for Live” while every BPM and all choreography are missing.                   | Creates false confidence and teaches the instructor not to trust readiness language.              |
| High     | Mobile Builder buries Add track and the selected inspector below the full document.                 | Directly increases time-to-build on the required mobile viewport.                                 |
| High     | Active Live makes “No cue set” its hero after declaring Live ready.                                 | The contradiction becomes visible at the worst possible moment.                                   |
| Medium   | Mobile Builder exposes 22–32px controls despite a 44px system contract.                             | Harder to use while moving and a visible quality miss in front of a product designer.             |
| Medium   | Desktop Classes and Music leave most of the canvas empty.                                           | Pitch-deck screenshots look unfinished rather than restrained.                                    |
| Medium   | “Pilates stores as the current Sculpt contract.”                                                    | Exposes implementation debt in customer-facing copy.                                              |
| Medium   | Delete is a full-width top-level mobile Builder action.                                             | Destructive hierarchy competes with building and Live.                                            |
| Low      | Account presents product facts as settings.                                                         | Suggests unfinished controls and weakens information architecture credibility.                    |

## 8. What this wants to become — polish thesis

Ritmo Studio is accidentally becoming a **warm, card-based admin shell wrapped around an excellent Live
HUD**. It should amplify the continuous creator loop: available music → selected material → visible class
shape → local scoring → truthful readiness → pressure-proof Live.

Within the existing shell:

- **Amplify:** class shape, local preview, selected-track context, truthful readiness, provider capability,
  high-contrast Live.
- **Kill:** bulk list dumps, false-zero metadata, duplicated management surfaces, implementation copy,
  negative hero states, destructive-action prominence.
- **Restrain:** outline borders, pill proliferation, resting shadows, full-page warning preambles, and
  provider auth chrome when music is available.

**Ritmo Studio currently feels like a polished private-beta dashboard with a great Live mode, but it
should feel like a movement score that stays in your hands from first track to final cue.**

## 9. Future: room / audience display

**Out of this polish program.** A later audience view should not mirror the instructor HUD. It could
derive a minimal room-facing composition from class shape, section, effort arc, and intentional
instructor-authored moments—no provider controls, operational warnings, account state, or private notes.
The audience should feel the energy architecture, while the instructor retains time, recovery, provider,
and next-cue control. Treat it as a separate display contract and safety/privacy surface, not a responsive
variant of current Live.

## 10. Evidence log

### Visual and interaction evidence

- Signed-in production in Chrome: Classes, Music, Connections, Apple Music Likes, Apple Music playlists,
  Builder, class shape/timeline, track search, active SoundCloud preview, Live queue, provider preflight,
  active Live, and Account.
- Current-main local Chrome: Login at 1280×800 and 390×844.
- Required screenshots: `screenshots/` (30 privacy-reviewed PNGs, desktop and mobile pairs).
- Real playback checks: SoundCloud track preview started and stopped; Live SoundCloud playback started,
  paused, and exited cleanly.
- Browser console: no warning/error entries observed during the pass.

### Code and system evidence

- `apps/web/src/components/Dashboard.tsx`
- `apps/web/src/components/TrackSearch.tsx`
- `apps/web/src/components/TrackPreview.tsx`
- `apps/web/src/components/LiveMode.tsx`
- `apps/web/src/components/LivePreflight.tsx`
- `apps/web/src/components/Login.tsx`
- `apps/web/src/components/ConnectionsDialog.tsx`
- `apps/web/src/components/TimelineStrip.tsx`
- `apps/web/src/components/SegmentBand.tsx`
- `apps/web/src/components/ChoreographyEditor.tsx`
- `ritmofit_design_system/tokens.json`
- `ritmofit_design_system/01-design-principles.md`
- `ritmofit_design_system/04-layout-and-surfaces.md`
- `ritmofit_design_system/07-accessibility.md`
- `ritmofit_design_system/09-class-builder-guidelines.md`
- `ritmofit_design_system/11-library-guidelines.md`

### Verification

- `npm run verify` in `ritmofit_design_system`: passed token sync, token lint, and semantic contrast.
- Focused web component suite: 126 tests passed across Login, Dashboard, TrackSearch, TrackPreview, and
  LiveMode.
- Live 390px target measurement confirmed sub-44px controls in Builder and Account.

### Gaps and seams

- Signed-in screenshots are production; code mapping is current local `main` at `728b148`. No material
  structure mismatch was observed, but deployment ancestry was not asserted by this design pass.
- Local authenticated data was not created because the owner supplied signed-in production access.
- Empty/error states not naturally triggered were assessed from code and existing tests, not destructive
  production manipulation.
- Account screenshots intentionally omit the profile/email area to avoid tracking private identity data.
- Pilates and HIIT were assessed for visible entry points and vocabulary only; no new production classes
  were created.
- No production code was modified.
