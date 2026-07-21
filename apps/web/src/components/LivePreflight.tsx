/**
 * The playback preflight screen shown before class start (provider-playback
 * plan: "Live Mode is hands-free after start"). Every track is resolved to a
 * connected, playable provider *before* the instructor is on stage; failures
 * name the exact track and the fix, so nothing surprises them mid-class.
 *
 * Verdicts are glyph + label (never color alone, design system 05/11): ✓ plays
 * on a named provider, ⊘ cannot — with an inline recovery hint. Unplayable
 * verdicts use the caution channel (pre-class and fixable, unlike a runtime
 * playback failure, which is a danger-channel alert in the transport). Running
 * the prompter without music stays available: it is the existing capability,
 * not a provider-handoff fallback.
 */
import { useState } from 'react';
import { providerLabel } from '../lib/providers.js';
import type {
  PreflightResult,
  PreflightTrackResult,
  UnplayableReason,
} from '../lib/playback/types.js';
import { RecoveryState, StatusLabel } from './SharedState.js';

const REASON_META: Record<UnplayableReason, { label: string; hint: string }> = {
  no_provider_ref: {
    label: 'No provider link',
    hint: 'Add a music provider to this track in the builder.',
  },
  no_connected_provider: {
    label: 'No connected provider can play this',
    hint: 'Connect a music provider that has this track.',
  },
  playback_reauth_required: {
    label: 'Spotify needs reconnecting',
    hint: 'Reconnect Spotify for playback so it can grant the streaming scope.',
  },
  provider_not_playable: {
    label: 'Not on a provider Ritmo can play yet',
    hint: 'Open the track in the builder and find it on SoundCloud or Apple Music.',
  },
  missing_duration: {
    label: 'No duration set',
    hint: 'Enter the track duration in the builder.',
  },
};

function Verdict({ result }: { result: PreflightTrackResult }) {
  if (result.selection.status === 'playable') {
    return (
      <span className="flex items-center gap-1.5 font-ui text-sm text-text-secondary">
        <span aria-hidden className="text-state-positive">
          ✓
        </span>
        Plays on {providerLabel(result.selection.provider)}
      </span>
    );
  }
  const meta = REASON_META[result.selection.reason];
  return (
    <span className="flex min-w-0 flex-col gap-1 text-left sm:items-end sm:text-right">
      <span className="flex items-center gap-1.5 font-ui text-sm font-semibold text-state-caution">
        <span aria-hidden>⊘</span>
        {meta.label}
      </span>
      <span className="font-ui text-xs text-text-tertiary">{meta.hint}</span>
    </span>
  );
}

