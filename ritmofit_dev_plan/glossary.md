# Glossary

Domain terms used throughout the codebase and docs. Keep these meanings consistent.

**Class** — A single planned/run session ("Mon POWER 6/8"). Owned by one user. *Is* the ordered set of
tracks plus the choreography on them — not a playlist imported from elsewhere.

**Class template** — The kind of class: cycle, HIIT, sculpt, tread. An enum on `classes`.

**Track** — The provider-agnostic, abstract song (title, artist, art, optional manual BPM). Not tied to
any one provider.

**Track provider ID** — A row linking a `track` to one provider's copy of it (Spotify / Apple Music /
SoundCloud) via that provider's ID and optional URI. One track can have several. This is what makes
tracks provider-agnostic and lets a class hand off to whichever app the instructor opens.

**class_track** — A track's placement *within a class*. Carries per-class context: position (order),
intensity, optional BPM override, timeline offset (`start_offset_ms`), notes. Choreography (cues,
placed moves) attaches here, so the same song can be choreographed differently in different classes. A
first-class item, not "an imported row."

**Cue** — A coaching prompt tied to a moment in a track (anchored by `anchor_ms`, optionally beat/bar).
Has text and an optional color. Shown in the live prompter. **Separate concept from a move.**

**Move (library)** — A reusable named movement/exercise. Two layers: global **`moves`** (seeded: Climb,
Sprint, Jog, Tap Back, Push, Recovery, …) and **`user_moves`** (a user's custom moves / personal
coaching language, optionally linked to a global move). The MovePicker draws from these.

**Placed move (`class_track_moves`)** — An *instance* of a move on a class_track's timeline (anchored by
`anchor_ms`, optional intensity), referencing a library move or carrying a freeform name. The thing you
see as a marker on the timeline. **Distinct from a cue.**

**Intensity** — Effort level: none / easy / mod / hard / all_out. Lives on a `class_track` (and
optionally per placed move).

**Display BPM** — The tempo shown to the instructor. Our own data: manually entered or sourced from a
permitted tempo provider, never Spotify BPM. Can be overridden per `class_track`
(`display_bpm_override`).

**Beat-drop** — A musically significant moment instructors often anchor cues to. In our model it's just
a cue/move at a specific `anchor_ms` (and optionally beat/bar) — not a distinct anchor type.

**Timeline** — The class laid out over time. `start_offset_ms` on `class_track`; `anchor_ms` on
cues/placed moves. Wall-clock milliseconds is the provider-independent default.

**Segment** — A class section type (Warm-up / Climb / Sprint / Recovery / Cool-down). Cut from the M1
schema as a design concept, then **shipped** in the design-system builder build as the `class_sections`
table (migration `0006`) with a fixed `segmentType` enum
(`warm_up`/`climb`/`sprint`/`recovery`/`cool_down`); the run-payload carries an additive `sections[]`.
See `decisions.md` and `milestones.md` slice 16.

**Team** — A studio/group. Many-to-many with users via `team_memberships`. Team roles
(owner/admin/member) govern *membership management*, not class access.

**Share** — A grant of access to a class, to a single user OR a whole team, at view or edit permission.
Additive and revocable; never changes ownership (Google Drive model).

**Owner** — The single user who owns a class. Always exactly one. Full control including delete and
share management.

**Run-payload** — The versioned single-fetch response (`GET /classes/:id/run-payload`) containing
everything needed to run a class live. The read-optimized iOS contract; the granular REST endpoints are
the edit surface.

**Planning surface** — What the web app is: where instructors build and choreograph. Distinct from
playback, which happens in the providers' own apps.

**Live mode** — Running a class in front of a room (primarily the iOS app): cue prompter, interval
timers, intensity readouts.

**Provider** — A music service: Spotify, Apple Music, or SoundCloud. RitmoFit hands off playback to
these; it does not stream or mix audio itself.

**Mock-track seam** — A dev-only path that creates tracks without any provider API, so local builder
flows remain exercisable with zero credentials.
