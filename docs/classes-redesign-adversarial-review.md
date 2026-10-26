# Adversarial review: Classes redesign

Reviewed `docs/classes-redesign-plan.md` and Steven's Oct 26 decisions. Findings below are the original review. Steven resolved them the same day. The resolutions are the final plan. No pull request was opened.

## Resolved

1. Build a class imports the whole playlist in order and does not open the picker. The 15-song picker stays only on Add a playlist.
2. Stretch scales block lengths only. Cue holds keep their exact lengths and stay inside their block. That case is the test.
3. A single song does not stretch. Place the song and keep the template lengths.
4. Sequence is B, then A, then C. Not parallel.
5. Build a class creates the class only after the provider fetch succeeds. Failure shows an error and a retry and saves nothing.
6. The readiness mark has a short text label. Color is not the only signal.
7. Recents sorts by last opened or taught, including Live, not by last edited.
8. On a phone, templates come before the class list.
9. Stretch happens once, at Build a class. Later additions append and do not stretch again.

The original findings follow unchanged.


## Blocker

None. Nothing here is unsafe to keep discussing. Several High items should be answered before pull request C is approved.

## High

### 1. Build a class fights the 15-song import

**Why.** A playlist long enough to motivate stretch is often more than 15 songs. Today a playlist over 15 songs opens the picker and imports at most 15 at a time. Decision 4 says Build a class takes the whole playlist, in order, with no tempo matching. The plan never says C bypasses that picker. If it does not, stretch scales to the whole playlist and then the instructor only gets 15 songs. If it does, C silently imports dozens of songs and skips the duplicate check.

**Change.** C states one rule: Build a class imports every song in playlist order and does not open the 15-song picker. Duplicates against songs already on the class are skipped and listed, not mixed into the stretch math. The 15 cap stays for Add a playlist in the builder.

### 2. Stretch moves the wrong times

**Why.** Block targets, section starts, and cue anchors are milliseconds. Cue hold lengths are also milliseconds and mean the move, not the block. Scaling every timestamp makes a 15-second hold into something else. Leaving holds alone while stretching the block lets a hold run into the next block.

**Change.** Scale block target durations and the section starts that belong to those blocks. Do not scale cue `durationMs`. After the blocks have new lengths, clamp or shift cue anchors so each hold still sits inside its block. That case is the acceptance test, not a later polish.

### 3. A single song should not stretch

**Why.** Decision 4 applies Build a class to one song. The plan then divides a 45-minute template by one song and tells the instructor to repair the wreck in the builder. That is the first time she uses the feature.

**Question.** For one song, place it and leave the template's durations alone. Stretch only when the playlist has a real length, at least two songs or some minimum minutes. Does Steven want that exception?

### 4. A and B will collide

**Why.** Both are web layout in the class screens. The builder and the library are likely the same large page component. Parallel pulls will conflict, and B's header change is the surface C also uses to land.

**Change.** Sequence them. B first, then A, then C. Do not start C until B's header and back link exist, or C invents a second builder.

## Medium

### 5. The orange dot encodes meaning by color

**Why.** The tabs were ambiguous, but a dot with no words is easier to miss and fails the rule that color is not the only signal. Keyboard and screen-reader users get no name for it.

**Change.** The row includes a short text label, such as the existing readiness phrase, and the dot is extra. Focus and hover show the same words.

### 6. Recents is the wrong clock for Jump back in

**Why.** Most recently updated is an edit clock. Jump back in sounds like the class she last taught or opened. A class she edited and abandoned outranks the one she ran yesterday if Live does not touch the timestamp.

**Question.** Should Recents and Jump back in use last opened, including starting Live, instead of last edited?

### 7. On a phone the library buries the templates

**Why.** Classes is supposed to start with a template. Stacking the full class list above the tiles pushes the templates below the fold as soon as she has a few classes.

**Change.** On a narrow screen, Start from a template comes first and Your Classes follows. Create stays visible.

### 8. Provider failure must not leave a half class

**Why.** Apple Music playback already fails on Steven's iPhone after the queue loads. His Spotify library returns 403 until the Development Mode allowlist includes him. Build a class that creates the class and then fails the import leaves a template she did not mean to keep, or a class with songs and unstretched blocks.

**Change.** If the song list does not load, do not create the class. Show the existing provider error and stay on Music. Apple Music is still the path he can prove before the Spotify allowlist change. C does not claim his Spotify library works.

### 9. Removing the list hides the class name

**Why.** Full focus is right. A back link alone does not say which class she is in, or whether it is Cycle or Pilates.

**Change.** The builder header shows the class name and type next to the back link. Add a playlist stays in that header, and the "adds after N songs" line sits with the button, not only down in the run of show.

### 10. The two paths are not equal until C

**Why.** A ships template-first. Music still has no Build a class. Calling them equal in A will make the missing Music button look like a bug.

**Change.** A is the library. C is what makes the paths equal. Do not write "two equal ways in" on the Classes page until C is in.

### 11. Adding songs later does not say whether to stretch again

**Why.** Decision 5 lets her save a template with no music and add songs later. Decision 1 stretches to the playlist she had at create time. A second playlist, or Add a playlist after that, has no rule. Stretching again moves cues she has since edited. Not stretching leaves blocks sized for a playlist that is no longer the class.

**Question.** Stretch once, at Build a class, and never again automatically?

## Low

### 12. [QA] classes will dominate Jump back in

**Why.** They are real classes, so All should show them. Jump back in and Recents will fill with Session expired checks and import smokes if those were updated last.

**Change.** All includes them. Jump back in and the default Recents list skip names that start with `[QA]`. A chip can show them. This is a one-line filter, not a new permission model.

### 13. The mockup's HIIT tile will be missing

**Why.** A ships two tiles. The picture he approved has three. That will read as an unfinished layout.

**Question.** Is a two-tile row acceptable for A, or does the HIIT tile appear and do nothing until the type exists? A dead tile is worse than a gap. Recommend two tiles.

### 14. Search is an icon

**Why.** An icon with no visible field is easy to miss, and a search box that is only an icon fails a label check if it has no accessible name.

**Change.** The search control has an accessible name, and on a wide screen the field is visible. Chips are buttons, not only colored pills.

## What can stand

Playlist order with no tempo matching is the right default. She can fix energy in the builder. Saving a template with no songs matches pull request B's empty-state Add a playlist. Spotify and Apple Music first is right if SoundCloud is simply absent from Build a class, not a broken button. The same builder is right if B lands first and C only changes what is prefilled.
