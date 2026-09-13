# Playback liveness — investigation and design proposal

**Session 2026-07-29.** Follow-up to the 2026-07-24 design-audit run. Covers two items the
run left open: the **LIVE-09** induction and the **silent-player-death** question. Both are
answered here. One defect was found and fixed along the way; one design change is proposed
and **not** implemented.

Nothing in this document changes schema, migrations, or a shared contract.

> **Context.** [`IMPLEMENTATION-KICKOFF.md`](IMPLEMENTATION-KICKOFF.md) is the entry point for
> the run as a whole — authorization, the standing constraints, and the measurement traps
> (including traps 7 and 8, which came from §1 below). This document is the detailed record
> for LIVE-09 and playback liveness; the kickoff summarizes and links here.

---

## 1. LIVE-09 — induced, and it works

`PlaybackRuntime.fail()` was reached from a **genuine SoundCloud-emitted error**, which the
two prior attempts recorded in F-03 never managed.

### How

Track 2 of the local `SoundCloud likes` fixture carries the provider URI
`https://soundcloud.com/x/instinct` — a well-formed but nonexistent permalink. It passes
`soundcloudTrackUrl`'s validation (https, `soundcloud.com` host) and is handed to the real
widget, which asks SoundCloud for a track that does not exist. SoundCloud's own player
emits `ERROR` during load, `prepare` rejects at `soundcloud-adapter.ts:211`, and
`enterTrack`'s catch calls `fail({ phase: 'prepare' })`.

