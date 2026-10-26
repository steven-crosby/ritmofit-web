import { describe, expect, it } from 'vitest';
import {
  PLAYLIST_LINK_PLACEHOLDER,
  UNSUPPORTED_PLAYLIST_URL,
  isSpotifyResourceId,
  playlistProviderFromUrl,
  spotifyPlaylistLinkError,
} from './playlist-link.js';

describe('playlistProviderFromUrl', () => {
  it('recognizes Spotify, Apple Music, and SoundCloud playlist hosts', () => {
    expect(
      playlistProviderFromUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'),
    ).toBe('spotify');
    expect(playlistProviderFromUrl('https://spotify.com/playlist/abc')).toBe('spotify');
    expect(playlistProviderFromUrl('https://music.apple.com/us/playlist/demo/pl.demo')).toBe(
      'apple_music',
    );
    expect(playlistProviderFromUrl('https://soundcloud.com/artist/sets/mix')).toBe('soundcloud');
    expect(playlistProviderFromUrl('https://on.soundcloud.com/abc')).toBe('soundcloud');
  });

  it('ignores blank, non-URL, and lookalike hosts', () => {
    expect(playlistProviderFromUrl('')).toBeNull();
    expect(playlistProviderFromUrl('   ')).toBeNull();
    expect(playlistProviderFromUrl('not a url')).toBeNull();
    expect(playlistProviderFromUrl('javascript:alert(1)')).toBeNull();
    expect(playlistProviderFromUrl('https://open.spotify.com.evil.com/playlist/x')).toBeNull();
    expect(playlistProviderFromUrl('https://music.apple.com.evil.com/playlist/x')).toBeNull();
    expect(playlistProviderFromUrl('https://soundcloud.com.evil.com/sets/x')).toBeNull();
    expect(playlistProviderFromUrl('https://example.com/playlist/1')).toBeNull();
  });

  it('uses a provider-agnostic paste placeholder', () => {
    expect(PLAYLIST_LINK_PLACEHOLDER).toBe(
      'Paste a Spotify, Apple Music, or SoundCloud playlist link',
    );
    expect(PLAYLIST_LINK_PLACEHOLDER).not.toMatch(/SoundCloud playlist URL/);
  });
});

describe('spotifyPlaylistLinkError', () => {
  const editorial = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';

  it('rejects a Spotify playlist id whose shape cannot encode a 128-bit id', () => {
    expect(isSpotifyResourceId('invalid000000000000000')).toBe(false);
    expect(isSpotifyResourceId('37i9dQZF1DXcBWIGoYBM5M')).toBe(true);
    expect(
      spotifyPlaylistLinkError('https://open.spotify.com/playlist/invalid000000000000000'),
    ).toBe(UNSUPPORTED_PLAYLIST_URL);
    expect(
      spotifyPlaylistLinkError('https://open.spotify.com/playlist/invalid000000000000000?si=share'),
    ).toBe(UNSUPPORTED_PLAYLIST_URL);
    expect(spotifyPlaylistLinkError('https://open.spotify.com/playlist/37i9dQZF1DX')).toBe(
      UNSUPPORTED_PLAYLIST_URL,
    );
    expect(spotifyPlaylistLinkError('https://open.spotify.com/playlist/')).toBe(
      UNSUPPORTED_PLAYLIST_URL,
    );
  });

  it('leaves a well-shaped Spotify id and other providers for the import request', () => {
    expect(spotifyPlaylistLinkError(editorial)).toBeNull();
    expect(
      spotifyPlaylistLinkError('https://open.spotify.com/intl-de/playlist/37i9dQZF1DXcBWIGoYBM5M'),
    ).toBeNull();
    expect(spotifyPlaylistLinkError(`${editorial}?si=abc123`)).toBeNull();
    expect(spotifyPlaylistLinkError('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')).toBe(
      null,
    );
    expect(spotifyPlaylistLinkError('https://music.apple.com/us/playlist/demo/pl.demo')).toBeNull();
    expect(spotifyPlaylistLinkError('https://soundcloud.com/artist/sets/mix')).toBeNull();
    expect(spotifyPlaylistLinkError('not a url')).toBeNull();
  });
});
