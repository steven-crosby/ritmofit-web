# Shared foundations contract

**Run:** `docs/audits/claude-design-audit-2026-07-24/` · **Baseline:** `main` @ `9b188df`
**Owned by:** `implementation-prompts/01-shared-foundations.md`
**Consumed by:** prompts 02–06.

> **Proposal only.** This contract describes primitives that do not exist yet. It is not authorized work.
> Nothing here may be implemented until the owner records `approve` or `approve-with-notes` for the
> backlog IDs below in `run-decisions.md`.

Prompt 01 owns every primitive on this page. Prompts 02–06 **consume** them and must not redefine,
fork, or locally re-style any of them. This is what stops six slices from producing six dialects of the
same state.

---

## Backlog IDs this foundation covers

| ID | Title |
| --- | --- |
| P0-04 | Live text meets the AAA contrast target |
| P0-05 | The Live AAA target is gated in the design-system verifier |
| P0-07 | Class Pulse never renders flat for a class that has tracks |
| P0-08 | Duplicated empty-state copy and the zero-size canvas error |
| P1-01 | Intensity control returns to the canon selection treatment |
| P1-08 | One focus-ring treatment everywhere |

---

## 1. Token layer

Two **re-maps of existing values**. No new token value is introduced, and no primitive ramp changes.

| Token | Today | Proposed | Scope | Measured |
| --- | --- | --- | --- | --- |
| Live supporting label | `text/tertiary` (`bone-400` `#9E927E`) | `text/secondary` (`bone-300` `#C9BEAA`) | Live surfaces only | 6.79:1 → **11.30:1** on `bg/live` |
| Live primary fill | `copper-400 → copper-500` | `copper-400 → copper-300` | Live surfaces only | ink label 5.38:1 → **7.04:1** at the darkest stop |

**Planning surfaces are unchanged.** `text/tertiary` remains correct at AA on `bg/base`, and the standard
copper primary keeps its current gradient everywhere outside Live.

Token edits go through `ritmofit_design_system/tokens.json` and the documented generation workflow
(`npm run build`, `npm run build:ios`). Never hand-edit generated output.

### Gate (P0-05)

`ritmofit_design_system/scripts/check-contrast.mjs` currently declares AA pairs only (4.5 / 3.0) and has
no Live entry, so the AAA target documented in `07-accessibility.md` is unenforceable. Prompt 01 adds
Live pairs at **7.0 for text and 4.5 for large display**, including the ink-on-Live-primary pair. After
this, P0-04 cannot silently regress.

---

## 2. `ClassPulse` — the signature component

**File:** `apps/web/src/components/ClassPulse.tsx`

### Guarantees

1. **Never a flat slab (P0-07).** When every track carries the same stored effort, the component derives a
   warm-up → build → peak → release shape from track order, duration, and section data, and captions it
   with the assumption it made. Only a class with **zero** tracks shows the empty invitation.
2. **The empty invitation renders exactly once (P0-08).** Today `{coverage}` is rendered at both
   `ClassPulse.tsx:97` and `:160`, so an empty pulse prints its sentence twice — visible on CLS-01,
   CLS-03, and CLS-04. Exactly one of those call sites survives.
3. **Provenance is always visible.** The `◇ derived · confirm` marker sits on the caution channel with a
   glyph, honouring the prior run's PDR-02 boundary: derived and confirmable, never a persistence claim.
   **No schema change. No new persisted field.**
4. **Unscored effort is encoded without colour** — a hatch pattern plus the count in the caption.
5. **No zero-size canvas (P0-08).** The pattern fill must not be created before the element has non-zero
   dimensions. The current build throws
   `InvalidStateError: Failed to execute 'createPattern' … width or height of 0` during Builder use.

### Props consuming surfaces may set

`model` (segments + state), `compact`, `confirmed`, `onConfirm`, `className`. Consumers **must not**
re-implement the derivation, restyle the bars, or suppress the provenance marker.

### Accessibility the component guarantees

An `aria-label` describing the arc in words (effort sequence + coverage), height-encoded bars, and
hatching for unscored spans. Callers supply the class context; the component supplies the description.

---

## 3. `IntensitySegmentedControl` (P1-01)

**File:** `apps/web/src/components/IntensitySegmentedControl.tsx`

| Rule | Requirement |
| --- | --- |
| Selection | Neutral fill + **3px cyan bottom indicator**, per `09-class-builder-guidelines.md`. **Copper is not a selection fill** — it is identity and the one primary action. |
| Encoding | Zone number, bar count, and word are all present; the number is visually separated from the word ("Z1 Build", not "Z1Build"). |
| Layout | All five options fit **one row down to a 280px inspector**. The current control wraps and orphans "All Out" onto a second line. |
| State | `aria-pressed` carries selection; a textual summary carries it for assistive tech. |
| Targets | ≥ 44px. |

---

## 4. Focus ring (P1-08)

One treatment, everywhere: **3px solid `interactive/focus-ring` (`#74D6E5`) at 2px offset.**

Today two coexist — a 3px `#74D6E5` outline on some controls and a 2px `#3AC0D4` box-shadow ring on
others (measured across a 14-stop Live traversal). Both are visible, so this is a consistency fix, not an
accessibility defect. Prompt 01 settles it centrally; prompts 02–06 must not introduce a third.

Note for implementers: Tailwind's `outline-none` emits `outline: 2px solid transparent` and draws the
ring with `box-shadow`. Verify the ring by reading **both** `outline` and `box-shadow`, or you will
measure a false negative.

---

## 5. State and recovery grammar (already shipped — freeze, do not fork)

The existing `StatusLabel` and `RecoveryState` contracts in `05-components.md` are **the strongest system
work in the current product** and are deliberately not being redesigned. Every consuming prompt reuses
them as-is.

`RecoveryState` order stays: what happened → what remains safe → the best next action → a truthful
secondary escape.

The only change any prompt may make is the one owned by prompt 06: **user-facing copy must not
interpolate a raw upstream error message.** `CLS-05` currently renders "Ritmo could not read the class
list: boom", where `boom` came straight from the failing response.

---

## 6. What consuming prompts are forbidden from redefining

| Prompt | Consumes | Must not |
| --- | --- | --- |
| 02 Music + provider truth | provider state matrix, focus ring, buttons | invent a second provider-state vocabulary or a second connect affordance style |
| 03 Classes | `ClassPulse`, readiness derivation, focus ring | re-derive class shape locally or restyle the pulse per surface |
| 04 Live | Live tokens, `ClassPulse`, focus ring | hard-code a Live label colour or fork the pulse for the HUD |
| 05 Builder moves | `IntensitySegmentedControl`, focus ring | restyle intensity selection inside the inspector |
| 06 Truthful copy | `StatusLabel`, `RecoveryState` | introduce a new status vocabulary |

## 7. Integration gate

Prompt 01 must be merged and verified before 02–06 begin. Its acceptance evidence is:

- `npm run verify` in `ritmofit_design_system/` passes **with the new Live AAA pairs present**.
- A measured browser pass showing every Live text node ≥ 7:1 (large display ≥ 4.5:1), including the
  transport primary's ink label.
- A class whose tracks all share one effort renders a derived arc, not a flat bar.
- An empty Class Pulse prints its invitation once.
- No `createPattern` error in the console across a full Builder session.
