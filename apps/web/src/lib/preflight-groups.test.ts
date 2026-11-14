import { describe, expect, it } from 'vitest';
import type { Provider } from '@ritmofit/shared';
import type { PreflightTrackResult, UnplayableReason } from './playback/types.js';
import { groupPreflightFailures } from './preflight-groups.js';

const window = { startMs: 0, endMs: 180_000 };

function failing(
  position: number,
  reason: UnplayableReason,
  providers?: Provider[],
): PreflightTrackResult {
  return {
    classTrackId: `ct-${position}`,
    position,
    title: `Track ${position + 1}`,
    selection: { status: 'unplayable', reason, ...(providers ? { providers } : {}) },
    window,
  };
}

function passing(position: number): PreflightTrackResult {
  return {
    classTrackId: `ct-${position}`,
    position,
    title: `Track ${position + 1}`,
    selection: {
      status: 'playable',
      provider: 'soundcloud',
      ref: { provider: 'soundcloud', providerTrackId: 'sc', providerUri: null },
    },
    window,
  };
}

describe('groupPreflightFailures (RF-136)', () => {
  it('returns no groups when nothing failed', () => {
    expect(groupPreflightFailures([])).toEqual([]);
    expect(groupPreflightFailures([passing(0), passing(1)])).toEqual([]);
  });

  it('puts tracks that fail for the same reason and provider in one group, in class order', () => {
    const groups = groupPreflightFailures([
      failing(0, 'no_connected_provider', ['apple_music']),
      passing(1),
      failing(2, 'no_connected_provider', ['apple_music']),
      failing(3, 'no_connected_provider', ['apple_music']),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      reason: 'no_connected_provider',
      providers: ['apple_music'],
      label: 'Apple Music is not connected',
      hint: 'Connect Apple Music to play these tracks.',
      fix: 'connections',
    });
    expect(groups[0]!.tracks.map((track) => track.position)).toEqual([0, 2, 3]);
  });

  it('keeps the same reason on different providers apart, ordered by first appearance', () => {
    const groups = groupPreflightFailures([
      failing(0, 'no_connected_provider', ['spotify']),
      failing(1, 'no_connected_provider', ['apple_music']),
      failing(2, 'no_connected_provider', ['spotify']),
    ]);
    expect(groups.map((group) => [group.label, group.tracks.length])).toEqual([
      ['Spotify is not connected', 2],
      ['Apple Music is not connected', 1],
    ]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(2);
  });

  it('keeps different reasons on the same provider apart', () => {
    const groups = groupPreflightFailures([
      failing(0, 'no_connected_provider', ['spotify']),
      failing(1, 'playback_reauth_required', ['spotify']),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      'Spotify is not connected',
      'Spotify needs reconnecting',
    ]);
    expect(groups[1]).toMatchObject({
      hint: 'Reconnect Spotify for playback so it can grant the streaming scope.',
      fix: 'connections',
    });
  });

  it('names every provider when a track is linked to more than one unconnected provider', () => {
    const [group] = groupPreflightFailures([
      failing(0, 'no_connected_provider', ['spotify', 'apple_music']),
    ]);
    expect(group).toMatchObject({
      label: 'Spotify and Apple Music are not connected',
      hint: 'Connect Spotify or Apple Music to play this track.',
    });
  });

  it('falls back to the generic wording when a failure carries no provider', () => {
    const [connect, reauth] = groupPreflightFailures([
      failing(0, 'no_connected_provider'),
      failing(1, 'playback_reauth_required'),
    ]);
    expect(connect).toMatchObject({
      providers: [],
      label: 'No connected provider can play this',
      hint: 'Connect a music provider that has this track.',
      fix: 'connections',
    });
    expect(reauth).toMatchObject({ label: 'Spotify needs reconnecting', fix: 'connections' });
  });

  it('sends builder-fixable reasons to the builder, with singular and plural wording', () => {
    const one = groupPreflightFailures([
      failing(0, 'no_provider_ref'),
      failing(1, 'provider_not_playable'),
      failing(2, 'missing_duration'),
    ]);
    expect(one.map((group) => [group.label, group.hint, group.fix])).toEqual([
      ['No provider link', 'Add a music provider to this track in the builder.', 'builder'],
      [
        'Not on a provider Ritmo can play yet',
        'Open the track in the builder and find it on SoundCloud or Apple Music.',
        'builder',
      ],
      ['No duration set', 'Enter the track duration in the builder.', 'builder'],
    ]);
    const many = groupPreflightFailures([
      failing(0, 'no_provider_ref'),
      failing(1, 'no_provider_ref'),
      failing(2, 'provider_not_playable'),
      failing(3, 'provider_not_playable'),
      failing(4, 'missing_duration'),
      failing(5, 'missing_duration'),
    ]);
    expect(many.map((group) => group.hint)).toEqual([
      'Add a music provider to these tracks in the builder.',
      'Open these tracks in the builder and find them on SoundCloud or Apple Music.',
      'Enter each track’s duration in the builder.',
    ]);
  });
});
