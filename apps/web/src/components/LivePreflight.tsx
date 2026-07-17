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
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center gap-5 p-4 sm:p-6">
      <div className="rounded-card bg-bg-raised/70 p-5 sm:p-6">
        <p className="font-data text-[11px] uppercase tracking-[0.22em] text-text-tertiary">
          Preflight
        </p>
        <h2 className={`mt-1 font-display text-2xl font-semibold ${verdict.tone}`}>
          {verdict.label}
        </h2>
        <p className="mt-1 max-w-xl font-ui text-sm text-text-secondary">{verdict.detail}</p>
        {preflight != null && !preflight.ok && (
          <p className="mt-3 font-ui text-sm font-semibold text-text-primary">
            Runnable with warnings
            <span className="ml-2 font-normal text-text-tertiary">
              Prompter-only mode remains available.
            </span>
          </p>
        )}
      </div>

      {connectionsError ? (
        <div className="rounded-card bg-bg-raised p-4">
          <p className="font-ui text-sm text-text-primary">
            <span aria-hidden className="mr-1.5 text-state-caution">
              ⊘
            </span>
            Could not check your provider connections: {connectionsError}
          </p>
          <button
            className="mt-3 min-h-11 rounded-pill border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
            onClick={onRetryConnections}
          >
            Retry
          </button>
        </div>
      ) : preflight == null ? (
        <p className="px-1 font-ui text-sm text-text-tertiary" role="status">
          Checking provider connections…
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Track playback check">
          {preflight.tracks.map((result) => {
            const passing = result.selection.status === 'playable';
            return (
              <li
                key={result.classTrackId}
                className={`rounded-card bg-bg-raised ${
                  passing
                    ? 'flex items-center justify-between gap-3 px-4 py-3'
                    : 'grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,1.25fr)] sm:items-start'
                }`}
              >
                <span className="min-w-0">
                  <span className="font-data text-xs text-text-tertiary">
                    #{result.position + 1}
                  </span>
                  <p className="truncate font-display font-semibold text-text-primary">
                    {result.title}
                  </p>
                </span>
                <Verdict result={result} />
              </li>
            );
          })}
        </ul>
      )}

      {preflight != null && passingCount > 0 && !preflight.ok && (
        <p className="px-1 font-ui text-xs text-text-tertiary">
          {passingCount} {passingCount === 1 ? 'track passes' : 'tracks pass'} playback checks.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="min-h-11 rounded-pill rf-btn-primary px-6 py-2 font-ui font-semibold text-text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onStart}
          disabled={preflight == null || !preflight.ok}
        >
          Start class
        </button>
        <button
          className="min-h-11 rounded-pill border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
          onClick={onRunWithoutMusic}
        >
          Run without music
        </button>
        {canManageConnections && (
          <button
            className="min-h-11 rounded-pill border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 focus-visible:ring-2 focus-visible:ring-interactive"
            onClick={() => {
              setConnectionsVisited(true);
              onManageConnections();
            }}
          >
            Manage connections
          </button>
        )}
      </div>
      {canManageConnections && (
        <p className="font-ui text-xs text-text-tertiary">
          Apple Music connects here without leaving preflight. Spotify and SoundCloud authorization
          open a provider page; when you return, reopen this class in Live.
        </p>
      )}
    </div>
  );
}
