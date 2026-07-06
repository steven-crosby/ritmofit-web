# Design-system deep audit — report-only

> **Local worktree, unattended, browser required.** This prompt is the exception in
> `remote-prompts/`: it is written for an **isolated worktree on the owner's machine**
> (`claude --worktree --permission-mode acceptEdits`), not a remote cloud sandbox, because
> Phase 3 needs a real browser against a locally booted app. Everything else about the
> operating model is unchanged: no human is watching, never block on interactive input, and
> nothing survives unless it is committed and pushed — the deliverable is a **validated
> agent report pushed on a branch**. Decisions that belong to the owner become written
> recommendations.

> **Follow the house rules** (`agent-prompts/remote-prompts/00-house-rules.md`) **with
> these explicit deviations:**
>
> 1. **Report-only. Zero code changes.** This prompt opens **no PR** and edits **no**
>    product code, tokens, docs, or mockups — not even an "obvious one-liner". Every fix,
>    however small, is a finding in the report. The only files this run may create are the
>    report and its curated screenshot assets under `agent-reports/`. (Like the planning
>    briefs, it pushes its validated report on a branch with no code PR.)
> 2. **Timebox: 4 hours hard cap, 3 hours target** — not 45 minutes. Reserve the final
>    20 minutes for Phase 4 (report, validation, push, cleanup). Phase budgets and the
>    degradation ladder are at the bottom of this prompt.
> 3. **Local machine safety** replaces sandbox isolation: stay inside the worktree, never
>    read or copy `apps/api/.dev.vars` (it holds real provider secrets), never hit
>    production (`ritmofit.studio`) or the remote D1, and kill every process you started
>    before you stop.

**REPO:** `ritmofit-web`

**Use when:** the weekly deep design pass is due; a large UI slice just landed; the UI
"looks off" and you want the full picture; before a milestone or redesign decision.
**Do not use when:** you only need a quick drift check on recent changes (the sentinel
covers deltas); the main concern is WCAG interaction / assistive-technology behavior
(→ `accessibility.md`); the concern is wording (→ `content-consistency.md`).

## Mission

Audit the design system as **three claims that must agree**, and report where they don't:

1. **Canon integrity** — `ritmofit_design_system/` is internally consistent: tokens,
   prose docs, generated outputs, mockups, and guard scripts all tell the same story.
2. **Code adherence** — `apps/web` (and any UI in `packages/`) implements that canon:
   token-backed values, canonical components, complete states, honest color/motion roles.
3. **Rendered truth** — what a real browser actually paints matches both of the above,
   across viewports, themes, states, and user settings.

The deliverable is a ranked, evidence-backed findings backlog plus an explicit verdict —
not fixes. The owner dispatches remediation from the report.

## Out of scope — other pieces own these lanes

- Deep WCAG interaction, screen-reader, and focus-order work → `accessibility.md`. This
  audit checks design-system-level a11y invariants (contrast tokens, visible cyan focus,
  redundant encoding, reduced-motion, hit targets) but does not run an AT pass.
- Microcopy, terminology, banned copy in **app** strings → `content-consistency.md`
  (banned copy inside the DS package itself is in scope — `lint-tokens` gates it).
- iOS parity: `ios/RFTokens.swift` generation is in scope (Phase 1 gates it), but the
  iOS repo's hand-synced copy and native adoption are not — that seam is tracked in
  `ritmofit_dev_plan/web-ios-parity.md`. Do not read or edit the iOS repo.
- Performance, bundle size, network behavior → `performance.md`.

Incidental discoveries in these lanes go in the report's "Out-of-scope observations"
appendix, addressed to the owning prompt. Do not investigate them.

## Evidence bar — what counts as a finding

Every finding must cite all three of:

- **Canon**: the rule being violated, as `doc-or-file § section` (e.g.
  `02-color-system.md § plasma allowlist`, `tokens.json → color.semantic.success`,
  `CLAUDE.md § Music Constraints`). If you cannot point to canon, it is not a
  violation — it goes in the **Canon gaps** appendix as an owner decision.
- **Evidence**: `path/to/file.ts:line` for code, a committed screenshot filename for
  visual findings, or a measured value (computed style, contrast ratio, px size) for
  instrumented findings. "Looks wrong" is not evidence.
- **Impact**: who sees it and where (surface + viewport + theme), and what it costs
  (brand erosion, illegibility, broken state, drift compounding).

Batch repetition: one pattern violated in 30 places is **one finding** with a count,
2–3 representative citations, and the full list in an appendix. Rank honestly; do not
inflate severity to make the run look productive, and if a dimension is clean, say so
plainly — a clean bill with proof of coverage is a valid, valuable outcome.

---

## Phase 0 — Build the canon (~20 min)

