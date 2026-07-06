/**
 * Builder track preview (provider-playback-implementation.md §"Builder preview
 * is manual"). Lets an instructor hear the selected track's saved clip window
 * while choreographing — test a climb/sprint/drop — using the same adapter
 * stack as Live Mode via `PreviewPlaybackController`. Deliberately manual: no
 * auto-advance, no whole-class preflight, just this one track's range. The host
 * owns a small rAF clock exactly as Live Mode does, so the controller stays
 * timer-free; Ritmo Studio owns the window, the provider SDK owns the audio (D19).
 *
 * Playback-state rendering follows the design system's "Playback states (Live
 * Mode & Builder preview)" table: glyph + label carry meaning (never color
 * alone), unplayable verdicts name the fix, and a runtime failure is a
 * recoverable `role="alert"` — no provider handoff link (that stays a Live Mode
 * recovery-only affordance).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MusicConnectionView,
  Provider,
  RunPayloadTrackEntry,
  TrackSearchResult,
} from '@ritmofit/shared';
import {
  attachTrackProviderId,
  connectProvider,
  listConnections,
  resolveTrackProvider,
} from '../lib/api.js';
import { playbackWindowFor, selectProvider } from '../lib/playback/coordinator.js';
import { PreviewPlaybackController, type PreviewStatus } from '../lib/playback/preview.js';
import type { RunPayloadProviderRef, UnplayableReason } from '../lib/playback/types.js';
import { PLAYBACK_ADAPTERS, PLAYBACK_ADAPTER_PROVIDERS } from '../lib/playback/registry.js';
import { providerLabel } from '../lib/providers.js';

/** Providers the track has a ref for AND the web player can actually drive. */
function playableRefProviders(entry: RunPayloadTrackEntry): string[] {
  const seen = new Set<string>();
  for (const ref of entry.providerRefs) {
    if (ref.provider in PLAYBACK_ADAPTERS) seen.add(providerLabel(ref.provider));
  }
  return [...seen];
}

