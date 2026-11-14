/**
 * Groups the tracks that failed static preflight by what fixes them (RF-136):
 * one group per reason and provider set, so twelve Apple Music tracks with no
 * connection read as one problem with one fix, not twelve rows. Pure — the
 * Live preflight screen renders the result.
 */
import type { Provider } from '@ritmofit/shared';
import { providerLabel } from './providers.js';
import type { PreflightTrackResult, UnplayableReason } from './playback/types.js';

export interface PreflightFailureGroup {
  /** Stable React key: the reason plus its providers. */
  key: string;
  reason: UnplayableReason;
  /** The providers the fix applies to; empty when the reason names none. */
  providers: Provider[];
  /** The failing tracks, in class order. */
  tracks: PreflightTrackResult[];
  label: string;
  hint: string;
  /** Where the fix lives: provider connections, or the class builder. */
  fix: 'connections' | 'builder';
}

function joined(names: string[], word: 'and' | 'or'): string {
  return names.length <= 2
    ? names.join(` ${word} `)
    : `${names.slice(0, -1).join(', ')} ${word} ${names[names.length - 1]}`;
}

function copyFor(
  reason: UnplayableReason,
  providers: Provider[],
  count: number,
): Pick<PreflightFailureGroup, 'label' | 'hint' | 'fix'> {
  const one = count === 1;
  const names = providers.map(providerLabel);
  switch (reason) {
    case 'no_provider_ref':
      return {
        label: 'No provider link',
        hint: `Add a music provider to ${one ? 'this track' : 'these tracks'} in the builder.`,
        fix: 'builder',
      };
    case 'no_connected_provider':
      if (names.length === 0) {
        return {
          label: `No connected provider can play ${one ? 'this' : 'these'}`,
          hint: `Connect a music provider that has ${one ? 'this track' : 'these tracks'}.`,
          fix: 'connections',
        };
      }
      return {
        label: `${joined(names, 'and')} ${names.length === 1 ? 'is' : 'are'} not connected`,
        hint: `Connect ${joined(names, 'or')} to play ${one ? 'this track' : 'these tracks'}.`,
        fix: 'connections',
      };
    case 'playback_reauth_required': {
      const name = names.length === 0 ? 'Spotify' : joined(names, 'and');
      return {
        label: `${name} ${names.length > 1 ? 'need' : 'needs'} reconnecting`,
        hint: `Reconnect ${name} for playback so it can grant the streaming scope.`,
        fix: 'connections',
      };
    }
    case 'provider_not_playable':
      return {
        label: 'Not on a provider Ritmo can play yet',
        hint: one
          ? 'Open the track in the builder and find it on SoundCloud or Apple Music.'
          : 'Open these tracks in the builder and find them on SoundCloud or Apple Music.',
        fix: 'builder',
      };
    case 'missing_duration':
      return {
        label: 'No duration set',
        hint: one
          ? 'Enter the track duration in the builder.'
          : 'Enter each track’s duration in the builder.',
        fix: 'builder',
      };
  }
}

/**
 * One group per (reason, providers), in the order each first appears in the
 * class; tracks keep class order inside their group. Playable results are
 * ignored, so callers may pass either the full track list or the failing subset.
 */
export function groupPreflightFailures(results: PreflightTrackResult[]): PreflightFailureGroup[] {
  const groups = new Map<
    string,
    { reason: UnplayableReason; providers: Provider[]; tracks: PreflightTrackResult[] }
  >();
  for (const result of results) {
    if (result.selection.status !== 'unplayable') continue;
    const { reason } = result.selection;
    const providers = result.selection.providers ?? [];
    const key = [reason, ...providers].join(':');
    const group = groups.get(key);
    if (group) group.tracks.push(result);
    else groups.set(key, { reason, providers, tracks: [result] });
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    ...group,
    ...copyFor(group.reason, group.providers, group.tracks.length),
  }));
}
