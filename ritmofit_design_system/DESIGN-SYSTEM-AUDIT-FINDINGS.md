# Executive Summary

This is a mature, disciplined, and genuinely brand-coherent design system — far closer to
ship-ready than most "final audit" requests. The token architecture is a real single source of
truth (`tokens.json` → two generated emitters), the non-negotiable rules are not just written but
*enforced in code* (lint + contrast gates), and the mockups honor the rules I spot-checked rather
than contradicting them. I verified, not assumed:

- **Generated outputs match source.** `build-tokens.mjs` reports `theme.css` already in sync;
  `build-tokens-ios.mjs` regenerates `RFTokens.swift` byte-identically. **Zero token drift** web or iOS.
- **Hex discipline holds.** Only **2 hardcoded hex** in ~2,400 lines of hand-written CSS, both
  intentional and allowlisted (`#050403` device bezel, `#000` phone screen). All inline HTML styles
  are data-driven (ribbon bar heights, cue positions), not hardcoded colors.
- **Plasma restraint is real.** Every `--rf-peak` usage resolves to a sanctioned context (All-Out
  cue, ribbon peak "kiss", marketing/share/login brand-front). **No plasma on any working surface.**
- **Accessibility is implemented, not just specced.** The energy ribbon carries `role="img"` + a
  descriptive `aria-label` matching the spec's screen-reader summary; cue/move markers are
  time+type labeled; the reduced-motion block suppresses both pulse surfaces with a global backstop;
  `check-contrast.mjs` passes AA for every semantic pair in **both** themes.

The defects that remain are **minor and structural, not visual**. The system reads as a *premium
studio instrument / creator workstation* — exactly its target — with strong Nike restraint and a
disciplined reggaeton-locked palette. Nothing here reads as generic SaaS or party-fitness; the lint
actively forbids the latter.

**Verdict: A — ship-ready with minor consistency fixes.** Two items (a prose↔token drift guard and a
visually-demonstrated light theme) are worth completing before this folder is *certified* as the
governing authority for both web and iOS, but neither blocks adoption.

The single most important truth from this audit: **the token/generator/lint/contrast spine is
excellent; the weakness is everything that is hand-maintained prose mirroring that spine.** Close
the gap between the prose tables and `tokens.json` and this becomes an A+ governing system.

---

# Changes Applied (this session)

All three approved tiers were executed; `npm run verify` (build `--check` ×2 + lint + contrast) is
**green**, and a real `npm run build:all` writes nothing (outputs idempotent). What changed:

**Tier 1 — zero visual risk**
- Documented the two undocumented tokens: `display-xl` (52/56) in `03-typography.md` + brief §7.2;
  `radius.sheet` (32) in `04-layout-and-surfaces.md` + brief §8.1; added `space.0` to brief §8.2.
