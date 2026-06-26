/**
 * Explore (M4 slice 3a/3b) — browse public classes other instructors have
 * published. Read-only discovery: preview a class's live run-payload, or "save a
 * copy" into your own library as an editable, owned class. Featured curation is
 * deferred; v1 is the public feed newest-first.
 */
import { useCallback, useEffect, useState } from 'react';
import type { ExploreClass, Class } from '@ritmofit/shared';
import { listExplore, copyClass } from '../lib/api.js';
import { errMessage } from '../lib/errors.js';
import { useAsyncAction } from '../lib/use-async-action.js';
import { Dialog } from './Dialog.js';
import { PendingList } from './PendingList.js';

export function ExploreDialog({
  onPreview,
  onCopied,
  onClose,
}: {
  onPreview: (classId: string) => void;
  onCopied: (cls: Class) => void;
  onClose: () => void;
}) {
  const PAGE_SIZE = 30;
  const [items, setItems] = useState<ExploreClass[] | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Pagination: a full page implies there may be more; a short page is the end.
  const [hasMore, setHasMore] = useState(false);
  // useAsyncAction's re-entry guard makes a double-clicked "Load more" a no-op, so
  // two requests can't race at the same offset and clobber `hasMore`.
  const { busy: loadingMore, run: runLoadMore } = useAsyncAction(setError);

  const saveCopy = useCallback(
    async (classId: string) => {
      setCopyingId(classId);
      setError(null);
      try {
        onCopied(await copyClass(classId));
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setCopyingId(null);
      }
    },
    [onCopied],
  );

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const page = await listExplore(PAGE_SIZE, 0);
      setItems(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      setError(errMessage(e));
    }
  }, []);

  const loadMore = useCallback(
    () =>
      runLoadMore(async () => {
        // Derive the offset functionally so it reflects the latest list, not a stale
        // closure; the re-entry guard already serializes calls.
        const current = items ?? [];
        const page = await listExplore(PAGE_SIZE, current.length);
        // De-dupe defensively: a class published between pages can shift offsets.
        setItems((prev) => {
          const seen = new Set((prev ?? []).map((c) => c.id));
          return [...(prev ?? []), ...page.filter((c) => !seen.has(c.id))];
        });
        setHasMore(page.length === PAGE_SIZE);
      }),
    [items, runLoadMore],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Dialog
      onClose={onClose}
      label="Explore public classes"
      panelClassName="flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-panel bg-bg-raised p-6 shadow-lifted"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">Explore</h2>
          <p className="font-ui text-sm text-text-secondary">
            Public classes from other instructors
          </p>
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
        <p className="font-ui text-sm text-state-danger" role="alert">
          {error}
        </p>
      )}

      {items === null ? (
        <PendingList error={error} onRetry={() => void refresh()} />
      ) : items.length === 0 ? (
        <p className="font-ui text-sm text-text-tertiary">
          No public classes yet. Publish one of yours to share it here.
        </p>
      ) : (
        <div className="flex flex-col gap-6 overflow-y-auto">
          {Object.entries(
            items.reduce(
              (acc, cls) => {
                const cat = cls.featuredCategory || 'Community';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(cls);
                return acc;
              },
              {} as Record<string, ExploreClass[]>,
            ),
          ).map(([category, categoryItems]) => (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="font-display text-md font-semibold text-text-secondary">{category}</h3>
              <ul className="flex flex-col gap-2">
                {categoryItems.map((cls) => (
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
                        <span className="font-data">{cls.trackCount}</span> track
                        {cls.trackCount === 1 ? '' : 's'}
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
                      title={
                        cls.trackCount === 0 ? 'This class has no tracks yet' : 'Preview this class'
                      }
                    >
                      Preview
                    </button>
                    <button
                      className="rounded-pill rf-btn-primary px-3 py-1.5 font-ui text-sm font-semibold text-text-on-accent disabled:opacity-40"
                      onClick={() => saveCopy(cls.id)}
                      disabled={copyingId !== null}
                      title="Copy this class into your library to edit it"
                    >
                      {copyingId === cls.id ? 'Saving…' : 'Save a copy'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-1">
              <button
                className="rounded-pill border border-interactive px-4 py-1.5 font-ui text-sm text-interactive disabled:opacity-40"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
