# Deterministic audit fixtures

Two runs can only be compared if they looked at the same product with the same data. Improvised fixtures
turn a design critique into a critique of whatever content the agent happened to invent. Build this
recipe exactly, in order, and record any deviation in the run folder `README.md`.

All content here is synthetic. Never use the owner's real account, real personal playlists, or production
data. `MOCK_PROVIDERS=true` serves a deterministic catalog (`apps/api/src/lib/mock-catalog.ts`) — for
example `Baianá — Bakermat` (SoundCloud), `Titanium — David Guetta` (Spotify), `Wake Me Up` (Apple
Music) — so provider search, import, and preview are reproducible with zero credentials. The global moves
library is seeded deterministically by `apps/api/src/db/seed.sql`; do not add global moves.

## Accounts

| Role | Name | Email | Purpose |
| --- | --- | --- | --- |
| Populated | Marisol Vega | `marisol.audit@example.com` | Every populated and dense surface |
| Fresh | Sofía Ramos | `sofia.audit@example.com` | First-run, empty, and onboarding surfaces |

Use a throwaway local password of your choosing; never reuse a real credential and never record it in the
deliverable. Sign-up requires `BETA_ALLOWED_EMAILS` to be blank locally (see the pack `README.md`, phase
0b). The fresh account stays untouched — do not create a class in it, or `CLS-02` and `CLS-00` stop being
capturable.

## Classes (populated account)

Build exactly five classes, in this order. Templates map to the stored enum: Cycle = `cycle`,
HIIT = `hiit`, Pilates = `sculpt`.

| # | Title | Template | Tracks | Purpose |
| --- | --- | --- | --- | --- |
| 1 | Sunrise Climb | cycle | 10 | Dense class: timeline, readiness, run-of-show, Live |
| 2 | Heat Check | hiit | 6 | Second populated class, sequential timeline |
| 3 | Slow Burn | sculpt | 5 | Third discipline, free-placement timeline with one gap |
| 4 | Tuesday 6AM — Test | cycle | 3 | Recency/draft state, minimal content |
| 5 | Untitled class | cycle | 0 | Empty class and start-choice surfaces (`CLS-03`) |

Content rules for class 1 (**Sunrise Climb** — the class most surfaces will show):

- Ten tracks drawn from the mock catalog in catalog order, so the track list is identical between runs.
- Manual tempos on nine of the ten tracks, averaging **127 BPM**. Leave one track without a tempo so
  readiness has something real to warn about. Never source BPM from Spotify.
- At least four cues spread across the class, including one at the very start of a track and one within
  the final thirty seconds of a track.
- At least three distinct seeded moves, including one used twice.
- One custom move created in this account, named `Hover Pulse`, so `BLD-11` has real content.
- Mixed provider sources across the ten tracks: SoundCloud, Spotify, and Apple Music all represented.
- Clip windows set on two tracks so playback windows are visible in Builder and Live.

Class 3 (**Slow Burn**) uses free-placement mode with one deliberate silence gap between tracks, so
`BLD-04` shows a gap rather than a packed sequence.

## Hostile content

The dense class must carry hostile content, or long-name and reflow findings are untestable:

- Track 4 of Sunrise Climb is retitled to a long multilingual string:
  `Ritmo del Amanecer — Edición Extendida (Versión Instrumental) 日の出のリズム`
- Its artist is set to a long name: `Orquesta Sinfónica de la Madrugada feat. Los Hermanos Delgado`
- One cue uses a 180-character note.
- One class title uses a long string: rename class 2 to
  `Heat Check — Thursday Express Interval Session (Studio B, Summer Series)` after its populated
  screenshots are captured, then capture the long-title variants.

## Provider connection states

The audit needs several connection truths, and they cannot all exist at once. Capture in this order:

1. **Disconnected:** before connecting anything, capture `MUS-01` and `CONN-01`.
2. **Mixed:** connect the mock providers so `MUS-02`, `CONN-02`, and `ACC-02` show connected, expired, and
   disconnected side by side.
3. **Unavailable:** induce or, if it cannot be induced honestly, mark `MUS-07`, `ACC-03`, and `CLS-05` as
   `code-confirmed` with the exact reason.

Never connect a real provider account. If the environment already holds a real connection, note it as an
evidence source, capture nothing containing personal library content, and say so in the run folder
`README.md`.

## States that must be induced, not imagined

Attempt each of these in the browser before falling back to `code-confirmed`:

- Loading: throttle the network rather than screenshotting a lucky frame.
- Empty: use the fresh account and class 5.
- Error and recovery: block or fail the relevant request.
- Disconnected: use step 1 above.
- Disabled: find the real precondition that disables the control.
- Update available and render/chunk recovery (`SYS-02`, `SYS-03`): if these cannot be induced locally,
  record them as `code-confirmed` with the code path that produces them.

## Fixture deviation

If a fixture cannot be built as specified — a feature does not exist, a limit blocks it, the mock catalog
changed — record it in the run folder `README.md` under "Fixture deviations", with what you built instead
and which surface IDs are affected. Do not quietly substitute different content; a later run comparing
against yours needs to know.
