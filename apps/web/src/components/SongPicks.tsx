/**
 * Music › Songs pick mode (RF-151): the always-pickable song rows, the selection
 * bar, and the sheet that names the new class. Selection state lives in
 * `lib/song-picks.ts`; the caller owns loading and class creation.
 */
import { useState, type ReactNode } from 'react';
import type { ClassTemplate, TrackSearchResult } from '@ritmofit/shared';
import { CREATE_TEMPLATE_OPTIONS } from '../lib/class-summary.js';
import { songMetaLine } from '../lib/music-library.js';
import { songPickKey } from '../lib/song-picks.js';
import { errMessage } from '../lib/errors.js';
import { Dialog } from './Dialog.js';
import { TrackArt } from './TrackArt.js';

const CAP_NOTE_ID = 'song-pick-cap-note';

/**
 * One row per song. The checkbox and the song text are two <label>s for the same
 * checkbox, so a tap on either toggles exactly once. The artwork between them is
 * the RF-172 ▶ preview button: it sits beside the labels, never inside one, so a
 * preview tap never selects and a selection tap never plays. ▶ stays live on rows
 * the 15-song cap disables, since previewing adds nothing. `renderPreview` mounts
 * the inline player under the row being previewed.
 */
export function SongPickList({
  rows,
  selectedKeys,
  full,
  onToggle,
  previewKey = null,
  onPreview,
  renderPreview,
}: {
  rows: readonly TrackSearchResult[];
  selectedKeys: ReadonlySet<string>;
  /** The cap is reached: unticked rows are disabled, ticked rows can still untick. */
  full: boolean;
  onToggle: (track: TrackSearchResult) => void;
  /** The song whose inline player is open (`songPickKey`), if any. */
  previewKey?: string | null;
  /** ▶ on a row's artwork: open (or, on the open row, close) its preview. */
  onPreview?: (track: TrackSearchResult) => void;
  renderPreview?: (track: TrackSearchResult) => ReactNode;
}) {
  return (
    <ul aria-label="Liked songs" className="flex flex-col gap-1">
      {rows.map((track) => {
        const key = songPickKey(track);
        const selected = selectedKeys.has(key);
        const disabled = full && !selected;
        const previewing = previewKey === key;
        const checkboxId = `song-pick-${key}`;
        const labelTone = disabled ? 'cursor-not-allowed' : 'cursor-pointer';
        return (
          <li
            key={key}
            data-build-class-slot="song"
            className={`flex min-w-0 flex-col rounded-control border px-1 py-1 ${
              selected
                ? 'border-border-strong bg-bg-raised'
                : 'border-transparent hover:bg-interactive/5'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <label
                className={`flex min-h-11 shrink-0 items-center ${labelTone} ${disabled ? 'opacity-60' : ''}`}
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => onToggle(track)}
                  aria-describedby={disabled ? CAP_NOTE_ID : undefined}
                  className="ml-2 h-5 w-5 shrink-0 accent-interactive rf-focus-ring"
                />
              </label>
              {onPreview ? (
                <button
                  type="button"
                  onClick={() => onPreview(track)}
                  aria-label={
                    previewing ? `Stop preview of ${track.title}` : `Preview ${track.title}`
                  }
                  aria-expanded={previewing}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-control rf-focus-ring"
                >
                  <TrackArt
                    url={track.albumArtUrl}
                    identity={`${track.title}:${track.artist}`}
                    size={44}
                    className="max-h-11 max-w-11"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center bg-black/35 font-ui text-base text-white"
                  >
                    {previewing ? '■' : '▶'}
                  </span>
                </button>
              ) : (
                <TrackArt
                  url={track.albumArtUrl}
                  identity={`${track.title}:${track.artist}`}
                  size={44}
                  className="max-h-11 max-w-11"
                />
              )}
              <label
                htmlFor={checkboxId}
                className={`flex min-h-11 min-w-0 flex-1 flex-col justify-center ${labelTone} ${disabled ? 'opacity-60' : ''}`}
              >
                <span className="block truncate font-ui text-sm font-semibold text-text-primary">
                  {track.title}
                </span>
                <span className="block truncate font-ui text-xs text-text-secondary">
                  {songMetaLine(track.artist, track.durationMs)}
                </span>
              </label>
            </div>
            {previewing && renderPreview?.(track)}
          </li>
        );
      })}
    </ul>
  );
}

/** "N of 15 selected", Clear, and Create a class once a song is ticked. */
export function SongPickBar({
  count,
  cap,
  onClear,
  onCreate,
}: {
  count: number;
  cap: number;
  onClear: () => void;
  onCreate: () => void;
}) {
  const full = count >= cap;
  return (
    <aside
      aria-label="Song selection"
      className="sticky bottom-2 z-10 flex min-w-0 flex-col gap-2 rounded-card border border-interactive/20 bg-bg-overlay p-3 shadow-overlay sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p
          role="status"
          aria-live="polite"
          className="font-data text-sm font-semibold text-text-primary"
        >
          {count === 0
            ? `Tick up to ${cap} songs to create a class.`
            : `${count} of ${cap} selected`}
        </p>
        {full && (
          <p id={CAP_NOTE_ID} className="font-ui text-xs text-text-secondary">
            That’s the most a class takes. Untick a song to choose another.
          </p>
        )}
      </div>
      {count > 0 && (
        <div className="flex min-w-0 gap-2">
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 rounded-control border border-interactive/35 px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
          >
            Clear selection
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="min-h-11 flex-1 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring sm:flex-none sm:rounded-pill"
          >
            Create a class
          </button>
        </div>
      )}
    </aside>
  );
}

/**
 * Names the class and picks its template. The songs are already chosen, so there
 * is no second song picker; they become the class blocks in list order.
 */
export function SongPickCreateDialog({
  count,
  defaultTitle,
  onClose,
  onCreate,
}: {
  count: number;
  defaultTitle: string;
  onClose: () => void;
  onCreate: (title: string, template: ClassTemplate) => Promise<void>;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [template, setTemplate] = useState<ClassTemplate>('cycle');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate(title.trim(), template);
    } catch (e) {
      setError(errMessage(e));
      setCreating(false);
    }
  };

  return (
    <Dialog
      label="Create a class"
      onClose={onClose}
      panelClassName="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-card bg-bg-raised p-6 shadow-overlay"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-text-primary">Create a class</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-pill border border-interactive/30 px-3 font-ui text-xs text-text-secondary hover:text-text-primary rf-focus-ring"
          >
            Cancel
          </button>
        </div>
        <label
          htmlFor="song-pick-class-title"
          className="mb-2 block font-ui text-xs font-semibold text-text-secondary"
        >
          Class name
        </label>
        <input
          id="song-pick-class-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mb-4 min-h-11 w-full rounded-control border border-interactive/20 bg-bg-base px-3 font-ui text-sm text-text-primary rf-focus-ring"
        />
        <p className="mb-2 font-ui text-xs font-semibold text-text-secondary">Template</p>
        <div role="group" aria-label="Class template" className="mb-4 flex gap-1.5">
          {CREATE_TEMPLATE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={template === value}
              onClick={() => setTemplate(value)}
              className={`min-h-11 rounded-pill border px-3 font-ui text-xs rf-focus-ring ${
                template === value
                  ? 'border-interactive bg-interactive/15 text-text-primary'
                  : 'border-interactive/30 text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mb-3 font-ui text-xs text-text-secondary">
          {count} {count === 1 ? 'song becomes' : 'songs become'} the class blocks, in list order.
        </p>
        {error && (
          <p role="alert" className="mb-3 font-ui text-sm text-state-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="min-h-11 w-full rounded-pill rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create class'}
        </button>
      </form>
    </Dialog>
  );
}
