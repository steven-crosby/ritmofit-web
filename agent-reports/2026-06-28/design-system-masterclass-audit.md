---
prompt: meta/report-audit # audit of agent-reports/design-system-masterclass.md (not a remote prompt)
repo: ritmofit-web
agent: claude-code
date: 2026-06-28 # the run date
inspected_head: e489279721d5107ce196302facc8316904f1fe70 # branch head when the audit ran
inspected_range: full-repo # verified the report's claims against the whole repo
completed: true # the design-system verify gate ran and the audit finished in-timebox
prs: # PR URLs opened this run; leave empty if none
  []
---

# meta/report-audit — Design System Masterclass evaluation — 2026-06-28

This is a **meta-review**: an audit of `agent-reports/design-system-masterclass.md`
(the "A−" RitmoFit design-system evaluation written by another agent, Grok 4.3, against
commit `7a4be4fe`). It judges that report on two axes the requester asked for: **factual
accuracy** (are its claims true in the code?) and **rigor/quality** (did it meet the brief
in `agent-prompts/design-system-masterclass.md`?). Every concrete claim was checked against
source; the authoritative `verify` gate was re-run.

## Summary

**The masterclass report is mostly accurate on the design system's technical core, but it is
not trustworthy as an "evidence-based" audit, because it fabricates evidence about artifacts
and a feature it claims to have inspected.** The verified-true core is genuinely strong: the
`verify` gate passes for both themes (I re-ran it), the two-pulse rhythm allowlist is exactly
as described, copper/cyan/plasma channel discipline holds (including the `cue-colors.ts`
plasma exclusion + its guarding test), fonts are self-hosted OFL with correct role mapping,
the token pipeline matches the description, and the headline backlog items (no `semantic.bg.scrim`
token → raw `bg-black/60` scrim at `Dialog.tsx:121`; inconsistent empty/loading copy; no
skeleton recipe; ad-hoc segmented components; ErrorBoundary + Dialog focus-trap present) are
all real and correctly scoped.

But four claims do not survive verification, and two of them are **fabrications about things
that do not exist in the repo**: the report describes inspecting a `ds-bundle/` artifact
(with a "manifest" and "\_screenshots/ … durable visual regression anchors") that has never
existed in git; it cites "Smoke shots (22 files)" at "320/390 viewports" as durable anchors,
when smoke `shots/` are git-ignored, only two smoke scripts exist (390×844 only), and the
report's own command log never ran them; it repeatedly describes a "giant Azeret `data-hero`
BPM" in the Live HUD that does not exist (`data-hero` is a defined-but-unused token; the large
Live element is cue **text** in the display font); and it flags a Live cue-announcement a11y
gap (and recommends building a live region) that is **already implemented**. The report also
skips several explicit deliverables the prompt marked as required (tables, a component/state
matrix, code blocks, quoted doc passages, and `path:line` citations throughout — the whole
document contains exactly one line citation).

**Verdict:** the **system's** A− grade is defensible on the merits. The **report's** reliability
is not — I'd grade the report itself ~**B−**: a well-organized, largely-true narrative undermined
by invented evidence and missed rigor requirements. It is safe to act on the backlog, but the
"Visual / Experiential Observations" and any artifact-based claims should be disregarded until
re-verified.

## Commands run + results

- `git cat-file -t 7a4be4fe…` + `git log -1 --format=%s` → **confirmed**: the inspected SHA exists,
  subject matches ("feat(web): planning-timeline active-track tempo pulse (Session 5) (#137)"),
  and it is an ancestor of HEAD.
- `cd ritmofit_design_system && npm run verify` → **PASS** (exit 0): build-tokens `--check`
  (web + iOS) in sync, lint clean, DARK + LIGHT contrast all clear AA. Corroborates the report's
  central gate claim.
- Repo searches for `ds-bundle`, smoke `shots/`, `data-hero`, `--rf-beat`/`--rf-bpm`, `scrim`,
  plasma/cue colors, fonts, aria-live, etc. (see Findings).
- 5 parallel read-only claim-verification passes over `apps/web/src`, `ritmofit_design_system`,
  and scripts.

I did **not** run the full web build or the browser smokes (the smokes need a running stack +
a Playwright install and are out of scope for verifying a report's truthfulness); none of the
findings below depend on doing so.

## Findings

Ranked by how much they undermine trust in the report. "The report" = `agent-reports/design-system-masterclass.md`.

- **[P1] Fabricated artifact: `ds-bundle/`** — report lines 125, 126, 151, 172, 259

  - Evidence: the report lists `ds-bundle/` among "Living artifacts" with "(synced component
    previews with manifest)", claims "ds-bundle `_screenshots/` provide durable visual regression
    anchors", and lists it among artifacts it "inspected" (line 259). In the repo, `ds-bundle/`
    **does not exist and never has**: `git log --all -- ds-bundle` is empty; the only references
    anywhere are `.gitignore:48` and `eslint.config.js:21` (both _ignore_ rules) plus the prompt
    and the report. No script generates it. The prompt (`design-system-masterclass.md:34,126`)
    _told_ the agent to assess "ds-bundle/ purpose and health" — the correct finding was "absent
    in this checkout," not a description of its contents.
  - Impact: invented evidence in an audit whose entire value is evidence. Erodes trust in every
    unverifiable observation.
  - Recommended owner: n/a (report correction)
  - Recheck next run? yes

