/** Static track checks and browser consent precede Live; neither proves audible playback. */
import { type ReactNode } from 'react';
import { providerLabel } from '../lib/providers.js';
import type {
  PreflightResult,
  PreflightTrackResult,
  UnplayableReason,
} from '../lib/playback/types.js';
import { RecoveryState, StatusLabel } from './SharedState.js';

/**
 * Canonical disabled control (05-components): ~40% opacity and no pointer/hover.
 * Color is never the only state signal — pair this with native `disabled`.
 */
export const DISABLED_CONTROL_CLASS = 'disabled:pointer-events-none disabled:opacity-40';

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
        Selected: {providerLabel(result.selection.provider)}
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

function trackCheckSummary(
  trackCount: number,
  passingCount: number,
  unplayableCount: number,
): string {
  return `${trackCount} ${trackCount === 1 ? 'track checked' : 'tracks checked'} · ${passingCount} passed · ${unplayableCount} ${unplayableCount === 1 ? 'needs attention' : 'need attention'}`;
}

export function LivePreflight({
  preflight,
  connectionsError,
  onRetryConnections,
  onManageConnections,
  onStart,
  onRunWithoutMusic,
  browserAuthorizationReady = true,
  authorizationLead,
  browserAuthorization,
}: {
  /** Null while the provider connections are still loading. */
  preflight: PreflightResult | null;
  browserAuthorizationReady?: boolean;
  /**
   * Names the browser check that blocks Start. Counts stay a supporting line
   * under this action.
   */
  authorizationLead?: string;
  browserAuthorization?: ReactNode;
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
  const trackCount = preflight?.tracks.length ?? 0;
  const passingCount = trackCount - unplayableCount;
  const playableTracks = preflight?.tracks.filter(
    (result) => result.selection.status === 'playable',
  );
  const unplayableTracks = preflight?.tracks.filter(
    (result) => result.selection.status === 'unplayable',
  );
  // Everything passed: one status line and one Start class, no repeated "passed".
  const allPass = preflight?.ok === true && browserAuthorizationReady && !connectionsError;
  const counts =
    preflight == null || allPass
      ? null
      : trackCheckSummary(trackCount, passingCount, unplayableCount);
  const blockedLead = `${unplayableCount} ${unplayableCount === 1 ? 'track needs' : 'tracks need'} a fix before starting with music.`;
  const lead = connectionsError
    ? 'Retry the connection check'
    : preflight == null
      ? 'Checking readiness'
      : !preflight.ok
        ? blockedLead
        : !browserAuthorizationReady
          ? (authorizationLead ?? 'Check music authorization to start')
          : `${passingCount} of ${trackCount} ${trackCount === 1 ? 'track' : 'tracks'} ready`;
  const verdict = connectionsError
    ? {
        label: 'Runnable with warnings',
        tone: 'text-state-caution',
      }
    : preflight == null
      ? {
          label: 'Checking readiness',
          tone: 'text-text-secondary',
        }
      : preflight.ok
        ? {
            label: browserAuthorizationReady ? 'Ready' : 'Browser authorization needed',
            tone: browserAuthorizationReady ? 'text-state-positive' : 'text-state-caution',
          }
        : {
            label: 'Blocked',
            tone: 'text-state-caution',
          };
  const playbackCaveat = `Provider links and durations checked for ${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}. Playback availability and audible output are unverified.`;
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center gap-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-card border border-border-subtle bg-bg-raised/70 p-5 sm:p-6">
        {!allPass && (
          <StatusLabel
            kind={
              connectionsError ||
              (preflight != null && (!preflight.ok || !browserAuthorizationReady))
                ? 'unavailable'
                : 'loading'
            }
            label={verdict.label}
          />
        )}
        <div
          className={`${allPass ? '' : 'mt-3 '}flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between`}
        >
          <div className="min-w-0">
            <p className="font-data text-[11px] uppercase tracking-[0.22em] text-text-tertiary">
              Playback preflight
            </p>
            <h2
              className={`mt-1 text-balance font-display text-2xl font-semibold sm:text-3xl ${verdict.tone}`}
            >
              {allPass && (
                <span aria-hidden className="mr-2">
                  ✓
                </span>
              )}
              {lead}
            </h2>
            {counts && <p className="mt-2 font-ui text-sm text-text-secondary">{counts}</p>}
            {connectionsError && (
              <p className="mt-2 max-w-2xl font-ui text-sm leading-6 text-text-secondary">
                Provider playback could not be verified. Retry, or run the prompter without music.
              </p>
            )}
            {preflight == null && !connectionsError && (
              <p className="mt-2 max-w-2xl font-ui text-sm leading-6 text-text-secondary">
                Checking stored connections, provider links, and track durations.
              </p>
            )}
            {preflight != null && !preflight.ok && (
              <p className="mt-2 font-ui text-sm font-semibold text-text-primary">
                Run without music keeps your cues and timer. Music can be fixed before the run or
                left off deliberately.
              </p>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-3 lg:max-w-sm lg:items-end">
            {browserAuthorization}
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                className={`min-h-11 rounded-control px-6 py-2 font-ui font-semibold rf-focus-ring sm:rounded-pill ${DISABLED_CONTROL_CLASS} ${preflight?.ok && !connectionsError && browserAuthorizationReady ? 'rf-btn-primary text-text-on-accent' : 'border border-border-strong text-text-secondary'}`}
                onClick={onStart}
                disabled={!preflight?.ok || !!connectionsError || !browserAuthorizationReady}
              >
                Start class
              </button>
              <button
                className="min-h-11 rounded-control border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 rf-focus-ring sm:rounded-pill"
                onClick={onRunWithoutMusic}
              >
                Run without music
              </button>
            </div>
          </div>
        </div>
        {preflight != null && (
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer rounded-control px-1 py-2 font-ui text-sm font-semibold text-text-secondary rf-focus-ring">
              What playback checks cover
            </summary>
            <div className="flex flex-col gap-2 px-1 pb-1 font-ui text-sm leading-6 text-text-secondary">
              {preflight.ok && <p>{playbackCaveat}</p>}
              {preflight.ok && (
                <p>
                  Start prepares the first track. The teaching clock waits for confirmed playback
                  progress. Later tracks may still need recovery. Check your volume and audio output
                  when music starts. Browser playback permission and each track’s availability may
                  still require recovery when playback starts.
                </p>
              )}
              <p>
                Apple Music connects here without leaving preflight. Spotify and SoundCloud
                authorization open a provider page; returning restores this class’s preflight
                without starting playback.
              </p>
            </div>
          </details>
        )}
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
        <div className="flex flex-col gap-4" role="list" aria-label="Track playback check">
          {unplayableCount > 0 && (
            <PreflightGroup
              title="Needs attention before music can start"
              results={unplayableTracks ?? []}
              caution
            />
          )}
          {passingCount > 0 && (
            <PreflightGroup
              title={
                allPass
                  ? 'Track details'
                  : `${passingCount} ${passingCount === 1 ? 'track passed' : 'tracks passed'} checks`
              }
              results={playableTracks ?? []}
              disclosure
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="min-h-11 rounded-control border border-interactive px-4 py-2 font-ui text-sm font-semibold text-interactive transition-colors hover:bg-interactive/10 rf-focus-ring sm:rounded-pill"
          onClick={() => {
            onManageConnections();
          }}
        >
          Manage connections
        </button>
      </div>
    </div>
  );
}

function PreflightGroup({
  title,
  results,
  caution = false,
  disclosure = false,
}: {
  title: string;
  results: PreflightTrackResult[];
  caution?: boolean;
  disclosure?: boolean;
}) {
  const tracks = (
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
  );
  return (
    <section
      role="listitem"
      className="rounded-card border border-border-subtle bg-bg-raised p-3 sm:p-4"
    >
      {disclosure ? (
        <details>
          <summary className="min-h-11 cursor-pointer rounded-control px-1 py-3 font-ui text-sm font-semibold text-text-secondary rf-focus-ring">
            {title}
          </summary>
          {tracks}
        </details>
      ) : (
        <>
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
          {tracks}
        </>
      )}
    </section>
  );
}
