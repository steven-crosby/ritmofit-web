# Implementation kickoff — authorized work from the 2026-07-24 design audit

**Read this first if you are an agent starting an implementation session.**
Everything you need is in this folder. You do not need the audit transcript.

---

## Authorization status

**All 18 backlog items are owner-approved.** Dispositions were recorded by the owner (Steven) in chat on
**2026-07-24** and are transcribed in [`run-decisions.md`](run-decisions.md), which is the authority — if
this file and the ledger ever disagree, **the ledger wins**.

All three product decisions were resolved by the owner in the same exchange:

| ID | Owner's resolution |
| --- | --- |
| **PDR-01** | **Teaching readiness is the default ordering** on both Classes and Live. Keep the labelled switch; "needs work" (today's behaviour) stays available. |
| **PDR-02** | **Music owns sourcing** via one shared source-list component, consumed by both Music and Builder's Add music. |
| **PDR-03** | **Group and demote** in the move picker — current template first, other disciplines collapsed but reachable. Never hidden. |

All six prompts are authorized to execute.

### Git rights — granted 2026-07-24

You may **branch, commit, push, open a PR, and merge it once CI is green.** The owner granted this on
2026-07-24, after approving the backlog.

**Deploy is NOT granted.** Deploys are manual and production-facing (`AGENTS.md`, "Security And
Deployment"), Ritmo ships in deliberate batches, and **merging to `main` does not deploy**. Ask the owner
separately, and never fold a deploy into a merge.

Working rules that come with the grant:

- **Branch from `main`; never commit directly to it.** One branch per slice.
- **One PR per slice.** Keep it to that slice's scope — no drive-by refactors or unrelated cleanup.
- **Run the repo gates before requesting merge** (see each prompt's Tests section for the proportionate
  set; the full CI-equivalent gate is in `AGENTS.md`).
- **Commit messages:** small Conventional Commits, e.g. `feat(web): …`, `fix(api): …`, `docs: …`.
- **PRs** explain behaviour and risk, list verification, include screenshots for UI changes, and call out
  schema, migration, shared-contract, config, secret, or deployment impact.

> **Note on production drift.** As of 2026-07-24 production is behind `main` by 7 app-code commits from
> *before* this work started. That is a pre-existing batch decision for the owner — do not treat it as
> something your slice should resolve, and do not deploy to "catch up".

---

## Do this, in this order

### Step 0 — orient (once, ~15 min)

Read, in order:

1. [`README.md`](README.md) — the verdict and the five consequential changes.
2. [`implementation-sequence.md`](implementation-sequence.md) — order, dependency graph, collision map, gates.
3. [`shared-foundations-contract.md`](shared-foundations-contract.md) — the primitives prompts 02–06 may not redefine.
4. `AGENTS.md` at the repo root — the canonical operating rules. **It wins over anything here.**

Then open the prototype so you can see what you are building toward:

```bash
python3 -m http.server 8099
# http://127.0.0.1:8099/docs/audits/claude-design-audit-2026-07-24/mockups/index.html
```

### Step 1 — boot the app

```bash
pnpm install --frozen-lockfile
cp apps/api/.dev.vars.example apps/api/.dev.vars   # if absent
# set BETTER_AUTH_SECRET and ENCRYPTION_KEY to freshly generated local-only values
# keep MOCK_PROVIDERS=true and BETA_ALLOWED_EMAILS blank
pnpm --filter @ritmofit/web build                  # wrangler needs apps/web/dist to exist
pnpm --filter @ritmofit/api db:migrate:local
pnpm --filter @ritmofit/api db:seed:local
pnpm dev:api    # :8787
pnpm dev:web    # :5173
```

Two setup facts this run learned the hard way, both of which will otherwise cost you time:

- **`wrangler dev` fails if `apps/web/dist` does not exist** — it is the Worker's `assets.directory`.
  Build the SPA once first.
- **`ENCRYPTION_KEY` is blank in the example file, and without it every provider connection returns 503.**
  You will conclude providers are broken when they are not.

### Step 2 — run the prompts

**Prompt 01 is a hard gate.** Merge it and pass gate G1 before starting anything else.

> **Status, 2026-07-25: all six prompts have landed and the §8 reconciliation passed.** Nothing in
> this file remains to be executed. PRs #370 (01), #375 (02), #377 (03), #378 (04), #379 (05), and
> #380 (06); every one merged with GitHub CI green. **Not deployed** — that grant was never given.
>
> The reconciliation measured every touched surface at 1440×1000, 390×844, 320×844, and a
> 200%-equivalent reflow: **Live runtime 0 of 36 text nodes below AAA**, zero animations over 50ms
> under reduced motion, and a clean console across the whole traversal.
>
> Six primitives from the landed slices are binding on anything built next, and each is easy to
> re-fork by accident:
>
> 1. The focus ring is the single class `.rf-focus-ring`; do not write
>    `focus-visible:ring-2 focus-visible:ring-interactive`.
> 2. Live token re-maps live under `.bg-bg-live` in `index.css` plus `semantic.live.*` in
>    `tokens.json`.
> 3. `SourceList.tsx` is the one source-row, provider-handoff, selection, and tray grammar for Music
>    and Builder. Extend its action modes instead of copying its rows.
> 4. Provider state remains `providerCapabilityTruth` rendered by `ProviderCapabilityLedger`
>    (Catalog / Library / Playback). Do not create new labels or a second capability matrix.
> 5. `lib/class-ordering.ts` is the one ranking rule and the one next-step verb, shared by the
>    Classes shelf and the Live queue. A surface that ranks classes consumes it; it does not
>    re-derive one.
> 6. `lib/error-reference.ts` is how a failure is named to the instructor. No user-facing string
>    interpolates an upstream message.
>
> **Two findings this run measured but did not fix**, both pre-existing and both out of the slices'
> scope:
>
> - ~~The Builder surface's horizontal overflow is pre-existing.~~ **Corrected 2026-07-25: it was
>   introduced by prompt 05 and is now fixed.** The cause was not `CompactClassChooser` — that track
>   scrolls correctly inside itself (clientWidth 262, scrollWidth 1096). It was the move picker: a
>   native `<select>` sizes itself to its widest `<option>`, so carrying each move's description in the
>   label made the control 392px wide and pushed the document to 425px against a 320px viewport.
>   Proven by shortening the option text in the live DOM, which took the document straight back to 320.
>
>   The original "identical on clean `main` at `798b9dc`" comparison was **wrong**: it used `git stash`
>   while Vite served the page with HMR, and the harness navigated before the rebuild landed, so the
>   same code was measured twice. **Lesson for the next run: to compare against another commit, use a
>   separate checkout or wait for the dev server to actually reload — never `git stash` under a running
>   HMR server.**
> - `.rf-brand-mark` (the header "R") is ink on the copper gradient at **3.79:1**. It is a logotype,
>   which WCAG 1.4.3 exempts from contrast, and it is app-shell branding no slice touched — recorded
>   so the next run does not re-derive it as new.
>
> Prompt 02's evidence gap stands: the local mock seam returns an empty saved-playlist array, so the
> populated MUS-05 playlist-detail path was never verified and must not be claimed. LIVE-09 likewise
> remains `code-confirmed` only — the fixture class runs prompter-only and never requests a stream.

| Order | Prompt | Owns | Concurrency |
| --- | --- | --- | --- |
| 1 | [`01-shared-foundations.md`](implementation-prompts/01-shared-foundations.md) — ✅ landed | tokens, contrast gate, `ClassPulse`, intensity control, focus ring | **alone** |
| 2 | [`02-music-sourcing.md`](implementation-prompts/02-music-sourcing.md) — ✅ landed | source-list extraction, Music workspace, connections | serial w/ 03, 04, 06 |
| 3 | [`03-classes-ranking.md`](implementation-prompts/03-classes-ranking.md) — ✅ landed | Classes ordering, card verbs, mobile rail | serial w/ 02, 04, 06 |
| 4 | [`04-live-pressure.md`](implementation-prompts/04-live-pressure.md) — ✅ landed | Live queue density, runtime composition | serial w/ 02, 03, 06 |
| 5 | [`05-builder-moves.md`](implementation-prompts/05-builder-moves.md) — ✅ landed | move picker, moves dialogs | **parallel-safe** |
| 6 | [`06-truthful-state-copy.md`](implementation-prompts/06-truthful-state-copy.md) — ✅ landed | account trust copy, derived access mode, error hygiene | last; serial w/ 02–04 |

**The one hard constraint:** `apps/web/src/components/Dashboard.tsx` is 4,975 lines and prompts 02, 03,
04, and 06 all edit it. Ownership is partitioned by *workspace region*, not by file. **Never run two of
those concurrently.** Prompt 05 is the only slice that does not touch it, so it can run alongside any one
of them.

Recommended shape: **two lanes after 01** — Lane A runs 02 → 03 → 04 → 06 strictly serially; Lane B runs
05 whenever. More lanes will produce merge conflicts, not throughput.

### Step 3 — gates between slices

Each prompt carries its own acceptance criteria. `implementation-sequence.md` §7 defines the gates
between them. Do not start the next slice until the previous one's gate passes.

### Step 4 — final combined pass

After the last slice, run the reconciliation in `implementation-sequence.md` §8 — the full local gate,
browser regression at all four geometries, a re-measured contrast pass, reduced motion, and a clean
console. **Per-PR verification is not a substitute for this.**

---

## Measurement traps — read before you verify anything

This run produced two false findings before catching them. Both are easy to repeat, and neither looks
wrong in the output — the incorrect numbers are entirely plausible:

1. **Focus rings.** Tailwind's `outline-none` emits `outline: 2px solid transparent` and draws the real
   ring with `box-shadow`. Reading only `outline` reports "no focus ring" on controls that have one.
   **Read both.**
2. **Contrast on gradient fills.** The copper primary paints a `linear-gradient` with a transparent
   `background-color`. A naive ancestor walk finds the page background and reports ~1:1 for ink-on-copper,
   which actually measures 5.34–7.04:1. **Composite the gradient stops and take the worst one.**

Trap 2 is not merely a false-positive generator: correcting it is what surfaced a *real* finding — the
Live transport primary at 5.34:1, below the AAA target. Prompt 01 fixed it.

A third trap the audit did not hit, but an implementation session will: **Chrome grants
`:focus-visible` only when the last interaction was a keypress.** A programmatic `.focus()` reports "no
ring" on every control in the app. Send real Tab keys.

### Use the harness rather than re-deriving this

`agent-prompts/browser-verification/` handles all three. It drives real Chrome over the DevTools
Protocol with zero dependencies, and measures contrast (AAA thresholds on Live, worst backdrop per
node), focus rings, horizontal overflow, and animations under reduced motion. `auth.mjs` signs a
headless browser in as a local fixture user without a password.

**Run its self-test first, every time:**

```bash
node agent-prompts/browser-verification/selftest.mjs
```

It renders swatches whose correct ratio is computed from `tokens.json` and requires the harness to
agree — gradients included. Expectations are derived rather than hardcoded, so it cannot rot as tokens
change, and it is verified to fail when the harness is broken. **If the self-test disagrees with
`tokens.json`, nothing else the harness prints is trustworthy.** Start at
[`agent-prompts/browser-verification/README.md`](../../../agent-prompts/browser-verification/README.md).

---

## Non-negotiables that outrank every proposal here

- **Music constraints.** Official provider-authorized playback only. Never cache, proxy, download, decode,
  mix, crossfade, or analyze provider audio. **Never source BPM from Spotify.**
- **No schema or migration changes.** Nothing in this plan needs one. If a slice appears to require one,
  that is a stop condition — report it.
- **D20/D21 boundaries.** Solo-first, web-first. Multi-entry creative flow: never collapse the product to
  one forced funnel. Explore, Teams, sharing, collaborators, publishing, and pricing stay dormant.
- **Token changes go through `ritmofit_design_system/tokens.json`** and the documented generation
  workflow. Never hand-edit generated output.
- **Real-browser verification is mandatory** for non-trivial UI work. Do not declare completion without
  it. Use `agent-prompts/browser-verification/` — and run its self-test before trusting any number it
  gives you.
- **Do not over-literalize the prototype.** It is a review artifact, not a component library. Preserve the
  proposed hierarchy, behaviour, states, and craft — not its static markup.

---

## What is deliberately NOT in scope

| Item | Status |
| --- | --- |
| MUS-05 populated playlist detail | Cannot be verified locally — the mock seam returns an empty playlist array by design. Do not claim it works. |
| BLD-15 / BLD-16 preview failure and clip completion | Not induced this run; need real provider audio |
| LIVE-09 runtime playback failure | Not induced — prompter-only mode never requests a stream. Code-confirmed only. |
| CLS-00, SYS-02, SYS-03 | Code-confirmed only; no change proposed |
| Audible playback truth | Headless blocks `encrypted-media`; `AGENTS.md` already requires a real browser |
| Any IA change or fifth destination | Out of scope by the audit's own constraints |

If a slice tempts you to close one of these gaps, stop and ask — it is new scope, not this plan.

---

## Suggested first message for a fresh session

> Read `docs/audits/claude-design-audit-2026-07-24/IMPLEMENTATION-KICKOFF.md`, including the dated
> Step 2 status, then read the revision log in `run-decisions.md` and execute
> `implementation-prompts/03-classes-ranking.md`. All backlog items are owner-approved. Prompt 02
> landed in PR #375 at merge commit `2bbc1ed`, and gate G2 passed, so 03 is unblocked. Preserve
> `.rf-focus-ring`, `ClassPulse`, `SourceList`, and the existing provider capability truth/ledger
> rather than re-forking them. You are authorized to branch, commit, push, open a PR, and merge it once
> CI is green — **do not deploy.** Run the full CI-equivalent gate in `AGENTS.md`. Verify both class
> orderings in a real browser at 1440×1000, 390×844, and 320×844 with the committed
> `agent-prompts/browser-verification/` harness, and run its self-test before trusting measurements.

Swap in the next prompt filename for each subsequent slice.

---

## Housekeeping — done

Both items this file used to leave open are closed. [`docs/audits/README.md`](../README.md) now carries a
row for this run recording that all six prompts landed, and its 2026-07-19 row already describes that run
correctly as all six landed rather than "prompts 01–02 … implemented".

~~One item is genuinely open: `AGENTS.md` lists a `pnpm audit:ci` gate that is not defined.~~
**Corrected 2026-07-25: that finding was wrong.** `audit:ci` **is** defined in the root `package.json`
as `pnpm audit --prod`. It was reported missing after being run from `apps/web`, where pnpm's workspace
resolution answers `Command "audit:ci" not found` — the script is real, the working directory was not
the root. **Run the documented gate from the repository root.**

Worth knowing when it does fail: `pnpm audit` depends on npm's live advisory endpoint, which
intermittently returns a body pnpm cannot parse (`ERR_PNPM_AUDIT_BAD_RESPONSE`). That failure is
registry-side and reproduces for everyone at once — check whether it also fails on an untouched
checkout before treating it as a defect in your change.