- **[P1] Fabricated/unsupported smoke-shot evidence** — report lines 145, 147, 151, 259

  - Evidence: "Smoke shots (22 files) … provide durable visual regression anchors" and "Narrow
    (smoke shots): 320/390 viewports covered." In the repo, `apps/web/smoke/` contains only
    `functional.smoke.mjs`, `narrow-width.smoke.mjs`, `README.md`, `.gitignore`; `.gitignore`
    is `shots/` (screenshots are **git-ignored / ephemeral, not durable anchors**); the smoke
    README documents a **single** narrow viewport (390×844), not "320/390"; and the report's own
    "Commands Run" section never runs a smoke script. There is no source of "22 files."
  - Impact: the "Visual / Experiential Observations" section is framed as rendered observation
    ("from smoke + code") but no rendering occurred; the numbers are invented.
  - Recommended owner: n/a (report correction)
  - Recheck next run? yes

- **[P2] Factual error: "giant Azeret `data-hero` BPM" in Live does not exist** — report lines 35, 117, 144

  - Evidence: the report asserts "Hero data in Live is `data-hero` Azeret Mono" (35), "Large
    data-hero" (117), and "giant Azeret data-hero BPM" (144). `git grep data-hero -- apps/web/src`
    returns **nothing** — the `data-hero` token is defined in `tokens.json` but consumed by no
    component. The largest element in the Live "Now" card is the cue **text** at
    `LiveMode.tsx:434` (`font-display text-4xl`, i.e. Bricolage display, not Azeret data); BPM
    renders separately at `LiveMode.tsx:394` as `font-data text-sm`. There is no large single
    BPM numeral.
  - Impact: a described "key strength" of the typography system is not in the code. (A fair audit
    would instead have flagged `data-hero` as a defined-but-unused token.)
  - Recommended owner: web / design (decide: use `data-hero` or drop it)
  - Recheck next run? yes

