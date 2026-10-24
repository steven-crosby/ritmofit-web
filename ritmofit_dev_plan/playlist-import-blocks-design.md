# Playlist import builds blocks only

<!-- note (Grok, 2026-10-24): Design for the playlist → class → Live gap. Owner decisions recorded verbatim. No implementation in this change. -->

**Status:** decided 2026-10-24. Not implemented. This change is the design only.
**Baseline inspected:** `main` `a78f6f5` (2026-10-24).
**Evidence:** [playlist-to-class-to-Live audit](../docs/audits/playlist-to-live-2026-10-03/coverage.md), findings 3 and 4, and the 15-song cap note.

Playlist import writes one plan block per selected song, in source order, and assigns that song to its block. The instructor adds cues, notes, and moves afterward. Live keeps using the existing cue and note projection.

## Owner decisions (verbatim)

Recorded from Steven, 2026-10-24:

1. Playlist import builds BLOCKS ONLY: one block per song, preserving source order. No generated cues, notes, or teaching content.
2. First block labeled warm-up, last block labeled cooldown, automatically.
3. Starting from the Classes template then importing: the empty template scaffold blocks are REPLACED by one block per song (do not fill fixed blocks; do not merely remove the Run Live gate).
4. Hard cap of 15 songs. Over 15: show a picker before creation to choose which songs (source-ordered subset); never silently truncate.

Answers to the two questions this design had left open, also Steven, 2026-10-24:

