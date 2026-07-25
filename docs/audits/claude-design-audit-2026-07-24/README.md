# Ritmo Studio design audit — `claude`, 2026-07-24

**Start here.** This folder is one complete audit run: what the product is today, what it should become,
a navigable prototype of that proposal, and ready-to-paste implementation prompts.

> **✅ APPROVED 2026-07-24.** The owner approved all 18 backlog items and resolved all three product
> decisions in chat; the dispositions are transcribed in [`run-decisions.md`](run-decisions.md), which is
> the authority. All six implementation prompts are **authorized to execute**.
>
> **Starting an implementation session? Go to
> [`IMPLEMENTATION-KICKOFF.md`](IMPLEMENTATION-KICKOFF.md).**
>
> Approval covers **implementation only** — commit, push, PR, merge, and deploy remain separate grants.

---

## 1. Verdict and thesis

**Ritmo Studio has won its structural argument.** Readiness, Class Pulse, and the recovery grammar are
coherent from the marketing page to the Live runtime, and all six implementation slices from the
2026-07-19 run landed. The product now reads as an instrument rather than an admin tool, and its error
and loading states are the best-written part of it.

**The thesis for what comes next is distribution and decisiveness, not more structure.** Three things
hold it back: a co-equal navigation destination (Music) that cannot actually browse music; ranked lists
that optimise for *what needs work* and therefore bury *what is ready to teach*; and surfaces that offer
four equal choices where the product already knows enough to have an opinion. One measured accessibility
failure sits underneath all of it — Live misses the AAA contrast target its own design system sets, and
the repository's contrast gate cannot catch it.

## 2. Run metadata

| Field | Value |
| --- | --- |
| Agent slug | `claude` |
| Run date | 2026-07-24 |
| Baseline branch | `main` |
| Baseline commit | `9b188df7b38a607a208343cd7f73f7c7f4ee4bbe` |
| Prior run | `2026-07-19-full-product-preview` (baseline `addaff3f`; 31 commits behind, 14 touching app code) |
| Pack version | 6 |
| Phases completed | 0, 0b, 1, 2, 3, 4, 5 — all |
| Folder size | **12.5 MB** (budget 15 MB) |

**One correction to the audit index.** [`docs/audits/README.md`](../README.md) describes the prior run as
"prompts 01–02 and the reconciliation pass implemented". The git history shows **all six** prompts landed
(`c6eca5f`, `c2ff378`, `a83c32c`, `5d4fe18`, `07777e4`, `de3b4f3`, plus the narrow repair `1be7d7e`).
That row understates what shipped, and it is why most prior findings return here as `resolved-since`.

## 3. Open the prototype

```bash
python3 -m http.server 8099
```

Then open:

```
http://127.0.0.1:8099/docs/audits/claude-design-audit-2026-07-24/mockups/index.html
```

Serving from the **repository root** matters — each view loads its matching current screenshot for
side-by-side comparison.

## 4. Recommended review order

1. **[`mockups/index.html#music-home`](mockups/index.html)** — the biggest proposed change.
2. **`#classes-home`** — toggle "Ready to teach" / "Needs work" to see the ordering question.
3. **`#live-run`** — the contrast fix, with running / paused / failed states.
4. **`#live-queue`** — four classes visible instead of 1.7.
5. **`#builder-workbench`** and **`#builder-inspector`** — mostly preserved; note the intensity control.
6. **`#foundations`** — the greyscale proof and the shared primitives.
7. Flip the **Mobile 390** switch and re-read 1–5.

Direct anchors for every primary surface: `#pub-entry` `#pub-auth` `#pub-recovery` `#pub-invite`
`#sys-states` `#classes-home` `#classes-fresh` `#class-empty` `#class-rehearsal` `#class-library-error`
`#music-home` `#music-likes` `#connections-dialog` `#builder-workbench` `#builder-inspector`
`#builder-addmusic` `#builder-moves` `#live-queue` `#live-preflight` `#live-run` `#live-run-of-show`
`#account` `#foundations`.

## 5. The five most consequential proposed changes

| # | Change | Why it matters |
| --- | --- | --- |
| 1 | **Music becomes a sourcing workspace** (P0-01) | Music is a primary destination whose headline says "Browse music" and whose ledger says catalog browsing needs no connection — yet it offers no search, no results, and ~40% empty viewport. Search exists only inside Builder. |
| 2 | **Live meets its AAA contrast target** (P0-04 + P0-05) | Measured: 13 of 29 Live text nodes sit at 5.84–6.70:1 against a 7:1 target, plus the transport primary's ink label at 5.38:1. These are the labels read at distance, mid-class. The design system's own gate only checks AA, so it cannot catch this. |
| 3 | **Rank by what you are about to teach** (P0-02 + P0-03) | The 10-track, fully-scored class appears in none of the four priority cards and last in the Live queue, while three of four cards share the identical primary label "Finish refinements". |
| 4 | **Class Pulse never renders flat** (P0-07) | A class whose tracks share one effort draws a uniform bar — explicitly forbidden by `10-rhythm-system.md` §4 and `09-class-builder-guidelines.md`, which require a derived arc. |
| 5 | **The interface only claims what it knows** (P1-05) | "Profile verified" means *the profile payload loaded*; the invite-only notice is a hardcoded literal; and the library error prints the raw upstream message ("…: boom"). |

## 6. Comparing current and proposed

- **In the prototype:** every view has a disclosure — *"Show the current screenshot this replaces"* —
  which reveals the current capture inline without contaminating the proposed UI.