export function LivePreflight({
  preflight,
  connectionsError,
  onRetryConnections,
  onManageConnections,
  onStart,
  onRunWithoutMusic,
}: {
  /** Null while the provider connections are still loading. */
  preflight: PreflightResult | null;
  /** Connections fetch failure — playback can't be verified, prompter still can run. */
  connectionsError: string | null;
  onRetryConnections: () => void;
  /** Open provider connections without leaving the Live preflight surface. */
  onManageConnections: () => void;
  /** Start the class with in-app provider playback (requires a passing preflight). */
  onStart: () => void;
  /** Run the prompter/timer only — the pre-playback Live Mode behavior. */
  onRunWithoutMusic: () => void;
}) {
  const unplayableCount = preflight?.unplayable.length ?? 0;
  // Keep the trigger mounted after an in-dialog fix makes preflight pass so the
  // dialog can return keyboard focus to the control that opened it.
  const [connectionsVisited, setConnectionsVisited] = useState(false);
  const hasConnectionFix = preflight?.unplayable.some(
    (result) =>
      result.selection.status === 'unplayable' &&
      (result.selection.reason === 'no_connected_provider' ||
        result.selection.reason === 'playback_reauth_required'),
  );
  const canManageConnections = connectionsVisited || hasConnectionFix;
  const trackCount = preflight?.tracks.length ?? 0;
  const passingCount = trackCount - unplayableCount;
  const playableTracks = preflight?.tracks.filter(
    (result) => result.selection.status === 'playable',
  );
  const unplayableTracks = preflight?.tracks.filter(
    (result) => result.selection.status === 'unplayable',
  );
  const verdict = connectionsError
    ? {
        label: 'Runnable with warnings',
        detail:
          'Provider playback could not be verified. Retry, or run the prompter without music.',
        tone: 'text-state-caution',
      }
    : preflight == null
      ? {
          label: 'Checking readiness',
          detail: 'Verifying every track against its connected music provider.',
          tone: 'text-text-secondary',
        }
      : preflight.ok
        ? {
            label: 'Live ready',
            detail: `All ${trackCount} ${trackCount === 1 ? 'track can' : 'tracks can'} play hands-free.`,
            tone: 'text-state-positive',
          }
        : {
            label: 'Blocked',
            detail: `${unplayableCount} ${unplayableCount === 1 ? 'track needs' : 'tracks need'} a fix before hands-free playback.`,
            tone: 'text-state-caution',
          };
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-card border border-border-subtle bg-bg-raised/70 p-5 sm:p-6">
        <StatusLabel
          kind={
            connectionsError || (preflight != null && !preflight.ok)
              ? 'unavailable'
              : preflight == null
                ? 'loading'
                : 'recovered'
          }
          label={verdict.label}
        />
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="font-data text-[11px] uppercase tracking-[0.22em] text-text-tertiary">
              Playback preflight
            </p>
            <h2
              className={`mt-1 text-balance font-display text-2xl font-semibold sm:text-3xl ${verdict.tone}`}
            >
              {preflight == null
                ? verdict.label
                : `${passingCount} ${passingCount === 1 ? 'track ready' : 'tracks ready'} · ${unplayableCount} ${unplayableCount === 1 ? 'needs a decision' : 'need a decision'}`}
            </h2>
            <p className="mt-2 max-w-2xl font-ui text-sm leading-6 text-text-secondary">
              {verdict.detail}
            </p>
            {preflight != null && !preflight.ok && (
              <p className="mt-2 font-ui text-sm font-semibold text-text-primary">
                Prompter-only is ready now. Music can be fixed before the run or left off
                deliberately.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {preflight?.ok ? (
              <>
                <button
                  className="min-h-11 rounded-control rf-btn-primary px-6 py-2 font-ui font-semibold text-text-on-accent sm:rounded-pill"
                  onClick={onStart}
                >
                  Start class
                </button>
                <button
                  className="min-h-11 rounded-control border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
                  onClick={onRunWithoutMusic}
                >
                  Run without music
                </button>
              </>
            ) : (
              <>
                <button
                  className="min-h-11 rounded-control rf-btn-primary px-6 py-2 font-ui font-semibold text-text-on-accent sm:rounded-pill"
                  onClick={onRunWithoutMusic}
                >
                  Run without music
                </button>
                <button
                  className="min-h-11 rounded-control border border-border-strong px-4 py-2 font-ui text-sm font-semibold text-text-tertiary focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
                  onClick={onStart}
                  disabled
                >
                  Start class
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {connectionsError ? (
        <RecoveryState
          kind="unavailable"
          title="Playback status is unverified"
          event={`Could not check your provider connections: ${connectionsError}`}
          safety="The class and prompter are ready. Ritmo has not marked any provider disconnected."
          statusLabel="Connection check unavailable"
          compact
          primaryAction={
            <button
              className="min-h-11 rounded-control rf-btn-primary px-4 py-2 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
              onClick={onRetryConnections}
            >
              Retry check
            </button>
          }
        />
      ) : preflight == null ? (
        <p className="px-1 font-ui text-sm text-text-tertiary" role="status" aria-live="polite">
          Checking provider connections…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2" role="list" aria-label="Track playback check">
          <PreflightGroup title="Playback ready" results={playableTracks ?? []} />
          <PreflightGroup
            title="Fix or choose prompter-only"
            results={unplayableTracks ?? []}
            caution
          />
        </div>
      )}

      {preflight != null && passingCount > 0 && !preflight.ok && (
        <p className="px-1 font-ui text-xs text-text-tertiary">
          {passingCount} {passingCount === 1 ? 'track passes' : 'tracks pass'} playback checks.
        </p>
      )}

      {canManageConnections && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="min-h-11 rounded-control border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive sm:rounded-pill"
            onClick={() => {
              setConnectionsVisited(true);
              onManageConnections();
            }}
          >
            Manage connections
          </button>
        </div>
      )}
      {canManageConnections && (
        <p className="font-ui text-xs text-text-tertiary">
          Apple Music connects here without leaving preflight. Spotify and SoundCloud authorization
          open a provider page; when you return, reopen this class in Live.
        </p>
      )}
    </div>
  );
}

function PreflightGroup({
  title,
  results,
  caution = false,
}: {
  title: string;
  results: PreflightTrackResult[];
  caution?: boolean;
}) {
  return (
    <section
      role="listitem"
      className="rounded-card border border-border-subtle bg-bg-raised p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-1 pb-3">
        <p className="font-data text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          {title}
        </p>
        <span
          className={`font-data text-sm ${caution ? 'text-state-caution' : 'text-state-positive'}`}
        >
          {results.length}
        </span>
      </div>
      {results.length === 0 ? (
        <p className="px-1 py-4 font-ui text-sm text-text-tertiary">No tracks in this group.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {results.map((result) => (
            <li
              key={result.classTrackId}
              className="grid min-h-16 gap-2 px-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,1fr)] sm:items-center"
            >
              <span className="min-w-0">
                <span className="font-data text-xs text-text-tertiary">#{result.position + 1}</span>
                <p className="break-words font-display font-semibold text-text-primary">
                  {result.title}
                </p>
              </span>
              <Verdict result={result} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