- **[P2] Recommends already-implemented work: Live cue aria-live** — report lines 106, 215–220 (backlog #6)

  - Evidence: the report says screen-reader users "may miss 'on the beat' semantics" and that
    "dynamic cue text changes … are not announced to AT," then recommends a "Polite live region
    for current cue text." But `LiveMode.tsx:234` already renders
    `<p className="sr-only" aria-live="assertive" aria-atomic="true">{announcement}</p>`, which
    announces each cue advance. The **only** genuine remnant of this gap is continuous _playhead-
    progress_ narration (the timeline at `LiveTimeline.tsx` exposes `role="slider"` +
    `aria-valuenow/aria-valuetext`, but does not proactively announce elapsed progress).
  - Impact: a follow-up implementer could re-build an existing feature; the gap is overstated.
  - Recommended owner: web (scope backlog #6 down to playhead progress only)
  - Recheck next run? yes

- **[P3] Minor imprecision: `--rf-beat` vs `--rf-bpm`** — report lines 16, 33

  - Evidence: the report credits "correct `--rf-beat` derivation." The implemented custom property
    is `--rf-bpm`; the beat is computed inline as `calc(60s / var(--rf-bpm, 120))`
    (`index.css:194,229`). `--rf-beat` appears only in a comment (`index.css:172`). The concept is
    right; the cited property name is not what ships.
  - Recommended owner: n/a
  - Recheck next run? no

- **[P3] Overstates what the contrast gate enforces: "Live AAA"** — report lines 23, 100, 253

  - Evidence: "planning AA, Live AAA targets met." `check-contrast.mjs` asserts AA only
    (thresholds shown in output are "need 4.5" / "need 3"; it prints "all semantic text/accent
    pairs clear AA"). Several dark-theme pairs do exceed 7:1 (incidental AAA), but AAA is **not
    gated**. "Contrast gate (both themes) passes cleanly" (line 102) is the accurate phrasing.
  - Recommended owner: n/a
  - Recheck next run? no

- **[P3] Soft overstatements** — report lines 83 (buttons), 38/102 (44px), 112/265 (iOS)
  - Buttons: "variants (primary copper gradient, secondary, inline cyan, ghost, destructive
    ember+icon) exist and are used" — only `.rf-btn-primary` is an actual recipe (`index.css:48`);
    secondary/inline/ghost/destructive are utility compositions / ad-hoc (`text-state-danger` +
    borders), with no `.rf-btn-secondary|ghost|destructive` recipe. The report partially self-
    corrects this in dimension 6, so it's soft, not contradictory.
  - 44px "via wrappers": scattered `h-11 w-11` / one `min-h-11` (`LiveMode.tsx:61`), many on album
    art; no shared touch-target wrapper. "via wrappers" overstates the structure.
  - iOS "source not present": a read-only vendored **contract** snapshot is present
    (`ios-snapshot/`); only the full iOS UI source is absent. Minor.
  - Recommended owner: n/a
  - Recheck next run? no

## Rigor vs the report's own brief

The prompt (`agent-prompts/design-system-masterclass.md`) lists explicit, non-optional output
requirements the report does not meet:

- **"Tables for inventories, matrices, and comparisons"** (prompt §"consistent formatting"): the
  report contains **zero tables**.
- **"Create a matrix: documented component/variant/state (05) vs actual implementation"**
  (dimension 6): no matrix — dimension 6 is prose ("Matrix gaps") with no documented-vs-actual table.
- **"Code blocks for before/after patterns or token examples"**: none.
- **"Quote relevant passages from design docs"**: the report quotes no `01–11` doc text.
- **"File references as `path/to/file:line` (or ranges)"** "with exact file/line guidance": the
  entire document contains **one** line citation (`Dialog.tsx:121`). Backlog items name files but
  almost never lines — thin for a "masterclass" that bills itself on precision.
- **"Evidence" and "Impact" bullets**: not used as the format specifies.

It does satisfy the dual-audience structure (narrative + numbered backlog + condensed brief +
"how to consume"), covers all 12 dimensions, records the SHA and baseline commands, and states
"no source changes were made." So it meets the _shape_ of the brief while missing the
_precision artifacts_ the brief required.

## What the report got right (verified true)

For fairness — the core is strong and these were confirmed against code:

- `verify` gate passes both themes (re-ran; exit 0, all AA).
- Exactly two beat pulses, correctly placed: `rf-beat-pulse` on Live HUD (`LiveMode.tsx:427`),
  `rf-beat-pulse-subtle` on the planning timeline (`TimelineStrip.tsx:250,454`); keyframes +
  reduced-motion suppression in `index.css`; `rf-drop-bloom` rationed to All-Out
  (`LiveMode.tsx:418`).
- Color discipline: `cue-colors.ts` excludes the plasma range, guarded by
  `cue-colors.test.ts` ("excludes the plasma range"); success = cyan `state-positive`, no
  green/emerald anywhere; plasma confined to All-Out glow / Live drop / ribbon Zone-4 kiss /
  marketing artwork, never in controls.
- Single raw-color deviation = `bg-black/60` scrim at `Dialog.tsx:121` (confirmed the _only_ one).
- Typography: Sora/Bricolage/Azeret roles in `tokens.json` + `tailwind.config.js`; numerals route
  through `font-data`; fonts self-hosted woff2, OFL-licensed, `font-display: swap`, preloaded; no
  raw `font-family` overrides.
- Token pipeline: `$meta.version` 4.1.0 (no separate changelog); dual emitters
  (`build-tokens.mjs`, `build-tokens-ios.mjs`) + `lint-tokens.mjs` + `check-contrast.mjs`;
  `apps/web/scripts/generate-tokens.mjs` wired into the web build; light overrides handled;
  generated `ios/RFTokens.swift`; iOS token-drift seam tracked in `web-ios-parity.md`.
- Backlog reality: no `semantic.bg.scrim` token; no skeleton/shimmer token; no shared
  `EmptyState`/`LoadingState`; empty-state copy genuinely inconsistent across LibraryRail /
  TrackSearch / SongsByMoveDialog / ChoreographyEditor / etc.; `IntensitySegmentedControl` and
  `SegmentBand` are standalone ad-hoc components; `ErrorBoundary` present; Dialog focus-trap +
  `inert` + `aria-hidden` + focus-return present (with tests).

## Is the A− justified?

For the **system**: yes, defensible. A token-driven system that passes its own dark+light
contrast gate, rations motion to two audited pulses, enforces channel discipline with a test,
and self-hosts licensed fonts is legitimately strong, and the open items (scrim token, state
polish) are cosmetic/incremental rather than launch-blocking.

For the **report**: the grade is delivered with more confidence than the evidence supports.
An audit that invents a `ds-bundle/` it "inspected," cites "22" non-existent durable shots,
and praises a `data-hero` Live BPM that isn't in the code has a self-congratulatory bias that
also likely inflates the unverifiable praise. Treat the A− as "the system is probably an
A−/B+," and treat the report as needing the corrections above before it is cited as ground truth.

## Blockers

None. One scope boundary: I verified the report's _claims_, not the full rendered UI — I did not
run the browser smokes or full web build, as none of the findings require it. Visual/render-level
assertions in the report remain unverified by anyone (the report did not run them either).

## Next recommended action

If this report will guide implementation, **correct the four substantive errors before handing
the backlog to an implementer**: (1) delete the `ds-bundle/` references or replace with "absent in
checkout"; (2) remove the "22 files / 320 viewport / durable anchors" smoke claims (state shots are
git-ignored and were not run); (3) fix the `data-hero` claims to "defined but unused token —
decide to adopt or drop"; (4) rescope backlog #6 to playhead-progress narration only, noting cue
announcement already exists at `LiveMode.tsx:234`. The remaining backlog (P0 scrim token, empty/
loading consistency, state-matrix tests, light-theme pass) is accurate and ready to action as-is.

_No source changes were made during this audit._
