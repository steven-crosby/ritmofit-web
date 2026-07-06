/**
 * Playback coordination — the pure decision core of the Ritmo Studio player
 * (provider-playback-implementation.md). This slice is provider selection,
 * clip-window math, and static class preflight; the runtime coordinator that
 * drives adapters (auto-advance, gap handling, clock sync) builds on these in
 * the adapter slices. Everything here is pure and injected (`now`, connections)
 * so it is unit-testable without any provider SDK.
 */
import {
  playbackRequiresConnection,
  providerValues,
  type MusicConnectionView,
  type Provider,
  type RunPayload,
  type RunPayloadTrackEntry,
} from '@ritmofit/shared';
import { PROVIDER_ORDER, providerConnectionState } from '../providers.js';
import type {
  PlaybackWindow,
  PreflightResult,
  PreflightTrackResult,
  ProviderSelection,
} from './types.js';

/** The connection fields selection needs — a subset of `MusicConnectionView`. */
export type ConnectionLike = Pick<MusicConnectionView, 'provider' | 'expiresAt'>;

/** Inputs shared by selection and preflight. */
export interface SelectionOptions {
  /**
   * The instructor's preferred provider (session/local preference for now —
   * no persisted priority exists yet). Null/undefined = no preference; the
   * deterministic fallback order is the product's `PROVIDER_ORDER`.
   */
  preferredProvider?: Provider | null;
  /** Injected clock so expiry checks are pure and testable. */
  now: number;
  /**
   * Providers this surface can actually drive (adapter-registered). A provider
   * absent here can never play, even with a ref + live connection — its adapter
   * isn't wired yet (e.g. Spotify today). Omitted = all providers, for pure
   * selection tests; real surfaces pass their playback-registry keys.
   */
  availableProviders?: readonly Provider[];
}

/** The providers with a live (present, unexpired) connection right now. */
function connectedProviders(connections: ConnectionLike[], now: number): Set<Provider> {
  const connected = new Set<Provider>();
  for (const connection of connections) {
    if (providerConnectionState(connection.provider, connection, now) === 'connected') {
      connected.add(connection.provider);
    }
  }
  return connected;
}

/**
 * Pick the provider that plays this track (plan §"Mixed-provider classes"):
 *
 * 1. the preferred provider, when it is usable and the track has its ref;
 * 2. otherwise the first usable provider with a ref, in `PROVIDER_ORDER`
 *    (the product's deterministic order — SoundCloud first);
 * 3. otherwise unplayable, with the reason preflight copy needs.
 *
 * A provider is *usable* when its adapter is registered on this surface AND
 * either its playback needs no user connection (SoundCloud's public Widget) or
 * it has a live one (MusicKit / Spotify authorize the user). This is why a
 * SoundCloud track plays with no connection — the Widget needs no token, and
 * gating on the likes-only OAuth token (which expires ~hourly) would wrongly
 * take the track dark.
 *
 * Selection is per track, never per class: a mixed-provider class resolves each
 * entry independently against the same connections.
 */
export function selectProvider(
  entry: RunPayloadTrackEntry,
  connections: ConnectionLike[],
  options: SelectionOptions,
): ProviderSelection {
  if (entry.providerRefs.length === 0) {
    return { status: 'unplayable', reason: 'no_provider_ref' };
  }
  const connected = connectedProviders(connections, options.now);
  const available = new Set<Provider>(options.availableProviders ?? providerValues);

  const refFor = (provider: Provider) =>
    entry.providerRefs.find((ref) => ref.provider === provider);
  const usable = (provider: Provider): boolean =>
    available.has(provider) && (!playbackRequiresConnection(provider) || connected.has(provider));

  const preferred = options.preferredProvider ?? null;
  if (preferred && usable(preferred)) {
    const ref = refFor(preferred);
    if (ref) return { status: 'playable', provider: preferred, ref };
  }

  for (const provider of PROVIDER_ORDER) {
    if (!usable(provider)) continue;
    const ref = refFor(provider);
    if (ref) return { status: 'playable', provider, ref };
  }

  return { status: 'unplayable', reason: 'no_connected_provider' };
}

/**
 * The provider-time playback window for an entry. `track.durationMs` in the
 * run-payload is already the effective clipped duration, so:
 *
 *   startMs = clipStartMs
 *   endMs   = clipStartMs + durationMs
 *
 * A missing duration yields a zero-width window (the plan's `?? 0`); preflight
 * separately reports those tracks as unplayable (`missing_duration`).
 */
export function playbackWindowFor(entry: RunPayloadTrackEntry): PlaybackWindow {
  const startMs = entry.clipStartMs;
  return { startMs, endMs: startMs + (entry.track.durationMs ?? 0) };
}

/**
 * Translate class-timeline elapsed time to provider time for an entry:
 * how far into the (clipped) track we are, offset by where the clip starts in
 * the full provider stream. Callers clamp to the entry's window as needed.
 */
export function providerMsAt(entry: RunPayloadTrackEntry, classElapsedMs: number): number {
  const inTrackMs = classElapsedMs - (entry.startOffsetMs ?? 0);
  return entry.clipStartMs + inTrackMs;
}

/**
 * Static preflight over a whole class: resolve every track's provider and
 * window before class start, so Live Mode can refuse to start hands-free
 * playback with a track that could never play — and tell the instructor
 * exactly which track and why. Connection/ref/duration checks only; SDK-level
 * checks (subscription, availability, load failure) arrive with the adapters.
 */
export function preflightPayload(
  payload: RunPayload,
  connections: ConnectionLike[],
  options: SelectionOptions,
): PreflightResult {
  const tracks: PreflightTrackResult[] = payload.tracks.map((entry) => {
    let selection = selectProvider(entry, connections, options);
    // A playable provider is not enough without an end to stop at.
    if (selection.status === 'playable' && entry.track.durationMs == null) {
      selection = { status: 'unplayable', reason: 'missing_duration' };
    }
    return {
      classTrackId: entry.classTrackId,
      position: entry.position,
      title: entry.track.title,
      selection,
      window: playbackWindowFor(entry),
    };
  });
  const unplayable = tracks.filter((t) => t.selection.status === 'unplayable');
  return { ok: unplayable.length === 0, tracks, unplayable };
}