- **On disk:** [`screenshots/current/`](screenshots/current/) (122 files) and
  [`screenshots/proposed/`](screenshots/proposed/) (47 files) use matching
  `<SURFACE-ID>-<view>-<viewport>.jpg` names, so the pairs line up in any file browser.
  Example: `current/LIVE-01-queue-desktop.jpg` ↔ `proposed/LIVE-01-queue-desktop.jpg`.

## 7. Coverage, gaps, and what the prototype cannot honestly show

**Coverage:** all 51 registry surfaces traced. **0 new, 0 retired** — `agent-prompts/design-audit/surface-ids.md`
needed no edit. 30 `primary`, 18 `must-mock-state`, 1 `reference-only`.
Evidence: **42 observed · 3 code-confirmed · 4 not-checked.**
122 current captures, 47 proposed, across 1440×1000, 640×500 (200%-equivalent), 390×844, and 320×844.

**Gaps — stated plainly, never rounded up:**

| Surface | Why it could not be verified |
| --- | --- |
| MUS-05 playlist detail | The local mock provider seam returns an **empty** playlist array by design (`user-playlists.ts:114`) |
| BLD-15 / BLD-16 preview failure & clip complete | Need real provider audio progression; the mock seam has no resume-failure path |
| LIVE-09 runtime playback failure | The fixture class runs prompter-only, so no stream is requested and no failure surface appears |
| CLS-00 onboarding tutorial | The pending flag is written only by the in-app sign-up path (`App.tsx:78`); fixture accounts were created via the API |
| SYS-02 / SYS-03 | Need a real service-worker update cycle and a forced render throw |
| Audible playback (BLD-06, Live) | Headless Chromium blocks `encrypted-media`; `AGENTS.md` already requires a real browser for playback verification |

Each of these is marked in the prototype with an amber **"Current behaviour not verified in this run"**
note, so no proposal appears better-evidenced than it is.

**Fixture deviations:** the mock catalog holds 6 tracks where `fixtures.md` asks for 10, so Sunrise
Climb's tracks 7–10 are explicit deterministic additions; `ENCRYPTION_KEY` was set locally (blank in the
example file, and without it every provider connection 503s, which would have manufactured a false
finding); `BETA_ALLOWED_EMAILS` was briefly populated to induce PUB-07 then reverted; Spotify's expiry
was set to the past in local D1 to produce a genuine mixed connection state; a sixth class
("SoundCloud likes") exists because scenario 2 was exercised end to end. Full detail in
[`critique.md`](critique.md) §H.

## 8. Decisions — settled 2026-07-24

[`run-decisions.md`](run-decisions.md) is complete: all 18 backlog items carry `approve`, all 46 surface
rows and 6 global-direction rows are dispositioned, and every owner-gate box is checked. The three product
decisions were answered explicitly:

| ID | Owner's resolution |
| --- | --- |
| **PDR-01** | **Teaching readiness is the default** on both Classes and Live; the labelled switch keeps "needs work" available. |
| **PDR-02** | **Music owns sourcing** via one shared source-list component, consumed by Music and Builder's Add music. |
| **PDR-03** | **Group and demote** — current template first, other disciplines collapsed but reachable, never hidden. |

Those resolutions are written into prompts 02, 03, and 05, which previously carried "stop if unresolved"
clauses. All six prompts are executable.

**Next step:** hand a fresh session [`IMPLEMENTATION-KICKOFF.md`](IMPLEMENTATION-KICKOFF.md).

## 9. Authorization

**Status: approved 2026-07-24.** All 18 backlog items carry `approve`; PDR-01, PDR-02, and PDR-03 are
resolved (teaching-readiness default · Music owns sourcing · group-and-demote). All six prompts are
authorized. Start at [`IMPLEMENTATION-KICKOFF.md`](IMPLEMENTATION-KICKOFF.md).

This run made **no Git commits, opened no PR, changed no production code, proposed no schema or migration
change, and deployed nothing.** The only files it wrote are inside this folder. Owner disposition,
implementation, commit, push, PR, merge, and deploy are seven separate grants — approving an item here
authorizes *implementation of that item, in a separate session*, and nothing more.

## 10. Contents

| Path | What it is |
| --- | --- |
| [`surface-inventory.md`](surface-inventory.md) | All 51 surfaces bound to canonical IDs, with evidence and coverage labels |
| [`critique.md`](critique.md) | Verdict, workflow findings, per-surface critique, system/brand/accessibility analysis, evidence ledger |
| [`backlog.md`](backlog.md) | 18 ranked items + 3 product decisions, with scenario, dependency, and kill lists |
| [`preview-brief.md`](preview-brief.md) | The binding spec the prototype was built against |
| [`mockups/`](mockups/) | The navigable prototype + its adversarial craft-pass log |
| [`screenshots/current/`](screenshots/current/) · [`proposed/`](screenshots/proposed/) | 122 + 47 captures |
| [`shared-foundations-contract.md`](shared-foundations-contract.md) | The primitives prompts 02–06 may not redefine |
| [`implementation-sequence.md`](implementation-sequence.md) | Order, dependencies, collisions, gates, parallelisation |
| [`implementation-prompts/`](implementation-prompts/) | Six standalone, executable prompts — **proposals only** |
| [`IMPLEMENTATION-KICKOFF.md`](IMPLEMENTATION-KICKOFF.md) | **Start here to implement.** Authorization status, order, traps, non-negotiables |
| [`run-decisions.md`](run-decisions.md) | The owner ledger &mdash; all dispositions recorded 2026-07-24 |

**Folder size: 12.5 MB** (budget 15 MB). No coverage was dropped to meet it.