1. Read `CLAUDE.md` (it overrides this prompt on conflict), then the **entire** design
   package: `ritmofit_design_system/README.md`, `ritmofit-design-system.md` (brand
   authority), docs `01`–`11`, and `tokens.json`.
2. Read the machinery, not just its output: `scripts/build-tokens.mjs`,
   `scripts/build-tokens-ios.mjs`, `scripts/lint-tokens.mjs`, `scripts/check-contrast.mjs`,
   and the app-side consumer `apps/web/scripts/generate-tokens.mjs`. You need to know
   precisely what the guards **cannot** catch — that residue is where this audit earns
   its keep.
3. From those sources, write down this run's **invariant checklist**. The table below is
   a floor, not the truth — values and rules may have moved since this prompt was
   written, so re-derive each one from its cited source and note any that no longer hold:

   | Invariant (verify against source) | Canonical source |
   |---|---|
   | `tokens.json` is the single source of truth; generated outputs are never hand-edited | `README.md` § Tokens |
   | Web fonts: Sora (UI), Bricolage Grotesque (display), Azeret Mono (data), self-hosted | `03-typography.md`, `README.md` § canon 2 |
   | Copper = brand identity + **the one** primary action per surface | `02-color-system.md`, `README.md` § canon 3 |
   | Cyan = interaction, focus, links, controls, information | `README.md` § canon 4 |
   | `success` reads **cyan**, never green | `02-color-system.md`, `tokens.json` |
   | Plasma = peak affect only, per explicit allowlist; never atmosphere or a control | `02-color-system.md`, `10-rhythm-system.md`, `README.md` § canon 5 |
   | Color confirms; structure/labels/numbers/icons/shape inform (no color-only meaning) | `01-design-principles.md`, `07-accessibility.md` |
   | Pulse animation only in the Live HUD + the currently playing planning indicator | `10-rhythm-system.md`, `README.md` § canon 9 |
   | Reduced motion removes affect without removing meaning | `06-motion.md`, `README.md` § canon 10 |
   | Live mode stays dark in both themes | `README.md` § Tokens (light theme) |
   | Album art is bounded; BPM/duration/sequence/cues/energy carry the weight | `README.md` § canon 8 |
   | Every data-bearing surface has loading / empty / error / offline / permission states | `CLAUDE.md` § Engineering Rules, `05-components.md` |
   | Contrast: AA — text 4.5:1, graphics 3.0:1, **both** themes | `07-accessibility.md`, `check-contrast.mjs` |
   | Light-theme glass legibility is NOT machine-gated — must be browser-verified | `README.md` § Tokens (light theme) |
   | Foundation language is modality-neutral (flag only; copy depth → content-consistency) | `README.md` § canon 11 |

4. **Dedup before you hunt.** Read every prior `agent-reports/*/technical-design-system*.md`
   and the latest `technical-accessibility*.md`; run `gh pr list` and `gh issue list`;
   skim `git log --oneline` for `ritmofit_design_system/` and `apps/web/src/` since the
   last design report. A known, tracked, unfixed issue gets one "still open, tracked at X"
   line — not a re-investigation. A previously-reported issue that has since been fixed
   gets verified as fixed (cheap regression check).

## Phase 1 — The package audits itself (~40 min)

1. **Run the gate:** `(cd ritmofit_design_system && npm run verify)` — both emitters in
   `--check` mode, `lint-tokens`, `check-contrast`. Record the exact output in the report.
   If it is already red on the default branch, that is an automatic P0/P1 finding; note it
   and continue (this run changes nothing).
2. **Token integrity beyond the lint:** orphaned tokens (defined, never referenced by
   either emitter or any consumer), near-duplicate values (two spacing/radius/color tokens
   within a rounding error of each other — each pair is future drift), naming
   inconsistencies, semantic slots missing a dark or light counterpart, `{ref}` chains
   that resolve somewhere surprising.
3. **Prose ↔ token drift:** every concrete value quoted in the prose docs (hex, px, ms,
   ratios, font names, scale steps in `01`–`11` and `ritmofit-design-system.md`) checked
   against `tokens.json`. `lint-tokens` covers some of this — hand-check what it skips.
4. **Doc-vs-doc contradictions:** cross-read for conflicting guidance — e.g. the plasma
   allowlist in `02` vs `10`; component states in `05` vs a11y requirements in `07`;
   layout/glass rules in `04` vs what `09`/`11` assume; motion budget in `06` vs pulse
   rules in `10`. Record contradictions verbatim (both quotes).
5. **Hand-authored CSS:** the component rules **below** the generated block in
   `mockups/theme.css`, plus `mockups/app.js` and per-page styles — raw values, drift
   from `05-components.md`, dead rules for components that no longer exist.
