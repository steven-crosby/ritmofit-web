# Proposed implementation sequence

**Run:** `docs/audits/claude-design-audit-2026-07-24/` · **Baseline:** `main` @ `9b188df7b38a607a208343cd7f73f7c7f4ee4bbe`

> **Nothing in this sequence is authorized.** These are proposals generated from this run's own
> recommendations, before the owner has judged anything. No prompt may be executed until
> `run-decisions.md` records `approve` or `approve-with-notes` for its backlog IDs.

## 1. Proposed thesis

Ritmo Studio's structure is settled; what remains is **distribution and decisiveness**. Put sourcing where
the product says sourcing lives, make every ranked list answer the instructor's real question, let each
surface commit to one action, and bring Live up to the contrast target its own design system sets.

## 2. Ordered slices

| # | Prompt | Owns | Why here |
| --- | --- | --- | --- |
| 01 | `01-shared-foundations.md` | tokens, contrast gate, `ClassPulse`, intensity control, focus ring | Every other slice consumes these. Landing them first stops five surfaces inventing five dialects, and makes the Live contrast fix measurable before Live layout moves. |
| 02 | `02-music-sourcing.md` | source list extraction, Music workspace, connections | The largest change and the one that must own the shared source-list component before Builder's Add music can share it. |
| 03 | `03-classes-ranking.md` | Classes ordering, card actions, mobile rail | Depends on the readiness derivation and `ClassPulse` from 01; independent of Music once 02's extraction is merged. |
| 04 | `04-live-pressure.md` | Live queue density, runtime composition | Consumes 01's Live tokens; touches a different `Dashboard.tsx` region than 02/03. |
| 05 | `05-builder-moves.md` | move picker grouping, inspector | Smallest, fully disjoint — the only slice that does not touch `Dashboard.tsx`. |
| 06 | `06-truthful-state-copy.md` | account trust copy, derived access mode, error hygiene | Last, because it reconciles copy across surfaces the earlier slices reshape. |

## 3. Dependency graph

```text
01 shared foundations ──┬── 02 music sourcing ──┐
                        ├── 03 classes ─────────┤
                        ├── 04 live ────────────┼── final reconciliation
                        ├── 05 builder moves ───┤
                        └── 06 truthful copy ───┘
```

01 is a hard gate. 05 may run alongside any other slice. 02, 03, 04, and 06 all edit `Dashboard.tsx`
and must be serialized against each other.

## 4. Ownership map

| Prompt | Likely files (owned) | Frozen for that prompt |
| --- | --- | --- |
| 01 | `ritmofit_design_system/tokens.json`, `scripts/check-contrast.mjs`, `ClassPulse.tsx`, `IntensitySegmentedControl.tsx`, shared control styles, `tailwind.config.js` | all of `Dashboard.tsx`; every workspace region |
| 02 | `TrackSearch.tsx`, new shared source-list component, `Dashboard.tsx` **MusicWorkspace region only**, `ConnectionsDialog.tsx`, `ProviderCapabilityLedger.tsx` | `ClassPulse.tsx`, tokens, `LiveMode.tsx`, classes region |
| 03 | `ClassRunOfShowShelf.tsx`, `LibraryRail.tsx`, `Dashboard.tsx` **classes region only**; reads `readiness.ts` | `readiness.ts` derivation logic, `ClassPulse.tsx`, tokens, music/live regions |
| 04 | `LiveMode.tsx`, `LiveTimeline.tsx`, `LivePreflight.tsx`, `Dashboard.tsx` **LiveWorkspace region only** | tokens, `ClassPulse.tsx`, classes/music regions |
| 05 | `ChoreographyEditor.tsx` move picker, `CustomMovesDialog.tsx`, `SongsByMoveDialog.tsx` | `IntensitySegmentedControl.tsx`, `Dashboard.tsx` |
| 06 | `Dashboard.tsx` **account region only**, `apps/api/src/routes/auth.ts`, class-library error branch | every other region; all tokens |

**`apps/web/src/components/Dashboard.tsx` is 4,975 lines and is the dominant collision surface.**
Ownership is partitioned by *workspace region*, not by file. Two prompts that both edit it must never run
concurrently, regardless of how disjoint their regions look.

## 5. Collision map — must not run concurrently

| Pair | Reason |
| --- | --- |
| 02 ↔ 03 ↔ 04 ↔ 06 | all edit `Dashboard.tsx` |
| 01 ↔ anything | 01 changes tokens and shared primitives every other slice renders against |
| 05 ↔ 01 | 05 consumes `IntensitySegmentedControl` |