Reproduce it: sign in as `marisol.audit@example.com`, Live → `SoundCloud likes` → Preflight
→ Start class, then seek past 3:00 (track 2's window start).

### Why this induction is fair, where the previous two were not

| Attempt | Why it proved nothing |
| --- | --- |
| Blank the playing iframe (F-03) | The widget stops responding without emitting; no `onError` fires |
| Delete `window.SC.Widget` (F-03) | The loader re-injects the script and recovers; the adapter never throws |
| **Dead track URL (this run)** | **SoundCloud itself emits `ERROR`. Same mechanism as a deleted, private, or region-blocked track.** |

The decisive evidence is timing: the failure surfaced in **under 2.5 seconds** against a
20 s prepare timeout (`DEFAULT_PREPARE_TIMEOUT_MS`). It was a real provider error event, not
the timeout path.

### What renders

```
! Music interrupted
Playback stopped
SoundCloud could not load "Instinct".
Your current cue and class clock are still running.
[Continue without music] [Retry playback] [Manage connections] [Open in SoundCloud]
```

The rail flips from `♪ SoundCloud` to `⚠ Playback error`, the iframe is torn down, and the
alert carries `role="alert"`. It names the provider without interpolating an upstream
message, states what is unchanged, and offers recovery — the error doctrine `LiveMode.tsx`
describes, met.

**LIVE-09 can move off `code-confirmed`.** Verified at 1440×1000, 390×844, 320×844: no
horizontal overflow at any width, zero animations over 50 ms under reduced motion, clean
console throughout.

### The defect it exposed — fixed

With the failure surface open the Live runtime has **43** text nodes, not the 36 the §8
reconciliation measured. Two of the seven new ones were below AAA, and they were the alert's
own status line:

| Node | Before | After | Target |
| --- | --- | --- | --- |
| `Music interrupted` (12 px / 600) | 6.48:1 | **7.04:1** | 7.0 |
| its `!` glyph | 6.48:1 | **7.04:1** | 7.0 |

Identical at all three viewports. **43 of 43 now clear AAA**, measured on the same nodes in
the same session before and after.

**Root cause — the token was validated against a backdrop it never renders on.** The Live
re-map at `index.css:86` was working correctly; the colour was `live.danger` (ember-300).
But `live.danger`'s own comment read *"measures 6.33:1 on bg/live … ember-300 measures
7.52:1"*, and `check-contrast.mjs` gated it only against `bg/live`. Live's recovery card is a
`RecoveryState`, which renders on **`bg/raised`** (ink-800), where ember-300 gives 6.48:1.

The gate's comment stated the assumption out loud — *"Live pairs are measured on bg/live …
which is the combination that actually ships"* — and it was half right. It correctly avoids
gating planning roles on `bg/live`, but it assumed `bg/live` is the only ground inside Live.
It is not: every card in the Live subtree sits on `bg/raised`.

Fixed by adding `ember.200` (`#EF8572`) and pointing `live.danger` at it — 7.04:1 on
`bg/raised`, 8.17:1 on `bg/live`. `tokens.json` only; generated output regenerated through
`npm run build:all`, never hand-edited.

**The gate now covers both grounds.** Every Live text role is checked against `bg/raised` as
well as `bg/live`, worst case wins. Verified to bite: reverting `live.danger` to ember-300
makes `check-contrast` fail with `✗ 6.48:1 (need 7) LIVE danger (live re-map) on raised`.

Blast radius was checked before the change — `live.danger` is the only Live role that failed
on `bg/raised`. The next worst is `interactive` at 8.23:1.

> **Lesson worth carrying.** A contrast gate is only as good as its list of grounds. This one
> was self-consistent and still wrong, because the pair it never wrote down was the one that
> mattered. When adding a surface-scoped role, gate it against **every** surface in that
> subtree, not the one the subtree is named after.

---

## 2. Silent player death — real, and not provider-specific

The kickoff recorded this as *"a question to investigate, not a defect"*, on the grounds that
the induction was artificial and *"whether a provider player can die this way in the wild is
unknown."*

**It is not unknown. This project has already observed it.**

`ritmofit_dev_plan/HISTORY.md` (session 2026-07-06, Apple Music CSP fix) records a real
Apple Music playback verification in which MusicKit authorized, loaded the track,
set `nowPlayingItem` with the full 246 s duration, built the MSE `blob:` audio element, and
logged **zero errors** — and then the buffer stalled at `readyState 0` under Chrome's
background-media throttling. It was caught by a human moving to a foreground tab. Nothing in
the app noticed.

That is a provider player dying silently, on real hardware, with a real provider, already in
this repository's history.

### The gap is structural

Every adapter reports **finished** and **errored**. None reports **stopped without being
asked** or **stalled**. `PlaybackAdapter` (`types.ts:39`) has no position or liveness member,
and `RuntimePlaybackCoordinator` never re-checks after `setStatus({ kind: 'playing' })` —
`tick()` returns early while the segment index is unchanged.

| Provider | Signal available | What is ignored today |
| --- | --- | --- |
| **Spotify** | `player_state_changed` already delivers `paused` + `position` (`spotify-adapter.ts:80`) | `paused: true` at `position > 0` falls through — only `position === 0` counts, as end-of-track |
| **SoundCloud** | Widget API `getPosition` / `isPaused`; `PAUSE` event | `PAUSE` is **declared** in the Events type (`soundcloud-adapter.ts:45`) but never bound. No position poll. |
| **Apple Music** | `playbackStateDidChange`; `currentPlaybackTime` | Only `completed` / `ended` handled. `paused`, `stalled`, `waiting` are not even in the typed slice (`musickit.ts:72`). |

Both consumers share the gap: `preview.ts` reacts to the same two adapter events and has no
liveness poll either.

### Confirmed at the coordinator level

A throwaway probe drove `SpotifyAdapter` through `RuntimePlaybackCoordinator` with the real
SDK state shape:

```
status after start:                {"kind":"playing","index":0,"provider":"spotify"}
emit player_state_changed {paused:true, position:45000}
status after silent death + tick:  {"kind":"playing","index":0,"provider":"spotify"}
statuses emitted:                  ["preparing","playing"]
```

No `onFinish`, no `onError`, no status change. `PlaybackRail` then renders
`♪ Spotify` in `text-text-tertiary` — no alert, no glyph change — while the clock advances
over silence.

**The probe was deliberately not kept as a test.** A test asserting this behaviour would pin
the bug as correct, which is exactly the F-05 trap where `apple-music.test.ts` made a green
suite evidence *for* a defect.

### Why the Spotify case is not exotic

Spotify Connect transfer is a first-class product feature. An instructor whose phone grabs
the session mid-class — or who simply presses pause in another Spotify client — produces
`{ paused: true, position: 45000 }` exactly. No iframe blanking required.

### Proposed design — NOT implemented

Two pieces, both additive.

**1. An optional liveness read on the adapter contract.**

```ts
export interface PlaybackAdapter {
  // … existing members unchanged …
  /**
   * Provider-reported playhead in provider-relative ms, and whether the
   * provider believes it is playing. Optional: an adapter that cannot answer
   * returns null and is exempt from the liveness check rather than failing it.
   */
  getLiveness?(): Promise<{ positionMs: number; playing: boolean } | null>;
}
```

Optional, so no adapter is forced to answer and the change cannot break a provider whose SDK
does not expose position.

**2. A coordinator watchdog.**

While status is `playing`, poll `getLiveness()` on a slow interval (2–3 s is ample — this is
a "has it been dead for seconds" check, not frame-accurate sync). Treat as death:
`playing === false` when we did not pause, or `positionMs` not advancing across N
consecutive polls while the class clock does. Route the result through the existing
`fail({ phase: 'adapter' })` path so it lands on the LIVE-09 surface already verified above —
no new UI, no new error vocabulary, no second recovery grammar.

Tuning must tolerate buffering: a track that stalls for 800 ms and resumes is not dead.
Require several consecutive non-advancing polls, and reset the counter on any advance.

**Per-provider implementation notes.** Spotify needs no new plumbing — `onStateChange`
already receives everything, so its `getLiveness` can read the last state. SoundCloud needs
`getPosition`/`isPaused` added to the typed widget slice (they exist in the official API,
just not in our interface) and binding the already-declared `PAUSE` event. Apple Music needs
`currentPlaybackTime` and `playbackState` added to `MusicKitInstance`, plus the remaining
`PlaybackStates` keys.

**Music-constraint check.** This reads provider-reported transport state through the official
SDK — the same channel as `play`/`pause`/`seek`. It does not cache, proxy, download, decode,
mix, or analyze audio, and it derives nothing from the stream. It is a remote-control status
read, squarely inside the "adapters are remote controls for provider-owned players" framing
in `types.ts`.

**Open question for the owner.** A watchdog that fires wrongly is worse than none — it would
interrupt a class that is playing fine. The polling interval and consecutive-miss threshold
should be tuned against a real provider before this ships, which means a live-provider
session, not a local one.

---

## 2b. Decided 2026-08-02: instrument first, alert later

The owner resolved the open question above by **splitting the design in half**. Piece 1 (the
adapter liveness read) and the *observation* half of piece 2 are implemented; the **watchdog
itself — anything that routes a verdict to `fail()` — is not**, and stays an owner decision.

The reasoning is the open question's own: a watchdog that fires wrongly is worse than none,
and its thresholds cannot be tuned against the local mock seam. Instrumentation removes the
false-fire risk entirely while producing exactly the evidence tuning needs.

**What shipped** (`apps/web/src/lib/playback/liveness.ts`, merged to `main` as
[PR #395](https://github.com/steven-crosby/ritmofit-web/pull/395) on 2026-08-25,
deployed 2026-08-28 as Worker `fc0eb9a9`):

- `PlaybackAdapter.getLiveness?()`, implemented on all three adapters, exactly as proposed
  above. Three outcomes carry distinct meaning: a reading, `null` (this adapter cannot
  answer, so it is exempt), and a **rejection** (the provider stopped answering — the
  strongest silent-death signal there is, and the one a blanked iframe produces).
- A `LivenessObserver` that classifies each sample, keeps a ring buffer of raw samples, and
  logs **verdict transitions only** — a 45-minute class at 2.5 s would otherwise be a
  thousand console lines nobody reads. `__rfLiveness.summary()` reads the buffer from the
  running page afterwards.
- A slow poll owned by the coordinator. It does **not** ride the host rAF tick, because rAF
  stops entirely in a backgrounded tab — which is where the 2026-07-06 Apple Music stall
  happened, and therefore the case most worth catching.

**One verdict the original design did not have: `host_stalled`.** It was added so a
backgrounded or occluded host (rAF records zero ticks) would not be counted as provider
death. The first verification run recorded 3 straight `host_stalled` samples from an
occluded Chrome window, not only a hidden tab. That short-circuit was later shown to be
wrong: it discarded a successful provider reading before inspecting it. `hostTicks` remains
on each sample as context. The winning verdict now comes from the provider reading (or
from `unresponsive` / `exempt`). `host_stalled` is no longer a classify outcome — every
`record()` input is `null`, `'unresponsive'`, or a reading, so there is no remaining "no
provider signal" case for it.

### The measurement, and the number it produced

Verified in real (non-headless) Chrome against a local SoundCloud class, forcing the page
active via `Page.bringToFront` + `Emulation.setFocusEmulationEnabled` +
`Page.setWebLifecycleState`. Without those the harness measures its own occlusion.

| Condition | Samples | Result |
| --- | --- | --- |
| **Healthy playback, 90 s** | 35 | 34 `advancing`, **1** `not_advancing`; peak consecutive misses **1** |
| **Blanked widget iframe** | 5 | 5 consecutive `unresponsive`, counter climbing 1 → 5 |

Healthy playhead deltas tracked wall clock to within ~3 ms of the 2 500 ms interval
(`deltaMax` 2502.9 ms), with ~150 host rAF ticks between samples throughout.

**The tuning datum: a healthy provider reached 1 consecutive miss and never 2.** A threshold
of **≥3** consecutive misses (~7.5 s) would have produced zero false fires across this window
while catching the induced death comfortably.

**Do not over-read that number.** It is 90 seconds, one provider, one local class, one
machine, and no network variance. It is the shape of the answer, not the answer. The
live-provider requirement in the open question above still stands — Spotify Connect and
MusicKit have not been observed at all yet, and the Apple Music case is the one that
motivated this work.

**Confirmed inert.** Through both the induction and the baseline the runtime never reacted:
no `role="alert"` in the DOM, no "Music interrupted" copy, no status change, no adapter
teardown. That is the point — the instructor's class is untouched by being observed.

### Live-provider measurement — 2026-08-31

Measured on production Worker `fc0eb9a9` in real, non-headless Chrome with a Premium
Spotify account and an Apple Music subscription. The owner confirmed audible output; Spotify's
Web API independently confirmed the active device, current track, and advancing playhead. The
observer remained inert throughout.

| Provider / condition | Samples | Result |
| --- | --- | --- |
| **Apple Music, healthy and visible** | 97 across two runs | 97 `advancing`; peak consecutive misses **0** |
| **Apple Music, tab hidden** | 42 | 42 `host_stalled`; all 42 provider readings still reported `playing: true` with a positive position delta |
| **Spotify, competing Connect device** | 39 | Ritmo lost the active device after ~1.25 s; another household device became active, while Ritmo's cached reading remained `playing: true` and frozen |
| **Spotify, healthy Ritmo device** | 29 plus an 8 s API cross-check | Observer reported 27 `not_advancing` and peak misses **16**, but Spotify's Web API showed the Ritmo device active and advanced **8,308 ms in ~8 s**; the owner heard uninterrupted audio |

**The Spotify signal on Worker `fc0eb9a9` was invalid for steady playback.** At that
measurement, `SpotifyAdapter.getLiveness()` returned the last `player_state_changed`
payload. That event reports transport state changes; it is not a playhead timer. During
healthy playback the cached position could remain unchanged for many polls, manufacturing
consecutive misses. In the measured run it froze at 1,220 ms, later jumped to 30,173 ms
when another state event arrived, then froze again while Spotify's own API and audible
output proved playback was advancing. Both a real Connect-device handoff and healthy
playback therefore produced the same frozen local reading.

That stale-cache behaviour was the pre-[#399](https://github.com/steven-crosby/ritmofit-web/pull/399)
adapter. **It is not current.** `#399` shipped `getCurrentState()` on every probe and treats
`null` or a current-track URI different from the class track while the adapter owns started
playback as an unresponsive local device. The URI check was added after Spotify Connect
changed the active track independently of the class while continuing to play through the
Ritmo Studio device; this is remote control of the active Connect device, not a device
handoff. A separate explicit transfer to the iPhone and back exercised the device-handoff
path.

The corrected bundle was live-verified before merge (loaded into the authenticated
production origin without deploying it). Healthy playback produced 14/14 `advancing`
samples in the first run and 5/5 after a reset, with zero misses and audible music
confirmed by the owner. Changing the active track from the iPhone while Ritmo remained the
output device changed the observer from `advancing` to `unresponsive`; the subsequent
remote-control / explicit-device-transfer sequence accumulated 93 `unresponsive` and 2
`provider_paused` samples. The signal fix is therefore live-verified for healthy steady
playback, Connect track replacement, and external pause. The observer remained inert as
designed: Live did not react to any verdict.

Do **not** route any liveness verdict to `fail()` from this observer. Alerting is still an
owner decision; instrumentation stays recording-only.

Do not make Spotify's arbitrary Connect queue the Live source of truth. The class track and its
choreography remain authoritative; a mismatched provider track or external pause should eventually
surface as an interruption with a recovery action that restores the scheduled class track.

**The hidden-tab short-circuit did not "prevent false misses."** The 42 Apple Music hidden-tab
samples were classified `host_stalled` because `classify()` returned that verdict as soon as
`hostTicks === 0`, without inspecting the reading. The table above already shows every one of
those 42 readings was `playing: true` with a positive position delta — they would have been
`advancing` if the provider had been inspected, so the short-circuit discarded healthy
evidence rather than protecting the miss counter. The same short-circuit would have swallowed
the motivating 2026-07-06 Apple Music stall (`playing: true`, frozen position, backgrounded
tab) as `host_stalled` instead of `not_advancing`. Classify now inspects the provider reading
regardless of host ticks: an advancing playhead is `advancing` (misses stay 0); a frozen
`playing: true` is `not_advancing` and increments `consecutiveMisses`. `unresponsive` is
still classified first and still counts as a miss. The observer remains inert — no `fail()`,
no Live UI, no class-clock freeze.

Two adjacent production findings need separate follow-up:

- On the first Apple Music run in a fresh browser, the class clock advanced for about 31 seconds
  while the owner completed MusicKit authorization. Track 1's prompter timeline therefore ran
  ahead of its audio until the next track boundary. A warm authorized run started within about
  two seconds and stayed aligned.
- The Music workspace derived Spotify's "Session expired · Reconnect for playback" state from an
  expired access-token timestamp even though the stored refresh token successfully minted a new
  playback token. After that server-side refresh, reloading changed the same connection to
  "Connected · Playback authorized" without an OAuth reconnect.

---

## 3. Still open

- **F-02** (D11 `createPattern` `InvalidStateError`) — re-checked this session, still no
  canvas or canvas dependency anywhere in `apps/web`. Unchanged: unconfirmed, not closed.
- **The liveness watchdog** — the observation half is implemented and now measured against
  SoundCloud, Apple Music, and Spotify (§2b and the 2026-08-31 live-provider measurement).
  The two signal problems that previously blocked even considering a threshold are no
  longer current: Spotify's stale `player_state_changed` cache was replaced by
  `getCurrentState()` in [#399](https://github.com/steven-crosby/ritmofit-web/pull/399),
  and `classify()` now inspects the provider reading even when the host rAF loop recorded
  zero ticks (`host_stalled` is no longer a winning verdict). **Alerting is still not
  wired** — the observer stays inert by owner decision (instrument first). Re-measure a
  hidden-tab Apple run under the new classifier before treating the candidate ≥3
  threshold as live-verified; the 42-sample row above is a record of the old short-circuit,
  not of current classify.
- **Runtime failure coverage** — SoundCloud's runtime-failure path was induced earlier. A real
  Spotify Connect-device handoff was observed on 2026-08-31, but it produced no SDK error event;
  only the inert liveness observer noticed the frozen cached state. Apple Music's adapter error
  path remains uninduced.

## Local environment note

The local SoundCloud `music_connections` row had expired 2026-07-25, which made all five
local classes unrunnable in Live. Its `expires_at` was refreshed in the **local** D1 only.
Nothing was written to production; the induction above is entirely local.
