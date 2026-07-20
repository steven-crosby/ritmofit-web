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
import { StatusLabel } from './SharedState.js';

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
  const playbackWindow = playbackWindowFor(entry);
  const previewDurationMs = Number.isFinite(playbackWindow.endMs)
    ? Math.max(0, playbackWindow.endMs - playbackWindow.startMs)
    : null;
  const [connections, setConnections] = useState<MusicConnectionView[] | null>(null);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>({ kind: 'idle' });
  const [elapsedMs, setElapsedMs] = useState(0);
  // A cross-provider resolution attached a playable ref this session — overlay it
  // on the entry so the verdict/preview update immediately (it's persisted
  // server-side, and a full class reload carries it too). Reset per selected track.
  const [overrideRefs, setOverrideRefs] = useState<RunPayloadProviderRef[] | null>(null);
  const controllerRef = useRef<PreviewPlaybackController | null>(null);
  const lastActionRef = useRef<'start' | 'resume'>('start');
  const baseRef = useRef(0);
  const startRef = useRef(0);
  const displayedElapsedRef = useRef(0);
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
      onStatus: (next) => {
        setStatus(next);
        if (next.kind === 'idle') setElapsedMs(0);
        if (next.kind === 'ended') setElapsedMs(previewDurationMs ?? baseRef.current);
      },
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
      // destroy() doesn't push status; reset it here so `playing` derives false.
      setStatus({ kind: 'idle' });
    };
  }, [connections, previewDurationMs]);

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
  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    let raf = 0;
    const frame = () => {
      const elapsed = baseRef.current + (performance.now() - startRef.current);
      if (elapsed - displayedElapsedRef.current >= 250) {
        displayedElapsedRef.current = elapsed;
        setElapsedMs(elapsed);
      }
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
    displayedElapsedRef.current = 0;
    setElapsedMs(0);
    lastActionRef.current = 'start';
    void controllerRef.current?.play(effectiveEntry);
  }, [effectiveEntry]);

  const onPause = useCallback(() => {
    void controllerRef.current?.pause();
  }, []);

  const onResume = useCallback(() => {
    lastActionRef.current = 'resume';
    void controllerRef.current?.resume();
  }, []);

  const onStop = useCallback(() => {
    baseRef.current = 0;
    displayedElapsedRef.current = 0;
    setElapsedMs(0);
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
  const isClipped = entry.clipStartMs > 0 || entry.track.durationMs != null;
  const providerName =
    status.kind === 'preparing' ||
    status.kind === 'awaiting_authorization' ||
    status.kind === 'playing' ||
    status.kind === 'paused'
      ? providerLabel(status.provider)
      : status.kind === 'error' && status.error.provider
        ? providerLabel(status.error.provider)
        : selection?.status === 'playable'
          ? providerLabel(selection.provider)
          : null;
  const resumeFailed = status.kind === 'error' && lastActionRef.current === 'resume';
  const totalMs = previewDurationMs;

  return (
    <section
      aria-label={`Track preview for ${entry.track.title}`}
      className={`sticky bottom-2 z-20 flex min-w-0 flex-col gap-3 rounded-card border bg-bg-raised p-3 shadow-overlay sm:p-4 ${
        status.kind === 'error' ? 'border-state-caution/55' : 'border-border-strong'
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="rf-eyebrow">Selected-track preview</p>
          <h3 className="mt-1 truncate font-display text-base font-semibold text-text-primary">
            {entry.track.title}
          </h3>
          <p className="truncate font-ui text-xs text-text-secondary">{entry.track.artist}</p>
        </div>
        <div className="shrink-0" aria-live="polite" aria-atomic="true">
          <PreviewChip
            status={status}
            ready={connections != null && selection?.status === 'playable'}
            checked={connections != null}
            unverified={connectionsError != null}
            resumeFailed={resumeFailed}
          />
        </div>
      </div>

      {connectionsError && (
        <div role="status" className="rounded-card border border-border-subtle bg-bg-sunken p-3">
          <StatusLabel kind="unavailable" label="Playback status unverified" />
          <p className="mt-1 font-ui text-xs text-text-secondary">
            Couldn’t check provider connections ({connectionsError}). Your class edit is unchanged.
          </p>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="font-data text-xs text-text-secondary">
            {providerName ?? 'Provider not selected'} · {formatClock(elapsedMs)}
            {totalMs != null ? ` / ${formatClock(totalMs)}` : ''}
          </p>
          <p className="mt-1 font-data text-[0.7rem] text-text-tertiary">
            Clip {formatWindow(playbackWindow.startMs, playbackWindow.endMs)} · Track{' '}
            {entry.position + 1}
          </p>
        </div>

        {connections && selection?.status === 'unplayable' ? (
          <UnplayableVerdict
            entry={effectiveEntry}
            reason={selection.reason}
            onReconnect={reconnectProvider}
            onResolved={setOverrideRefs}
          />
        ) : status.kind !== 'error' ? (
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
        ) : null}
      </div>

      {status.kind === 'error' && (
        <div role="alert" className="rounded-card border border-state-caution/45 bg-bg-sunken p-3">
          <StatusLabel
            kind="error"
            label={resumeFailed ? 'Preview could not resume' : 'Preview interrupted'}
          />
          <p className="mt-2 font-ui text-sm font-semibold text-text-primary">
            {status.error.message}
          </p>
          <p className="mt-1 font-ui text-xs text-text-secondary">
            Your class edit, selected track, and scoring changes are unchanged. Restart this clip or
            stop auditioning.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPreview}
              className="min-h-11 rounded-control rf-btn-primary px-3 font-ui text-xs font-semibold text-text-on-accent sm:rounded-pill"
            >
              Start clip again
            </button>
            <button
              type="button"
              onClick={onStop}
              className="min-h-11 rounded-control border border-interactive px-3 font-ui text-xs font-semibold text-interactive hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
            >
              Stop auditioning
            </button>
            {status.error.provider && (
              <button
                type="button"
                onClick={() => void reconnectProvider(status.error.provider!)}
                className="min-h-11 rounded-control px-3 font-ui text-xs font-semibold text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
              >
                Reconnect {providerLabel(status.error.provider)}
              </button>
            )}
          </div>
        </div>
      )}

      {selection?.status === 'playable' && !isClipped && (
        <p className="font-ui text-xs text-text-tertiary">Preview starts at the track boundary.</p>
      )}
    </section>
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
  // No refs at all (manual add) or refs only for a provider Ritmo can't play
  // (e.g. Spotify-only) — same cross-provider resolve loop, different lead-in.
  if (reason === 'no_provider_ref' || reason === 'provider_not_playable') {
    return (
      <ResolveProviderAction
        entry={entry}
        onResolved={onResolved}
        leadIn={
          reason === 'no_provider_ref'
            ? 'No provider link yet'
            : 'Not on a provider Ritmo can play yet'
        }
      />
    );
  }
  if (reason === 'playback_reauth_required') {
    return <ReconnectSpotifyAction onReconnect={onReconnect} />;
  }
  // missing_duration or no_connected_provider — name the fix; no resolve CTA.
  let text: string;
  if (reason === 'missing_duration') {
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
        className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-control border border-interactive px-3 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive disabled:opacity-50 sm:rounded-pill"
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
 * "Find on a supported provider" — cross-provider resolution for tracks that
 * either have no provider link yet (`no_provider_ref`, e.g. manual-add) or only
 * refs for a provider Ritmo can't play (`provider_not_playable`, e.g. Spotify).
 * Searches the playable providers for the same song: a strong same-song match is
 * attached automatically; otherwise the candidates are listed to confirm. The
 * attach is persisted server-side; `onResolved` overlays the new ref so the
 * verdict flips to playable at once, no class reload needed.
 *
 * `leadIn` differentiates the two cases without forking the action UI.
 */
function ResolveProviderAction({
  entry,
  onResolved,
  leadIn,
}: {
  entry: RunPayloadTrackEntry;
  onResolved: (refs: RunPayloadProviderRef[]) => void;
  /** Case-specific prefix before "— find this song on {targets}." */
  leadIn: string;
}) {
  type ResolveState =
    | { kind: 'idle' }
    | { kind: 'searching' }
    | { kind: 'candidates'; candidates: TrackSearchResult[] }
    | { kind: 'none' }
    | { kind: 'error'; message: string };
  const [state, setState] = useState<ResolveState>({ kind: 'idle' });

  const btn =
    'inline-flex min-h-11 items-center gap-1.5 rounded-control border border-interactive px-3 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive disabled:opacity-50 sm:rounded-pill';
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
          {leadIn} — find this song on {targets}.
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
    'inline-flex min-h-11 items-center gap-1.5 rounded-control rf-btn-primary px-4 font-ui text-xs font-semibold text-text-on-accent disabled:opacity-50 sm:rounded-pill';
  const secondary =
    'inline-flex min-h-11 items-center gap-1.5 rounded-control border border-interactive px-3 font-ui text-xs font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill';

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
      <span aria-hidden>{status.kind === 'ended' ? '↺' : '▶'}</span>{' '}
      {status.kind === 'ended' ? 'Replay clip' : 'Play preview'}
      {providerLabelText ? ` on ${providerLabelText}` : ''}
    </button>
  );
}

/** Status chip mirroring the Live Mode player-rail vocabulary (glyph + label). */
function PreviewChip({
  status,
  ready,
  checked,
  unverified,
  resumeFailed,
}: {
  status: PreviewStatus;
  ready: boolean;
  checked: boolean;
  unverified: boolean;
  resumeFailed: boolean;
}) {
  let text: string;
  let glyph = '◇';
  switch (status.kind) {
    case 'preparing':
      text = `Preparing ${providerLabel(status.provider)}…`;
      glyph = '…';
      break;
    case 'awaiting_authorization':
      text = `Waiting for ${providerLabel(status.provider)} authorization…`;
      glyph = '⏳';
      break;
    case 'playing':
      text = `Now playing · ${providerLabel(status.provider)}`;
      glyph = '▶';
      break;
    case 'paused':
      text = `Preview paused · ${providerLabel(status.provider)}`;
      glyph = 'Ⅱ';
      break;
    case 'ended':
      text = 'Preview complete';
      glyph = '✓';
      break;
    case 'error':
      text = resumeFailed ? 'Resume failed' : 'Preview interrupted';
      glyph = '!';
      break;
    default:
      text = ready
        ? 'Preview ready'
        : unverified
          ? 'Playback unverified'
          : checked
            ? 'Preview unavailable'
            : 'Checking playback';
      glyph = ready ? '▶' : checked ? '⊘' : '…';
  }
  const isError = status.kind === 'error';
  return (
    <span
      className={`flex min-h-7 shrink-0 items-center gap-1 rounded-pill border px-2 font-data text-[0.7rem] ${
        isError
          ? 'border-state-caution/45 font-semibold text-state-caution'
          : 'border-border-subtle text-text-secondary'
      }`}
    >
      <span aria-hidden>{glyph}</span>
      <span className="sr-only">Preview: </span>
      {text}
    </span>
  );
}

/** m:ss–m:ss window label for the clip range. */
function formatWindow(startMs: number, endMs: number): string {
  return `${formatClock(startMs)}–${Number.isFinite(endMs) ? formatClock(endMs) : 'track end'}`;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
