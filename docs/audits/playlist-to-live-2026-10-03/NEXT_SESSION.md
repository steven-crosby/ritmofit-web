# Next session — plan the playlist-to-class-to-Live fixes

Codex full-close handoff, 2026-10-03. Begin in Plan Mode with the repository's
[start-session prompt](../../../agent-prompts/daily/start-session.md). This guide
records evidence and planning priorities; it does not authorize implementation,
Git publication, deployment, migrations, or fixture deletion.

## Restart point

1. Read `AGENTS.md`, inspect the actual checkout/branch/status, fetch origin, and
   inspect open PRs. Preserve unrelated work. At this close, main and origin/main
   were `aa128e868819729b38237677791fbff495e905a8`; `.claude/` was unrelated untracked
   work. The audit and four planning-doc updates are prepared locally, with Git
   publication awaiting a separate owner decision. Recheck whether they have
   since reached main before relying on this checkpoint.
2. Read [the audit](./coverage.md), [evidence notes](./evidence/README.md), the
   current focus in [DEVELOPMENT_PLAN](../../../ritmofit_dev_plan/DEVELOPMENT_PLAN.md),
   and the newest [HISTORY](../../../ritmofit_dev_plan/HISTORY.md) entry. Read the
   [class-score blueprint](../../../ritmofit_dev_plan/instructor-class-score-blueprint.md)
   and [music-led plan](../../../ritmofit_dev_plan/music-led-instructor-workflow-plan.md)
   for settled semantics and the broader roadmap.
3. Reinspect current code before choosing fixes. File/line references in the audit
   describe the served release and may drift. Use the interface-design skill and
   applicable design-system guidance for the Live/creation plan.
4. Propose one reviewable first slice for the natural song-boundary defect, with
   regressions and browser acceptance. Show the remaining sequence and any shared
   contract/schema choices. Wait for Steven's approval before implementation.

## Goal and current evidence

“I already built my playlist. Ritmo turns it into a class I can confidently teach,
and lets me add detail when I want.” Immediate scope: desktop Chrome, Apple Music,
Cycle and Pilates. Exclude iPhone testing, Spotify, and HIIT in this follow-up
unless Steven changes scope. Do not import a large playlist for cap testing.

Beginner default: preserve source order; one song per exercise block; first/last
songs warm-up/cooldown; editable discipline-specific generic cues and notes.
Experienced default: an empty choreography layer can run immediately with music,
with an optional quick teaching draft and progressively detailed song/cue/note
editing. Returning to an overview must preserve authored work.

The ten-song `Ritmo Apple Music Test` has no repeated songs. Imports preserved its
order. Existing notes/timed cues and precise editing persist and project into
Live. Music-created and empty classes can run without choreography. Classes
templates instead have eight/seven fixed blocks; all imported songs land in the
first block and empty blocks disable Run Live. Neither route generates the
desired song-based teaching draft.

Browser authorization succeeded. Both disciplines advanced provider transport,
then failed at the first natural song end at 3:43. Saved source duration is
223,398 ms; MusicKit reports 223 seconds. This is strong causal evidence for a
precision mismatch, pending a regression-backed diagnosis. Skip and explicit
prompter recovery worked in sampled runs. Neither full uninterrupted class
passed; audible output remains unverified. Accelerated End/seek completion is
separate evidence.

## Recommended sequence and acceptance

