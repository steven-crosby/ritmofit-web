# 11 — Library Guidelines

The Library is the bridge between saved music and authored classes. It should feel as immediate as
creating a playlist from a music library, but the destination is a movement score rather than a
listening queue.

It is the **discovery shell** of the creator workstation (D21): provider libraries are browsable raw
material, and it is the workspace's resting state when no class is open (readiness + discovery), never an
empty panel.

## Product job

The Library helps an instructor:

1. See music available through supported provider catalogs and connected accounts — surfaced as **provider
   shelves** (Spotify, Apple Music, SoundCloud), each with that service's **liked/saved tracks card**.
2. Search, filter, and select tracks without leaving the planning flow.
3. Open a **playlist detail / track list** from a playlist card — browsing a playlist, not importing it.
4. **Browse and listen/preview** candidates (provider-authorized playback) before committing them.
5. Start a new class from one or more selected tracks (`Start class`).
6. Add selected tracks to an existing class (`Add selected`).
7. Understand provider capability and reconnect only where user connection is supported.

It is the browse-first on-ramp of the creator loop — _familiar before specialized_ (D21) — not a social
feed or recommendation firehose. Every path points at a create action.

## Information hierarchy

Prioritize:

1. Track title and artist.
2. BPM and duration in Azeret Mono.
3. Provider and availability state.
4. Selection state and class action.
5. Small bounded artwork.

Do not infer or display class intensity before a track has been added to a class. Library tracks are
source material; intensity belongs to the authored class context.

## Layout

Desktop uses a persistent source rail, a searchable track table/list, and a selection tray:

- Source rail: **provider shelves** (Spotify, Apple Music, SoundCloud), each surfacing that service's
  **liked/saved tracks card**, plus saved playlists, recent imports, search, and provider filters.
- Main list: low-noise rows with checkbox, artwork, title, artist, BPM, duration, provider, and a quiet
  per-row **preview/listen** control (provider-authorized playback).
- Playlist cards open a **playlist detail / track list** (browse, don't import) — the same row shape and
  the same `Start class` / `Add selected` actions as the rest of the list.
- Selection tray: count, total duration, `Start class` (create), and `Add selected` (add to open class).

Tablet collapses the source rail above the list. Mobile uses a single list and a sticky bottom
selection tray. Rows wrap metadata rather than forcing horizontal scrolling.

## Primary workflow

`Start class` is the single **copper primary** action once tracks are selected (it supersedes the earlier
`Build class` label). It creates a draft class and carries the selected tracks into Builder in their
current order. A new class still needs a **template** — the create step offers Cycle / Pilates / HIIT and
requires a pick (D21) before the draft opens.

`Add selected` is a **cyan secondary** action (it supersedes the earlier `Add to class` label): it adds the
selected tracks to the currently open class. Reordering and intensity assignment happen in Builder.

Both actions are reachable from the main list **and** from a playlist detail view, so an instructor can
browse/listen first and act without a separate import step.

Empty selection copy:

> Select tracks to shape a new class.

Selection copy:

> 4 tracks selected. Start with the music; shape the room in Builder.

## Provider states

Provider capability is explicit. Current implementation truth:

- Spotify: catalog search/import plus user connection and saved-track library access.
- Apple Music: catalog search/import plus user connection and library-song access.
- SoundCloud: catalog search/import plus user connection and likes.

Discovery surfaces sit on that capability matrix and must not offer a dead end. Built today: catalog
**search**, per-user **likes** (all three providers), single-track **import**, and **Spotify playlist-URL
import**. Not yet built (its own sub-slice, D21): **listing a user's saved playlists** and **browsing a
playlist's tracks without importing** — Spotify has the adapter path, SoundCloud needs permalink
`/resolve`, Apple Music has none yet. Until those land, a provider's playlist shelf shows only what its
capability supports (e.g. paste-a-URL import), never a broken browse. See
`../ritmofit_dev_plan/decisions.md` D21 and `../ritmofit_dev_plan/provider-playback-implementation.md`.

The connection-state matrix below applies to providers that support user accounts:

| State            | Treatment                                         |
| ---------------- | ------------------------------------------------- |
| Connected        | check icon + provider label + last sync           |
| Reconnecting     | progress indicator + `Reconnecting` label         |
| Disconnected     | link-break icon + reconnect action                |
| Expired          | clock icon + `Session expired` + reconnect action |
| Permission issue | lock icon + explanation                           |
| Provider error   | warning icon + retry action                       |

Disconnected copy:

> Your music link dropped. Reconnect to keep building.

Provider audio is never cached or re-hosted. Provider controls drive official provider-authorized
playback (SDKs/widgets) or hand off to approved provider applications or links.

## Selection and accessibility

- The checkbox and row both expose selection, but essential controls remain independently focusable.
- Selected rows use checkbox state plus a neutral surface/border change. The content heading names the
  active source; cyan belongs to the checkbox and focus ring, not the persistent row container.
- All targets are at least 44 by 44 pixels.
- The sticky selection tray is announced as a status region.
- Keyboard users can select rows, move through the list, and trigger class creation.
- Focus is always visible with the cyan focus ring.

## Launch boundary

Library contains the instructor's music and saved source material. Social discovery and team
collaboration are outside the launch system and must not crowd the authoring workflow.