5. The 15-song cap applies to playlist import ONLY. Search, manual add, and Songs-by-Move copy stay uncapped.
6. Paste-a-link import IS included: it uses the same blocks-only, one-block-per-song behavior, warm-up/cooldown labels, template-scaffold replacement, and 15-song cap with the pre-create picker (replacing today's reject-above-100 / no-blocks path).

## Contract answer

Cues, notes, moves, and the run payload stay as they are. Nothing in this design adds a column or a migration.

A small additive change on the existing ordered-import body is still required. The current write path cannot place one song in one block, and it cannot store a plan block with the teaching fields left empty:

| Constraint on `a78f6f5`                        | Where                                                                                                                                                                                  | Why a client-only change fails                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| One import commit takes a single `planBlockId` | `packages/shared/src/entities/classes.ts` `importClassTracksSchema`; `apps/api/src/lib/ordered-class-import.ts` writes that id onto every new row                                      | Ten songs become ten assignments to one block, which is the audited dead end                                                            |
| Plan-block teaching columns are `NOT NULL`     | `apps/api/src/db/schema.ts` `teaching_goal`, `movement_focus`, `guidance_kind`, `guidance_json`; `createClassPlanBlockSchema` requires `teachingGoal`, `movementFocus`, and `guidance` | `POST` of a block cannot omit coaching text. Filling a real Cycle cadence or RPE would show generated teaching on the block card        |
| Create and import are separate requests        | `POST /classes` in `apps/api/src/routes/classes.ts`, then `POST /classes/:id/tracks/import`                                                                                            | Deleting the scaffold in one request and importing in another can leave the empty-block Run Live gate in place if the second call fails |
| Playlist commits allow 100 placements          | `importClassTracksSchema` `.max(100)`; `MAX_PLAYLIST_IMPORT_TRACKS = 100` on URL import                                                                                                | The cap has to be enforced where the write happens, or a client can skip the picker                                                     |

The additive field is `songBlocks: true` on `importClassTracksSchema`. With that flag, the import batch creates the blocks and the placements together. Commits without the flag keep today's behavior, including the 100-placement ceiling. `recipeBlockKey` is an existing nullable text column. The value `playlist_song` marks these rows. It is not a new column. Paste-a-link keeps the same write. Its current `POST /classes/:id/import-playlist` response changes from `{ imported }` to a preview list in slice B, still with no new column.

`packages/shared/src/entities/run-payload.ts` and `apps/api/src/lib/run-payload.ts` do not change. Plan blocks are not part of the live payload today. Generated cues are not how this slice reaches Live. With no cues, Live keeps the existing per-track line "Lead this track" (`apps/web/src/components/LiveMode.tsx`).

iOS is halted. A future client that renders plan blocks must treat `recipeBlockKey === "playlist_song"` as structure: show the label and the song, and ignore stored guidance until the instructor edits the block and the key is cleared. Run-payload contract parity stays on the current DTO.

## Audit findings 1 and 2, re-checked on `a78f6f5`

These two are outside this design. They are already fixed in code on `main`.

**Finding 1, natural Apple Music end.** The 2026-10-03 failure was a finished stream reported short of a millisecond window (`223398` ms saved, MusicKit duration 223 seconds) while `runtime.ts` required `position < window.endMs`. That strict check is no longer the end rule.

- [#484](https://github.com/steven-crosby/ritmofit-web/pull/484) adds `ENDPOINT_TOLERANCE_MS = 1_000` in `apps/web/src/lib/playback/runtime.ts`. A finished stream less than one second short of the window counts as the window end. A shortfall of 1,000 ms or more still errors and holds the teaching position. The #486 deploy record says this tolerance alone did not stop a later 3:43 failure, because the adapter's endpoint reading was wrong, not only short by a fraction of a second.
- [#488](https://github.com/steven-crosby/ritmofit-web/pull/488) retains the Apple endpoint across teardown.
- [#494](https://github.com/steven-crosby/ritmofit-web/pull/494) caches an endpoint only from a positive playhead, so a MusicKit pause at 0 before `ended` cannot replace it. Current `captureTransport` in `apps/web/src/lib/playback/apple-music-adapter.ts` keeps the latest positive position and does not invent a full-song end from duration.

Full natural-class listening acceptance is still open (Apple 5:18 stays tabled). The mechanism in finding 1 is fixed on `main`. This design does not change playback.

**Finding 2, Live at desktop 200% zoom.** [#486](https://github.com/steven-crosby/ritmofit-web/pull/486) (merge `eeec377`) makes the Live shell the scrollport. `LiveMode.tsx` uses `overflow-y-auto` and a `min-h-full` column. The comment above that shell names the old failure: a `min-h-0` teaching slot collapsed to `clientHeight` 0 at 600×304 CSS pixels. HISTORY records production Chrome at 200% with current/next and transport reachable on that deploy. Later short-viewport work (#518) is additional. This design does not change Live layout.

## Current behavior (`a78f6f5`)

Three create paths diverge, which is finding 4.

**Classes template.** `CreateClassDialog` in scaffold mode calls `createClass({ mode: 'scaffold', recipeId })`. `POST /classes` (`apps/api/src/routes/classes.ts`) materializes every recipe block in one batch: Cycle 45 is eight blocks, Pilates 45 is seven, each with a non-null `recipeBlockKey`. The dialog copy stays "Ritmo lays out the blocks. You add the music." That dialog does not import music. The scaffold remains the right object when the instructor adds songs one block at a time.

**Builder import on that scaffold.** Music is chosen per block (`ClassPlanBlocks` `onChooseMusic`). `Dashboard.tsx` `showStackAddMusic` is true only when `scaffoldRecipeId == null` and the class has no plan blocks, so a template class has no class-level Add music button. Inside the block picker, `TrackSearch` still offers Saved playlists. Import all calls `runOrderedImport` with that block's `planBlockId`. URL playlist mode is already hidden when `planBlockId` is set (`TrackSearch` source filter). Saved-playlist Import all is not hidden, and the commit writes every occurrence onto the one block. The other recipe blocks stay empty.

**Run Live gate.** `canRunPayload` (`apps/web/src/lib/duration.ts`) is true when there is at least one track and every track has a length. `planNextStep` (`apps/web/src/lib/class-scaffold.ts`) returns a lead string when any song is unassigned, any block has no song, or any block's music is over its planned time. Underfill does not lead. `ClassHeaderCard` sets `runEnabled = canRun && !planLead`, and the button's description is the lead string. Empty scaffold blocks therefore keep Run Live off after a block-targeted import. The gate stays. Song blocks have to satisfy it.

**Music → Start class, and likes.** `handleCreateClassFromPlaylist` loads the playlist, rejects an empty list, then `createClass({ title, template })` (legacy empty create: discipline stored, no plan blocks) and `runOrderedImport` without `planBlockId`. Songs land unassigned. With no plan blocks, `planNextStep` returns null, so Run Live turns on once every track has a length. The class has no blocks. Likes (`handleCreateClassFromLikes` / `LikesBrowserDialog`) import the whole likes list the same way, with no size picker.

**URL paste.** `POST /classes/:id/import-playlist` resolves the playlist on the server, collapses same-song match keys, rejects above 100 with 422, and appends tracks with no plan block (`appendImportedClassTracks`). There is no picker.

**Ordered import atomicity today.** `runOrderedImport` resolves library tracks, then `commitOrderedClassImport` writes placements in one guarded batch. The operation id and request hash make a lost 2xx safe to replay. A 4xx clears the pending body. A 5xx or a network failure keeps it. Blocks are not part of that batch. Provider resolution stays outside it, so a library track can exist before the class commit. That split stays.

**What Live receives.** `assembleRunPayload` projects track notes and cues. It does not project plan blocks. Empty cues render "Lead this track."

## Behavior

### Song blocks

Each selected occurrence becomes one block and one `class_track`. Source order is block order and playback order. Repeated titles stay repeated occurrences, as ordered import already does. The URL-import match-key collapse is unchanged until the follow-up below.

Display labels use the existing `segmentType` enum. The owner words are the labels. The enum value for the closer is `cool_down`.

| Songs in this write | Block 1                                  | Middle blocks                  | Last block                              |
| ------------------- | ---------------------------------------- | ------------------------------ | --------------------------------------- |
| 1                   | Label `Warm-up`, `segmentType` `warm_up` | none                           | The same block. Cooldown is not applied |
| 2                   | `Warm-up` / `warm_up`                    | none                           | `Cooldown` / `cool_down`                |
| 3–15                | `Warm-up` / `warm_up`                    | Song title, `segmentType` null | `Cooldown` / `cool_down`                |

The one-song class is the opener. One label cannot be both warm-up and cooldown, and a single song has no distinct closer. Two songs are opener and closer with no middle.

Middle labels are the song title, trimmed, whitespace collapsed, cut at 100 characters (`label` max). An empty title becomes `Song N` using the 1-based position in this write. `teachingGoal` and `movementFocus` store that same title (limits 500) so the `NOT NULL` columns are satisfied. They are identifiers, not coaching copy.

Every song block:

- `recipeBlockKey`: `playlist_song` (exported constant `PLAYLIST_SONG_BLOCK_KEY`)
- `intensity`: `none`
- `targetDurationMs`: the track's positive `durationMs` when the library row has one
- guidance: the smallest valid object for the class template, stored and not shown (Cycle `posture: mixed`, cadence 1–1, RPE 1–1; Pilates `optionalEquipment: []`; HIIT continuous, `sequenceFocus` the song title, `equipment: bodyweight`). A class with no template uses the Pilates object
- no cue, note, or move row

While `recipeBlockKey` is `playlist_song`, the block card shows the label, intensity None, planned duration, and the assigned song. It hides `teachingGoal` and `planBlockDetailLine`. The editor opens with guidance fields blank. It does not copy the stored 1–1 cadence into the inputs. A save that changes `teachingGoal`, `movementFocus`, guidance, `targetDurationMs`, or intensity clears `recipeBlockKey` so the card shows what the instructor wrote. A label-only save keeps the key.

When the track has no positive duration, `targetDurationMs` is `60000` until a length exists. Run Live stays off through the existing missing-duration reason. The class-track update that sets a length, a duration override, or a clip window also sets that block's `targetDurationMs` to the effective duration in the same write, for as long as the key is `playlist_song`. After the instructor edits planned time, the key is clear and the block stops tracking the song.

Warm-up and cooldown labels apply only when this write creates the class's entire block list (the replace rule below). An append uses the song title and `segmentType` null on every new block, including the first and last of the appended run. Existing labels stay.

### Replace, append, and authored work

The server chooses the mode from the class. The client does not send it.

**Replace** when the class has zero `class_tracks` and every existing plan block has a non-null `recipeBlockKey` other than `playlist_song`. Zero blocks counts as replace. The batch deletes those blocks and inserts the labeled song blocks. This is the Classes-template case: the empty recipe is removed, and one block per song replaces it. It is also the Music and likes case, which start with no blocks.

A recipe block the instructor renamed, while the class still has no songs, is deleted. There is no cue, note, or move on it. Decision 3 replaces the empty template scaffold. Preserving a renamed empty recipe block would need a recipe-snapshot compare this slice does not add.

**Append** when the class has any `class_track`, any plan block with a null `recipeBlockKey`, or any `playlist_song` block. In that same batch:

- Delete plan blocks whose `recipeBlockKey` is non-null, other than `playlist_song`, and which have no tracks. Those empty recipe blocks are what keep Run Live off. They are not instructor-authored structure.
- Keep every block that has a track, every `playlist_song` block, and every block with a null `recipeBlockKey`.
- Insert the new song blocks after the remaining blocks. Do not relabel the class's current first or last block.
- Do not update, move, or delete existing `class_tracks`, cues, notes, or moves.

Cues and notes are never written by this import. An instructor cue on an existing song is still there after an append. Ordered-import's current rule against undoing a reorder stays: a retry that finds previously imported songs moved or removed refuses to reshuffle them.

If append leaves an instructor-created empty block (null `recipeBlockKey`, no song), `planNextStep` still leads with "still needs music" and Run Live stays off. The import response includes that count so the builder can say why. The fix is to fill or delete that block. The gate is not removed.

Songs already placed in a recipe block stay in that block. This slice does not rebuild historical classes that already took the old Import all (the 2026-10-03 QA fixtures included).

### Cap and picker

`PLAYLIST_SONG_BLOCK_CAP` is 15. It counts occurrences in one song-block commit, plus tracks already on the class. Decision 5 limits that cap to playlist import, including saved playlists, Music Start class, likes, and paste-a-link. Search, manual add, and Songs-by-Move copy stay uncapped. A class can still pass 15 by those other writes.

The picker is a dialog the instructor must finish before `createClass` or, for a class that already exists, before the import commit:

- Source list of 0: keep today's "no tracks" error. No class is created.
- Source list of 1–15, and `existing tracks + source ≤ 15`: no picker. Import the whole list in source order.
- Otherwise: checkbox per occurrence, source order fixed, repeats as separate rows. The accessible name includes the 1-based source position and the title. Nothing starts checked. Confirm stays disabled until the selection has 1 to N songs, where N is `min(15, 15 − existing tracks)`. Checking past N is refused in the control, with the message "Choose at most 15 songs." The confirm label includes the count ("Create class from 4 songs" or "Import 4 songs"). Cancel creates nothing.
- The chosen subset is committed in source order, not click order.

Keyboard: the existing `Dialog` focus trap, checkboxes are real inputs, the cap message is `aria-describedby` on the group, and confirm is a button. Meaning does not depend on color.

`PlaylistBrowserDialog` and `LikesBrowserDialog` both use one `PlaylistSongPicker`. The discipline control stays. It still stores `classes.template` for movement language. It does not create a recipe on these paths.

### API validation

`POST /classes/:id/tracks/import` with `songBlocks: true`:

- `placements.length` from 1 to 15, or 422 `VALIDATION_ERROR` and no write. The server does not drop the tail.
- `placements.length + existing class_tracks > 15`: 422, no write. A class that is already over 15 is left as it is; this call does not add to it.
- `songBlocks` together with `planBlockId`: 422.
- Unknown track, track owned by someone else, or a stale track/block snapshot: today's 404 / 409, no partial block insert.
- The operation-id receipt covers the block inserts. The same body returns the stored track list and does not insert a second set of blocks. A new operation id after success is a new append and is subject to the cap.

`requireAccess(..., 'edit')` stays the gate. No new route.

### Atomicity of create and import

The picker runs before `createClass`. Cancel leaves no class.

Music, likes, and an empty-class import then do two requests: empty `createClass`, then one song-block commit. The commit is the atomic unit: delete-eligible blocks, insert song blocks, insert placements, write the receipt, in one D1 batch. A failure before that batch leaves the class without song blocks (an empty class, or the original scaffold). Retry commits into the class id already returned. It does not call `createClass` again. The pending ordered-import body is how a lost response replays, which is the current session-storage rule.

Provider `importTrack` calls stay before the batch. A resolved library row can exist without a class placement. That matches ordered import today.

The template path does not grow a new create mode. `CreateClassDialog` still creates the recipe. The replace happens inside the import commit when the class has no songs. A failed import leaves the recipe intact, and retry replaces it.

### Run Live after a successful import

Replace with every song duration known: each block has one song, nothing is unassigned, and `targetDurationMs` equals the song, so `planBlockFit` is `on_plan`. `planNextStep` returns null. `canRunPayload` is true. Run Live enables. The class target (for example 45 minutes on a recipe create) stays. `classTargetGap` can still show under target. That gap does not lead and does not disable Run Live.

Missing duration: Run Live stays disabled with the existing length reason. The empty-block and over-plan leads stay in `planNextStep`. They do not fire for a well-formed song-block class.

The builder refetches plan blocks and the run payload after the commit before it treats the class as runnable. It does not clear `planLead` on an optimistic track list. The 2026-10-03 home card flashed "Can run live" before empty blocks had loaded. A failed block refetch keeps Run Live off.

Live shows titles and "Lead this track" until the instructor writes cues or notes. Those notes already project through the run payload.

### Paste-a-link

Decision 6. `POST /classes/:id/import-playlist` and the builder "Import Playlist URL" control use the same blocks, labels, replace/append rules, and 15-song picker as saved-playlist import. That replaces the handler in `apps/api/src/routes/playlist-import.ts`, which dedupes by match key, rejects above `MAX_PLAYLIST_IMPORT_TRACKS` (100), and appends tracks with no blocks (`appendImportedClassTracks`).

The class already exists. The picker runs before any class write. Cancel leaves blocks and tracks as they were. This path does not call `createClass`.

The handler becomes a preview:

- Apple Music library links stay 400. A pasted link cannot carry the user token; saved-playlist browse remains that path. Unsupported URLs stay 400. An empty playlist stays 400.
- `requireAccess(..., 'edit')` and the existing per-user rate limit stay.
- Fetch with the provider adapter. Keep source order. Do not call `dedupeByMatchKey`. A repeated title is a repeated occurrence.
- Write no `class_tracks`, plan blocks, cues, notes, or library tracks.
- Return 200 `{ occurrences: [{ index, title, artist, durationMs, provider, providerTrackId }] }`.
- If the adapter returns more than `PLAYLIST_URL_LIST_LIMIT` (500), respond 422 with the count and write nothing. 500 bounds the list. It is not the import cap, and it does not keep the first 15. A playlist of 16 to 500 occurrences returns the whole list so the picker can show it. That is what removes the old reject-above-100.

`importUserPlaylist` (`POST /providers/:provider/playlists/:playlistId/import`) stays as it is. That route imports library references with no class. It keeps match-key dedupe and the 100 cap.

`TrackSearch` `importList`, only when `planBlockId` is null:

1. Preview. The button reads "Checking playlist…" while the request is in flight.
2. The server's 400 covers an empty playlist. No picker.
3. One to 15 occurrences, and existing tracks plus that count is at most 15: no picker. Resolve those occurrences with the existing per-track import and one `songBlocks` commit, in source order.
4. Otherwise show `PlaylistSongPicker`. Nothing starts checked. N is `min(15, 15 − existing tracks)`. Confirm resolves only the selection and commits it in source order. Cancel writes nothing.
5. URL mode stays hidden while `planBlockId` is set, so Choose music on one block cannot paste a playlist into that block. The scaffold's class-level "Import a playlist as song blocks" control includes this URL field.
6. The helper no longer says a paste imports every track at once.
7. A song that fails to resolve stays unadded in the ordered-import session and can be retried. The commit does not drop it and close the gap the way `partitionSettledImports` does on the current URL handler.

`appendImportedClassTracks` leaves this route. Slice B deletes it when nothing else calls it, and moves the recency coverage in `apps/api/test/playlist-import-url.integration.test.ts` onto the song-block commit.

OpenAPI today documents 201 `{ imported }` as an inline object on `/classes/{id}/import-playlist`. Slice B registers the shared preview response and regenerates `openapi.json` in the same change as `TrackSearch`. Slice A does not change this route, so a deployed API is not a preview while the SPA still expects `{ imported }`.

## File-by-file

Inspected files and the change each slice makes. "None" means leave the file alone.

| File                                                                             | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/entities/classes.ts`                                        | Slice A: `PLAYLIST_SONG_BLOCK_CAP = 15` and optional `songBlocks: z.literal(true)` on `importClassTracksSchema`. `superRefine`: when set, placements length is 1–15. The unconditional `.max(100)` stays for commits without the flag. Slice B: preview response schema and `PLAYLIST_URL_LIST_LIMIT = 500`. `MAX_PLAYLIST_IMPORT_TRACKS` stays 100 for the library bulk route only                                                                                                                                                                                                                                                         |
| `packages/shared/src/entities/class-plan-blocks.ts`                              | Export `PLAYLIST_SONG_BLOCK_KEY = 'playlist_song'`. Comment that those rows store structural titles and hidden guidance until an instructor edit clears the key                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `apps/api/src/lib/ordered-class-import.ts`                                       | When `songBlocks`, apply replace or append inside the existing guarded batch, set each new row's `planBlockId` to its own block, and include the block writes in the operation receipt. Ignore a successful path's single `planBlockId` because the schema rejects the combination                                                                                                                                                                                                                                                                                                                                                          |
| `apps/api/src/routes/class-tracks.ts`                                            | Import handler stays `POST /classes/:id/tracks/import`. On duration, override, and clip updates, while the assigned block is `playlist_song`, set `targetDurationMs` to the effective duration in that write                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `apps/api/src/routes/class-plan-blocks.ts`                                       | PATCH clears `recipeBlockKey` when a `playlist_song` block's teaching goal, movement focus, guidance, intensity, or planned duration changes. Label-only PATCH keeps the key                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `apps/api/scripts/generate-openapi.ts`                                           | Slice A: regeneration records `songBlocks`, plus the 422 cap sentence on `/classes/{id}/tracks/import`. Slice B: `/classes/{id}/import-playlist` returns the shared preview schema instead of inline 201 `{ imported }`. No new path                                                                                                                                                                                                                                                                                                                                                                                                        |
| `apps/api/openapi/openapi.json`                                                  | Commit the slice A diff with the flag, and the slice B diff with the preview response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ritmofit_dev_plan/schema.md`                                                    | One sentence on `recipe_block_key`: `playlist_song` is the playlist-import marker, not a recipe id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `apps/web/src/lib/ordered-import.ts`                                             | Song-block commits send `songBlocks: true`, omit `planBlockId`, and use one commit (no 100-chunk split)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `apps/web/src/lib/class-scaffold.ts`                                             | Add the label/segment helper for the 1-song, 2-song, and 3-song table. `planNextStep` stays                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `apps/web/src/components/PlaylistSongPicker.tsx`                                 | New dialog. Shared by Music, likes, saved playlists, and paste-a-link                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `apps/web/src/components/Dashboard.tsx`                                          | `handleCreateClassFromPlaylist` and `handleCreateClassFromLikes`: picker before create; retry reuses the class id. `PlaylistBrowserDialog` and `LikesBrowserDialog` host the picker. Discipline control stays; copy says the playlist becomes the blocks and the discipline sets movement language. On a scaffold, add a class-level "Import a playlist as song blocks" control that does not set `assigningPlanBlock` and includes paste-a-link. `showStackAddMusic` stays restricted so generic Add music does not dump unassigned songs into a recipe. `canRun` / `runEnabled` stay. Refetch blocks and payload before clearing the lead |
| `apps/web/src/components/TrackSearch.tsx`                                        | When `planBlockId` is set, hide Saved-playlist Import all the way URL mode is already hidden. Single-song search add into the block stays. Class-level Import all sends `songBlocks: true`. Paste-a-link previews, then uses the picker or a direct `songBlocks` commit. It does not call the old append                                                                                                                                                                                                                                                                                                                                    |
| `apps/web/src/components/ClassPlanBlocks.tsx`                                    | Hide teaching goal and guidance detail while `recipeBlockKey === playlist_song`. Editor initial guidance is blank for those blocks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `apps/web/src/components/CreateClassDialog.tsx`                                  | None. Scaffold create stays. Replace happens at import                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `apps/api/src/routes/classes.ts`                                                 | None. No new create mode                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `apps/web/src/lib/duration.ts`                                                   | None. `canRunPayload` stays the length gate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `packages/shared/src/entities/run-payload.ts`, `apps/api/src/lib/run-payload.ts` | None                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `apps/api/src/routes/playlist-import.ts`                                         | Slice B: preview only. Source order, no match-key collapse, no class or library write, 422 above 500 occurrences. Delete `appendImportedClassTracks` from this route                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `apps/web/src/lib/api.ts`                                                        | Slice B: the playlist-URL client returns the preview occurrence list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `apps/api/src/lib/music/import-playlist.ts`                                      | None. `dedupeByMatchKey` and the 100 cap stay on `importUserPlaylist` only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `apps/api/src/db/schema.ts`, `apps/api/migrations/`                              | None                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Tests

Existing ordered-import cases (repeat order, lost-response replay, 409, in-place retry) stay on commits without `songBlocks`.

**Unit**

- Label helper: 1 song → Warm-up only; 2 songs → Warm-up then Cooldown; 3 songs → Warm-up, title, Cooldown; title cut at 100; empty title → `Song N`.
- Picker: confirm disabled at 0; 16th check refused; selected ids commit in source order; repeats are two rows.
- Paste-a-link mapping keeps source order and a repeated title. `TrackSearch`: a 10-song preview commits `songBlocks` without the picker; a 16-song preview opens the picker and does not commit until confirm; cancel does not commit; a block destination still has no Import Playlist URL; the control does not call the old `{ imported }` write.
- `planNextStep` on song blocks whose targets match durations returns null. One empty instructor block still returns a lead. `canRunPayload` is false when a duration is null.
- Card hides teaching goal for `playlist_song` and shows it after the key is cleared.

**Integration** (`*.integration.test.ts`)

- 10 occurrences → 10 blocks, positions 0–9, first `warm_up`, last `cool_down`, each track's `planBlockId` is its block, cue count 0, note null.
- 15 accepted. 16 placements → 422 and the class is unchanged (block count and track count).
- `songBlocks` plus `planBlockId` → 422.
- Untouched scaffold, zero tracks: recipe blocks are gone, song blocks are the plan, one batch.
- Class with one track and one cue: append keeps that track, cue, and note; empty recipe blocks are deleted; instructor null-key empty block remains; new blocks are title-labeled, not warm-up/cooldown.
- Same `operationId` and body returns the stored tracks and does not double the blocks.
- Stale block snapshot → 409, no new block.
- Setting a missing duration on a `playlist_song` track updates that block's `targetDurationMs` to the effective duration. A planned-time PATCH clears the key and a later duration edit does not move the target.
- Paste-a-link preview of 16 ordered occurrences, including a repeated title: 200, class track count 0, plan blocks unchanged, no library rows.
- 101 occurrences: 200, not the old 422. 501 occurrences: 422, class unchanged.
- Apple library URL and an empty playlist: 400, class unchanged.
- The subset the client commits after that preview, through `tracks/import` with `songBlocks`: an empty scaffold becomes that many song blocks; a 2-song subset is Warm-up then Cooldown; an existing cue on another song stays.

**Smoke** (real browser, after slice B; not a substitute for the integration tests)

- Cycle template, Apple saved playlist of about 10 songs: Import as song blocks, recipe blocks gone, Run Live enabled, Live shows titles and "Lead this track", no generated cues.
- Playlist of 16 fixture rows: picker before the class exists; cancel leaves no class; confirm of 4 creates 4 blocks in source order.
- 1-song and 2-song label check in the builder.
- Class that already has a cue: import another playlist under the cap; the cue is still on its song; Run Live follows the rules above.
- Block Choose music: Import all is absent; adding one searched song still assigns that block.
- Paste a short public catalog URL into an empty Cycle template: recipe blocks replaced, Run Live enabled, no generated cues. A 16-row fixture does not 422; the picker lists all 16; confirming 4 writes 4 blocks.

Boundary checks use metadata and fixtures. Do not import a 50-song provider playlist.

## PR slices

Implement in order. Only slice B edits `Dashboard.tsx` and the paste-a-link route, so A can merge before B. Keep Music create, saved-playlist import, likes, and paste-a-link in that one web PR: they share the picker and the commit flag. Slice A must not change `POST /classes/:id/import-playlist`. The SPA still expects `{ imported }` until B ships both sides.

1. **Slice A — shared and API commit.** Schema flag, commit batch, PATCH key clearing, duration hook, OpenAPI for `songBlocks`, `schema.md` sentence, unit and integration tests for the commit. Web does not send `songBlocks` yet. Paste-a-link stays the current append. No migration. Full CI gate. Contract parity should be unchanged because the run payload is unchanged.
2. **Slice B — web and paste-a-link preview.** Picker, Music, likes, builder class-level import, hide block-targeted Import all, card/editor hide, Run Live refetch. The URL route becomes the preview, `TrackSearch` consumes it, and OpenAPI drops `{ imported }`. Web unit tests, the URL integration tests, and the smoke list. Full CI gate.

No deploy is part of either slice. Merging is not deploying.

## Open questions

None. The cap scope and paste-a-link are decisions 5 and 6 above.
