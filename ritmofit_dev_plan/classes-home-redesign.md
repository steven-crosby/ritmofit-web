# Classes Home — Redesign Plan

<!-- note (Cursor, 2026-09-19): Proposal written from an owner critique of the post-login Classes page. -->

> **Status: proposal. Not authorized, not implemented.** No production code changed in the commit that
> introduces this file. Per `AGENTS.md` › Working Agreement, a page-level redesign is substantial work
> and needs owner confirmation before any slice is built. Sign off (or amend) the decisions in
> [§8](#8-decisions-needed-before-any-slice-starts), then the slices in [§7](#7-slices) become buildable.
>
> Companion visual: [`classes-home-redesign-mockup.html`](./classes-home-redesign-mockup.html) — a static,
> framework-free render of the proposed page using the real design tokens and fonts. Open it in a browser.

**Surface:** the authenticated landing page — `destination === 'classes'` with no class open. There is no
`/classes` URL; `App.tsx` renders `Dashboard` at `/` and `Dashboard` defaults `destination` to `'classes'`.

**Scope of the complaint (owner, 2026-09-19):** the left column does not explain itself, the middle column
is cluttered and its heading/subheading do not say what the page is for, and "New class" is small and
dismissable — so an instructor who arrives thinking *"I need to make a class from the playlist I built in
Spotify"* has no obvious way to do it. The stated bar is **simple, stupid, easy, fast** at the top level,
with granularity and specificity **layered and on-demand** underneath.

---

## 1. Findings

Each one is a property of the code as it stands, not an opinion about taste.

**F1 — The page renders the same library twice.** `LibraryRail` and `ClassRunOfShowShelf` both read the
single `classes` array that `Dashboard.refreshClasses` fetches from `GET /classes`. On the resting page
the rail has no job the shelf is not already doing, which is exactly why it reads as unexplained
furniture. Its entire self-description is a 12px uppercase `Your classes` and a `6 loaded` count.

**F2 — The rail's functions are hidden behind one drawer that names three unrelated jobs.** The
`<details>` summary reads `New class, filters, and search`. Creating a class — the highest-intent action
on the page — shares a container with sorting a list.

**F3 — Creating a blank class requires two inputs before the button turns on.** `CreateClassForm` gates on
`title.trim().length > 0 && template != null`, and the button says `Add`, which is a list-append verb
rather than a create-a-class verb.

**F4 — The headline describes an ordering, not a purpose.** `Pick up where the energy left off.` followed
by `Ordered by ready to teach — closest to teachable first.` Both sentences assume you already have
classes and already know what Ritmo is for. Neither tells you what this page does.

**F5 — Each shelf card carries about ten information atoms.** Eyebrow, title, duration, discipline ·
track count, the `CLASS PULSE` panel label, the `derived · confirm` badge, the ribbon itself, the coverage
caption, the `Runnable · 2 to finish` status line, the primary button, and the secondary button. Four of
those describe *how Ritmo derived the shape* — a second-order concern at the moment you are deciding
which class to open.

**F6 — A session-only toggle occupies a badge on every landing card.** `confirmedPulseIds` lives in
`Dashboard` component state, is never sent to the API, and does not survive a reload. It is presented
with the same weight as the class's readiness.

**F7 — The job with the most intent behind it is absent from the page.** Turning a saved provider playlist
into a class today takes six actions across two destinations: Classes → `Music` nav → locate the provider
card in the Sources rail → `Playlists · N` → pick a discipline → `Open` the playlist → `Start class`.
Nothing on the Classes page points at any of it.

**F8 — Starting from a playlist blocks on the whole import.** `handleCreateClassFromPlaylist` awaits
`importCollectionTracks` in full before calling `openClass`. That helper runs `importTrack` then
`addTrack` per track at concurrency 4, so a 30-track playlist is roughly 60 round trips behind a
`Creating...` label with no progress.

## 2. Root cause

The page is organized around **what Ritmo knows about your classes** — readiness derivation, ordering
choice, pulse coverage — rather than **what you came here to do**. Two of its three regions are the class
library and the third is instrumentation about the library. None of them is a starting line.

That also explains the specific symptoms the owner named. The left column feels purposeless because it is
a duplicate. The middle feels cluttered because it is showing its work. "New class" feels dismissable
because it was filed under library housekeeping instead of under *start something*.

## 3. Direction

Four rules. Every proposal below traces to one of them.

**R1 — One page, two questions, in order: start something, or continue something.** Everything else is
third-tier.

**R2 — The headline states the job, not the sort.** A first-time instructor should learn what this page
is for by reading one sentence.

**R3 — Music-first start.** The playlist is the real unit of intent (D21: providers are the substrate,
Ritmo is the instructor layer). A blank titled class is the fallback path, not the default one.

**R4 — Three tiers of granularity.** Tier 1 is what you need to *choose*. Tier 2 is one click away
(rehearsal view, a section header, a row overflow). Tier 3 is the builder. Nothing sits on tier 1 that is
not needed to choose.

## 4. The proposed page

```
┌──────────────────────────────────────────────────────────────────────────┐
│ R  Ritmo Studio                      Steven   Classes  Music  Live  Acct │
└──────────────────────────────────────────────────────────────────────────┘

  CLASSES
  Turn your music into a class.
  Start from a playlist you already made — or pick up a class in progress.

  ┌────────────────────────────────────────────────────────────────────────┐
  │  ▶  Start from a playlist              ← the one copper primary        │
  │     Spotify · SoundCloud · Apple Music — 14 playlists ready            │
  │                                                                        │
  │     From liked tracks        Blank class                               │
  └────────────────────────────────────────────────────────────────────────┘

  CONTINUE · 6 classes                              Sort: Ready to teach ▾
  Ordered by ready to teach — closest to teachable first.

  ┌─ NEXT UP ──────────────────────────────────────────────────────────────┐
  │  SoundCloud Test: Cool Down                  Pilates · 9 tracks · 7:58 │
  │  ▁▂▄▆▇▆▄▃▂                                                             │
  │  ◈ Runnable · 2 to finish       [ Add the missing tempo ]  [ ⋯ ]       │
  └────────────────────────────────────────────────────────────────────────┘
  │ Latin riiide            Cycle · 6 tracks · 5:11    ▂▄▆▅▃  ◈ 2 to finish│
  │ Ambient Chill           Cycle · 65 tracks · 2:47   ▃▅▇▆▄  ◈ Runnable   │
  │ Jackson Remix           Cycle · 30 tracks · 1:49   ▁▃▅▄▂  ◈ Empty draft│

                                                     Show all 6 classes ▾
```

Below the fold, collapsed by default: **All classes** — the full library list with search, sort, tag
filter, `Load more`, and per-row `Rehearsal view` / `Copy`. That is where today's rail content goes.

### 4.1 Copy

Voice constraints: `ritmofit-design-system.md` §5 and `01-design-principles.md` §3 (lead with the
affirmative, name the next action, never make absence the focal point).

| Slot | Today | Proposed |
| --- | --- | --- |
| Eyebrow | `Classes` | `Classes` (unchanged) |
| Page heading | `Pick up where the energy left off.` | `Turn your music into a class.` |
| Page subheading | `Ordered by ready to teach — closest to teachable first.` | `Start from a playlist you already made — or pick up a class in progress.` |
| Primary action | *(none on the page)* | `Start from a playlist` |
| Under the primary | — | `Spotify · SoundCloud · Apple Music — 14 playlists ready` |
| Secondary actions | *(none)* | `From liked tracks` · `Blank class` |
| Continue heading | *(none)* | `Continue` — with `Pick up where the energy left off.` kept as its subhead |
| Ordering summary | rendered under the page heading | rendered under the `Continue` heading, wording unchanged |
| Count | `4 priority classes` | `6 classes`, next to `Continue` |
| Rail heading (at rest) | `Your classes` | *(rail removed at rest — see Slice E)* |
| Rail heading (in builder) | `Your classes` | `Switch class` |
| Blank-create button | `Add` | `Create class` |
| Blank-create helper | `Choose a discipline to start.` | unchanged, inside the dialog |

`Pick up where the energy left off.` is good writing in the wrong slot — it answers *"what does this list
mean?"*, not *"what is this page?"*. Moving it down one level keeps it and fixes the hierarchy.

### 4.2 Layering — what sits where

| Information | Today | Proposed tier |
| --- | --- | --- |
| Title, discipline, track count, runtime | card | 1 — glance |
| Class Pulse shape | titled panel on every card | 1 — bare sparkline, no panel/label/caption |
| Next-step verb (`Add the missing tempo`, …) | card button | 1 — unchanged logic |
| `Runnable · N to finish` | card line | 1 — one status chip |
| `derived · confirm` toggle | badge on every card | 2 — rehearsal view only |
| `Auto-shaped from track order and length…` caption | under every ribbon | 2 — rehearsal view only |
| Readiness ledger (4 dimensions) | builder | 2 — rehearsal view (already there) |
| Last opened | rail card | 2 — `All classes` rows |
| Search, sort, tag filter | always-present rail drawer | 2 — `All classes` header, on demand |
| `Rehearsal view`, `Copy` | rail card footer | 2 — row overflow `⋯` and `All classes` rows |
| Everything else | builder | 3 |

The Class Pulse stays on every card. The 2026-07-24 audit lists it as an explicit *preserve* (class
identity), and `01-design-principles.md` §8 requires signature surfaces to be alive at rest. What gets cut
is the chrome wrapped around it, not the signal: the `CLASS PULSE` panel title, the confirm badge, and the
two-line coverage caption. Provisional state stays honestly marked in the rehearsal view, where the
caution channel + icon + label rule (§8) still applies in full.

## 5. Playlist → class: the fast path

**Today — 6 actions, 2 destinations:** Classes → `Music` → find the provider card → `Playlists · N` → pick
a discipline → `Open` → `Start class`.

**Proposed — 2 clicks, 1 destination:** `Start from a playlist` → `Start class` on the row you want.

Five changes to `PlaylistBrowserDialog`, none of which need an API change:

1. **One cross-provider list.** All three providers already report `savedPlaylists: true` in
   `packages/shared/src/enums.ts`, and `useProviderBrowseState` already loads playlists per connected
   provider into `Partial<Record<Provider, ProviderPlaylistSummary[]>>`. The picker shows the union with a
   small provider label per row, instead of requiring the instructor to pick a provider first.
2. **`Start class` on the row.** Drill-in stays behind `Open` for the instructor who wants to read the
   track list first — that is the layered path, not the default one.
3. **Discipline defaults instead of gating.** The dialog already defaults to `cycle`
   (`useState<ClassTemplate>('cycle')`); change the default to the instructor's most-used discipline,
   derived client-side from `classes[].template`, and render it as a changeable chip beside the action.
   This does not touch D21's required pick, which governs the blank-create entry and keeps it.
4. **Search** across playlist names once the list is long enough to need it.
5. **No dead ends.** With no connected provider the primary becomes `Connect a music service` and opens
   `ConnectionsDialog`; with a provider connected but zero saved playlists, the band says so and offers
   liked tracks or a blank class. `11-library-guidelines.md` requires discovery never to offer a dead end.

Separately, **F8** is the "fast" half of the complaint and is its own slice: create the class, open the
builder immediately, and let the import stream in behind the existing import-result banner as progress.
`ClassWorkspace` already re-reads detail on `onTrackAdded`, so the machinery exists; the risk is in the
error and retry paths, not the happy path.

## 6. What this does not change

- The nav shell — `Classes` / `Music` / `Live` / `Account` (D21). No new destination, no new route.
- Solo-first scope (D20). No teams, sharing, publish, or Explore surface is revived.
- The readiness and ordering model. `readiness.ts` and `class-ordering.ts` keep their logic, their ranks,
  their verbs, and their tests. Both orderings remain reachable.
- Class Pulse as class identity, and the provisional/`derived` honesty rule.
- Schema, migrations, shared contracts, OpenAPI, and every API endpoint. Slices A–F are frontend-only.
- The class-cover placeholder question, which stays parked in `INBOX.md`.
- `ClassSummaryView` (rehearsal view) gains content but keeps its role as the read-only tier-2 surface.

## 7. Slices

Ordered. Each is independently shippable and independently revertible. `Dashboard.tsx` is 5,352 lines and
every one of these touches it, so they should not run as concurrent lanes.

### Slice A — extract `ClassesHome` (mechanical, no behavior change)

Move `WorkstationRestingState` and the resting branch of the Classes grid out of `Dashboard.tsx` into
`apps/web/src/components/ClassesHome.tsx`. Pure move plus prop threading.

- **Files:** `Dashboard.tsx`, new `ClassesHome.tsx`, `Dashboard.test.tsx`.
- **Why first:** B, D, and E all edit the same region of a 5,352-line file. Landing the move alone keeps
  the later diffs readable and keeps review focused on design rather than on relocation noise.
- **Risk:** merge collisions with any other work in `Dashboard.tsx`. Land it by itself.
- **Tests:** existing `Dashboard.test.tsx` must pass untouched except for import paths.

### Slice B — hero copy and the Start band

- **Files:** `ClassesHome.tsx` (new `ClassStartBand`), `Dashboard.tsx` (lift `useProviderBrowseState`),
  `CreateClassForm` reused inside a new create dialog.
- **Behavior:** new heading/subheading; a start band with one copper primary (`Start from a playlist`) and
  two quiet secondaries; the blank-create form moves from the rail drawer into a dialog. The fresh-account
  state (`Your first class can start anywhere.`) is reconciled with the band so a new user and a returning
  user see the same start affordance — this is also the answer to audit finding **B1** (four equal start
  paths with no recommended default).
- **Data note:** `useProviderBrowseState` currently lives inside `MusicWorkspace`, so its
  `listConnections` + per-provider `listPlaylists`/`listLikes` calls fire on every visit to Music. Lifting
  it to `Dashboard` and sharing one instance between Classes and Music means the Classes page gains
  playlist counts *and* the app stops refetching on each Music visit — net requests go down, not up. If
  measurement contradicts that, fall back to fetching counts lazily when the band is first rendered.
- **Risk:** the band must degrade honestly while connections are still loading. Show the primary with a
  neutral subline rather than a count that flickers from `0` to `14`.
- **Tests:** new `ClassesHome.test.tsx` — connected with playlists, connected with none, no provider
  connected, connections still loading, connections errored.

### Slice C — one cross-provider playlist picker

- **Files:** `Dashboard.tsx` (`PlaylistBrowserDialog` → `PlaylistPickerDialog`), new
  `apps/web/src/lib/class-template-preference.ts` (`mostUsedTemplate`), `Dashboard.test.tsx`.
- **Behavior:** items 1–5 in §5. `MusicWorkspace`'s existing `Playlists · N` shelf buttons open the same
  dialog pre-filtered to that provider, so the Music page loses nothing.
- **Risk:** provider drift. Per `AGENTS.md` › Music Constraints, connect / browse / start-class /
  playback are distinct capabilities and success in one does not prove the others — re-verify browse
  against all three providers with real accounts after this slice.
- **Tests:** union across providers, per-provider pre-filter, row-level start, search, default discipline
  from library, connect-state empty; plus `mostUsedTemplate` unit tests (empty library, tie-break).

### Slice D — Continue section and card de-cluttering

- **Files:** `ClassRunOfShowShelf.tsx` → `ContinueSection`, `ClassPulse.tsx` (new `sparkline` variant),
  `ClassSummaryView.tsx` (receives the confirm toggle and coverage caption),
  `ClassRunOfShowShelf.test.tsx`, `ClassPulse.test.tsx`, `ClassSummaryView.test.tsx`.
- **Behavior:** one feature card plus three compact rows; sparkline pulse without panel chrome; ordering
  tabs become a labeled `<select>` in the `Continue` header while keeping the visible summary sentence, so
  the ordering is still stated in words and never conveyed by selection styling alone.
- **Risk:** the sparkline must keep a real accessible name. `ClassPulse` today emits a descriptive label
  for the empty case; the compact variant needs an equivalent (shape summary plus coverage state) rather
  than `aria-hidden`.
- **Tests:** ranking output unchanged (reuse `class-ordering.test.ts` fixtures), sparkline a11y name,
  confirm toggle reachable in the rehearsal view, ordering select persists to `sessionStorage` exactly as
  the tabs did.

### Slice E — retire the rail at rest, add `All classes`

- **Files:** `Dashboard.tsx` (grid branches), `LibraryRail` (kept for the builder, header renamed),
  `ClassesHome.tsx` (new collapsed `All classes` section), `LibraryRail.test.tsx`, `Dashboard.test.tsx`,
  `apps/web/smoke/functional.smoke.mjs`, `apps/web/smoke/narrow-width.smoke.mjs`.
- **Behavior:** at rest the page is a single column at every width; the library moves into a collapsed
  `All classes (N)` section carrying search, sort, tag filter, `Load more`, and per-row secondary actions.
  With a class open, the 3-pane workstation is unchanged and the rail keeps its real job — switching class
  context — under the clearer heading `Switch class`.
- **Risk:** highest-churn slice. Two smoke scripts and several tests select on rail structure. Also
  re-check that `focusClassCreator` (used by the error and fresh-account recovery paths) still lands on a
  real, visible control once the create form lives in a dialog.
- **Tests:** rail absent at rest / present in builder, `All classes` expand-collapse, search and sort still
  narrow the loaded set, `Load more` pagination intact, tag filter empty state intact.

### Slice F — optimistic import (the "fast" half of F8)

- **Files:** `Dashboard.tsx` (`handleCreateClassFromPlaylist`, `handleCreateClassFromLikes`,
  `importCollectionTracks`, import-result banner).
- **Behavior:** create the class, open the builder, stream imports with live progress; failures still land
  in the existing retry banner against the same class id, so retry can never duplicate.
- **Risk:** a class that grows under the instructor's cursor. Needs a deliberate decision about ordering
  guarantees — `handleCreateClassFromLikes` imports serially precisely so completion timing cannot
  reshuffle an instructor-authored order. Measure a 30+ track playlist before and after; if the current
  wait is acceptable, drop this slice.
- **Tests:** builder opens before import completes, progress reflects partial state, retry path unchanged.

## 8. Decisions needed before any slice starts

Recommendations first, as requested. "If rejected" states the cost, not an alternative menu.

| # | Decision | Recommendation | If rejected |
| --- | --- | --- | --- |
| D-1 | Page heading | `Turn your music into a class.` — names the job in one line and matches D21's music-first framing | F4 stands; pick different words but the heading must still state the job, not the sort |
| D-2 | Left rail on the resting page | **Remove it**; keep it in the builder as `Switch class` | It stays a duplicate list; the best available mitigation is a real heading and an explicit purpose line, which is weaker |
| D-3 | Ordering tabs | Demote to a labeled `Sort` select in the `Continue` header, summary sentence retained | Two prominent pills of teaching jargon stay above the fold; PDR-01's default ordering is unaffected either way |
| D-4 | `derived · confirm` on landing cards | Move to the rehearsal view | A session-only toggle keeps badge weight on every card (F6) |
| D-5 | Discipline on the playlist path | Default to the most-used discipline, changeable inline | One extra required decision per class start; D21 is satisfied either way since the dialog already defaults today |
| D-6 | How many classes before "show all" | One feature card plus three compact rows | Keep four equal cards; the clutter reduction then rests entirely on Slice D's card diet |
| D-7 | Optimistic import | Yes, but only as Slice F, after A–E and after measuring | Large playlists keep their silent wait |
| D-8 | Where this plan lives | `ritmofit_dev_plan/classes-home-redesign.md`, linked from `DEVELOPMENT_PLAN.md` once approved | Move it to `docs/audits/` if you would rather treat it as an audit deliverable |

## 9. Verification plan

Everything in `AGENTS.md` › Verification, PRs, And Commits applies per slice. Specific to this work:

- **Component tests** as listed per slice; `readiness.test.ts` and `class-ordering.test.ts` must pass
  unchanged, which is the proof that this is a presentation change and not a behavior change.
- **Design-system gate:** `(cd ritmofit_design_system && npm run verify)` plus
  `pnpm --filter @ritmofit/web theme-classes`, since new markup means new colour utilities that neither
  `tsc` nor ESLint can see.
- **Responsive QA** at 1440 / 1180 / 900 / 680 / 390 / 320 using browser viewport emulation, not a resized
  headless window (`AGENTS.md`: shrinking the window can capture a cropped wider layout).
- **Keyboard and a11y:** tab through the start band, the picker, the Continue rows, and the `All classes`
  disclosure; cyan focus ring visible throughout; no state carried by colour alone; `prefers-reduced-motion`
  honored by the sparkline.
- **Provider verification (Slice C):** connect, browse, start-class, and playback verified separately
  against Spotify, SoundCloud, and Apple Music with real accounts. Any fixtures created in production
  follow `ritmofit_dev_plan/prod-fixture-hygiene.md`.
- **The "fast" claim, measured:** count clicks and wall-clock from login to a class containing a
  playlist's tracks, before and after. The target is 2 clicks; record the actual number in the PR.
