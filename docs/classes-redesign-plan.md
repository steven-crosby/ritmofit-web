# Classes library redesign

Final as of Oct 26, after Steven's decisions on the adversarial review. No pull request until he says to start pull request B.

Mockup: design/classes-redesign-mockup-2026-10-26.jpg.

## Goal

Two ways in.

- Classes: pick a template first, then import or insert a playlist.
- Music: find a playlist or a song first, then layer a class template on top.

They become equal when pull request C ships. Until then the Classes page is the library only. Both paths land in the same full-focus builder. Only what is prefilled differs.

## Decisions

1. Build a class imports the whole playlist in order and does not open the picker. The 15-song picker stays only on Add a playlist. Songs already on the class are skipped and listed. They are not part of the stretch math.
2. Stretch scales block lengths only. Cue holds keep their exact lengths and must stay inside their block. That is the acceptance test.
3. A single song does not stretch. Place the song and keep the template lengths. Stretch only for a real playlist, two or more songs.
4. Pull requests run in order: B, then A, then C. Not in parallel.
5. Build a class is all or nothing. Create the class only after the provider fetch succeeds. On failure, show a clear error with a retry and save nothing.
6. The readiness mark has a short text label, such as Needs tempo. The orange dot is not the only signal.
7. Recents and Jump back in sort by last opened or taught, including starting Live, not by last edited.
8. On a phone, templates come before the class list. Create stays on screen.
9. Stretch happens once, at Build a class. Later additions append and do not stretch again.

Playlist order stays. No matching by tempo or energy. A template can be saved with no music. Sources for C are Spotify and Apple Music. SoundCloud comes later. The Music button label is Build a class. It works on a whole playlist and on a single song.

## Pull request B, start this first

Builder focus. Does not wait on the new library.

- Remove the class list from the builder. Full focus, with a back link to Classes. The header shows the class name and type.
- Move Add a playlist to the header, with the line that new songs are added after the current count sitting next to the button. When the class has no music, that action is the empty-state call to action.
- New songs still append. They do not stretch the template.

## Pull request A, after B

Library shell. No schema, no new class type, no Live change.

- Drop the hero line and the Ready to teach / Needs work tabs.
- Left panel: Your Classes, orange + Create pill, chips All / Cycle / Pilates / #tags, a labeled search field, Recents, compact rows.
- The readiness label is text. The dot repeats it.
- Main, and on a phone first: Start from a template with Cycle and Pilates tiles only. Two tiles, not a dead HIIT tile.
- Jump back in: up to four classes by last opened or taught, plus Show all. Skip names that start with `[QA]`. All still lists them.
- Covers: stored cover, otherwise a gradient by type. No provider artwork.
- Empty: the list says there are no classes yet. Templates stay. Jump back in is hidden.
- + Create opens New class, From a template, and Import a playlist.

## Pull request C, after A

Music first and stretch. Do not start until B's header and back link exist.

- Build a class on a playlist or a song, then Cycle or Pilates. Same builder.
- Whole playlist, in order, no picker. One song: no stretch.
- Real playlist: scale block lengths once. Cue holds stay exact and inside their blocks.
- Create the class only after the provider fetch succeeds. On failure, error and retry, save nothing.
- Later Add a playlist appends and does not stretch.
- Spotify and Apple Music only. Steven's Spotify library still 403s until his user is on the Development Mode allowlist. Apple Music is the path to prove first. This pull request does not fix that allowlist, and it does not fix iPhone Apple Music playback.

## Later

- HIIT type, recipe, Live cues, and tile.
- SoundCloud as a Build a class source.
- Pinning a block so it does not scale, only if Steven asks.
- The phone clip of End Class, which still needs a repro.
