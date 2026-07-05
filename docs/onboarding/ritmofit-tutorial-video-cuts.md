# Ritmo Studio Tutorial Video Cuts

## Scope

Two caption-only product demo cuts cover the ready "aha" loop:

- Find a track.
- Build the class stack.
- Shape intensity and sections.
- Add cues, moves, and instructor notes.
- Open Live Mode and lead from the prompter.

Teams and Explore are intentionally omitted until those surfaces are complete.

## Landing Page Cut

Target runtime: 68 seconds.
Placement: signed-out landing hero.
Tone: punchy product demo.

| Time   | Caption                                         |
| ------ | ----------------------------------------------- |
| 0-11s  | Start with a track, not a blank page.           |
| 11-24s | Drop tracks into a ride that already has shape. |
| 24-38s | Make the energy arc visible before class.       |
| 38-52s | Choreograph the moments that matter.            |
| 52-63s | Run Live Mode when the room is moving.          |
| 63-68s | Save the class. Teach it again.                 |

## Post-Signup Cut

Target runtime: 86 seconds.
Placement: first dashboard load after successful email signup.
Tone: guided onboarding.

| Time   | Caption                                            |
| ------ | -------------------------------------------------- |
| 0-12s  | Create a class and keep it in your library.        |
| 12-27s | Add tracks from search, library, or manual entry.  |
| 27-42s | Arrange the track stack into the ride order.       |
| 42-57s | Set intensity and sections so the arc is readable. |
| 57-72s | Add cues, moves, and notes on the beat.            |
| 72-83s | Open Live Mode and lead from the prompter.         |
| 83-86s | Build the first class, then keep refining.         |

## Demo Data

Use stable mock data only. Track titles, artists, BPM, duration, class names, and provider-copy are
fictional and do not require connected accounts, provider tokens, or real provider audio.

The shared implementation lives in `apps/web/src/components/TutorialVideo.tsx`; both cuts use the
same demo system with different timings and captions.