6. **Mockup freshness:** open `mockups/index.html` in the browser and click through every
   page (this doubles as your browser warm-up). Check: fonts actually load (no console
   404s, no silent system-font fallback), both top-level redirect files still point where
   the README says, `builder-states.html` and `components.html` still match what `05`
   documents, the light-theme page uses the opt-in mechanism, and the mockups stay
   schema-honest (`README.md` § Schema honesty).
7. **Guard-gap analysis:** enumerate what `npm run verify` structurally cannot catch —
   e.g. it lints the DS folder, not `apps/web`; light-glass legibility; the app's
   Tailwind layer; hand-authored theme.css rules. For each gap, either this audit covers
   it in Phase 2/3 (say where) or it becomes a finding recommending a new guard.
8. **README accuracy:** the package map, script descriptions, and mockup list match what
   is actually on disk.

## Phase 2 — Static adherence sweep (~75 min)

0. **Pipeline first.** Confirm `apps/web/scripts/generate-tokens.mjs` reads the same
   `tokens.json`; run `pnpm --filter @ritmofit/web tokens` and, if
   `apps/web/src/styles/tokens.css` is committed, `git diff --exit-code` it for staleness.
   Read `apps/web/tailwind.config.js` end-to-end: every theme extension should map to
   `--rf-*` variables, not duplicate raw values — a hex literal in the Tailwind config is
   drift at the root of the tree. Same check for `apps/web/src/index.css` and any font
   loading in the app vs the DS's self-hosted approach.
1. **The sweep.** Over `apps/web/src` and any UI in `packages/` (excluding generated
   `tokens.css`), grep and **classify every hit** as token-backed / justified literal
   (record the justification) / violation:
   - hex colors `#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(`, `oklch(`
   - Tailwind arbitrary values: `[#`, `[rgb`, `-[`\<number>`px]`, `[<number>rem]`
   - font literals: `font-family`, `font-['`, hardcoded face names (any face, not just
     the currently-approved three — the approved set is whatever `tokens.json` says today)
   - raw `border-radius` / `rounded-[`, `shadow-[` / `box-shadow` literals
   - motion literals: `duration-[`, `transition:` with ms values, `animation:`,
     `cubic-bezier(`, keyframes defined outside the token layer
   - z-index literals, opacity literals on brand surfaces, inline `style={{` objects
   - Include test files but tag them separately — a test asserting a hardcoded hex pins
     drift in place.
   Report the tally (total hits / classified breakdown) in an appendix so coverage is
   auditable.
2. **Component census.** Enumerate every component in `apps/web/src/components/` and
   build a component × checks matrix (appendix): canonical reference exists in
   `05-components.md` / `mockups/components.html`? token-backed styling? radius/shadow/
   spacing from the documented families? correct type roles (data values in the data
   face, display type where canon says)? hover/focus/disabled styled? and — for every
   data-bearing component — loading / empty / error / offline / permission states
   present in code? A component with no canonical reference is itself a finding (either
   the canon is incomplete or the component is a bespoke one-off).
3. **Color-role policing.** Count copper primary actions per surface (canon: exactly
   one); trace every `success` usage to the cyan token; list every plasma usage and check
   it against the allowlist; hunt color-only encodings (state communicated by hue alone
   with no label/icon/shape).
4. **Motion census.** Every animation/transition site: token-backed duration/easing?
   wrapped in a `prefers-reduced-motion` guard that removes affect but keeps meaning?
   pulse outside the two allowlisted homes?
5. **Data presentation.** BPM, durations, counts, sequence numbers: data face + tabular
   treatment per `03-typography.md`; energy ribbon implementation vs `10-rhythm-system.md`;
   album-art bounding vs canon 8.

## Phase 3 — Rendered truth (~75 min)

0. **Boot, safely.** In the worktree: `pnpm install --frozen-lockfile` if needed; create
   `apps/api/.dev.vars` **from `.dev.vars.example` only** — never open or copy the real
   one — with mock/dummy provider values; `pnpm --filter @ritmofit/api db:migrate:local`
   and `db:seed:local`; then `pnpm dev:api` and `pnpm dev:web`. Give boot at most 20
   minutes of debugging; if it will not run, fall back to auditing the mockup pages in
   depth plus Phase 2, and record the blocker. **Never point the browser at production.**
1. **Data setup.** One seeded account with a realistic class (multiple sections, tracks,
   cues, choreography, library content) and one fresh account for genuine empty states.
   Also prepare one pathological record locally (very long class/track names, many
   sections) to probe overflow.
