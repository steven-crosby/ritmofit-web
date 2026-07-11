import { describe, it, expect } from 'vitest';
import { parsePlaylistUrl } from './playlist-url.js';

describe('parsePlaylistUrl — Spotify', () => {
  it('parses an open.spotify.com playlist URL', () => {
    expect(parsePlaylistUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toEqual({
      kind: 'importable',
      ref: { provider: 'spotify', playlistId: '37i9dQZF1DXcBWIGoYBM5M' },
    });
  });

  it('ignores share query params (?si=…)', () => {
    const parsed = parsePlaylistUrl('https://open.spotify.com/playlist/37i9dQZF1DX?si=abc123');
    expect(parsed).toEqual({
      kind: 'importable',
      ref: { provider: 'spotify', playlistId: '37i9dQZF1DX' },
    });
  });

  it('rejects a spotify track URL', () => {
    expect(parsePlaylistUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')).toEqual({
      kind: 'unsupported',
    });
  });

  it('rejects a lookalike host (evil-spotify.com / spotify.com.evil.com)', () => {
    expect(parsePlaylistUrl('https://evil-spotify.com/playlist/x')).toEqual({
      kind: 'unsupported',
    });
    expect(parsePlaylistUrl('https://open.spotify.com.evil.com/playlist/x')).toEqual({
      kind: 'unsupported',
    });
  });
});

describe('parsePlaylistUrl — SoundCloud', () => {
  it('parses a sets permalink, carrying the URL for /resolve', () => {
    const url = 'https://soundcloud.com/some-artist/sets/summer-mix';
    expect(parsePlaylistUrl(url)).toEqual({
      kind: 'importable',
      ref: { provider: 'soundcloud', permalinkUrl: url },
    });
  });

  it('accepts m. and www. subdomains', () => {
    for (const host of ['m.soundcloud.com', 'www.soundcloud.com']) {
      expect(parsePlaylistUrl(`https://${host}/artist/sets/mix`).kind).toBe('importable');
    }
  });

  it('accepts opaque on.soundcloud.com short links', () => {
    const url = 'https://on.soundcloud.com/AbCd123';
    expect(parsePlaylistUrl(url)).toEqual({
      kind: 'importable',
      ref: { provider: 'soundcloud', permalinkUrl: url },
    });
  });

  it('rejects a bare on.soundcloud.com root', () => {
    expect(parsePlaylistUrl('https://on.soundcloud.com/')).toEqual({ kind: 'unsupported' });
  });

  it('rejects a track permalink (no /sets/)', () => {
    expect(parsePlaylistUrl('https://soundcloud.com/bakermat/baiana')).toEqual({
      kind: 'unsupported',
    });
  });

  it('rejects a profile URL', () => {
    expect(parsePlaylistUrl('https://soundcloud.com/bakermat')).toEqual({ kind: 'unsupported' });
  });
});

describe('parsePlaylistUrl — Apple Music', () => {
  it('parses a catalog playlist URL with its storefront', () => {
    const parsed = parsePlaylistUrl(
      'https://music.apple.com/gb/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb',
    );
    expect(parsed).toEqual({
      kind: 'importable',
      ref: {
        provider: 'apple_music',
        storefront: 'gb',
        playlistId: 'pl.f4d106fed2bd41149aaacabb233eb5eb',
      },
    });
  });

  it('accepts a shared user playlist (pl.u-…)', () => {
    const parsed = parsePlaylistUrl(
      'https://music.apple.com/us/playlist/my-shared-mix/pl.u-2aoq8mfsZeXV1zM',
    );
    expect(parsed).toEqual({
      kind: 'importable',
      ref: { provider: 'apple_music', storefront: 'us', playlistId: 'pl.u-2aoq8mfsZeXV1zM' },
    });
  });

  it('defaults the storefront to us when the URL has none', () => {
    const parsed = parsePlaylistUrl('https://music.apple.com/playlist/hits/pl.abc123');
    expect(parsed).toEqual({
      kind: 'importable',
      ref: { provider: 'apple_music', storefront: 'us', playlistId: 'pl.abc123' },
    });
  });

  it('classifies /library/ URLs as apple_library (needs a Music-User-Token)', () => {
    expect(parsePlaylistUrl('https://music.apple.com/library/playlist/p.ldvAAZ3C3Qmop9')).toEqual({
      kind: 'apple_library',
    });
    expect(
      parsePlaylistUrl('https://music.apple.com/us/library/playlist/p.ldvAAZ3C3Qmop9'),
    ).toEqual({ kind: 'apple_library' });
  });

  it('classifies a bare p.… id as apple_library even without /library/', () => {
    expect(parsePlaylistUrl('https://music.apple.com/us/playlist/mine/p.ldvAAZ3C3Qmop9')).toEqual({
      kind: 'apple_library',
    });
  });

  it('rejects an album URL', () => {
    expect(parsePlaylistUrl('https://music.apple.com/us/album/thriller/269572838')).toEqual({
      kind: 'unsupported',
    });
  });
});

describe('parsePlaylistUrl — junk input', () => {
  it.each([
    'not a url',
    'ftp://open.spotify.com/playlist/x',
    'https://example.com/playlist/x',
    'https://open.spotify.com/playlist/',
    '',
  ])('rejects %j', (url) => {
    expect(parsePlaylistUrl(url)).toEqual({ kind: 'unsupported' });
  });
});
