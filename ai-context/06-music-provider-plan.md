# 06 — Music Provider Plan

## Provider priority

SoundCloud is the first provider because it is a core RitmoFit differentiator.

Spotify and Apple Music should be added later through the same abstraction.

## Important product rule

Music providers are metadata and playback-link sources.

RitmoFit does not host or store full audio.

RitmoFit does not become the music source of truth.

## Provider abstraction

Implement music providers behind an interface similar to:

```ts
export interface MusicProvider {
  provider: MusicProviderKey;
  searchTracks(query: string, context: MusicProviderContext): Promise<ProviderTrackSearchResult[]>;
  getTrack(providerTrackId: string, context: MusicProviderContext): Promise<ProviderTrackDetail>;
  getPlaylist?(providerPlaylistId: string, context: MusicProviderContext): Promise<ProviderPlaylistDetail>;
  getPlaylistTracks?(providerPlaylistId: string, context: MusicProviderContext): Promise<ProviderTrackDetail[]>;
}
```

Suggested provider keys:

```txt
soundcloud
spotify
apple_music
```

## Shared provider track shape

```ts
export type ProviderTrackSearchResult = {
  provider: MusicProviderKey;
  providerTrackId: string;
  title: string;
  artistName: string;
  albumName?: string | null;
  durationMs?: number | null;
  artworkUrl?: string | null;
  providerUrl?: string | null;
  previewUrl?: string | null;
  bpm?: number | null;
  isrc?: string | null;
  raw?: unknown;
};
```

## SoundCloud first implementation

Initial SoundCloud features:

- connect account if needed
- search tracks
- fetch track details
- import track metadata
- store provider URL
- open track externally

Playlist import should be implemented only if the SoundCloud API access and returned data support it cleanly.

Do not block the MVP class builder on SoundCloud playlist import.

## Spotify later

Spotify features later:

- OAuth connection
- fetch user playlists
- import playlist metadata
- import track metadata
- open track/playlist externally

Do not assume Spotify playback inside RitmoFit.

## Apple Music later

Apple Music integration has two separate concerns:

1. Apple Sign In for auth
2. Apple Music/MusicKit for music metadata/access

Keep these separate in code and configuration.

## Metadata normalization

When importing a provider track:

1. Fetch provider metadata.
2. Create or find a normalized `track`.
3. Create or update `provider_track`.
4. Attach to class if requested.
5. Store raw metadata JSON for debugging.

## Matching tracks across providers

In v1, keep matching simple.

Preferred matching signals:

- ISRC, if available
- normalized title + artist + duration proximity

Do not overbuild cross-provider deduplication early.

## Provider risk notes

- APIs have rate limits.
- Provider metadata can change.
- Provider track availability can change.
- Some tracks may not be playable outside their provider app.
- OAuth refresh behavior differs per provider.
- SoundCloud API access may have practical limitations.

## Implementation rule

Do not let provider-specific response shapes leak into frontend UI or class domain models.

Use provider adapters to convert everything into shared RitmoFit shapes.
