# 11 - Library Guidelines

The Library is the bridge between saved music and authored classes. It should feel as immediate as
creating a playlist from a music library, but the destination is a movement score rather than a
listening queue.

## Product job

The Library helps an instructor:

1. See music available through supported provider catalogs and connected accounts.
2. Search, filter, and select tracks without leaving the planning flow.
3. Start a new class from one or more selected tracks.
4. Add selected tracks to an existing class.
5. Understand provider capability and reconnect only where user connection is supported.

It is not a social feed or recommendation firehose.

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

- Source rail: Liked tracks, saved playlists, recent imports, provider filters.
- Main list: low-noise rows with checkbox, artwork, title, artist, BPM, duration, provider.
- Selection tray: count, total duration, `Build class`, and `Add to class`.

Tablet collapses the source rail above the list. Mobile uses a single list and a sticky bottom
selection tray. Rows wrap metadata rather than forcing horizontal scrolling.

## Primary workflow

`Build class` is the single copper primary action once tracks are selected. It creates a draft class
and carries the selected tracks into Builder in their current order.

`Add to class` is a cyan secondary action. Reordering and intensity assignment happen in Builder.

Empty selection copy:

> Select tracks to shape a new class.

Selection copy:

> 4 tracks selected. Start with the music; shape the room in Builder.

## Provider states

Provider capability is explicit. Current implementation truth:

- Spotify: catalog search/import; no user connection or likes.
- Apple Music: catalog search/import; no user connection or likes.
- SoundCloud: catalog search/import plus user connection and likes.

The connection-state matrix below applies only to providers that support user accounts:

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

Provider audio is never embedded or cached. Provider controls hand off to approved provider
applications or links.

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
