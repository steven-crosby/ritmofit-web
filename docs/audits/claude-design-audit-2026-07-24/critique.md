# Brutal critique — Ritmo Studio, claude design audit, 2026-07-24

**Baseline:** `main` @ `9b188df7b38a607a208343cd7f73f7c7f4ee4bbe`
**Prior run:** `2026-07-19-full-product-preview` (baseline `addaff3f`, 31 commits behind this one)
**Method:** 121 browser captures across four viewports, computed-style contrast measurement, keyboard
traversal, reduced-motion emulation, induced failure states, and source tracing. Every claim below
carries an evidence label.

> **Important context for reading this critique.** All six implementation prompts from the 2026-07-19
> run shipped to `main` (`c6eca5f`, `c2ff378`, `a83c32c`, `5d4fe18`, `07777e4`, `de3b4f3`, plus the
> narrow-responsive repair `1be7d7e`). `docs/audits/README.md` describes that run as "prompts 01–02 and
> the reconciliation pass implemented", which understates it. This audit therefore judges a
> substantially rebuilt product, and most of the prior run's findings return as `resolved-since`
> rather than `known-open`.

---

## A. Verdict

**Strongest product asset — the readiness spine.** `observed`. Readiness is now the connective tissue
of the whole product, and it is genuinely good. The Builder header states "Runnable · 1 to finish",
names the failing dimension ("Tempo incomplete — No beat pulse where BPM is missing (1 track)"), and
offers a click-to-fix chip that jumps to the offending track (`BLD-02-inspector-desktop.jpg`). The Live
queue restates the same truth as a scannable panel ("RUNNABLE 4 of 4 · NEEDS A DURATION 0 · MUSIC All
linked", `LIVE-01-queue-desktop.jpg`), and preflight escalates it to per-track playback verdicts. One
derivation, three altitudes, no contradictions. This is the part of the product that feels like an
instrument rather than a CRUD app.

**Most damaging workflow friction — the Music workspace does not let you browse music.** `observed`.
Music is one of four primary destinations. Its headline says "Browse music, then shape it into class"
and its own capability ledger asserts "✓ Browse catalog" for all three providers. Yet the surface
offers no search field, no catalog results, and no track list — only three provider status cards and a
connect affordance (`MUS-01-music-disconnected-desktop.jpg`, `MUS-02-music-mixed-desktop.jpg`; the full
button inventory of the workspace is `Manage connections`, `Connect music`, `Connect SoundCloud`,
`Connect Spotify`, `Connect Apple Music`). Catalog search exists — but only inside Builder → Add music
(`BLD-07-search-results-desktop.jpg`). An instructor who follows the product's own navigation to
"browse music" arrives at a surface that can only browse *connections*. Below the provider cards, roughly
40% of the desktop viewport is empty.

**Most generic/defaulted design behavior — three-up status cards with repeated boilerplate.**
`observed`. The disconnected Music home renders "Catalog browsing stays available without a linked
account." three times, "Connect this provider to browse liked tracks." three times, and "Connect this
provider to browse saved playlists." three times — nine near-identical strings on one screen, in three
equal-weight cards. That is the default SaaS integrations page, and it is the least Ritmo-specific
composition in the product.

**Most important Live pressure risk — Live misses its own AAA contrast target.** `observed`, measured.
`07-accessibility.md` sets Live at AAA (text ≥ 7:1). Measuring computed colors against composited
backgrounds on the Live runtime, **13 of 29 text nodes fall between 5.84:1 and 6.70:1** — every one of
them `text/tertiary` `#9E927E`. The affected labels are exactly the glanceable ones: `EFFORT`, `BPM`,
`NEXT CUE`, `TRACK LEFT`, `CLASS LEFT`, the `0:00 / 11:05` timecode, and the `Music off` playback state.
These are read at distance, in a dim room, mid-class. Compounding it: the design system's own
`scripts/check-contrast.mjs` declares only AA pairs (4.5 / 3.0) and has no Live-specific entry, so the
documented AAA target is **structurally unenforceable** — the gate passes while the target is missed.

**Does it feel like a coherent premium creative instrument?** Largely yes, and much more so than the
prior baseline. The class-level model (Class Pulse + readiness + run-of-show) is consistent from
marketing page to Live runtime, the recovery grammar is genuinely well written, and the responsive floor
holds at 320px and 200%. What holds it back is not craft on any single screen but **distribution**: the
richest surface (Builder) carries nearly all the product's density while a co-equal destination (Music)
is nearly empty, and several surfaces still present four equal choices where the product should have an
opinion.

---

## B. Workflow findings by scenario

### Scenario 1 — start a class from a discipline/template

**B1 · Four equal start paths, no recommended one · `new` · `observed` · CLS-02, CLS-03**
The empty-class and fresh-account surfaces both offer exactly four peers: Music first, Template first,
Movement first, Manual first (`CLS-02-fresh-desktop.jpg`, `CLS-03-empty-class-desktop.jpg`). This is a
faithful reading of D20's "do not force a single workflow", and it is a real improvement over a blank
panel. But "Choose the strongest starting point" then declines to say which is strongest, and all four
cards carry identical visual weight. Consequence: the decision is handed back to the instructor at the
moment they have least context — first run. Supporting the four paths and *ranking* them are not in
conflict; D20 forbids forcing one order, not having a default.
*Rival explanation considered:* this may be deliberate neutrality for a beta cohort with mixed habits.
Even so, the copy promises a "strongest" option the layout refuses to identify.

### Scenario 2 — begin from a provider playlist or liked-music shelf

**B2 · "Connect <Provider>" does not connect · `new` · `observed` · MUS-01, MUS-02, CONN-01**
The buttons labelled "Connect SoundCloud" / "Connect Spotify" / "Connect Apple Music" on the Music home
call `onManageConnections` (`Dashboard.tsx:2857-2863`) — they open the connections dialog. Inside that
dialog the user must find the same provider and press a second control. Those three controls all have
the identical accessible name **"Connect"** (verified: three matches for an exact-name query). A screen
reader user hears "Connect, button" three times with nothing distinguishing them, and every user is
promised a one-step action that takes two.

**B3 · Likes-to-class works end to end · `resolved-since` (prior P0-04) · `observed` · MUS-03, MUS-04**
"Browse liked tracks" → select → "Create class from 2 liked tracks" creates a real class and lands the
instructor in it. Verified end to end; a class titled "SoundCloud likes" was created. The prior run's
discovery-continuity finding is genuinely fixed.

**B4 · Music cannot browse music · `new` · `observed` · MUS-01, MUS-02, MUS-06**
See Verdict. `11-library-guidelines.md` specifies a source rail carrying "saved playlists, recent
imports, **search**, and provider filters"; the shipped rail carries three provider names and a Manage
button. The capability ledger truthfully says catalog browsing needs no connection — which makes the
absence of any catalog entry point on this surface harder to defend, not easier.

**B5 · Saved-playlist browsing is unverifiable locally · `new` · `not-checked` · MUS-05**
`user-playlists.ts:114,152` returns `[]` whenever `MOCK_PROVIDERS=true`. The empty state renders
correctly and honestly ("No saved playlists yet on this account"), but the populated playlist-detail
surface — the centrepiece of PDR-03 from the prior run — cannot be exercised without real provider
credentials. This is an evidence gap, not a defect.

### Scenario 3 — begin from a specific track

**B6 · Search is real, and well-formed · `resolved-since` (prior P0-04) · `observed` · BLD-07, MUS-06**
Add music offers Search / My likes / Saved playlists / Import Playlist URL with an explicit
DESTINATION selector ("Current class"). Naming the destination before the action is exactly right and
removes the prior run's "where did this go?" ambiguity.

### Scenario 4 — resume a class to place music and add choreography

**B7 · The most finished class is the hardest to reach · `new` · `observed` · CLS-01, LIVE-01**
The Classes grid shows "4 priority classes" — Untitled class, Tuesday 6AM — Test, Slow Burn, Heat Check.
**Sunrise Climb, the 10-track, fully-cued, fully-scored class, appears in none of them**; it is reachable
only from the left rail (`CLS-01-library-desktop.jpg`). In the Live queue it is likewise last
(`LIVE-01-queue-desktop.jpg`). The stated sort is "Ordered by the next creative step, then readiness and
recency" — so the ranking optimises for *what needs work*, and systematically buries *what is ready to
teach*. For a product whose Live queue asks "What are you teaching next?", these two orderings answer
different questions, and the more urgent one loses.

**B8 · The primary action does not discriminate · `new` · `observed` · CLS-01**
Three of the four priority cards carry the identical copper primary **"Finish refinements"**, and all
four carry an identical cyan "Rehearsal view" secondary. The copper primary is canon's "one main action
per surface"; replicated four times with the same words it stops being a call to action and becomes
decoration. The readiness line beneath is equally uniform: "Runnable · 1 to finish" on three cards.

**B9 · Two class navigators, two vocabularies · `new` · `observed` · BLD-01**
With a class open at desktop, the left rail lists classes as cards with **"View · Copy"**, while a second
compact chooser exposes the same classes plus "All classes", and the priority cards use
**"Finish refinements" / "Rehearsal view"**. Three labels for "open this class" across one workspace.

**B10 · Builder hierarchy is genuinely fixed · `resolved-since` (prior P0-01, P0-03) · `observed` · BLD-01–03**
The workbench now reads header → readiness → Class Pulse → selected-track preview → run-of-show track
stack, with an inspector that opens on Essentials and hides RPM/holds/downbeat behind "Advanced timing
and placement". Track rows carry position, title, artist, zone label, and BPM in the data face, and
reorder is keyboard-operable with an explicit instruction ("Reorder Baianá, position 1 of 10. Use arrow
up and down."). This is a large, real improvement.

### Scenario 5 — rehearse and resolve readiness before Live

**B11 · Rehearsal view exists and is read-only · `resolved-since` (prior P1-05) · `observed` · CLS-04**
"READ-ONLY REHEARSAL VIEW" with pulse, readiness, run-of-show, and an "Open in Builder" escape. The
prior run's "review requires entering edit mode" finding is fixed.

### Scenario 6 — run, pause, recover, exit Live

**B12 · Live pressure hierarchy is right · `resolved-since` (prior P0-05) · `observed` · LIVE-02–06**
Preflight names per-track playback verdicts and keeps "Run without music" always available as a
capability rather than a fallback. The runtime leads with the current cue, keeps BPM/effort/timers
persistent, and discloses secondary truths honestly ("♪ Playback: Music off", "⊘ Display: Screen may
dim"). Reduced motion measured **zero** elements running an animation over 50ms — fully compliant with
`06-motion.md` and `10-rhythm-system.md` §6.

**B13 · Live's glanceable labels miss AAA · `new` · `observed`, measured · LIVE-03–06**
See Verdict. Full measurement in section F.

**B14 · Runtime playback failure remains unproven · `known-open` (prior run's residual seam) · `not-checked` · LIVE-09**
The prior run's closeout explicitly left real provider resume/failure behavior as a residual seam. This
run could not close it either: forcing the playback-token route to 502 produced no failure surface,
because the fixture class runs prompter-only and never requests a stream. The recovery UI is
`code-confirmed` only.

---

## C. Surface critique (primary rows)

### PUB-01 public entry — `observed`
*Intent:* convert an invited instructor. *Focal action:* "Start building" (copper).
*Preserve:* the hero is confident and product-specific — "Find the class inside the music." with the
Class Pulse artifact rendered live beside it is the single best expression of the product's thesis
anywhere in the app. The four-step loop (Find / Shape / Score / Lead) is well-proportioned.
*Problems:* the hero band leaves a large empty region between the fold and the first content row at
1440×1000. The demo class is labelled "Synthetic class · authored order, duration, and effort", which is
admirably honest but reads as engineering candour on a marketing surface.
*Evidence:* `PUB-01-marketing-desktop.jpg`, `-390.jpg`, `MarketingPage.tsx`.

### PUB-02/03/07 auth, recovery, invitation gate — `observed`
*Preserve:* the split composition is calm and the recovery copy is exemplary. Password reset returns a
neutral "If that email has an account, a reset link is on its way." — correct anti-enumeration posture.
The invitation rejection is the best error surface in the product: "INVITATION REQUIRED / Use your
invited email / Your name and email stay here if the invitation needs attention." — it names the state,
protects the user's work, and offers the fix.
*Problems:* the sign-in surface always renders "Private beta · New accounts require an invitation."
because `access.mode` is a hardcoded `'invite_only'` literal (`apps/api/src/routes/auth.ts:22`) rather
than derived from the actual gate. In any environment where the allowlist is blank the claim is false.
Production sets the secret, so this is a truthfulness/derivation issue rather than a live defect.
*Evidence:* `PUB-02-signin-desktop.jpg`, `PUB-03-recovery-sent-desktop.jpg`, `PUB-07-invite-rejected-desktop.jpg`.

### CLS-01 class library — `observed`
*Intent:* answer "what am I teaching, and what needs work?" *Focal action:* the per-card copper primary.
*Preserve:* Class Pulse on every card is the right call — the class's shape is its identity. The
`◇ derived · confirm` marker implements PDR-02's derived-and-confirmable boundary correctly and uses the
caution channel with a glyph, not colour alone.
*Problems:* B7 (the ready class is buried), B8 (four identical primaries), B9 (three vocabularies).
Additionally the empty "Untitled class" card renders its Class Pulse placeholder as a large empty box
containing the sentence "Add tracks to derive the class shape." **printed twice** — once inside the
graph area and once as the caption below it.
*Desktop/mobile:* at 390 the entire first screen is the creation form (title field, three template
chips, helper sentence, search field, sort select) before a single class appears — a preamble that
`09-class-builder-guidelines.md` explicitly warns against ("must not become a large preamble before the
work"). *Hostile content:* the long class title and the multilingual track title both truncate cleanly.
*Evidence:* `CLS-01-library-desktop.jpg`, `-390.jpg`, `ClassPulse.tsx:97,160`.

### MUS-01/02 music workspace — `observed`
*Intent:* source raw material. *Focal action:* ambiguous — see below.
*Preserve:* the capability ledger (Catalog / Library / Playback, each with glyph + label) is excellent
and is the clearest expression of the D19/D21 constraint anywhere. Connected / EXPIRED / CATALOG ONLY
badges read correctly without colour.
*Problems:* B4 (no browsing), B2 (mislabelled connect), the nine repeated strings, and a focal-action
conflict — one copper "Connect music" competes with two **cyan-filled** provider buttons that are the
heaviest elements on the surface. `05-components.md` defines secondary as "neutral border/fill, text
bone or cyan"; a saturated cyan fill with ink text reads as a second and third primary.
*Evidence:* `MUS-01-music-disconnected-desktop.jpg`, `MUS-02-music-mixed-desktop.jpg`.

### BLD-01/02 builder and inspector — `observed`
*Preserve:* everything in B10, plus two details worth protecting: the Class Pulse renders unscored
effort as a **hatched** segment with the caption "1 unscored effort" (non-colour encoding, exactly right),
and the cue colour picker correctly excludes the plasma range — enforced by a real test
(`apps/web/src/lib/cue-colors.test.ts:24`) against `tokens.json`. That is canon compliance with teeth.
*Problems:*
- The intensity segmented control fills the selected option with **copper**.
  `09-class-builder-guidelines.md` is explicit: "The selected editor option uses a neutral fill plus a
  3px cyan bottom indicator, while `aria-pressed` and the textual summary carry state." Copper is
  identity and the one primary action; using it as a selection fill inside a five-option control spends
  the brand channel on a radio button.
- That control wraps to two rows at inspector width, orphaning "Z4 All Out" alone on the second line,
  and the zone number and label render with no separating space ("Z1Build", "Z4All Out") — two data
  channels fused into one token.
- "Save" and "Remove track" sit mid-panel with the entire Cues and Moves sections below them, so the
  Save button does not terminate the form it saves.
*Evidence:* `BLD-02-inspector-desktop.jpg`, `BLD-03-advanced-desktop.jpg`.

### BLD-11/12/13 moves — `observed`
*Problems:* the move picker is a **flat, ungrouped list of all 21 library moves plus custom moves**,
offered identically regardless of the class template. A Cycle class is offered Burpees, Press-Ups,
Crunches, and Mountain Climbers. `09-class-builder-guidelines.md` states the library is "grouped by the
`template` enum" and that the inspector "types each placed move by its template" — neither grouping nor
typing is visible in the picker. The seeded list also contains unmitigated near-duplicates ("Run" and
"Running"; "Sprint", "Sprint Hold", "Sprint on a Hill") with no descriptions to disambiguate at the
point of choice.
*Evidence:* `BLD-12-songs-by-move-desktop.jpg`, `BLD-13-songs-by-move-results-desktop.jpg`.

### LIVE-01 queue — `observed`
*Preserve:* the QUEUE READINESS panel is the right idea, executed in the data face.
*Problems:* each queue card is a full detail page — title, meta, complete Class Pulse, and the entire
four-line readiness list with consequence copy. At 1440×1000 roughly **1.7 cards** are visible. Choosing
what to teach next means scrolling past detail nobody asked for at selection time. Live's own doctrine —
"80% glanceability" — is not applied to the surface that *chooses* the class, only to the one that runs it.
*Evidence:* `LIVE-01-queue-desktop.jpg`, `-full.jpg`.

### LIVE-03/04 runtime — `observed`
*Preserve:* the affirmative ready state ("FIRST ACTION / Press play to start"), persistent BPM in the
data face, effort as bars + word, dual timers, and honest playback/display disclosure.
*Problems:* the AAA contrast miss (F1). Compositionally, the hero card devotes roughly 550px of its
780px height to empty space above and below three short lines; the right column ends with a large void
below the TRACK 1 card. At rest that reads as calm; the same proportions persist while running, when
the instructor would benefit from the next cue being larger and closer.
*Evidence:* `LIVE-03-run-ready-desktop.jpg`, `LIVE-04-run-active-dense-desktop.jpg`.

### CLS-05 / MUS-07 / ACC-03 / SYS-01 failure and loading — `observed`
*Preserve:* this is the strongest system-level work in the product. CLS-05 reads: status label "Class
library unavailable" → "Your library is temporarily unavailable." → what happened → **"No class was
removed. A new draft remains a separate, safe starting point."** → two actions. That is the
`RecoveryState` contract from `05-components.md` executed exactly. MUS-07's "Status unavailable" stays
distinct from "Disconnected". SYS-01 keeps the workspace silhouette and names what it is restoring
("Reading your next run of show…") without inventing content.
*Problem:* CLS-05 interpolates the raw server message into user-facing copy — "Ritmo could not read the
class list: **boom**", where `boom` was the literal message from the injected 500. In production this
channel would surface whatever an upstream error carries.
*Evidence:* `CLS-05-library-error-desktop.jpg`, `MUS-07-status-unavailable-desktop.jpg`, `SYS-01-workspace-loading-desktop.jpg`.

### ACC-01/02 account — `observed`
*Preserve:* the provider ledger is reused verbatim from Music, so connection truth cannot diverge
between surfaces — the prior run's P1-07 concern is resolved.
*Problem:* the header badge reads **"Profile verified"** with a success glyph, but it is derived from
`const profileTrusted = profile !== null` (`Dashboard.tsx:2398`, rendered at `:2440`) — it means "the
profile payload loaded". The fixture account's email is genuinely unverified (Better Auth sends
verification but does not require it). A data-fetch outcome is presented as an identity-trust claim.
*Evidence:* `ACC-01-account-disconnected-desktop.jpg`, `ACC-02-connections-desktop-full.jpg`.

---

## D. System critique

| # | Issue | Classification | Evidence |
| --- | --- | --- | --- |
| D1 | Live text uses `text/tertiary` throughout and misses the AAA target | **app drift** | measured, F1 |
| D2 | `check-contrast.mjs` declares only AA pairs, so Live's AAA target cannot be gated | **canon gap** (tooling) | `scripts/check-contrast.mjs:7,44-61` |
| D3 | Intensity segmented control uses a copper fill for selection instead of neutral + cyan indicator | **app drift** | `09-class-builder-guidelines.md` "Intensity in context"; `BLD-02-inspector-desktop.jpg` |
| D4 | Cyan-filled secondary buttons outweigh the copper primary on Music | **app drift** | `05-components.md` Buttons; `MUS-02-music-mixed-desktop.jpg` |
| D5 | Class Pulse renders a flat slab when every track shares one effort | **app drift** | `10-rhythm-system.md` §4 "alive at rest"; `LIVE-01-queue-desktop.jpg` (Tuesday 6AM) |
| D6 | Empty Class Pulse prints its coverage sentence twice | **app drift** (bug) | `ClassPulse.tsx:97` and `:160` |
| D7 | Two focus-ring treatments coexist: 3px outline `#74D6E5` (focus-ring token) and 2px box-shadow `#3AC0D4` (interactive/default) | **app drift** (minor) | measured tab traversal |
| D8 | Move picker is ungrouped and untyped by template | **app drift** | `09-class-builder-guidelines.md` "Moves come from a library" |
| D9 | Beat snapping ("Snap to beat") ships in the inspector, but canon calls it a flagged future extension, "not v1" | **canon gap** (docs trail the product) | `BLD-03` dump; `09-…:113`, `10-…` §8 |
| D10 | Music workspace lacks the search/filters its own library guidelines specify | **app drift** | `11-library-guidelines.md` "Layout" |
| D11 | Runtime console error: `InvalidStateError: Failed to execute 'createPattern' … canvas with a width or height of 0` | **app drift** (bug) | captured during the Builder/dialog pass |
| D12 | `access.mode` is a hardcoded literal rather than derived from the active gate | **app drift** (truthfulness) | `apps/api/src/routes/auth.ts:22` |

**Navigation.** Four destinations, consistent on every viewport, with `aria-current="page"` and a neutral
underline for the active item — canon-compliant (cyan is not used for persistent location). No drift.

**Typography.** Role separation is correct and consistent: Bricolage for display moments, Sora for work,
Azeret Mono for every number (BPM, timecodes, durations, counts). No BPM rendered in Sora was found.

**Motion.** Restrained, and reduced-motion is fully honoured (measured zero animations). No ambient
motion, no second pulsing element, no banned two-orb background anywhere.

**Depth and surface.** Glass is reserved for overlays; dense editing sits on solid stepped backgrounds.
No glass-on-glass and no dense editable data on glass were observed.

---

## E. Brand and voice

**Working well.** The product's own voice is strong and specific where it matters:
"Pick up where the energy left off.", "Browse music, then shape it into class.", "What are you teaching
next?", "Press play to start", "Live runs as a bare prompter without them.", "No class was removed. A new
draft remains a separate, safe starting point." These are instructor sentences, not SaaS sentences.
There is **no costume-Latin expression** anywhere — no tropical decoration, no party-fitness cliché. The
Latin identity lives entirely in the palette and the rhythm concepts, which is exactly the brief.

**Weak spots.**
- "Finish refinements" as a universal primary is vague where the readiness engine already knows the
  specific gap. It could say what to finish.
- "Choose the strongest starting point." promises a ranking the layout does not provide (B1).
- "Profile verified" claims identity verification for a data-load outcome (ACC-01).
- "Synthetic class · authored order, duration, and effort" on the public marketing page is internal
  vocabulary on an acquisition surface.
- The nine repeated provider sentences on Music are the least voiced copy in the product.
- "Pilates stores as the current Sculpt contract." is shipped schema vocabulary shown to instructors in
  the class-creation rail. It is honest, but it explains an implementation detail at the moment of
  creative choice.

---

## F. Accessibility and sustained-use comfort

**Method.** Computed-style measurement in a real browser: for every text-bearing element I resolved the
effective composited background by walking ancestors and alpha-compositing, then applied the WCAG
relative-luminance formula, classifying large text as ≥24px or ≥18.66px at weight ≥700. Keyboard
traversal was performed with real Tab presses reading `document.activeElement` and both `outline` and
`box-shadow`. Reduced motion used browser-level emulation. Target sizes were measured from bounding
rects at 320px.

**F1 · Live misses AAA · `observed`, measured · LIVE-03–06.** 13 of 29 measured text nodes fall below
7:1; all are `#9E927E` (`text/tertiary`):

| Ratio | Size/weight | Content |
| --- | --- | --- |
| 5.84:1 | 11px/400 | `First action`, `Effort`, `Next cue`, `Track left`, `Class left`, `Track 1` |
| 5.84:1 | 14px/400 | `BPM` |
| 6.21:1 | 10px/600 · 12px/400 | `Class Pulse`, `All track durations and efforts contribute` |
| 6.70:1 | 10px/600 · 12px/400 | `Ready · Track 1 of 3`, `0:00 / 11:05`, `Music off` |

All of these clear AA comfortably. They fail only the stricter Live target — which is the target the
design system sets for this surface, and the one the use context justifies.

**F1b · The Live transport's primary label also sits below AAA · `new` · `observed`, computed.** The
copper primary paints `linear-gradient(170deg, #E07E3C, #C8682A)` with ink `#050403` text. Computed
against each gradient stop, the label runs **7.04:1 at the light end and 5.38:1 at the dark end**. On
planning surfaces that is correct AA. On Live — where `Play` / `Pause` is the control an instructor hits
without looking — the darker half of the gradient misses the 7:1 target. This is a smaller effect than
F1 but it lands on the single most safety-critical control in the product, so it belongs in the same fix.

**F2 · Planning surfaces pass AA · `observed`, measured.** Classes, Music, Account, and Builder returned
**zero** genuine failures. An initial pass flagged ink-on-copper button labels at ~1:1; that was a
measurement artifact — copper primaries paint with `linear-gradient(170deg, #E07E3C, #C8682A)` and a
transparent `background-color`, so the ancestor walk found the page background. Computed directly, ink
`#050403` on the darkest gradient stop `#C8682A` is **5.38:1**, which passes AA. Reported here so the
finding is not mistaken for a defect.

**F3 · Focus visibility is complete · `observed`, measured.** Every control reached in a 14-stop
traversal of the Live runtime carried a visible cyan ring. Two treatments coexist, though: a 3px
`outline` in `#74D6E5` (the `focus-ring` token) on Play/Reset, and a 2px `box-shadow` ring in `#3AC0D4`
(`interactive/default`) on Exit, track-jump, seek, and the view toggles. `05-components.md` specifies
`interactive/focus-ring` for focus. Both are clearly visible; the inconsistency is cosmetic (D7). An
earlier reading suggesting missing rings was wrong — Tailwind's `outline-none` emits
`outline: 2px solid transparent` and draws the ring with `box-shadow`.

**F4 · Reduced motion is fully honoured · `observed`, measured.** Zero elements ran an animation longer
than 50ms on the Live runtime under `prefers-reduced-motion: reduce`.

**F5 · Narrow and zoom hold · `observed`, measured.** No horizontal overflow at 320×844 or at the
200%-equivalent 640×500, on Builder, Live queue, preflight, Live runtime, not-found, or sign-up. At 320px
the only sub-44px interactive elements were the visually-hidden skip link and a hidden input — i.e. none
that a user can reach. The prior run's P0-07 repairs hold.

**F6 · Redundant encoding is thorough · `observed`.** Intensity renders as zone number + bars + word;
provider states as glyph + word; readiness as glyph + word + consequence; unscored effort as a hatch
pattern. Nothing meaning-bearing was found encoded by colour alone.

**F7 · Keyboard reorder is a highlight · `observed`.** Track rows expose "Reorder Baianá, position 1 of
10. Use arrow up and down." — the instruction is in the accessible name, so it is discoverable without
sight and without documentation.

**F8 · Three identical "Connect" accessible names · `new` · `observed` · CONN-01.** See B2.

---

## G. Structural findings — `product-decision-required`

**G1 · Which question should the Classes grid answer?**
"Next creative step" (current) and "what am I teaching next" are different orderings, and today the first
wins on both Classes and Live — burying the most-taught-ready class in both places (B7). Resolving this
is a product-model decision about whether Ritmo is primarily a *building* tool or a *teaching* tool at
rest. Consequence if unresolved: the instructor's most time-critical need is the hardest to serve.
This audit does not redesign the IA; the prototype keeps both orderings available and makes the choice
explicit.

**G2 · Where does music discovery live?**
Catalog search exists only inside Builder → Add music, while Music is a co-equal destination that cannot
search (B4). Either Music gains the source rail its guidelines describe, or Music stops claiming to be a
browsing surface. Duplicating search in two places without a shared model risks two divergent
behaviours. This is an IA decision, not a polish item.

**G3 · Should the move library be filtered by class template?**
Canon says moves are grouped by template; the picker shows all of them (D8). Filtering is more coherent
but removes cross-discipline borrowing that an instructor may legitimately want. Grouping-without-hiding
is the likely answer, but it is the owner's call.

---

## H. Evidence ledger

| Item | Value |
| --- | --- |
| Baseline branch / commit | `main` / `9b188df7b38a607a208343cd7f73f7c7f4ee4bbe` |
| Prior run compared | `2026-07-19-full-product-preview` (`addaff3f`) |
| Commits since prior baseline | 31 total, 14 touching `apps/` · `packages/` · `ritmofit_design_system/` |
| Registry surfaces bound | 51 (0 new, 0 retired) |
| Screenshots | 121 files, 9.2 MB |
| Viewports | 1440×1000, 640×500 (200%-equivalent), 390×844, 320×844 |
| Scenarios exercised | 6 of 6 (`00-context.md`), one only partially — see below |
| States induced | loading (route delay), library error (500), provider status unavailable (503), invitation rejection (allowlist), session expired (D1 update), disconnected, empty, paused |
| Accounts | 2 disposable local fixtures; no real provider account was connected |
| Console/network errors observed | `InvalidStateError: createPattern … width or height of 0`; `Permissions policy violation: encrypted-media is not allowed` (headless-only); no failed asset or font requests |

**Coverage:** `observed` 42 · `code-confirmed` 3 · `not-checked` 4.

**Explicit gaps** (each stated with its blocker in `surface-inventory.md`): MUS-05, BLD-15, BLD-16,
LIVE-09, CLS-00, SYS-02, SYS-03, and audible playback truth for BLD-06 and Live. Scenario 6 was exercised
fully except for the mid-class provider-failure recovery path.

**Fixture deviations** (also recorded in the run `README.md`):

1. **Sunrise Climb tracks 7–10 are not from the mock catalog** — it holds only 6 entries, and
   `fixtures.md` asks for 10. Tracks 1–6 are the catalog in catalog order; 7–10 are explicit
   deterministic additions (Sun Is Shining / Rather Be / Latch / Midnight City, mixed providers) so a
   later run can reproduce them exactly.
2. **`ENCRYPTION_KEY` was set locally.** It is blank in `.dev.vars.example`, and without it every
   provider connection returns 503 — which would have manufactured a false "providers unavailable"
   finding. A freshly generated local-only value was written to the git-ignored `.dev.vars`.
3. **`BETA_ALLOWED_EMAILS` was temporarily populated** to induce PUB-07, then reverted to blank.
4. **Spotify's `expires_at` was set to a past timestamp** in the local D1 to produce the session-expired
   member of the mixed connection state, which cannot otherwise coexist with a healthy connection.
5. **A sixth class, "SoundCloud likes", exists** — created by exercising scenario 2 end to end rather
   than by the recipe.
6. **Mock provider tokens expire after one hour**, so a long capture session sees a connected provider
   lapse mid-run. SoundCloud was reconnected once for this reason. Not a product defect.