| Order | Finding and likely surface                                                                                                                                                                                          | Required proof                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Reconcile natural end precision in web playback runtime / Apple adapter. Inspect `apps/web/src/lib/playback/runtime.ts` and `apple-music-adapter.ts`.                                                               | Bound any tolerance to a justified provider/window rule. Cover subsecond source duration, exact end, clipped windows, final track, seek/retry, and genuinely early end. Preserve D24's held teaching position on stalls/errors. Then run one full natural class per discipline with listening confirmation. |
| 2     | Make Live teaching content reachable at 200% desktop zoom; constrain long-cue display in `LiveMode.tsx`.                                                                                                            | Real Chrome zoom at a 1200 × 608 window yields 600 × 304 CSS pixels. Current/next guidance and transport must remain reachable; long text must remain available without dominating the teaching view. Check keyboard/focus, Full List, and recovery layouts.                                                |
| 3     | Design an editable playlist-derived teaching draft using existing authoring contracts where possible. Inspect shared entities, scaffold recipes, creation/import routes, and cue/note projection.                   | Preserve occurrence order and duplicates. Default one song per block with first/last guidance. Generate useful discipline cues/notes. Reload and Go Live must retain the draft; regeneration must preserve instructor edits. Manual QA preparation is not a generation pass.                                |
| 4     | Unify Classes and Music creation policy and readiness presentation. Inspect `CreateClassDialog`, `Dashboard`, scaffold/import targeting, and class/run validation. Plan jointly with item 3 before choosing an API. | Both entry points reach the same playlist-first choices and usable teaching draft/empty workflow. Explain optional detail. Avoid a fixed-template dead end; do not simply remove readiness gates or redistribute songs to fit a recipe.                                                                     |
| 5     | Accept explicit zero anchors in precise editing. Inspect `parseClockToMs` versus the positive duration parser.                                                                                                      | Reproduce/fix clip start `0:00`; inspect downbeat and free-placement anchors separately rather than claiming they already failed. Preserve positive duration, end-after-start, and cue/move preservation validation.                                                                                        |

Sequence items 3–4 as one design decision, then choose small implementation
slices. The immediate first slice does not need a schema/API change. Include
meaningful adversarial regression coverage and the repository's full gate for
code changes. Recheck production Worker and three cache-busted SPA responses
before reporting deployed-browser acceptance; merge and deployment are separate.

## Decisions the development plan must expose

- **Playlist size:** typical classes have at most ten songs per Steven's stated
  expectation. A hard limit of fifteen was proposed, not approved as a locked
  rule. Recommend a clear expectation plus pre-create validation and an ordered
  subset chooser if a cap is selected. No silent truncation; test boundaries with
  metadata/fixtures rather than importing a 50-song playlist.
- **Teaching semantics:** one-song beginner blocks do not redefine the general
  plan-block grammar (zero, one, or many songs) or force the proposed bounded
  exercise-step entity into this slice. Planned target and assembled music time
  remain distinct unless a new behavior is explicitly approved.
- **Storage / Live:** existing song notes and timed cues already have shared and
  Live contracts; basic coaching notes need no new note schema. Decide whether
  generated cues/notes are sufficient or block guidance needs an additive Live
  projection. Plan generation provenance, safe regeneration, and atomic
  creation/import before selecting migrations or API changes. Inspect OpenAPI
  registries and future iOS implications if a wire contract changes.
- **Provider boundary:** use permitted metadata and generic discipline guidance.
  Do not analyze/cache provider audio or derive Spotify BPM. Apple duration is
  transport evidence; it does not establish audible output.

## Preserved state and remaining authority

Six `[QA]` classes, all `qa-fixture`, remain for review. Exact names/IDs and manual
test edits are in [the fixture table](./coverage.md#retained-fixtures). Temporary
clipping was restored. Source playlists and existing instructor content were
preserved. Delete none without separate authorization.

Read-only close reconcile at 17:11 UTC retained Worker
`b74e4fe2-fbf3-4eb4-a617-ea6f45a04e03` at 100%, SPA
`assets/index-68EE379w.js` on three consecutive cache-busted fetches, passing
mounted-route/header smoke, and no pending remote D1 migrations through level 0020. Production application source is `d026f5992b8c2181b262259e5d9acf84e7745364`;
main `aa128e8` differs only by later documentation/evidence. See
[the reconcile record](./evidence/close-reconcile.json).

Pre-existing PR [#480](https://github.com/steven-crosby/ritmofit-web/pull/480),
**docs: record the Phase 1 deploy and table Spotify**, was open and conflicting at
close. It is outside this audit's publication scope. Preserve it and recheck its
status at restart. Do not silently merge/close it, copy its work, stash foreign
changes, or delete branches. No new app code, contract, migration, or deploy was
performed during this audit/close.

Close verification passed: repository formatting, explicit formatting of the
new audit Markdown/JSON (normally excluded by `.prettierignore`), tracked diff
whitespace, relative evidence/restart links, JSON/journal parsing, JPEG file
integrity, selected QA order/duration assertions, and a prospective-publication
credential-pattern/portable-path scan. The evidence SHA-256 manifest is retained.
Existing planning-document formatting was preserved. The matching application
gate already passed for the deployed #481 source; no code changed during close,
so its unit/integration/browser suites were not rerun. Publication PR CI remains
pending until a PR exists.
