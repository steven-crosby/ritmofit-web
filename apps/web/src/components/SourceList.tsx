import type { ReactNode } from 'react';
import type { ClassTemplate, TrackSearchResult } from '@ritmofit/shared';
import { formatDuration } from '../lib/class-summary.js';
import { providerHandoffHref, providerLabel } from '../lib/providers.js';

export const sourceCandidateKey = (candidate: TrackSearchResult) =>
  `${candidate.provider}:${candidate.providerTrackId}`;

type ImportAction = {
  kind: 'import';
  addedKeys: ReadonlySet<string>;
  busyKey: string | null;
  bulkBusy: boolean;
  onAdd: (candidate: TrackSearchResult) => void;
};

type SelectionAction = {
  kind: 'selection';
  selectedKeys: ReadonlySet<string>;
  selectedTracks: readonly TrackSearchResult[];
  onToggle: (candidate: TrackSearchResult) => void;
  tray: {
    title: string;
    template: ClassTemplate;
    templateControl: ReactNode;
    primaryLabel: string;
    primaryBusyLabel: string;
    primaryBusy: boolean;
    onPrimary: () => void;
  };
};

export type SourceListAction = ImportAction | SelectionAction;

/**
 * One source-list grammar for Builder and Music. The caller owns data fetching
 * and the destination action; this component owns the row, provider handoff,
 * selection treatment, and the sticky selection tray.
 */
export function SourceList({
  tracks,
  action,
  ariaLabel = 'Music sources',
}: {
  tracks: TrackSearchResult[];
  action: SourceListAction;
  ariaLabel?: string;
}) {
  const selectedCount = action.kind === 'selection' ? action.selectedKeys.size : 0;
  const selectedDuration =
    action.kind === 'selection'
      ? action.selectedTracks.reduce((total, track) => total + (track.durationMs ?? 0), 0)
      : 0;

  return (
    <div
      className={`min-w-0 ${
        action.kind === 'selection' ? 'sm:flex sm:min-h-[420px] sm:flex-col' : ''
      }`}
    >
      <ul aria-label={ariaLabel} className="flex min-w-0 flex-col gap-1.5">
        {tracks.map((track) => {
          const key = sourceCandidateKey(track);
          const sourceHref = providerHandoffHref(track.provider, track.providerUri);
          const selected = action.kind === 'selection' && action.selectedKeys.has(key);
          const added = action.kind === 'import' && action.addedKeys.has(key);
          const busy = action.kind === 'import' && action.busyKey === key;
          const bulkBusy = action.kind === 'import' && action.bulkBusy && !added;
          const toggleLabel = selected
            ? `Remove ${track.title} by ${track.artist} from selection`
            : `Select ${track.title} by ${track.artist}`;
          const checkboxLabel = `${track.title} by ${track.artist} ${
            selected ? 'selected' : 'not selected'
          }; toggle selection`;

          return (
            <li
              key={key}
              className={`flex min-w-0 items-center gap-2 rounded-card px-2 py-1.5 sm:gap-3 ${
                selected
                  ? 'border border-interactive/35 bg-interactive/10'
                  : 'border border-transparent bg-bg-base'
              }`}
            >
              {action.kind === 'selection' && (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => action.onToggle(track)}
                  aria-label={checkboxLabel}
                  className="h-5 w-5 min-h-11 min-w-11 shrink-0 accent-interactive rf-focus-ring"
                />
              )}

              {track.albumArtUrl ? (
                <img
                  src={track.albumArtUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-11 shrink-0 rounded-card object-cover"
                />
              ) : (
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-bg-raised text-text-tertiary"
                  aria-hidden
                >
                  ♪
                </span>
              )}

              {action.kind === 'selection' ? (
                <button
                  type="button"
                  onClick={() => action.onToggle(track)}
                  aria-pressed={selected}
                  aria-label={toggleLabel}
                  className="min-h-11 min-w-0 flex-1 text-left rf-focus-ring"
                >
                  <span className="block truncate font-ui text-sm font-semibold text-text-primary">
                    {track.title}
                  </span>
                  <span className="block truncate font-ui text-xs text-text-secondary">
                    {track.artist}
                  </span>
                </button>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-sm font-semibold text-text-primary">
                    {track.title}
                  </p>
                  <p className="truncate font-ui text-xs text-text-secondary">{track.artist}</p>
                </div>
              )}

              <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                {track.durationMs != null && (
                  <span className="font-data text-xs text-text-tertiary">
                    {formatDuration(track.durationMs)}
                  </span>
                )}
                {sourceHref && (
                  <a
                    href={sourceHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center rounded-control font-ui text-[11px] font-semibold text-interactive hover:text-interactive-hover rf-focus-ring"
                    aria-label={`${action.kind === 'import' ? 'Open' : 'Preview'} ${track.title} on ${providerLabel(track.provider)}`}
                  >
                    {action.kind === 'import'
                      ? `Source: ${providerLabel(track.provider)} ↗`
                      : 'Preview ↗'}
                  </a>
                )}
              </div>

              {action.kind === 'import' && (
                <button
                  type="button"
                  onClick={() => action.onAdd(track)}
                  disabled={busy || bulkBusy || added}
                  aria-busy={busy || bulkBusy}
                  aria-label={
                    added ? `${track.title} added` : `Add ${track.title} by ${track.artist}`
                  }
                  className={`min-h-11 shrink-0 rounded-pill px-3 font-ui text-xs font-semibold rf-focus-ring disabled:opacity-60 ${
                    added ? 'bg-bg-raised text-text-tertiary' : 'rf-btn-primary text-text-on-accent'
                  }`}
                >
                  {added ? 'Added ✓' : busy || bulkBusy ? 'Adding…' : 'Add'}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {action.kind === 'selection' && (
        <aside
          aria-label="Music selection"
          className="sticky bottom-2 mt-3 flex min-w-0 flex-col gap-3 rounded-card border border-interactive/20 bg-bg-overlay p-3 shadow-overlay sm:mt-auto sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p
              role="status"
              aria-live="polite"
              className="font-data text-sm font-semibold text-text-primary"
            >
              {selectedCount} selected
              {selectedDuration > 0 ? ` · ${formatDuration(selectedDuration)} total` : ''}
            </p>
            <p className="truncate font-ui text-xs text-text-tertiary">
              Destination · {action.tray.title}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            {action.tray.templateControl}
            <button
              type="button"
              onClick={action.tray.onPrimary}
              disabled={selectedCount === 0 || action.tray.primaryBusy}
              className="min-h-11 shrink-0 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring disabled:opacity-50 sm:rounded-pill"
            >
              {action.tray.primaryBusy ? action.tray.primaryBusyLabel : action.tray.primaryLabel}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
