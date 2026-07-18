# Implementation brief 04 — Classes

## Role

Act as the SPA Classes-library implementer. Turn the resting state into a continuation surface and make
class cards scan with one primary action.

## Authority

Gate C authorizes `P1-01` and `P1-02`. Consume foundation patterns and existing class summary helpers;
do not expand creation, sharing, community, or Builder behavior. This is commit batch 4 in the single
approved draft PR.

## Backlog IDs

- `P1-01` — Turn Classes rest into a useful continuation surface
- `P1-02` — Clarify class-card primary action and recency

## User outcomes

- Resume the most relevant unfinished/recent class without interpreting an empty desktop canvas.
- Start from music without first creating a blank administrative object.
- Scan recency and class shape, then open with one obvious target.

## Mockup references

- `../mockups/polish-preview.html#classes`
- `../mockups/polish-preview-notes.md`

Match continuation-first hierarchy, the secondary start-from-music entry, honest recency, and subordinate
Preview/overflow actions. Do not literalize fake ranking or infer new recommendation data.

## Files to inspect / likely edit

- `apps/web/src/components/Dashboard.tsx`
  - `ClassCard`
  - `WorkstationRestingState`
  - library ordering/selection around those components
- `apps/web/src/components/LibraryRail.test.tsx`
- `apps/web/src/components/Dashboard.test.tsx`
- `apps/web/src/lib/class-summary.ts`
- `apps/web/src/lib/class-summary.test.ts`
- `apps/web/src/lib/relative-time.ts`
- `apps/web/src/lib/relative-time.test.ts`

## Out of scope

- New recommendation services, persistence fields, analytics, schema, or API routes.
- Builder header/Inspector, provider selection, Account/Login, or Live work.
- Sharing, publishing, teams, public classes, or community discovery.
- Making Preview or Copy equal visual peers with Open.

## Implementation steps

1. Reuse existing updated/opened timestamps and class summary data to select a deterministic continuation
   candidate. Do not invent precision the data does not contain.
2. Replace the empty resting canvas with one **Continue building** action and one **Start from music** entry.
3. Preserve a useful empty-library state for instructors with zero classes.
4. Make the class card's open target unambiguous across pointer, keyboard, and touch; keep Preview/Copy or
   overflow visibly secondary.
5. Show useful recency only when supported, with accessible labels and stable relative-time tests.
6. Let class shape/summary lead within the existing density; do not add decorative dashboard metrics.
7. Verify ordering, long titles, one-class, many-class, empty, loading, and failure states at desktop and
   390px.

## Tests and checks

```bash
pnpm --filter @ritmofit/web test \
  src/components/Dashboard.test.tsx \
  src/components/LibraryRail.test.tsx \
  src/lib/class-summary.test.ts \
  src/lib/relative-time.test.ts
pnpm --filter @ritmofit/web typecheck
pnpm --filter @ritmofit/web build
pnpm format:check
pnpm lint
```

Manual: desktop, 390×844, 320px, 200% zoom, keyboard-only card use, empty library, and multiple classes
with identical/absent recency signals.

## Acceptance criteria

- With classes present and none open, the canvas shows one continuation action and one music-first entry.
- With no classes, the empty state explains how to begin without a dead workspace.
- Each card has one obvious Open target; Preview/Copy/overflow remain subordinate and keyboard reachable.
- Recency is data-backed, deterministic, and omitted or generalized when unknown.
- Long titles and multiple cards do not hide core actions at 390px or 200% zoom.

## Suggested PR / branch

- Extracted PR title if needed: `feat(web): make Classes continuation-first`
- Extracted branch if needed: `polish/classes-continuation`
- Current approved delivery: commit batch 4 on `polishv3/design-audit-mockups`.

## Stop / handoff

Report continuation-selection rules, all empty/loading/failure states, card action hierarchy, and desktop +
mobile evidence. Do not merge or deploy.

## Global constraints

- Keep the current Classes / Music / Live / Account shell; no IA redesign.
- Success ranking: build speed > gorgeous > Live pride.
- Builder stays airy and consumer-music scannable; Live remains 80% safety/glanceability and 20% swagger.
- Never cache provider audio or provider-derived analysis; never obtain BPM from Spotify; never download,
  proxy, mix, crossfade, decode, analyze, or derive provider audio. Playback uses official provider paths.
- Prefer small diffs. When tokens change, update design-system guidance and regenerate iOS tokens when the
  package workflow requires it.
- Do not merge or deploy without separate owner authorization.