- **Added a prose↔token drift guard** to `scripts/lint-tokens.mjs` (check #5): every
  `typography.scale` and `radius` key in `tokens.json` must appear in its spec table and the brief,
  matched as a whole hyphen-aware word (so `display` can't satisfy `display-xl`). Negative-tested.
- **Added `package.json`** with `build` / `build:ios` / `build:all` / `lint` / `contrast` and a
  CI-grade **`verify`**. Both emitters now accept `--check` (never write, exit non-zero on drift), so
  `verify` is a safe read-only gate. README documents the workflow.
- Made `build-tokens-ios.mjs` **sync-aware** (compares before writing; prints "already in sync"),
  matching the web emitter, so it can serve as a drift check.
- Resolved the stale `DESIGN-SYSTEM-AUDIT-FINDINGS.md` reference — this report now occupies that path.

**Tier 2 — touches mockups, low risk**
- **Normalized class naming** to the dominant un-prefixed convention. This was larger than the "two
  utilities" first flagged: a full `rf-`-prefixed presentational family (`rf-stop-*`, `rf-fill-*`,
  `rf-stroke-*`, `rf-bg-*` — 11 classes) was renamed un-prefixed across `theme.css` + 7 mockups.
  `--rf-*` design *tokens* keep their prefix (verified all 492 untouched); only *class* names changed.
  Brief §12.2's suggested utility names were rewritten to match what ships.
- **Built `mockups/light.html`** — a dedicated page that ships under `data-theme="light"` at rest, so
  the generated light palette is visible without interaction (color channels, type, controls, chips,
  segments, provider states, intensity, track row, energy ribbon). Carve-outs (Live stays dark;
  glass/shadow light is a follow-up) are stated on the page. Linked from `index.html` + README; lint
  swatch exemption extended to it. All 79 classes resolve; tag nesting validated.

**Tier 3 — QA + reconciliation**
- Confirmed the rendered provider-state set (`ps-connected/reconnecting/disconnected/expired/
  permission/error`) matches specs 05 and 11 exactly.
- Made the Pilates **"Holds" placeholder self-documenting** in `builder.html` (`data-illustrative`,
  `title`, and a comment pointing at the rule-13 TODO), so the one unbacked number can't be mistaken
  for live data.
- **Responsive:** statically verified the breakpoint ladder (1180/900/680/480), the 320px floor, the
  absence of layout-breaking fixed widths, and `clamp()`-scaled Live BPM; recorded in `04` that the
  *visual* 320px + 200%-zoom checks still require a real browser (honest status, no fabricated pass).

**Net effect on the scorecard:** typography 8→9, responsive 7→8, maintainability 7→9, cross-file
consistency 8→9, component scalability 8→9. Verdict strengthens within **A** toward A+ (see Final
Assessment). The scorecard and plan below are annotated with post-change status.

---

# Folder Discovery

## Governing authority
- **`ritmofit-design-system.md`** (1,441 lines) — the Codex implementation brief; product + brand
  authority. Scope: web app, marketing, builder, live, iOS alignment, tokens, voice, rhythm.
- **`README.md`** restates 10 canonical decisions and names `tokens.json` as source of truth.
- *Note:* the rules are stated in **three** overlapping prose layers — the governing brief, the 11
  numbered specs, and the README "Canonical decisions." See Weakness W1 (triplicated authority).

## Numbered spec docs (01–11) — what each governs
| Doc | Governs |
| --- | --- |
| `01-design-principles.md` | The 7 product principles + decision filter |
| `02-color-system.md` | Color channels, intensity ramp, plasma allowlist, segments, states, contrast |
| `03-typography.md` | UI/display/data families, type scale, rules, loading |
| `04-layout-and-surfaces.md` | Glass vs solid, radius, spacing, atmosphere, breakpoint ladder |
| `05-components.md` | Full component inventory + per-component state logic |
| `06-motion.md` | Durations/easing, signature microinteractions, reduced motion |
| `07-accessibility.md` | Redundant encoding, contrast targets, motion safety, keyboard, targets |
| `08-ios-web-alignment.md` | Shared roles, what stays identical vs expresses differently |
| `09-class-builder-guidelines.md` | Builder layout/hierarchy, ribbon, song row, cues/moves, modality |
| `10-rhythm-system.md` | Tempo token, pulse allowlist, energy arc blend rule, the "drop" |
| `11-library-guidelines.md` | Saved-music → class workflow, provider states |

## Token sources
- **`tokens.json`** — authoritative, platform-neutral (color/type/radius/space/surface/tempo/motion/mode).
- **`mockups/theme.css`** — `:root` + `[data-theme="light"]` blocks are **generated** (lines 7–214);
  the ~2,400 lines below are hand-authored component CSS.
- **`ios/RFTokens.swift`** — **generated** Swift constants (the iOS half of parity).
- Generators: `scripts/build-tokens.mjs` (web), `scripts/build-tokens-ios.mjs` (iOS).
- Guards: `scripts/lint-tokens.mjs` (hex/copy/token integrity), `scripts/check-contrast.mjs` (AA gate).
- `scripts/fetch-fonts.mjs` self-hosts the three OFL families into `mockups/fonts/`.

## HTML surfaces
- **`preview.html`** → redirect to `mockups/components.html`. **`ritmofit-branding-mockup.html`** →
  redirect to `mockups/marketing.html`. (Both verified accurate redirects.)
- **`mockups/`**: `index.html` (browser), `marketing`, `library`, `moves`, `builder`,
  `builder-states`, `live`, `explore`, `teams`, `login`, `share-card`, `ios`, `components`.
- `mockups/app.js` — small progressive interactions (Library selection tray, pressed-state demos).

## Where each concern is defined / rendered
| Concern | Defined | Rendered |
| --- | --- | --- |
| Global tokens / CSS vars | `tokens.json` | `theme.css` `:root` (generated) |
| Typography | `03`, tokens `typography` | `theme.css` `.title-*`, `.data-*` |
| Color palette | `02`, tokens `color` | `theme.css` primitives/semantics |
| Layout primitives | `04`, tokens `space`/`radius` | `theme.css` grids/utilities |
| Buttons | `05` | `.button*` (theme.css 594–661) |
| Cards / surfaces | `04` | `.surface`, `.surface-glass` |
| Nav / header | `05` | `.app-header`, `.app-nav` |
| Hero / marketing | `04`, brief §12.4 | `marketing.html`, `.title-xl` |
| Class builder | `09` | `builder.html`, `builder-states.html` |
| Track rows / song cards | `05`, `09` | `.track-row` |
| BPM / data readouts | `03`, `05` | `.data*`, `.live-bpm` |
| Intensity displays | `02`, `05` | zone bars + number + label |
| Energy ribbon | `09`, `10` | `.ribbon` SVG (`role="img"`) |
| Provider states | `05`, `11` | `.provider-state` (6 mockups) |
| Forms / inputs | `05` | `.field`, inputs |
| Motion / reduced-motion | `06`, `10` | keyframes + `@media` block |
| Accessibility / focus | `07` | `.sr-only`, `:focus-visible` rings |

---

# System Interpretation

**1. Design intent (plain English).** A creator workstation for rhythm-fitness instructors that
treats *authoring a class* — not browsing music — as the core job. Tempo is a real design material
(`--rf-bpm` → `--rf-beat`); the class has a visible *shape* (the energy ribbon); the numbers (BPM,
timecodes, zones) are the brand, set in a characterful mono. Builder stays calm and solid; Live
earns contrast + motion; the brand-front (marketing/share/login) is the only place heat runs hot.

**2. Visual personality.** Warm espresso-dark, copper identity, cyan as the single interactive
language, hot-magenta plasma rationed to ~1% of pixels for "the drop." Mechanical-instrument data
type, large soft radii, translucent borders over hard lines. Confident, physical, restrained.

**3. Strengths.** Token spine is a true SSOT with two verified emitters; rules are enforced in code,
not just prose; plasma/motion discipline is airtight; accessibility is implemented; voice is strong
and lint-guarded; the energy ribbon is a genuine signature artifact with a real SR story.

**4. Weaknesses.** Authority is triplicated in prose (brief + 11 specs + README) with **no automated
guard** that the value tables match `tokens.json`; two real tokens (`display-xl`, `radius.sheet`)
are undocumented in the scale tables; the light theme is generated but never visually demonstrated;
no `package.json`/CI enforces the guard scripts; class-naming convention is mixed (`--rf-*` tokens
but `.button-primary` / a few `.rf-*` classes); the brief's *suggested* `.rf-button-*` utility names
don't match the implemented classes.

**5. Where it aligns with RitmoFit.** Creator-first hierarchy (ribbon/BPM/structure over artwork);
movement-first move library keyed on the real `moves.template` enum; "find the class inside the
music" stated explicitly in marketing + onboarding; Nike restraint (one primary per surface,
rationed motion); reggaeton palette locked without costume; party-cliché copy actively banned.

