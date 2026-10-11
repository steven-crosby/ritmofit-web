# Apple Music natural acceptance — 2026-10-09

Status: **desktop acceptance closed by owner decision, 2026-10-11.** Steven accepted the attended Cycle transition spot-check below as sufficient and ruled Pilates covered by it. No untouched natural run was performed; the limits listed below still describe what was and was not observed.

## Release binding

Current deployed baseline is #494, recorded source `e712274f8b0add74755bc97accff42f44405260f`, Worker `5f67d242-8956-42b7-9318-67b2797d3454` at 100%, SPA `assets/index-mZ1ypG4t.js`. The UX changes #503/#504 are merged on main but are not in this production build. Confirm live identities again before each attended run.

## Fresh fixture receipt

The owner authorized fresh production fixtures as part of the acceptance sequence. These were created through the authenticated application's Apple Music saved-playlist flow from the currently browsed **Ritmo Apple Music Test** playlist; ten tracks imported per class. Each was immediately renamed and tagged `qa-fixture` before playback. Existing instructor classes and the source playlist were preserved. This proves browse/import/setup, not playback.

| Discipline | Name                                             | Class ID                             | Displayed duration | Tag        | Run result  |
| ---------- | ------------------------------------------------ | ------------------------------------ | ------------------ | ---------- | ----------- |
| Cycle      | [QA] Apple natural acceptance 2026-10-09 Cycle   | 14849c7a-54ca-491d-8eea-c6fab47183d0 | 39:50              | qa-fixture | Spot-check 2026-10-11; natural run not done |
| Pilates    | [QA] Apple natural acceptance 2026-10-09 Pilates | 15547331-f97b-45ce-ae2c-78fbc6d2f7e0 | 39:50              | qa-fixture | Not started |

The UI/DOM receipt is in `fixtures.json`. The displayed duration is rounded; no SDK duration or audio observation is inferred. Both classes retain source order and have no authored choreography; readiness attention for missing BPM/cues does not block the existing Run live path.

## Attended procedure and verdict

Authorize Apple Music in the actual browser through its explicit preflight control, then press Start once. Run naturally through every transition and final completion; no accelerated seeks, shortening, skip, or prompter substitution counts as natural acceptance. Retain sanitized UI/provider positions, transition timestamps, final state, and the human listening verdict. On a failure, retain the held state and recovery evidence and report the run as failed or incomplete rather than making it pass by transport input.

Human listening confirmation is required for audible acceptance. SDK progress, import success, browser indicators, and automated gates cannot provide it. Actual iPhone Safari acceptance follows desktop completion and requires its own real-device evidence.

Both fixtures remain retained. Fixture deletion is a separate owner decision under `ritmofit_dev_plan/prod-fixture-hygiene.md`.

## Attended transition spot-check — Cycle, 2026-10-11

Recorded by Claude Code (local) with Steven listening on laptop speakers. This is a weaker test than the natural run defined above: Steven chose to press **Next** through most songs and listen to the hand-overs. It does not satisfy natural acceptance.

**Binding as observed.** Worker `5f67d242-8956-42b7-9318-67b2797d3454` at 100%; SPA `assets/index-mZ1ypG4t.js` on three cache-busted fetches and in the running page. Desktop Chrome on macOS, signed-in production account. The #494 / `e712274` source label comes from HISTORY and was not re-derived.

**Preflight.** All ten tracks selected on Apple Music, none needing a decision. Start was disabled until browser authorization; the authorization check played nothing. Steven completed Apple's authorization popup himself. The first attempt showed "Waiting for authorization… Still waiting" for over 30 seconds until he found and finished the popup.

**Run.** Start pressed once at 20:16:50 UTC. Times are UTC from a read-only on-page logger sampling the visible Live screen once a second; the agent pressed no transport control after Start.

| #   | Boundary                           | UTC      | Class clock | Outgoing song played | Advance     | On-screen hold | Listener |
| --- | ---------------------------------- | -------- | ----------- | -------------------- | ----------- | -------------- | -------- |
| —   | Start → Abracadabra                | 20:16:50 | 0:00        | —                    | Start       | ~3 s           | Music audible promptly |
| 1   | Abracadabra → Bad Romance          | 20:20:36 | 3:43        | 3:43 of 3:43         | **Natural** | ~1 s           | Clean |
| 2   | Bad Romance → Die With A Smile     | 20:23:23 | 8:38        | 2:46 of 4:55         | Next        | ~2 s           | Clean |
| 3   | Die With A Smile → Telephone       | 20:23:41 | 12:50       | 0:16 of 4:12         | Next        | ~1 s           | Not reported |
| 4   | Telephone → Born This Way          | 20:26:18 | 16:30       | 2:36 of 3:41         | Next        | ~1 s           | Clean |
| 5   | Born This Way → RUNWAY             | 20:26:51 | 20:50       | 0:32 of 4:20         | Next        | ~1 s           | Clean |
| 6   | RUNWAY → Poker Face                | 20:27:39 | 23:41       | 0:47 of 2:51         | Next        | ~1 s           | Clean |
| 7   | Poker Face → The Dead Dance        | 20:28:05 | 27:38       | 0:25 of 3:57         | Next        | ~1 s           | Clean |
| 8   | The Dead Dance → The Edge of Glory | 20:28:26 | 31:27       | 0:20 of 3:49         | Next        | ~1 s           | Clean |
| 9   | The Edge of Glory → Rain On Me     | 20:29:01 | 36:49       | 0:34 of 5:22         | Next        | ~2 s           | Clean |
| —   | Rain On Me → leave Live            | 20:31:49 | ~39:36      | ~2:46 of 3:02        | Exit        | —              | "Class ended cleanly"; "exit button works well" |

Each boundary showed a brief "Waiting for music" hold (the playback-recovery surface, paused state) before teaching resumed; none needed input. The app's liveness inspector reported 348 of 348 samples advancing with no misses. No console errors. The tab was in the background from 20:25:17 to about 20:26:16 and playback continued. After Exit, MusicKit reported stopped at position 0.

**What this establishes.** Prompt audible start; one natural end-of-song hand-over; eight manual Next hand-overs; Exit stops the music and returns to the Builder. Seventeen minutes of continuous session.

**What it does not establish.** Natural hand-over at boundaries 2–9; a song that has played several minutes before its boundary (only tracks 1, 2, 4 and 10 passed 2:30); the class reaching its own end (Live was left about 15 seconds before the last song's scheduled end, and no end-of-class screen was logged); a full 40-minute session; Pilates; iPhone Safari; any output other than laptop speakers.

**Observations for follow-up.**

- Owner feedback: Exit works well functionally; he prefers different wording (for example "End class"), a different location, and a different style. Next is disabled on the last track. Routed to `INBOX.md`.
- The `[rf-liveness]` console line for every earlier track was re-printed, several times, at each new track start (for example tracks 0–3 four times at 20:23:45). Cause not investigated; the inspector summary itself was consistent.
- Steven pressed Next early in the run without saying so; the agent first reported it as unexplained early endings. A future attended run should agree up front who touches the transport.

## Owner decision — 2026-10-11

After the spot-check, Steven decided (asked one decision at a time, recorded by Claude Code):

- **Desktop Cycle acceptance: accepted on the spot-check.** The recommended alternative, one untouched 40-minute run, was declined. Natural hand-overs after long-playing songs and the class reaching its own end remain unobserved.
- **Pilates: covered by the Cycle result.** Same ten songs through the same playback path; no separate run.

This closes the desktop listening gate for the release decision. It is not evidence about iPhone Safari, Bluetooth output, or a full-length session.

