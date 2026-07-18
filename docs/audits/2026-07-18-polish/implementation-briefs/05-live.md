# Implementation brief 05 — Live

## Role

Act as the SPA readiness and Live-mode implementer. Separate startability, provider readiness, and
creative completeness, then make no-cue Live useful without inventing choreography.

## Authority

Gate C authorizes `P0-04` and `P0-05`. The approved vocabulary is **Can start**, **Music checked**, and
**Class complete**. The approved no-cue lead is track identity plus section/effort. Do not make BPM,
cues, or moves new hard Live gates. This is commit batch 5 in the single approved draft PR.

## Backlog IDs

- `P0-04` — Separate “can start,” “music checked,” and “class complete”
- `P0-05` — Design an affirmative Live state for no-cue classes

## User outcomes

- Know whether a class can run, whether its music is playable now, and whether its creative score is done.
- Start a duration-valid but incomplete class without false “ready” language.
- Use track, section, effort, and timing in Live even when no authored cue exists.

## Mockup references

- `../mockups/polish-preview.html#live`
- `../mockups/polish-preview-notes.md`

Match the three-layer vocabulary, calm preflight, track/section/effort hierarchy, stable transport, and
secondary completeness warning. Do not copy fake cue text or derive choreography from provider audio.

## Files to inspect / likely edit

- `apps/web/src/lib/readiness.ts`
- `apps/web/src/lib/readiness.test.ts`
- `apps/web/src/lib/live-readiness.ts`
- `apps/web/src/lib/live-readiness.test.ts`
- `apps/web/src/components/ClassReadinessSummary.tsx`
- `apps/web/src/components/ClassReadinessSummary.test.tsx`
- `apps/web/src/components/LivePreflight.tsx`
- `apps/web/src/components/LiveMode.tsx`
- `apps/web/src/components/LiveMode.test.tsx`
- `apps/web/src/components/LiveTimeline.tsx`
- `apps/web/src/components/LiveTimeline.test.tsx`
- Live workspace integration in `apps/web/src/components/Dashboard.tsx` and `Dashboard.test.tsx`

## Out of scope

- New hard gates beyond existing duration requirements.
- BPM inference, provider audio analysis, invented cues/moves, or neutral prompts presented as authored.
- Audience display, room mode, sharing, or community Live.
- Provider authentication/playback redesign except consuming existing preflight truth.
- Builder layout or class-library work.

## Implementation steps

1. Re-derive current readiness rules and tests before changing labels. Preserve the duration-only hard gate.
2. Represent three independent concepts in helpers/view models: `canStart`, music preflight result, and
   creative completeness. Avoid one overloaded `ready` boolean or global label.
3. Update Builder/queue copy so a duration-valid incomplete class reads **Can start · Class incomplete**.
4. Make preflight own **Music checked** and name provider-specific failures/actions without implying the
   creative score is complete.
5. In active no-cue Live, lead with current track identity, stored/derived section where already available,
   authored intensity/effort, and time remaining. Keep missing BPM visible but not dominant.
6. Render missing authored cue/move as a secondary completeness note; never invent an instruction.
7. Preserve transport location, wake-lock behavior, keyboard use, focus, high contrast, and reduced motion.
8. Exercise provider failure, track transition, no BPM, no cue, partial cue, and full-score states.

## Tests and checks

```bash
pnpm --filter @ritmofit/web test \
  src/lib/readiness.test.ts \
  src/lib/live-readiness.test.ts \
  src/components/ClassReadinessSummary.test.tsx \
  src/components/LiveMode.test.tsx \
  src/components/LiveTimeline.test.tsx \
  src/components/Dashboard.test.tsx
pnpm --filter @ritmofit/web typecheck
pnpm --filter @ritmofit/web build
pnpm format:check
pnpm lint
```

Manual signed-in browser: duration-valid class with no BPM/cues/moves, failed provider preflight, successful
preflight, active playback, track transition, desktop, 390×844, 320px, 200% zoom, and reduced motion.

## Acceptance criteria

- A duration-valid incomplete class is **Can start · Class incomplete**, never globally “ready.”
- Provider success is **Music checked** and remains separate from creative completeness.
- **Class complete** requires the approved creative criteria but is not a hard Live gate.
- No-cue Live leads with track identity plus section/effort; missing choreography is secondary.
- No invented cue/move copy appears, and missing BPM does not dominate the stage.
- Transport, time, focus, contrast, provider playback, and track transitions remain stable.

## Suggested PR / branch

- Extracted PR title if needed: `feat(web): clarify readiness and incomplete Live`
- Extracted branch if needed: `polish/live-readiness`
- Current approved delivery: commit batch 5 on `polishv3/design-audit-mockups`.

## Stop / handoff

Report the exact truth table, copy mapping, no-cue hierarchy, playback evidence, and any remaining ambiguous
state. Do not merge or deploy.

## Global constraints

- Keep the current Classes / Music / Live / Account shell; no IA redesign.
- Success ranking: build speed > gorgeous > Live pride.
- Builder stays airy and consumer-music scannable; Live remains 80% safety/glanceability and 20% swagger.
- Never cache provider audio or provider-derived analysis; never obtain BPM from Spotify; never download,
  proxy, mix, crossfade, decode, analyze, or derive provider audio. Playback uses official provider paths.
- Prefer small diffs. When tokens change, update design-system guidance and regenerate iOS tokens when the
  package workflow requires it.
- Do not merge or deploy without separate owner authorization.
