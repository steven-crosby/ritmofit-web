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

### What is still NOT granted

Approval covers **implementation only**. Commit, push, PR, merge, and deploy are **separate grants** — ask
the owner for each. This audit run performed no Git operation and edited no production file; keep that
property until the owner says otherwise.

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

| Order | Prompt | Owns | Concurrency |
| --- | --- | --- | --- |
| 1 | [`01-shared-foundations.md`](implementation-prompts/01-shared-foundations.md) | tokens, contrast gate, `ClassPulse`, intensity control, focus ring | **alone** |
| 2 | [`02-music-sourcing.md`](implementation-prompts/02-music-sourcing.md) | source-list extraction, Music workspace, connections | serial w/ 03, 04, 06 |
| 3 | [`03-classes-ranking.md`](implementation-prompts/03-classes-ranking.md) | Classes ordering, card verbs, mobile rail | serial w/ 02, 04, 06 |
| 4 | [`04-live-pressure.md`](implementation-prompts/04-live-pressure.md) | Live queue density, runtime composition | serial w/ 02, 03, 06 |
| 5 | [`05-builder-moves.md`](implementation-prompts/05-builder-moves.md) | move picker, moves dialogs | **parallel-safe** |
| 6 | [`06-truthful-state-copy.md`](implementation-prompts/06-truthful-state-copy.md) | account trust copy, derived access mode, error hygiene | last; serial w/ 02–04 |

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

This run produced two false findings before catching them. Both are easy to repeat:

1. **Focus rings.** Tailwind's `outline-none` emits `outline: 2px solid transparent` and draws the real
   ring with `box-shadow`. Reading only `outline` reports "no focus ring" on controls that have one.
   **Read both.**
2. **Contrast on gradient fills.** The copper primary paints a `linear-gradient` with a transparent
   `background-color`. A naive ancestor walk finds the page background and reports ~1:1 for ink-on-copper,
   which actually measures 5.38–7.04:1. **Composite the gradient stops.**

Trap 2 is not merely a false-positive generator: correcting it is what surfaced a *real* finding — the
Live transport primary at 5.38:1, below the AAA target. Prompt 01 fixes it.

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
- **Real-browser verification is mandatory** for non-trivial UI work. Do not declare completion without it.
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

> Read `docs/audits/claude-design-audit-2026-07-24/IMPLEMENTATION-KICKOFF.md`, then execute
> `implementation-prompts/01-shared-foundations.md`. All backlog items are owner-approved per
> `run-decisions.md` (2026-07-24). Implementation only — do not commit, push, open a PR, merge, or deploy.

Swap in the next prompt filename for each subsequent slice.

---

## Two housekeeping items for the owner

1. **The audit index row is not yet added.** [`docs/audits/README.md`](../README.md) has no row for this
   run. This run deliberately wrote nothing outside its own folder, so adding it is your call.
2. **That same index describes the 2026-07-19 run as "prompts 01–02 … implemented"**, but git shows all
   six landed (`c6eca5f`, `c2ff378`, `a83c32c`, `5d4fe18`, `07777e4`, `de3b4f3`, `1be7d7e`). Worth
   correcting so the next audit is not misled about the baseline.