**6. Where it conflicts with RitmoFit.** Almost nowhere on intent. The only friction is *operational*:
a "final" two-platform authority that still has hand-maintained prose mirrors, an unproven light
theme, and un-enforced guard scripts is a maintenance liability waiting to drift — which would, over
time, erode the very discipline the system is built on.

**7. What it currently reads as:** **Premium studio instrument / creator workstation.** Not generic
SaaS (banned), not a music app (artwork is bounded, BPM-forward), not a fitness dashboard (no KPI-tile
energy), not a campaign brand system (heat is fenced to the brand-front). Bullseye on target.

---

# Scorecard

Single-system scores (1–10). Evidence is file-specific; "improve" lists what would raise it.

| # | Criterion | Score | Evidence | Why / What would improve |
| - | --- | :-: | --- | --- |
| 1 | RitmoFit brand fit | 9 | brief §1–§5; lint banned-copy; reggaeton palette `tokens.json color.plasma $comment` | On-brief throughout. +1 only if light theme proven. |
| 2 | Creator-first feel | 9 | `09` builder hierarchy; art bounded 44pt | Strong. Surface dense-mode later. |
| 3 | Movement-first feel | 8 | `move` taxonomy on real `template` enum; `moves.html` | Pilates "Holds" still placeholder (D7). |
| 4 | "Find the class inside the music" clarity | 9 | marketing hero + onboarding copy | Explicit and repeated. |
| 5 | Music/workstation energy | 9 | Martian Mono data face; timeline-first `09` | — |
| 6 | Fitness/studio confidence | 8 | Live mode `data-hero`; intensity ramp | Studio "texture" mostly implied. |
| 7 | Nike-like restraint | 9 | one primary/surface; rationed pulse+plasma | — |
| 8 | Latin warmth without cliché | 8 | easter-egg naming §5.5; palette lock; cliché lint | Intentionally implicit; correct call. |
| 9 | Avoidance of generic SaaS | 9 | banned verbs §5.2; two-orb gradient banned `04` | — |
| 10 | Avoidance of party-fitness clichés | 9 | `lint-tokens` BANNED list | Lint-enforced. |
| 11 | Color-channel discipline | 9 | `02` channels; verified plasma usage | — |
| 12 | Copper as brand warmth | 9 | `brand/*` = copper; primary buttons | — |
| 13 | Cyan as interaction/focus/info | 9 | success=cyan not green; focus-ring cyan | — |
| 14 | Plasma restraint | 10 | every `--rf-peak` selector verified in-allowlist | The cleanest result in the audit. |
| 15 | Surface system quality | 8 | glass/solid split `04` | Light glass/shadow is a follow-up. |
| 16 | Typography quality | 8→**9** | 3-family scale `03` | `display-xl` now documented (D1 fixed). |
| 17 | Data typography quality | 9 | Martian Mono tabular; `data-hero` pulse | — |
| 18 | Builder-mode calmness | 9 | solid surfaces; no plasma at rest | — |
| 19 | Live-mode glanceability | 9 | `data-hero` 88px; AAA target; minimal chrome | — |
| 20 | Marketing-page swagger | 8 | heat gradient/bloom brand-front only | Controlled; not over-spent. |
| 21 | Energy ribbon treatment | 9 | height-encoded; grayscale-legible; SR summary | — |
| 22 | Track row/song card hierarchy | 9 | BPM-weighted; art 44pt `09` | — |
| 23 | Provider-state clarity | 9 | 6 explicit states `05`/`11`; recovery action | — |
| 24 | Copy/voice alignment | 9 | approved examples in mockups; lint | — |
| 25 | Accessibility | 9 | redundant encoding `07`; ribbon `role=img`; targets | — |
| 26 | Colorblind safety | 9 | no red/green; height+bars+label carry meaning | — |
| 27 | Reduced-motion readiness | 9 | `@media` block + global backstop; both pulses killed | — |
| 28 | Responsive behavior | 7→**8** | breakpoint ladder `04` | Ladder/floor/widths statically verified; 320px + 200% zoom still manual-pending (honest). |
| 29 | Maintainability | 7→**9** | SSOT + emitters + lint + contrast + **`verify`** | `package.json`/`verify` added; prose mirrors now guarded (lint #5); emitters `--check`-able. Triplicated authority remains by design (brief is now explicitly the value-illustrative layer). |
| 30 | Token centralization | 9 | one `tokens.json` → 2 emitters, byte-verified | — |
| 31 | Cross-file consistency (HTML↔md↔tokens) | 8→**9** | tokens↔generated perfect | Drift guard added; 2 omissions documented; class naming normalized un-prefixed. |
| 32 | Component scalability | 8→**9** | variants + state logic `05` | Class naming normalized; convention documented in brief §12.2. |

**Unweighted mean ≈ 8.6 at audit time; ≈ 8.9 after the changes applied this session.** No criterion
below 8 now. The former 7s (responsive verification, maintainability) and the cross-file 8s were the
improvement surface — all addressed except the two genuinely browser-dependent responsive checks,
which are recorded as manual-pending rather than claimed.

---

# Strengths to Keep

- **`tokens.json` as a true SSOT with two generated emitters.** Do not regress to hand-edited theme
  values. Byte-verified in-sync for both web and iOS during this audit.
- **Rules enforced in code.** `lint-tokens.mjs` (hex discipline, banned copy, token-reference
  integrity) and `check-contrast.mjs` (AA gate, both themes) are the system's backbone. Keep and grow.
- **Plasma & motion rationing.** ~1% plasma, two pulse surfaces, one "drop." Verified airtight.
- **Implemented accessibility.** Ribbon `role="img"` + descriptive label; time/type-labeled markers;
  reduced-motion suppression with a global backstop; `.sr-only`; cyan focus rings; 44px targets.
- **Voice.** Strong, physical, creator-first; banned-cliché lint keeps it honest.
- **Schema honesty.** TODOs (Pilates "Holds"), "no `class_tracks.anchor_ms`" notes, derived-not-new
  rules are documented inline — exactly the brief's rule 13.

# Weaknesses to Avoid

- **W1 — Triplicated authority.** The color/typography/motion rules are restated in the governing
  brief, the 11 numbered specs, **and** the README. Three places to update per change → guaranteed
  eventual drift. The tokens + lint are the real contract; the prose should *defer* to them, not
  re-encode their values.
- **W2 — Hand-maintained value tables.** §6.2 / §7.2 / §8.1 of the brief and the 02/03/04 tables copy
  numbers out of `tokens.json` with nothing checking them (D1, D2).
- **W3 — Unproven light theme.** Generated + contrast-passed, but never rendered in a mockup (D4).
- **W4 — Guards aren't enforced.** No `package.json`/CI; a contributor can edit `tokens.json` and ship
  without regenerating or linting (D6).
- **W5 — Naming drift.** `--rf-*` tokens vs `.button-primary` / a few `.rf-*` classes; brief's
  suggested `.rf-button-*` names match nothing (D3).

---

# Consistency Findings & Resolution

Format: **current state → where they disagree → canonical answer.** The governing brief and the
non-negotiable rules win ties.

1. **Color palette** — `tokens.json` authoritative; brief §6.2 is an *illustrative* mirror (spot-checked
   values all match). **Canonical:** `tokens.json`. Mark every prose color block "illustrative — see
   `tokens.json`" and add a drift guard (Finding 30 below).
2. **Token architecture** — One source, two emitters, both generated. No disagreement. **Canonical:**
   keep; never hand-edit generated blocks (already documented in-file).
3. **Surface system** — glass (nav/overlay/HUD) vs solid (editing) consistent across `01`/`04`/`05`.
   **Canonical:** as specced; light-theme glass/shadow is a known follow-up — keep it flagged, don't
   silently ship a half-themed glass.
4. **Glass vs solid** — consistent; "never glass-on-glass / never dense data on glass" stated in `01`
   and `04`. **Canonical:** unchanged.
5. **Typography** — `tokens.typography.scale` has **`display-xl` (52/56)** and it ships via `.title-xl`
   on the marketing hero, but it is **absent** from the `03` and brief §7.2 scale tables. **Disagree:
   tokens vs prose.** **Canonical:** `tokens.json` (11 roles incl. `display-xl`); add the row to both
   tables.
6. **Data typography** — Martian Mono, tabular, three sizes; consistent. **Canonical:** unchanged.
7. **Spacing scale** — tokens `space.0..16`; brief §8.2 omits `0`. Cosmetic. **Canonical:** tokens
   (include `0`).
8. **Radius scale** — tokens have **`sheet` (32)**, used on `.share-card` and `.current-cue.is-all-out`,
   but `04` and brief §8.1 tables start at `panel` (28). **Disagree: tokens vs prose.** **Canonical:**
   `tokens.json` (6 radii incl. `sheet`); add the row.
9. **Shadows/elevation** — tokens `shadow.card/lifted/peak-glow/peak-bloom` (+`*Light`); `04` describes
   them. Consistent. **Canonical:** unchanged.
10. **Buttons** — `.button` + `-primary/-action/-ghost/-danger` (+layout `-square/-block`) consistent
    across all mockups; map cleanly to brief's 4 variants. The brief's *suggested* §12.2 names
    `.rf-button-*` match nothing. **Canonical:** implemented `.button-*` convention; update §12.2's
    suggested names (or adopt `rf-` prefix everywhere — pick one, see Finding 29).
11. **Chips/toggles** — `.chip[aria-pressed]`, `.segment-tag`, cyan-on toggle; consistent `05`.
    **Canonical:** unchanged.
12. **Forms/inputs** — label-above, cyan focus, ember+icon error, mono numerics. **Canonical:** unchanged.
13. **Nav/header** — glass top bar + side nav (web), glass tab bar (iOS); `header-fill` token; light
    inherits dark for now (documented). **Canonical:** as specced; light header is a follow-up.
14. **Marketing hero** — heat gradient on accent word + ambient bloom, brand-front only; verified
    fenced. **Canonical:** unchanged.
15. **Feature sections** — consistent within `marketing.html`. **Canonical:** unchanged.
16. **CTA sections** — copper primary + cyan secondary ("Start building" / "See class shape").
    **Canonical:** unchanged.
17. **Class builder layout** — timeline-first, ribbon on top, side editor; `09` matches `builder.html`.
    **Canonical:** unchanged.
18. **Track rows/song cards** — BPM-weighted, art 44pt; `09`/`05` match markup. **Canonical:** unchanged.
19. **BPM readouts** — three mono sizes; hero pulses in Live only. **Canonical:** unchanged.
20. **Intensity displays** — zone number + bars + label everywhere; color reinforces. **Canonical:** unchanged.
21. **Energy ribbon/class shape** — height-encoded, grayscale-legible, `role="img"` + SR summary,
    shareable; blend rule documented (no invented schema). **Canonical:** unchanged — this is the
    reference artifact.
22. **Cue & move markers** — distinct shape/icon, time+type aria-labels; cue picker excludes plasma.
    **Canonical:** unchanged.
23. **Provider connection states** — 6 explicit states with glyph+label+recovery, icon-led; `05`/`11`
    agree. **Canonical:** unchanged.
24. **Empty states** — invitational copy from brief §5.4/§14.3. **Canonical:** unchanged.
25. **Error states** — "what broke + how to fix," ember+icon; no bare codes. **Canonical:** unchanged.
26. **Share/export cards** — `share-card.html` carries ribbon + identity + duration + count + mark;
    campaign tone. **Canonical:** unchanged.
27. **Motion system** — durations/easing tokens; `onBeat` reserved for rhythm; signature list matches
    `06`/`tokens.motion`. **Canonical:** unchanged.
28. **Reduced-motion** — `@media` kills both pulse surfaces + global animation backstop; ribbon stays
    static. **Canonical:** unchanged.
29. **Responsive layout** — breakpoint ladder defined (1180/900/680/480, 320 floor); **but `04`
    self-states the 320px + 200%-zoom checks are manually unverified in the headless tooling.**
    **Canonical:** the ladder; **action:** run the two manual checks in a real browser and record
    pass/fail (Plan step 11).
30. **Accessibility/focus states** — cyan `:focus-visible` rings, `.sr-only`, redundant encoding,
    AA/AAA targets verified by `check-contrast`. **Canonical:** unchanged.
31. **Copy/voice system** — approved examples used; `lint` bans clichés. **Canonical:** unchanged.

**Cross-cutting Finding 30 (the keystone):** the prose value tables are **unguarded** mirrors of
`tokens.json`. **Canonical resolution:** `tokens.json` is always the value authority; extend
`lint-tokens.mjs` to parse the documented tables (or, lower-effort, assert that every
`tokens.typography.scale` and `tokens.radius` key appears at least once in its spec table) so prose
drift fails CI. This is the one change that converts "trust the prose" into "the prose can't lie."

**Class-naming convention (Finding 29 above, expanded):** tokens are uniformly `--rf-*`; component
classes mostly drop it (`.button-primary`, `.tempo-pulse-live`, `.surface-glass`) while a few keep it
(`.rf-fill-peak`, `.rf-bg-peak`). **Canonical answer:** pick **one** convention for component/utility
classes. Recommended: keep the short un-prefixed component classes (already dominant and consistent),
rename the two `.rf-*-peak` utilities to match, and update brief §12.2's suggested names to the real
convention. Do **not** mass-rename to `rf-` — that's churn for no functional gain.

---

# Final Assessment

**A — Ship-ready with minor consistency fixes.**

- **RitmoFit brand truth:** fully honored. "Instructors who are creators," "find the class inside the
  music," movement-first, Club Athletic + Creator Swagger + Nike restraint — all present in tokens,
  copy, and mockups, with cliché actively banned. No conflict found.
- **Builder mode needs:** met. Solid surfaces, no plasma at rest, ribbon/timeline/BPM hierarchy,
  bounded artwork, keyboard story. Calm and usable.
- **Live mode needs:** met. `data-hero` 88px, AAA contrast target, minimal chrome, beat pulse, the
  one "drop." Glanceable.
- **Marketing needs:** met. Heat gradient + bloom fenced to the brand-front; swagger without spilling
  onto working surfaces.
- **Token maintainability:** **was the soft spot — now addressed.** `package.json` + `npm run verify`
  enforce the guards; `lint-tokens.mjs` check #5 fails on prose↔token drift; both emitters are
  `--check`-able. The remaining gap is process, not code: wire `npm run verify` into whatever CI
  adopts this folder.
- **Cross-file consistency (HTML↔md↔tokens):** tokens↔generated outputs are perfect; the two prose
  omissions (`display-xl`, `sheet`) are documented and now guarded; class naming is normalized.
- **Accessibility:** strong and *implemented* — verified, not promised.
- **Implementation risk:** low for visual adoption; moderate for *governance longevity* until the
  drift guard + CI exist. Today it's correct; the risk is future silent drift.

I considered **B** (needs targeted refactors). It does not qualify: nothing is incoherent, no rule is
violated in the implementation, no muddy compromise exists. Every defect is additive
(document a token, demo a theme, wire a guard), not corrective. **C is clearly wrong** — the
structural spine is already the strongest part of the system.

---

# Implementation Plan

> **Status:** steps 1–7, 12, 13 **applied this session** (see "Changes Applied"); steps 8–10 were
> verify-only and confirmed clean; **step 11's visual 320px/200%-zoom checks remain manual-pending**
> (browser-dependent). Statuses are marked inline below.

Small, reviewable commits, scoped to this folder. Risk = chance of visual/behavioral regression.

1. **Document the two missing tokens.** Add `display-xl` (52/56) to `03-typography.md` + brief §7.2;
   add `radius.sheet` (32) to `04-layout-and-surfaces.md` + brief §8.1; add `space.0` to brief §8.2.
   *Files:* `03`, `04`, `ritmofit-design-system.md`. *Risk:* none (docs). *Impact:* none visual.
   *Verify:* every `tokens.typography.scale`/`tokens.radius` key now appears in its table.
2. **Add a prose↔token drift guard.** Extend `lint-tokens.mjs` (or a new `lint-docs.mjs`) to assert
   every typography-scale and radius key in `tokens.json` is referenced in its spec table; fail
   non-zero otherwise. *Files:* `scripts/lint-tokens.mjs`. *Risk:* low. *Impact:* none visual.
   *Verify:* lint passes; deleting a documented row makes it fail.
3. **Mark prose value blocks "illustrative."** Add a one-line "values authoritative in `tokens.json`"
   banner to brief §6.2/§7.2/§8.1 and the 02/03/04 tables (most already have one — normalize).
   *Risk:* none. *Verify:* grep for the banner in each.
4. **Wire a `package.json` + CI-style script.** Add `package.json` with
   `build` / `build:ios` / `lint` / `contrast` / `verify` scripts (`verify` = build both → lint →
   contrast, with build emitting no diff). *Files:* new `package.json`, README note. *Risk:* low.
   *Impact:* none visual. *Verify:* `npm run verify` exits 0 on a clean tree, non-zero after a
   hand-edit to `tokens.json` without regenerate.
5. **Make `build-tokens-ios.mjs` sync-aware.** Mirror the web emitter: only write when changed, print
   "already in sync" otherwise, so it can serve as a CI drift check. *Files:* `scripts/build-tokens-ios.mjs`.
   *Risk:* low. *Verify:* second run prints "already in sync"; `git diff` empty.
6. **Normalize class naming.** Rename `.rf-fill-peak`/`.rf-bg-peak` → `.fill-peak`/`.bg-peak` (or the
   reverse — one decision), update the 6 mockups that use them, and update brief §12.2 suggested names
   to the chosen convention. *Files:* `theme.css`, `components/builder/login/ios/share-card/marketing.html`,
   brief §12.2. *Risk:* low (mechanical). *Impact:* none visual. *Verify:* lint clean; mockups render
   identically; no stale class refs (`grep`).
7. **Demonstrate the light theme.** Add a `data-theme="light"` toggle to `mockups/index.html` (or one
   light variant page) so the generated palette is actually rendered + screenshotted. *Files:*
   `index.html`/`app.js`. *Risk:* low. *Impact:* new (light) surface visible. *Verify:* toggle flips
   palette; `check-contrast` LIGHT already gates values.
8. **Energy-ribbon: no change needed** beyond confirming the light-theme render (step 7) keeps the
   grayscale read. *Verify:* ribbon legible with `filter: grayscale(1)` in both themes.
9. **Copy/voice: no change needed.** Lint already guards; spot-audit passed. (Optional: extend BANNED
   list if new clichés surface.)
10. **Accessibility/reduced-motion: no change needed.** Verified implemented. (Optional: add an
    automated check that every animated selector is covered by the reduced-motion block.)
11. **Responsive QA (manual, as `04` flags).** In a real browser, verify the 320px floor and 200% zoom
    across builder/marketing/live/library; record results in `04` (replace the "manual" caveat with a
    dated pass/fail). *Risk:* none (QA). *Verify:* documented results.
12. **Reconcile remaining md↔HTML claims.** Confirm `09` "Holds" placeholder (D7) is either hidden or
    clearly labeled illustrative in `builder.html`; confirm provider-state tables in `05`/`11` match
    the rendered `.provider-state` set. *Risk:* low. *Verify:* visual + grep.
13. **Final cleanup.** Resolve the stale `DESIGN-SYSTEM-AUDIT-FINDINGS.md` reference in
    `lint-tokens.mjs` (this report now occupies that filename, so the reference resolves — verify the
    path/casing matches). Remove any dead tokens (none found this pass). *Risk:* none.

**Suggested commit order:** 1 → 3 → 5 → 2 → 4 (docs + guards first, lowest risk), then 6 → 7 → 11 → 12
(touch mockups), then 13. Steps 8/9/10 are verify-only.

---

# Proposed Preview Patch

Highest-value, lowest-risk first move (steps 1 + 2): document the two missing tokens and add a guard
so prose can never silently drift from `tokens.json` again. **✓ Applied this session** (along with
the rest of the approved plan) — the diffs below are the shipped change, kept here for the record.

**a) `03-typography.md` — add the missing top row to the scale table:**

