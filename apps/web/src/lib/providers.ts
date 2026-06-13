/**
 * Music-provider presentation helpers (design system `09`: SoundCloud is a
 * first-class provider, not an afterthought — so it's the default). The provider
 * *values* are the shared enum (`providerValues`); this only adds display labels
 * and the order/default the builder's search UI shows. No new contract.
 */
import { providerValues, type Provider } from '@ritmofit/shared';

/** Human label per provider (the enum values are snake/lowercase). */
export const PROVIDER_LABELS: Record<Provider, string> = {
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
};

/** SoundCloud first (09: "stronger SoundCloud support — a first-class provider"). */
export const PROVIDER_ORDER: Provider[] = ['soundcloud', 'spotify', 'apple_music'];

/** The provider the search box opens on. */
export const DEFAULT_PROVIDER: Provider = 'soundcloud';

/** Label for a provider, falling back to the raw value if ever unknown. */
export function providerLabel(provider: Provider): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

/** Defensive: every shared provider value has a label + a place in the order. */
export const ALL_PROVIDERS_LABELLED = providerValues.every((p) => p in PROVIDER_LABELS);
