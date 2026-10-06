# Classes Home — Redesign Plan

<!-- note (Cursor, 2026-09-19): First draft, then revised the same day after an adversarial pass and an owner review. -->

> **Status: revised plan, rebased 2026-09-19 onto `e99e253`.** Not authorized to implement.
> [#434](https://github.com/steven-crosby/ritmofit-web/pull/434),
> [#435](https://github.com/steven-crosby/ritmofit-web/pull/435), and
> [#436](https://github.com/steven-crosby/ritmofit-web/pull/436) are on `main` and in production
> (Worker `29a72e1c`). This PR still finishes as a document. A later implementation lane starts from
> `main` after this merges.
>
> Shared decisions live in [`class-scaffold-contract.md`](./class-scaffold-contract.md). Where the two
> disagree, the contract wins. Companion visual:
> [`classes-home-redesign-mockup.html`](./classes-home-redesign-mockup.html) — the returning-user page,
> one list, no second copy of the library.

**Surface:** the authenticated landing page. There is no `/classes` route; `App.tsx` renders `Dashboard`
at `/` and `destination` defaults to `'classes'`.

---

## 1. What this revision changes

The first draft's findings still hold. Its page does not. An adversarial pass and the owner review
(two first-session instructors; templates scaffold everything but the music) overturned the layout.

| First draft | This revision | Why |
| --- | --- | --- |
| `Continue` cards plus a collapsed `All classes` | **One ranked list.** Search, sort, and tags appear only once the library is too long to scan. | The draft's own headline finding was that the library renders twice. Collapsing the second copy did not fix it. |
| Remove the rail, keep the shelf | Remove the shelf's *region*, keep its *ranking*, draw it as compact rows. The builder rail stays — [#434](https://github.com/steven-crosby/ritmofit-web/pull/434) already gave it a job (`Editing now`, folded create controls, `Duplicate`). | The shelf costs up to twelve `run-payload` fetches and blocks its order until all of them settle. The rail costs one `GET /classes`. |
| `Start from a playlist` as the copper primary | **`Start a class`**, discipline first, music second, quiet `Start empty`. | Shipped in `CreateClassDialog` (#436): 45 preselected, scaffold primary. This page should call that dialog, not invent a second create path. |
| Four equal shelf cards, each with a copper button | One copper control on the page. On an empty library it is the start action. Once classes exist, it is the top row's next step and start becomes quiet. | `05-components.md`: one copper primary per surface. The draft had two. |
| Move `derived · confirm` into the rehearsal view | **Dropped.** #434 deletes the control. A guessed shape stays marked `◇ auto-shaped`. | The pill saved nothing. Do not reintroduce it. |
| Hero `Turn your music into a class.` | Recommended, not locked: while the library is empty, *Pick a discipline. Ritmo lays out the class. You bring the music.* Once classes exist, the heading quiets to `Pick up where the energy left off.` | Both target instructors arrive with an empty library, so the first-visit heading has to say what the page is for. A returning session does not need a value proposition. |

## 2. Who the page is for

Both instructors land on the **empty** state. That is the primary design target. The populated page only
has to work at one to six classes for a long time; forty-class library management is not a launch job.

| | A — newly certified | B — leaving StructClub |
| --- | --- | --- |
| Has planned a class before | No | Yes, elsewhere |
| Arrives with | Nothing | Nothing in Ritmo |
| First success | A scaffolded class she can fill with music | One class she already teaches, rebuilt, feeling faster than StructClub |
| Must not see | A demand for a playlist she does not have | An import path. Recreation has to beat importing. |

No StructClub import. Settled in the contract (S1).

## 3. The page

### First visit — nothing in the library

```
CLASSES
Pick a discipline. Ritmo lays out the class. You bring the music.

[ Start a class ]                         ← the one copper primary
  Cycle, Pilates, or HIIT. Music comes next, or later.

  Start empty                             ← quiet, for B
```

`Start a class` opens the shipped `CreateClassDialog`. `Start empty` is the quiet path in that same
dialog (`mode: "empty"`). `09-class-builder-guidelines.md` still says a new class starts from a
template, not a blank — F7 is still an outstanding canon amendment, not a missing API.

The four-up "your first class can start anywhere" grid goes away. Four equal doors was the audit's B1
finding, and it fails Persona A, who needs one recommended start.

### Returning — one to six classes

```
CLASSES                                          [ Start a class ]
Pick up where the energy left off.
Closest to teachable first.

SoundCloud Test: Cool Down     Pilates · 9 · 7:58     ▁▂▄▆▇
◈ Can run live · 2 left        [ Add the missing tempo ]  [⋯]

Latin riiide                   Cycle · 6 · 5:11       ▂▄▆▅▃   2 left
Ambient Chill                  Cycle · 65 · 2:47      ▃▅▇▆▄   Ready
Jackson Remix                  Cycle · 30 · 1:49      ▁▃▅▄▂   Score the arc
```

One list. Ranked by `orderClassesBy('ready_to_teach', …)`, which Live already shares, so a class that
leads here leads in the Live queue. The verbs stay `classNextStep`'s verbs — this plan does not touch
`class-ordering.ts`.

The status line should adopt the builder's words. #434 changed `ClassReadinessSummary` to
`Can run live · 3 things left` and left `classNextStep` saying `Runnable · 2 to finish`. Same fact, two
dialects, on the two surfaces an instructor moves between. Align the shelf to the builder's sentence
when this is built. That is a copy change in `class-ordering.ts`, shared with Live, so it needs a
deliberate check of the Live queue rather than a silent edit.

Search, sort, and tag filter are not on this page until the loaded library no longer fits a scan.
Recommendation: reveal them past **8 classes**, inside the list header, not in a second region. Below
that, ranking is the organization.

### What moved off the page

| Today | After |
| --- | --- |
| Left rail at rest | Gone. In the builder it stays, as #434 left it. |
| `ClassRunOfShowShelf` card grid | The one list. Ranking logic kept. |
| `CLASS PULSE` panel, caption, confirm pill | Compact sparkline only. `◇ auto-shaped` stays, per #434 and principle 8 — a derived shape on a landing row still has to say so. |
| Readiness ledger, rehearsal, duplicate | Row overflow `⋯`, and the rehearsal view. #434 renamed Copy to Duplicate; keep that. |
| Twelve-wide payload prefetch that blocks ranking | Rank the rows already in hand from `GET /classes`, and fill shape and verb as each payload arrives. A row with no payload yet says `Reading…` and sorts last, which `classNextStep` already does for a loading state. |

The prefetch change is the "fast" fix that belongs on this page. `handleCreateClassFromPlaylist`
awaiting a full import is real, but it is not what a first-session instructor waits on, and it is
deferred until someone measures a 30-track import and finds it slow.

## 4. Decisions

| # | Call | State |
| --- | --- | --- |
| H1 | One list, not two regions | Decided here, from the adversarial pass |
| H2 | Empty state is the primary target | Decided, from the persona brief |
| H3 | One copper control; it moves from start to the top row once classes exist | Decided here, from `05-components.md` |
| H4 | Heading changes with library size | Recommended copy, not locked |
| H5 | `Start a class` / discipline first / `Start empty` quiet | **Decided and shipped** in #436. This page should reuse `CreateClassDialog`. |
| H6 | Organize controls hidden until 8 classes | Recommended threshold |
| H7 | Shelf status copy follows the builder (`Can run live · N left`) | Still open. `classNextStep` still says `Runnable · N to finish`; builder says `Can run live`. Check Live before editing. |
| H8 | Do not reintroduce `derived · confirm` | Decided by #434 |
| H9 | This PR does not implement. Next lane starts from `main` after this merges. | Still decided |

## 5. Slices for the implementation lane

Not this session. Ordered so each is shippable alone, and none starts before its dependency.

| Slice | Does | Depends on | Files |
| --- | --- | --- | --- |
| 1 | Extract the resting Classes view out of `Dashboard.tsx` into `ClassesHome.tsx`. Behaviour unchanged. | Current `main` | `Dashboard.tsx`, new `ClassesHome.tsx`, `Dashboard.test.tsx` |
| 2 | Replace rail + shelf with one ranked list. Compact rows, one copper verb on the top row, sparkline, overflow menu. | Slice 1 | `ClassesHome.tsx`, `ClassRunOfShowShelf.tsx` (deleted or reduced to the list), `ClassPulse.tsx` as shipped, `LibraryRail` untouched in the builder |
| 3 | Stop blocking rank on the full payload pool. Rows render from the list response; shape and verb fill in. | Slice 2 | `ClassesHome.tsx`. `class-ordering.ts` only if H7's copy change lands here. |
| 4 | Empty state: one start action, one quiet empty-start, no four-up grid. | Slice 1. Reuse `CreateClassDialog`; do not add a second create form. | `ClassesHome.tsx`, `CreateClassDialog.tsx` |
| 5 | Reveal search, sort, and tags only past 8 classes. | Slice 2 | `library-state.ts` unchanged; the controls move, they are not rewritten |

Explicitly not sliced: optimistic import, a cross-provider playlist picker, layered timeline, ghosts,
or re-pointing an existing `class_track` at a new `trackId` (contract F1, still true, no longer
blocking S2).

## 6. Verification, when it is built

- `readiness.test.ts` passes unchanged. `class-ordering.test.ts` changes only if H7 lands, and then the
  Live queue is checked because it shares `classNextStep`.
- A class with zero cues still reports as unchoreographed after a scaffold, per contract F4. Ghost
  markers and placeholder text create no rows, so this holds provided the implementation does not
  "helpfully" insert example cues.
- `pnpm --filter @ritmofit/web theme-classes`, the design-system `verify`, and
  `apps/web/smoke/narrow-width.smoke.mjs` at 390 and 320. #434 records `functional.smoke.mjs` failing
  from `auth:signout` onward for a pre-existing reason (sign-out moved out of an Account settings
  dialog). That failure is not this work.
- Keyboard: the one list, the overflow menu, and the empty-state actions. Placeholder text is never the
  only label.

## 7. What this plan does not decide

Scaffold shape, zone anchoring, ghost markers, placeholder cue text, and the bind-a-song operation are
in the contract, owned by the other two lanes. This page only has to call whatever create API they
ship, and to keep ranking honest when they do.
