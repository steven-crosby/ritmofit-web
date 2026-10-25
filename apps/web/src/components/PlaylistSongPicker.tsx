/**
 * Choose up to 15 songs from a playlist that is longer than one import.
 * Nothing starts checked. The 16th check is refused. Confirm returns the
 * chosen occurrence ids in source order.
 */
import { useId, useState } from 'react';
import { PLAYLIST_SONG_BLOCK_CAP } from '@ritmofit/shared';
import { Dialog } from './Dialog.js';

export interface PlaylistSongPickerItem {
  id: string;
  /** 1-based position in the source playlist. */
  position: number;
  title: string;
  artist: string;
  durationMs: number | null;
}

function formatSongDuration(durationMs: number | null): string {
  if (durationMs == null) return 'Duration unknown';
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function PlaylistSongPicker({
  items,
  mode,
  onConfirm,
  onCancel,
}: {
  items: PlaylistSongPickerItem[];
  mode: 'create' | 'import';
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [refused, setRefused] = useState(false);
  const capId = useId();
  const orderedIds = items.filter((item) => selected.includes(item.id)).map((item) => item.id);
  const count = orderedIds.length;
  const confirmLabel =
    mode === 'create' ? `Create class from ${count} songs` : `Import ${count} songs`;

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) {
        setRefused(false);
        return current.filter((row) => row !== id);
      }
      if (current.length >= PLAYLIST_SONG_BLOCK_CAP) {
        setRefused(true);
        return current;
      }
      setRefused(false);
      return [...current, id];
    });
  };

  return (
    <Dialog
      onClose={onCancel}
      label="Choose songs"
      panelClassName="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-3 overflow-hidden rounded-card bg-bg-raised p-6 shadow-overlay"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Choose up to 15 songs
          </h2>
          <p className="mt-1 font-ui text-xs text-text-secondary">
            {count} of {PLAYLIST_SONG_BLOCK_CAP} selected. Songs stay in playlist order.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 shrink-0 rounded-pill border border-interactive/30 px-3 font-ui text-xs text-text-secondary"
        >
          Cancel
        </button>
      </div>
      <p
        id={capId}
        role={refused ? 'alert' : undefined}
        className="font-ui text-sm text-text-secondary"
      >
        Choose at most 15 songs.
      </p>
      <div role="group" aria-describedby={capId} className="max-h-80 overflow-y-auto">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex min-h-11 items-center gap-3 border-b border-border-subtle px-1 py-2"
            style={{ contentVisibility: 'auto', minHeight: '2.75rem' }}
          >
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              aria-label={`${item.position}. ${item.title}`}
              className="rf-focus-ring"
            />
            <span className="w-8 shrink-0 font-data text-xs text-text-tertiary">
              {item.position}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-ui text-sm text-text-primary">{item.title}</span>
              <span className="block truncate font-ui text-xs text-text-secondary">
                {item.artist}
              </span>
            </span>
            <span className="shrink-0 font-data text-xs text-text-secondary">
              {formatSongDuration(item.durationMs)}
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={count === 0}
        onClick={() => onConfirm(orderedIds)}
        className="min-h-11 rounded-pill rf-btn-primary px-3 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
      >
        {confirmLabel}
      </button>
    </Dialog>
  );
}
