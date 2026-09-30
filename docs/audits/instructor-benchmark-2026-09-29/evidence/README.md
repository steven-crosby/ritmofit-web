# Instructor benchmark evidence (2026-09-29)

Still frames supporting the instructor benchmark: Ritmo's builder and Live vs a Fitness+ trainer's
workflow and Struct Club, for an in-person spin, Pilates and HIIT instructor. The report itself is a
Claude Artifact outside the repo. This folder holds the evidence it cites.

Scope is **instructor-only**: building the class on a laptop, and running Live for herself (iPhone
for spin, portrait on the handlebars; iPad for Pilates and HIIT).

## Privacy and licensing rules for this folder

- This repo is public. Frames are cropped to the app UI: status bars and the Dynamic Island are
  removed, and album-art thumbnails are covered with grey boxes. Song titles are kept because they
  show where song changes fall in the queue.
- **No video in git.** The source recording has an audio track (provider music), so it stays outside
  the repo. The owner keeps it locally as `ScreenRecording_09-19-2026 08-40-12_1.mov` (56 s,
  588×1280, one audio track).
- Screenshots of other instructors' community content (Struct Club Explore) are not committed.

## `structclub/`

| File | Source | Shows |
| --- | --- | --- |
| `01-move-ending-queue.jpg` | Recording, 0:00 | Live: "Left Leg Lead" at 1s left, intensity "Open". Queue of moves with per-move BPM and duration. |
| `02-press-tap-progress-fill.jpg` | Recording, 0:18 | The move card fills left to right as a progress bar. The countdown is in seconds. |
| `03-recover-block-start.jpg` | Recording, 0:27 | Start of a "Recover" move (15s). |
| `04-song-change-next-move.jpg` | Recording, 0:33 | Song change. The queue runs straight across songs, and BPM changes per move (64 / 128). |
| `05-june-live-move-with-note.jpg` | Screenshot, 2026-06-18 | Live with a **note line** under the move card. Intensity reads **"Easy"**. |
| `06-june-class-detail-moves.jpg` | Screenshot, 2026-06-18 | Class detail: each song, then its moves with durations. |
| `07-june-editor-quick-cues-notes.jpg` | Screenshot, 2026-06-18 | Editor: Quick Cues / Notes tabs, intensity None/Easy/Mod/Hard/All Out, BPM stepper, move duration, move blocks on a timeline, and an add-at-playhead button. |
| `08-june-songs-by-move.jpg` | Screenshot, 2026-06-18 | "Pick songs by move". |

The recording is a mat/barre-style class (64–68 BPM), not spin.

### What the Struct Club evidence shows

- **Moves are timed segments.** Each move has a duration (15s, 31s…) plus its own BPM and
  intensity. Live counts down the current segment and lists the next ones across song changes.
  Ritmo's queue is only a per-track approximation. It stores point-in-time cues and moves, and its
  Live queue works out each item's length as the gap to the next cue or move, or to the end of the
  track. It covers only the active track (`eventsFor` and `choreographyQueueAt` in
  `apps/web/src/components/LiveMode.tsx`), so authored move durations don't exist and the queue
  doesn't continue across songs. This is a benchmark gap.
- **Cue + note already exists in Struct Club Live.** In frame 05, the note is shown as a sentence
  under the card. Her complaint is that editing notes is clunky, not that Live can't show them.
- **Intensity: the editor's choices and what Live shows don't match.**
  - The editor offers None / Easy / Mod / Hard / All Out (frame 07). These match Ritmo's stored enum
    values. Ritmo Live shows the D17 display labels instead (Build / Push / Attack / All Out).
  - Struct Club Live shows "Easy" in the June screenshot (frame 05).
  - In every recording frame (01–04), Live shows **"Open"**, which isn't one of the editor's choices.
  - Unresolved: whether "Open" is how Struct Club displays None, or a separate state. Ask her before
    any exercise-step or intensity-vocabulary contract treats "Open" as equal to None.
- **Not seen anywhere:** a beats-remaining count. Every countdown in these frames is in seconds.
  Confirm with her where she sees beats before building that must-keep.

## `ritmo-web/`

Viewport emulation in the built-in browser (not a real device), on local test classes, running
Live with "Run without music".

| File | Viewport | Shows |
| --- | --- | --- |
| `iphone-portrait-short-cue.jpg` | 375×812 | A short cue reads well. Next is cut off ("Add a quarter t…"). Notes are below the fold. |
| `iphone-portrait-long-cue.jpg` | 375×812 | A cue with guidance in its text fills the card. Next and its countdown drop off screen. "40.4" is a static bar.beat, not a countdown. |
| `iphone-landscape.jpg` | 812×375 | No cue text visible. Header, controls and timeline fill the screen. |
| `ipad-landscape.jpg` | 1024×768 | Two columns, with notes visible in the side rail (small type). |
| `ipad-pilates.jpg` | 1024×768 | Pilates class. Notes at 14px. Spin effort words appear in a Pilates class. |
