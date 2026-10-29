# Device, provider and network matrix

<!-- Claude Code, 2026-10-28: Created for D25 and RF-126. -->

The checklist for [D25](./decisions.md): if a device can run the Apple Music or Spotify app, Ritmo
plays there. Each cell is one device + browser + provider + network. **Pass** means the owner heard
the music in Live and pause, resume, seek and track advance worked. Anything less is recorded as what
was actually observed. Rows are evidence with dates, not live status; [RF-126](./tasks/RF-126.json)
owns the next action.

**Owner test devices (2026-10-28):** MacBook, iPhone, Samsung Galaxy tablet (Android). No Windows or
iPad device is available yet, so those rows stay "Not checked" until one is.

Network column: name the kind of network (cellular, home Wi-Fi, other Wi-Fi), never an SSID.

| Device / OS | Browser | Provider | Network | Authorize | Audible Live | Transport | Checked | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| iPhone, iOS 27.0.1 | Safari | Apple Music | Cellular (5G) | Pass | Pass on Worker `b41b99f9` after RF-122 fixed CSP `media-src`; Start took about 5 s ([RF-128](./tasks/RF-128.json)) | Fail: Resume stuck on Waiting for music; Next showed Playback stopped ([RF-124](./tasks/RF-124.json)) | 2026-10-28 | [RF-29](./tasks/RF-29.json), [RF-122](./tasks/RF-122.json) |
| iPhone, iOS 27.0.1 | Safari | Apple Music | Home Wi-Fi | Fail: stalls after Face ID | Not reached | Not reached | 2026-10-28 | [RF-125](./tasks/RF-125.json) |
| iPhone | Safari | Spotify | Any | Not checked | Not checked | Not checked | — | Spotify's Web Playback SDK targets desktop browsers; a phone path may need Spotify Connect (to verify) |
| iPad | Safari | Apple Music | Any | Not checked | Not checked | Not checked | — | — |
| iPad | Safari | Spotify | Any | Not checked | Not checked | Not checked | — | — |
| Mac | Chrome | Apple Music | Home Wi-Fi | Pass | MusicKit reported playing; not heard (agent run) | Next, pause and resume worked by SDK state | 2026-10-28 | Agent check on Worker `d092af3c`; not owner-witnessed |
| Mac | Safari | Apple Music | Any | Not checked | Not checked | Not checked | — | Historical desktop checks in [HISTORY](./HISTORY.md) predate D25 |
| Mac | Chrome | Spotify | Any | Not checked | Not checked | Not checked | — | — |
| Mac | Safari | Spotify | Any | Not checked | Not checked | Not checked | — | — |
| Windows | Chrome or Edge | Apple Music | Any | Not checked | Not checked | Not checked | — | — |
| Windows | Chrome or Edge | Spotify | Any | Not checked | Not checked | Not checked | — | — |
| Android (Galaxy tablet) | Chrome | Apple Music | Any | Not checked | Not checked | Not checked | — | Never tested |
| Android (Galaxy tablet) | Chrome | Spotify | Any | Not checked | Not checked | Not checked | — | Same SDK question as iPhone |

SoundCloud is not part of D25's wording; add rows if the owner extends it.
