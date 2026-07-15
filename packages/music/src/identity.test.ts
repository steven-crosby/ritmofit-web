import { describe, expect, it } from 'vitest';
import { providerTrackIdAliases } from './identity.js';

describe('providerTrackIdAliases', () => {
  it('matches a canonical SoundCloud track URN to its legacy numeric id', () => {
    expect(providerTrackIdAliases('soundcloud', 'soundcloud:tracks:12345')).toEqual([
      'soundcloud:tracks:12345',
      '12345',
    ]);
  });

  it('matches a legacy numeric SoundCloud id to its canonical track URN', () => {
    expect(providerTrackIdAliases('soundcloud', '12345')).toEqual([
      '12345',
      'soundcloud:tracks:12345',
    ]);
  });

  it('keeps non-decimal and non-track SoundCloud identifiers exact-only', () => {
    expect(providerTrackIdAliases('soundcloud', 'soundcloud:tracks:not-numeric')).toEqual([
      'soundcloud:tracks:not-numeric',
    ]);
    expect(providerTrackIdAliases('soundcloud', 'soundcloud:playlists:12345')).toEqual([
      'soundcloud:playlists:12345',
    ]);
    expect(providerTrackIdAliases('soundcloud', 'legacy-slug')).toEqual(['legacy-slug']);
  });

  it('keeps neighboring provider identifiers opaque', () => {
    expect(providerTrackIdAliases('spotify', '12345')).toEqual(['12345']);
    expect(providerTrackIdAliases('apple_music', 'soundcloud:tracks:12345')).toEqual([
      'soundcloud:tracks:12345',
    ]);
  });
});