```diff
 | Token         | Size / Line | Weight | Tracking | Family        | Use                                   |
 | ------------- | ----------- | ------ | -------- | ------------- | ------------------------------------- |
+| `display-xl`  | 52 / 56     | 600    | -0.02    | Space Grotesk | Marketing hero accent (`.title-xl`)   |
 | `display-lg`  | 48 / 52     | 600    | -0.02    | Space Grotesk | Marketing hero, big titles            |
```

**b) `04-layout-and-surfaces.md` — add the missing radius row:**

```diff
 | Token     | px  | Applies to                             |
 | --------- | --- | -------------------------------------- |
+| `sheet`   | 32  | Share/export card, All-Out cue card    |
 | `panel`   | 28  | Main panels, large overlays, sheets    |
```

**c) `scripts/lint-tokens.mjs` — new check (sketch) so the tables can't drift:**

```js
// --- 5. Prose ↔ token table integrity ------------------------------------
const typeMd = read("03-typography.md") + read("ritmofit-design-system.md");
for (const key of Object.keys(tokens.typography.scale)) {
  if (key.startsWith("$")) continue;
  if (!typeMd.includes("`" + key + "`"))
    fail("03-typography.md", `type token \`${key}\` is undocumented in the scale table`);
}
const radiusMd = read("04-layout-and-surfaces.md") + read("ritmofit-design-system.md");
for (const key of Object.keys(tokens.radius)) {
  if (key.startsWith("$"))  continue;
  if (!radiusMd.includes("`" + key + "`"))
    fail("04-layout-and-surfaces.md", `radius token \`${key}\` is undocumented`);
}
```

With (a)+(b) in place, this check passes; remove either row and CI fails — the prose can no longer
lie about the token set. (The brief §7.2/§8.1 tables are folded into the same check via the
concatenated read, so all three layers stay honest.)

> Implementation note: the shipped guard uses a **hyphen-aware whole-word regex** rather than the
> naive `includes("\`" + key + "\`")` sketched above — the brief's tables list tokens *without*
> backticks, and a bare `includes("data")` would be satisfied by `data-lg`. The regex
> `(^|[^\w-])<key>([^\w-]|$)` matches each token exactly in either style. Negative-tested:
> `display` does not satisfy `display-xl`, and an absent key returns false.

---

# Approval Needed Before Changes

> **Resolved — all three tiers approved and executed.** The decisions came back as: **all three
> tiers**, **short un-prefixed naming**, **dedicated light page**. Everything below was carried out
> (see "Changes Applied"); `npm run verify` is green and outputs are idempotent. This section is kept
> as the record of what was approved.

Decisions made:

1. **Class-naming convention →** short un-prefixed. Done — the full `rf-`-prefixed presentational
   class family (11 classes, broader than the two first flagged) was normalized; `--rf-*` *tokens*
   keep their prefix; brief §12.2 updated to match.
2. **Light theme →** dedicated page. Done — `mockups/light.html` ships under `data-theme="light"`,
   linked from `index.html` + README, with carve-outs stated and lint swatch-exemption extended.
3. **Scope →** all three tiers. Done, except the two browser-dependent responsive checks (step 11),
   which are recorded in `04` as manual-pending rather than fabricated.

**Remaining for you / whoever adopts this folder:**

- Run the visual **320px + 200%-zoom** checks in a real browser and record the result in `04`
  (static structure already verified; only the live render is outstanding).
- Wire **`npm run verify`** into CI when this package is adopted into the web/iOS repos, so the guards
  actually gate merges.
- Optional: decide whether the Pilates **"Holds"** metric gets a real derivation/field or stays
  hidden until then (it is now clearly labeled illustrative in `builder.html`).