2. **The matrix.** Screenshot every reachable surface — marketing, login, reset-password,
   not-found, dashboard, class builder/summary, live mode, and **every dialog**
   (account, connections, custom moves, explore, teams, share, songs-by-move, onboarding,
   track search) — across:
   - viewports **320 / 390 / 768 / 1280 px** — use DevTools viewport **emulation**
     (`resize_page` / device emulation), never a narrow OS window: headless windows below
     ~500px lay out at ~500 and crop, which fabricates findings;
   - themes: dark (default) and light (set `data-theme="light"` on the root) — and
     verify Live mode **stays dark in both**;
   - `prefers-reduced-motion: reduce` emulated on the motion-heavy surfaces (builder
     playing state, live mode) — affect gone, meaning intact;
   - 200% zoom on builder and live — nothing unusable, no content loss.
   Log the full capture matrix (done / skipped+why) — silent gaps read as coverage.
3. **Compare against the mockups.** For each app surface with a mockup counterpart
   (`library`, `builder`, `live`, `login`, `marketing`, `moves`, `share-card`, `light`),
   capture both and note drift. Classify carefully: drift that breaks canon is a
   violation; drift where the app evolved past a stale mockup is a **canon-maintenance**
   finding against the mockup, not the app.
4. **Instrument, don't eyeball.** Via the browser's script evaluation:
   - computed `font-family` on samples of each type role — confirm the real face loaded
     (network tab: woff2 200s, no silent fallback);
   - measured contrast on rendered fg/bg pairs — prioritize **light-theme glass**
     surfaces (explicitly not machine-gated) and ribbon/graphics at 3.0:1;
   - focus: Tab through login → dashboard → builder → live; every interactive control
     shows the visible cyan focus treatment;
   - hit targets measured against the documented minimum;
   - count animating elements per surface and reconcile with the Phase 2 motion census.
5. **State walk.** Loading (throttle network), error (stop the API worker mid-session —
   every surface should show its designed error state, not a blank screen or crash),
   empty (fresh account), offline (DevTools offline), permission/entitlement states where
   reachable. Screenshot each designed state that exists; file a finding for each one
   that doesn't.
6. **Console hygiene.** Keep the console and network log open the whole tour; collect
   errors, warnings, and 404s (fonts and assets especially) as evidence.
7. **Cleanup.** Stop both dev servers and anything else you started. Local D1/miniflare
   state stays inside the worktree; touch nothing outside it.

## Phase 4 — Triangulate, verdict, report (~30 min — never skip, never truncate)

1. **Merge across phases.** The same defect seen statically and live is one finding with
   both evidence types (and higher confidence). A live-only finding must be traced back
   to `file:line` where feasible.
2. **Rank P0–P3** per the report template's semantics. For each finding: canon cite,
   evidence, impact, a one-line suggested-fix sketch, effort (S/M/L), and recommended
   owner. Order the backlog so the owner can execute it top-down.
3. **Verdict.** One overall letter grade plus one per dimension — canon integrity /
   code adherence / rendered fidelity — each with a one-sentence justification. Compare
   against the previous run's verdict if one exists.
4. **Appendices** (all required; write "none" rather than omitting):
   A. invariant checklist — pass / fail / not-checked (with why) per invariant;
   B. component × checks matrix;
   C. sweep tally — hits and classification counts per pattern;
   D. capture matrix — surfaces × viewports × themes, done/skipped;
   E. **canon gaps** — real design questions the docs don't answer; framed as owner
      decisions, never as defects;
   F. out-of-scope observations, each addressed to the prompt that owns the lane.
5. **Screenshots policy.** The full capture set stays local in the worktree (it dies
   with the run). Commit at most ~12 **curated** images — only those that evidence a
   P0–P2 finding — compressed to ≤200 KB each, under
   `agent-reports/YYYY-MM-DD/design-system-assets/`, and reference them from the report
   by relative path.
6. **Report + push.** Write `agent-reports/YYYY-MM-DD/technical-design-system.md` from
   `agent-reports/AGENT_REPORT_TEMPLATE.md`; run
   `./agent-reports/validate-agent-report.sh` on it — the run is incomplete until it
   passes. `completed: true` requires: the Phase 1 gate ran, the browser phase ran (or
   its blocker is documented), and validation passed; the full CI gate is **not**
   required — nothing was changed. Commit the report (+ assets) on branch
   `auto/design-system-audit-YYYY-MM-DD` and push. **No PR** — the pushed report branch
   is the deliverable.

## Time budget & degradation ladder

Phase 0 ≈ 20 min · Phase 1 ≈ 40 · Phase 2 ≈ 75 · Phase 3 ≈ 75 · Phase 4 ≈ 30, inside a
4-hour hard cap. If you fall behind, cut in this order — and record every cut in
appendix D:

1. light-theme breadth (keep light login + builder + one dialog),
2. viewport breadth (keep 320 and 1280),
3. the mockup comparison pass,
4. component-matrix depth (keep the census list; shrink per-component checks).

Never cut: the Phase 1 gate, the Phase 2 sweep + classification, the state walk's error
case, and all of Phase 4. If Phase 3 is blocked entirely, say so in Blockers — a
static-only run is still a valid run, but it must not present itself as a full one.
