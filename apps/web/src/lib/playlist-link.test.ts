import { describe, expect, it } from 'vitest';
import { PLAYLIST_LINK_PLACEHOLDER, playlistProviderFromUrl } from './playlist-link.js';

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