/** A humane "X or Y" join for the connect hint. */
function orJoin(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

export function TrackPreview({ entry }: { entry: RunPayloadTrackEntry }) {
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>({ kind: 'idle' });
  // A cross-provider resolution attached a playable ref this session — overlay it
  // on the entry so the verdict/preview update immediately (it's persisted
  // server-side, and a full class reload carries it too). Reset per selected track.
  const [overrideRefs, setOverrideRefs] = useState<RunPayloadProviderRef[] | null>(null);
  const controllerRef = useRef<PreviewPlaybackController | null>(null);
  // The host rAF clock runs exactly while the controller reports `playing`.
  // Deriving this from status (rather than a separate `playing` flag the
  // handlers and a reconciling effect kept in sync) is what makes the clock
  // survive the `preparing → playing` transition: a hand-synced flag would get
  // cleared on the transient `preparing` commit and never restart, so `tick()`
  // never ran and the clip-window end was never enforced.
  const playing = status.kind === 'playing';

  useEffect(() => {
    let cancelled = false;
    listConnections()
      .then((c) => {
        if (!cancelled) setConnections(c);
      })
      .catch((e: unknown) => {
        if (!cancelled) setConnectionsError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // (Re)build the controller when the resolved connections change; tear down the
  // previous one so its adapter/SDK is released.
  useEffect(() => {
    if (!connections) return;
    const controller = new PreviewPlaybackController(connections, {
      // Clock accessor, not a frozen `Date.now()`: the controller outlives this
      // effect, so provider-expiry must be read at each play(), not at build.
      now: () => Date.now(),
      adapters: PLAYBACK_ADAPTERS,
      availableProviders: PLAYBACK_ADAPTER_PROVIDERS,
      onStatus: setStatus,
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
      // destroy() doesn't push status; reset it here so `playing` derives false.
      setStatus({ kind: 'idle' });
    };
  }, [connections]);

  // Switching the selected track stops any in-flight preview (single-track
  // model). stop() pushes `idle` via onStatus, which clears `playing`.
  useEffect(() => {
    return () => {
      void controllerRef.current?.stop();
    };
  }, [entry.classTrackId]);

  // Switching the selected track drops any resolution overlay from the previous one.
  useEffect(() => setOverrideRefs(null), [entry.classTrackId]);

  // Host clock: accumulate preview-relative time only while playing, and let the
  // controller stop at the clip-window end. Same rAF shape as Live Mode.
  const baseRef = useRef(0);
  const startRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    let raf = 0;
    const frame = () => {
      const elapsed = baseRef.current + (performance.now() - startRef.current);
      void controllerRef.current?.tick(elapsed);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      baseRef.current += performance.now() - startRef.current;
      cancelAnimationFrame(raf);
    };
  }, [playing]);

  // A fresh preview starts its clip clock from zero; the controller drives every
  // stop (window end, pause, error, track switch) by pushing status, so there is
  // no `playing` flag to reconcile here — it's derived above.
  // The entry with any freshly-resolved provider ref overlaid (see overrideRefs).
  const effectiveEntry = overrideRefs ? { ...entry, providerRefs: overrideRefs } : entry;

  const onPreview = useCallback(() => {
    baseRef.current = 0;
    void controllerRef.current?.play(effectiveEntry);
  }, [effectiveEntry]);

  const onPause = useCallback(() => {
    void controllerRef.current?.pause();
  }, []);

  const onResume = useCallback(() => {
    void controllerRef.current?.resume();
  }, []);

  const onStop = useCallback(() => {
    void controllerRef.current?.stop();
  }, []);

  const reconnectProvider = useCallback(async (provider: Provider) => {
    const result = await connectProvider(provider);
    if (result.authorizeUrl) {
      window.location.href = result.authorizeUrl;
      return;
    }
    setConnections(await listConnections());
  }, []);

  // Static eligibility for the idle verdict (before the instructor hits preview).
  const selection = connections
    ? selectProvider(effectiveEntry, connections, {
        now: Date.now(),
        availableProviders: PLAYBACK_ADAPTER_PROVIDERS,
      })
    : null;
  const playbackWindow = playbackWindowFor(entry);
  const isClipped = entry.clipStartMs > 0 || entry.track.durationMs != null;

  return (
    <div className="flex flex-col gap-2 rounded-card border border-interactive/20 bg-bg-base p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-ui text-xs uppercase tracking-wide text-text-tertiary">Preview</span>
        <PreviewChip status={status} />
      </div>

      {connectionsError && (
        <p className="font-ui text-xs text-text-tertiary">
          Couldn’t check provider connections ({connectionsError}).
        </p>
      )}

      {connections && selection?.status === 'unplayable' ? (
        <UnplayableVerdict
          entry={effectiveEntry}
          reason={selection.reason}
          onReconnect={reconnectProvider}
          onResolved={setOverrideRefs}
        />
      ) : (
        <PreviewControls
          status={status}
          providerLabelText={
            selection?.status === 'playable' ? providerLabel(selection.provider) : null
          }
          ready={connections != null}
          onPreview={onPreview}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
        />
      )}

      {status.kind === 'error' && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-state-danger/40 bg-bg-raised px-3 py-2"
        >
          <p className="font-ui text-xs font-semibold text-text-primary">
            <span aria-hidden className="mr-1 text-state-danger">
              ⚠
            </span>
            Preview stopped: {status.error.message}
          </p>
          <button
            type="button"
            onClick={onPreview}
            className="min-h-9 rounded-pill rf-btn-primary px-3 py-1.5 font-ui text-xs font-semibold text-text-on-accent"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onStop}
            className="min-h-9 rounded-pill border border-interactive px-3 py-1.5 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
          >
            Dismiss
          </button>
        </div>
      )}

      {selection?.status === 'playable' && isClipped && (
        <p className="font-data text-[0.7rem] text-text-tertiary">
          Plays the class clip{' '}
          {entry.track.durationMs != null
            ? `(${formatWindow(playbackWindow.startMs, playbackWindow.endMs)})`
            : '(from the clip start)'}
        </p>
      )}
    </div>
  );
}

/** The idle/verdict line naming exactly why a track can’t preview, with its fix. */
function UnplayableVerdict({
  entry,
  reason,
  onReconnect,
  onResolved,
}: {
  entry: RunPayloadTrackEntry;
  reason: UnplayableReason;
  onReconnect: (provider: Provider) => Promise<void>;
  onResolved: (refs: RunPayloadProviderRef[]) => void;
}) {
  // Refs exist but only for a provider Ritmo can't play (e.g. Spotify) — offer
  // cross-provider resolution instead of a dead-end "connect a provider" hint.
  if (reason === 'provider_not_playable') {
    return <ResolveProviderAction entry={entry} onResolved={onResolved} />;
  }
  if (reason === 'playback_reauth_required') {
    return <ReconnectSpotifyAction onReconnect={onReconnect} />;
  }
  let text: string;
  if (reason === 'no_provider_ref') {
    text = 'No provider link yet — add this track from search or import to preview it.';
  } else if (reason === 'missing_duration') {
    // Preview tolerates a missing duration (open-ended), so this only reaches here
    // if selection reported it; name the fix anyway.
    text = 'No duration yet — add one so the preview knows the clip length.';
  } else {
    const labels = playableRefProviders(entry);
    text = labels.length
      ? `Connect ${orJoin(labels)} to preview this track.`
      : 'Connect a provider that can play this track to preview it.';
  }
  return (
    <p className="flex items-start gap-1.5 font-ui text-xs text-state-caution">
      <span aria-hidden>⊘</span>
      <span>
        <span className="sr-only">Preview unavailable: </span>
        {text}
      </span>
    </p>
  );
}

/** Legacy Spotify grants need one more OAuth trip to approve playback scopes. */
function ReconnectSpotifyAction({
  onReconnect,
}: {
  onReconnect: (provider: Provider) => Promise<void>;
}) {
  const [state, setState] = useState<'idle' | 'reconnecting' | 'error'>('idle');
  const reconnect = () => {
    setState('reconnecting');
    onReconnect('spotify').catch(() => setState('error'));
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-1.5 font-ui text-xs text-state-caution">
        <span aria-hidden>⊘</span>
        <span>
          <span className="sr-only">Preview unavailable: </span>
          Spotify is connected for library access. Reconnect Spotify for playback.
        </span>
      </p>
      <button
        type="button"
        onClick={reconnect}
        disabled={state === 'reconnecting'}
        className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-pill border border-interactive px-3 py-1.5 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive disabled:opacity-50"
      >
        <span aria-hidden>↻</span>
        {state === 'reconnecting' ? 'Reconnecting…' : 'Reconnect Spotify for playback'}
      </button>
      {state === 'error' && (
        <p className="font-ui text-xs text-state-danger" role="alert">
          Could not start Spotify reconnect. Try again from Connections.
        </p>
      )}
    </div>
  );
}

/**
 * "Find on a supported provider" — cross-provider resolution for a
 * `provider_not_playable` track (e.g. a Spotify-only track, no adapter). Searches
 * the playable providers for the same song: a strong same-song match is attached
 * automatically; otherwise the candidates are listed to confirm. The attach is
 * persisted server-side; `onResolved` overlays the new ref so the verdict flips
 * to playable at once, no class reload needed.
 */
function ResolveProviderAction({
  entry,
  onResolved,
}: {
  entry: RunPayloadTrackEntry;
  onResolved: (refs: RunPayloadProviderRef[]) => void;
}) {
  type ResolveState =
    | { kind: 'idle' }
    | { kind: 'searching' }
    | { kind: 'candidates'; candidates: TrackSearchResult[] }
    | { kind: 'none' }
    | { kind: 'error'; message: string };
  const [state, setState] = useState<ResolveState>({ kind: 'idle' });

  const btn =
    'inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-interactive px-3 py-1.5 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive disabled:opacity-50';
  const targets = orJoin(PLAYBACK_ADAPTER_PROVIDERS.map((p) => providerLabel(p)));

  const find = () => {
    setState({ kind: 'searching' });
    resolveTrackProvider(entry.track.id, PLAYBACK_ADAPTER_PROVIDERS)
      .then((result) => {
        if (result.resolved) {
          onResolved(
            result.track.providerIds.map((p) => ({
              provider: p.provider,
              providerTrackId: p.providerTrackId,
              providerUri: p.providerUri,
            })),
          );
        } else if (result.candidates.length > 0) {
          setState({ kind: 'candidates', candidates: result.candidates });
        } else {
          setState({ kind: 'none' });
        }
      })
      .catch((e: unknown) =>
        setState({ kind: 'error', message: e instanceof Error ? e.message : 'Search failed.' }),
      );
  };

  const pick = (c: TrackSearchResult) => {
    setState({ kind: 'searching' });
    attachTrackProviderId(entry.track.id, {
      provider: c.provider,
      providerTrackId: c.providerTrackId,
      providerUri: c.providerUri,
    })
      .then(() =>
        onResolved([
          ...entry.providerRefs,
          { provider: c.provider, providerTrackId: c.providerTrackId, providerUri: c.providerUri },
        ]),
      )
      .catch((e: unknown) =>
        setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not attach.' }),
      );
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-1.5 font-ui text-xs text-state-caution">
        <span aria-hidden>⊘</span>
        <span>
          <span className="sr-only">Preview unavailable: </span>
          Not on a provider Ritmo can play yet — find this song on {targets}.
        </span>
      </p>
      {state.kind === 'candidates' ? (
        <ul className="flex flex-col gap-1" aria-label="Matches to confirm">
          {state.candidates.map((c) => (
            <li key={`${c.provider}:${c.providerTrackId}`}>
              <button
                type="button"
                className={`${btn} w-full justify-start`}
                onClick={() => pick(c)}
              >
                <span aria-hidden>＋</span>
                <span className="truncate">
                  {c.title} — {c.artist} · {providerLabel(c.provider)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button type="button" className={btn} onClick={find} disabled={state.kind === 'searching'}>
          {state.kind === 'searching' ? 'Searching…' : `Find on ${targets}`}
        </button>
      )}
      {state.kind === 'none' && (
        <p className="font-ui text-xs text-text-tertiary">No match found on {targets}.</p>
      )}
      {state.kind === 'error' && (
        <p className="font-ui text-xs text-state-danger" role="alert">
          {state.message}
        </p>
      )}
    </div>
  );
}

/** The transport: preview / pause+stop / resume+stop, keyed off the status kind. */
function PreviewControls({
  status,
  providerLabelText,
  ready,
  onPreview,
  onPause,
  onResume,
  onStop,
}: {
  status: PreviewStatus;
  providerLabelText: string | null;
  ready: boolean;
  onPreview: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const primary =
    'inline-flex min-h-9 items-center gap-1.5 rounded-pill rf-btn-primary px-4 py-1.5 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50';
  const secondary =
    'inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-interactive px-3 py-1.5 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive';

  if (status.kind === 'preparing') {
    return (
      <button type="button" disabled className={primary}>
        <span aria-hidden>♪</span> Preparing {providerLabel(status.provider)}…
      </button>
    );
  }
  if (status.kind === 'awaiting_authorization') {
    // Consent sheet is open: state it, and offer a way out (Cancel) so a
    // stuck/abandoned authorization is recoverable without waiting on the timeout.
    return (
      <div className="flex items-center gap-2">
        <button type="button" disabled className={primary}>
          <span aria-hidden>⏳</span> Waiting for {providerLabel(status.provider)}…
        </button>
        <button type="button" onClick={onStop} className={secondary}>
          <span aria-hidden>✕</span> Cancel
        </button>
      </div>
    );
  }
  if (status.kind === 'playing') {
    return (
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPause} className={primary}>
          <span aria-hidden>❚❚</span> Pause
        </button>
        <button type="button" onClick={onStop} className={secondary}>
          <span aria-hidden>◼</span> Stop
        </button>
      </div>
    );
  }
  if (status.kind === 'paused') {
    return (
      <div className="flex items-center gap-2">
        <button type="button" onClick={onResume} className={primary}>
          <span aria-hidden>▶</span> Resume
        </button>
        <button type="button" onClick={onStop} className={secondary}>
          <span aria-hidden>◼</span> Stop
        </button>
      </div>
    );
  }
  // idle / ended / error → offer a fresh preview.
  return (
    <button type="button" onClick={onPreview} disabled={!ready} className={primary}>
      <span aria-hidden>▶</span> Preview{providerLabelText ? ` on ${providerLabelText}` : ''}
    </button>
  );
}

/** Status chip mirroring the Live Mode player-rail vocabulary (glyph + label). */
function PreviewChip({ status }: { status: PreviewStatus }) {
  let text: string;
  switch (status.kind) {
    case 'preparing':
      text = `Preparing ${providerLabel(status.provider)}…`;
      break;
    case 'awaiting_authorization':
      text = `Waiting for ${providerLabel(status.provider)} authorization…`;
      break;
    case 'playing':
      text = providerLabel(status.provider);
      break;
    case 'paused':
      text = 'Paused';
      break;
    case 'ended':
      text = 'Preview ended';
      break;
    case 'error':
      text = 'Preview error';
      break;
    default:
      text = 'Idle';
  }
  const isError = status.kind === 'error';
  const isWaiting = status.kind === 'awaiting_authorization';
  if (status.kind === 'idle') return null;
  return (
    <span
      className={`flex shrink-0 items-center gap-1 font-data text-[0.7rem] ${
        isError ? 'font-semibold text-state-danger' : 'text-text-tertiary'
      }`}
    >
      <span aria-hidden>{isError ? '⚠' : isWaiting ? '⏳' : '♪'}</span>
      <span className="sr-only">Preview: </span>
      {text}
    </span>
  );
}

/** m:ss–m:ss window label for the clip range. */
function formatWindow(startMs: number, endMs: number): string {
  const clock = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  return `${clock(startMs)}–${clock(endMs)}`;
}