Safe to run concurrently: **05 with any one of 02 / 03 / 04 / 06** (05 does not touch `Dashboard.tsx`).

## 6. Parallelization recommendation

**Two lanes at most, and only after 01 merges.**

- Lane A: 02 → 03 → 04 → 06, strictly serial (shared `Dashboard.tsx`).
- Lane B: 05, any time after 01.

More lanes would not help: the file-ownership evidence shows a single dominant file, and forcing
parallelism across it produces merge conflicts rather than throughput. Do not assume a fixed lane count
from a previous round.

## 7. Integration gates

| Gate | Between | Must pass |
| --- | --- | --- |
| G1 | after 01 | `ritmofit_design_system` `npm run verify` green **with new Live AAA pairs**; measured browser pass showing every Live text node ≥ 7:1; single-effort class renders a derived arc; empty pulse prints once; no `createPattern` error |
| G2 | after 02 | Music can search, preview, select, and start a class without entering Builder; Builder's Add music renders from the same extracted component; no provider-state vocabulary forked |
| G3 | after 03 | Ordering is labelled and switchable; no two visible cards share a primary label unless their next step is identical; a class is visible at 390 without scrolling |
| G4 | after 04 | Four queue cards visible at 1440×1000; Live runtime still passes the G1 contrast measurement after layout changes |
| G5 | after 05 | Moves grouped by template with the open class's discipline first; cross-discipline borrowing still reachable |
| G6 | after 06 | No user-facing string claims something the system has not verified; no raw upstream message reaches the UI |

## 8. Final combined pass

After the last approved slice, run one reconciliation across the whole product — not per-PR:

1. Full local gate: `pnpm format:check`, `pnpm -r typecheck`, `pnpm lint`,
   `(cd ritmofit_design_system && npm run verify)`, `pnpm test`,
   `pnpm --filter @ritmofit/api test:integration`, `pnpm --filter @ritmofit/web build`,
   `pnpm --filter @ritmofit/api openapi` + `git diff --exit-code apps/api/openapi/openapi.json`,
   `pnpm --filter @ritmofit/api contract-parity`, `pnpm audit:ci`.
2. Browser regression at 1440×1000, 390×844, 320×844, and a 200%-equivalent reflow across every surface
   ID this run touched.
3. A re-measured contrast pass on Live (AAA) and the planning surfaces (AA), reading **both** `outline`
   and `box-shadow` for focus and compositing gradient stops for fills — the naive method produces false
   results on this codebase in both directions.
4. Reduced-motion check: zero animations over 50ms on the Live runtime.
5. Console must be clean of the `createPattern` error across a full Builder session.

## 9. Deferred and owner-decision items

**Excluded from every prompt** — these appear nowhere as an invitation to implement:

| ID | Status | What the owner must decide |
| --- | --- | --- |
| PDR-01 | product-decision-required | Should Classes and Live rank by teaching-readiness or by remaining work? Prompt 03 implements a labelled switch, but the **default** is the owner's call. |
| PDR-02 | product-decision-required | Should Music own catalog search, or should search stay in Builder and Music become an explicit entry surface? Prompt 02 assumes Music owns sourcing via a shared component. |
| PDR-03 | product-decision-required | Should the move library hide other disciplines or group and demote them? Prompt 05 assumes group-and-demote. |

**P2-01** (spend the empty regions on Live and Music) is folded into prompts 04 and 02 respectively,
because those surfaces are already being recomposed and leaving the void would contradict the change.
**P2-02** (move schema vocabulary out of the creative path) is folded into prompt 03.

Every backlog ID is owned by exactly one prompt:

| Prompt | Owns |
| --- | --- |
| 01 | P0-04, P0-05, P0-07, P0-08, P1-01, P1-08 |
| 02 | P0-01, P0-06, P1-02, P2-01 (Music half) |
| 03 | P0-02, P0-03, P1-06, P1-07, P2-02 |
| 04 | P1-03, P2-01 (Live half) |
| 05 | P1-04 |
| 06 | P1-05 |

## 10. Permissions reminder

**Owner disposition, implementation, commit, push, PR, merge, and deploy are seven separate grants.**

Recording `approve` in `run-decisions.md` authorizes *implementation of that item*, in a separate session,
and nothing else. It is not permission to commit, open a PR, merge, or deploy. This audit run performed no
Git operation of any kind and edited no production file.
