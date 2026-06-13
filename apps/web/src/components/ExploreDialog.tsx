/**
 * Explore (M4 slice 3a/3b) — browse public classes other instructors have
 * published. Read-only discovery: preview a class's live run-payload, or "save a
 * copy" into your own library as an editable, owned class. Featured curation is
 * deferred; v1 is the public feed newest-first.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ExploreClass, Class } from '@ritmofit/shared';
import { listExplore, copyClass } from '../lib/api.js';

export function ExploreDialog({
  onPreview,
  onCopied,
  onClose,
}: {
  onPreview: (classId: string) => void;
  onCopied: (cls: Class) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ExploreClass[] | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveCopy = useCallback(
    async (classId: string) => {
      setCopyingId(classId);
      setError(null);
      try {
        onCopied(await copyClass(classId));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setCopyingId(null);
      }
    },
    [onCopied],
  );

  const refresh = useCallback(async () => {
    try {
      setItems(await listExplore());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Explore public classes"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">Explore</h2>
            <p className="font-ui text-sm text-text-secondary">Public classes from other instructors</p>
          </div>
          <button
            className="rounded-pill px-2 py-1 font-ui text-sm text-text-tertiary hover:text-text-primary"
            onClick={onClose}
            aria-label="Close explore dialog"
          >
            ✕
          </button>
        </header>

        {error && (
          <p className="font-ui text-sm text-intensity-all_out" role="alert">
            {error}
          </p>
        )}

        {items === null ? (
          <p className="font-ui text-sm text-text-tertiary">Loading…</p>
        ) : items.length === 0 ? (
          <p className="font-ui text-sm text-text-tertiary">
            No public classes yet. Publish one of yours to share it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {items.map((cls) => (
              <li
                key={cls.id}
                className="flex items-center gap-3 rounded-card bg-bg-base p-3 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-text-primary">{cls.title}</p>
                  <p className="font-ui text-xs text-text-tertiary">
                    by {cls.ownerName}
                    <span className="mx-1.5" aria-hidden>
                      ·
                    </span>
                    <span className="font-data">{cls.trackCount}</span> track{cls.trackCount === 1 ? '' : 's'}
                    {cls.template && (
                      <>
                        <span className="mx-1.5" aria-hidden>
                          ·
                        </span>
                        {cls.template}
                      </>
                    )}
                  </p>
                </div>
                <button
                  className="rounded-pill border border-interactive px-3 py-1.5 font-ui text-sm text-interactive disabled:opacity-40"
                  onClick={() => onPreview(cls.id)}
                  disabled={cls.trackCount === 0}
                  title={cls.trackCount === 0 ? 'This class has no tracks yet' : 'Preview this class'}
                >
                  Preview
                </button>
                <button
                  className="rounded-pill bg-brand px-3 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
                  onClick={() => saveCopy(cls.id)}
                  disabled={copyingId !== null}
                  title="Copy this class into your library to edit it"
                >
                  {copyingId === cls.id ? 'Saving…' : 'Save a copy'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
