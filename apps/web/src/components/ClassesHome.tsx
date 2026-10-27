import type { CreateClassMode } from './CreateClassDialog.js';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ClassListItem } from '@ritmofit/shared';
import { getClassShelfPayload, listClassPlanBlocks, listClassTracks } from '../lib/api.js';
import { deleteClassConfirmMessage } from '../lib/class-delete.js';
import { errMessage } from '../lib/errors.js';
import { Dialog } from './Dialog.js';
import type { ClassDetailState } from '../lib/class-ordering.js';
import { creationNextStep, type CreationPlanContext } from '../lib/creation-next-step.js';
import { formatDuration, formatTemplateLabel } from '../lib/class-summary.js';
import { errorReference } from '../lib/error-reference.js';
import { libraryView, organizeClasses, type ListStatus } from '../lib/library-state.js';
import {
  coverGradientClass,
  jumpBackInClasses,
  LIBRARY_TEMPLATES,
  readinessMark,
  recentClasses,
  type LibraryTemplate,
} from '../lib/library-shell.js';
import { RecoveryState, StatusLabel } from './SharedState.js';

const DETAIL_CONCURRENCY = 2;

export function ClassesHome({
  classes,
  status,
  libraryError,
  activeTag,
  knownTags,
  hasMore,
  loadingMore,
  onOpen,
  onPreview,
  onDuplicate,
  onDelete,
  onSelectTag,
  onClearTag,
  onRetry,
  onLoadMore,
  onStartClass,
  onStartTemplate,
  onImportPlaylist,
}: {
  classes: ClassListItem[];
  status: ListStatus;
  libraryError: string | null;
  activeTag: string | null;
  knownTags: string[];
  hasMore: boolean;
  loadingMore: boolean;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onDelete: (cls: ClassListItem) => Promise<void>;
  onSelectTag: (tag: string | null) => void;
  onClearTag: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onStartClass: (mode?: CreateClassMode) => void;
  onStartTemplate: (template: LibraryTemplate) => void;
  onImportPlaylist: () => void;
}) {
  const view = libraryView(status, classes.length);

  if (view === 'loading') {
    return (
      <section
        className="mx-auto min-w-0 w-full max-w-3xl rounded-card border border-border-subtle bg-bg-raised p-5 sm:p-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <StatusLabel kind="loading" label="Loading your class library" />
        <h2 className="mt-3 font-display text-2xl font-semibold text-text-primary">
          Reading your next run of show…
        </h2>
        <p className="mt-2 font-ui text-sm leading-6 text-text-secondary">
          Ritmo is checking classes before it suggests a next step.
        </p>
        <div aria-hidden="true" className="mt-5 flex flex-col gap-3">
          <span className="h-16 rounded-card bg-bg-sunken" />
          <span className="h-16 rounded-card bg-bg-sunken" />
        </div>
      </section>
    );
  }

  if (view === 'error') {
    return (
      <div className="mx-auto min-w-0 w-full max-w-3xl">
        <RecoveryState
          kind="unavailable"
          role="alert"
          statusLabel="Class library unavailable"
          title="Your library is temporarily unavailable."
          event={`Ritmo could not read the class list. This is not an empty account. Reference ${errorReference(
            'CLS',
            libraryError,
          )}.`}
          safety="No class was removed. A new draft remains a separate, safe starting point."
          primaryAction={
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 rounded-control rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent sm:rounded-pill"
            >
              Try the library again
            </button>
          }
          secondaryAction={
            <button
              type="button"
              onClick={() => onStartClass()}
              className="min-h-11 rounded-control border border-interactive/50 px-4 font-ui text-sm font-semibold text-interactive sm:rounded-pill"
            >
              Start a new draft
            </button>
          }
        />
      </div>
    );
  }

  return (
    <LibraryShell
      classes={classes}
      activeTag={activeTag}
      knownTags={knownTags}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onOpen={onOpen}
      onPreview={onPreview}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onSelectTag={onSelectTag}
      onClearTag={onClearTag}
      onLoadMore={onLoadMore}
      onStartClass={onStartClass}
      onStartTemplate={onStartTemplate}
      onImportPlaylist={onImportPlaylist}
    />
  );
}

function LibraryShell({
  classes,
  activeTag,
  knownTags,
  hasMore,
  loadingMore,
  onOpen,
  onPreview,
  onDuplicate,
  onDelete,
  onSelectTag,
  onClearTag,
  onLoadMore,
  onStartClass,
  onStartTemplate,
  onImportPlaylist,
}: {
  classes: ClassListItem[];
  activeTag: string | null;
  knownTags: string[];
  hasMore: boolean;
  loadingMore: boolean;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onDelete: (cls: ClassListItem) => Promise<void>;
  onSelectTag: (tag: string | null) => void;
  onClearTag: () => void;
  onLoadMore: () => void;
  onStartClass: (mode?: CreateClassMode) => void;
  onStartTemplate: (template: LibraryTemplate) => void;
  onImportPlaylist: () => void;
}) {
  const searchId = useId();
  const recentsRef = useRef<HTMLElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreDeleteFocusRef = useRef(false);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ClassListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [discipline, setDiscipline] = useState<'all' | LibraryTemplate>('all');
  const [details, setDetails] = useState<Record<string, ClassDetailState>>({});
  const [plans, setPlans] = useState<Record<string, CreationPlanContext | null>>({});
  const [retryRevision, setRetryRevision] = useState(0);

  const candidateKey = classes.map((cls) => cls.id).join('|');

  useEffect(() => {
    let active = true;
    setDetails(Object.fromEntries(classes.map((cls) => [cls.id, { status: 'loading' }])));
    setPlans({});
    const queue = [...classes];

    const worker = async () => {
      while (queue.length > 0) {
        const cls = queue.shift();
        if (!cls) return;
        try {
          const payload = await getClassShelfPayload(cls.id);
          if (!payload || !Array.isArray(payload.tracks)) {
            throw new Error('Class details unavailable');
          }
          if (!active) return;
          setDetails((current) => ({ ...current, [cls.id]: { status: 'ready', payload } }));
          if (cls.scaffoldRecipeId) {
            try {
              const [blocks, tracks] = await Promise.all([
                listClassPlanBlocks(cls.id),
                listClassTracks(cls.id),
              ]);
              if (!active) return;
              setPlans((current) => ({
                ...current,
                [cls.id]: {
                  blocks: Array.isArray(blocks) ? blocks : [],
                  tracks: Array.isArray(tracks) ? tracks : [],
                },
              }));
            } catch {
              if (!active) return;
              setPlans((current) => ({ ...current, [cls.id]: null }));
            }
          }
        } catch {
          if (!active) return;
          setDetails((current) => ({ ...current, [cls.id]: { status: 'error' } }));
        }
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(DETAIL_CONCURRENCY, queue.length) }, () => worker()),
    );
    return () => {
      active = false;
    };
  }, [candidateKey, retryRevision]);

  const visible = useMemo(() => {
    const byDiscipline =
      discipline === 'all' || activeTag
        ? classes
        : classes.filter((cls) => cls.template === discipline);
    const matched = organizeClasses(byDiscipline, { query, sort: 'recently_updated' });
    return recentClasses(matched);
  }, [activeTag, classes, discipline, query]);

  const jumpBack = useMemo(() => jumpBackInClasses(classes), [classes]);
  const tagChips = [...new Set(activeTag ? [activeTag, ...knownTags] : knownTags)];

  const chooseDiscipline = (next: 'all' | LibraryTemplate) => {
    setDiscipline(next);
    if (activeTag) onSelectTag(null);
  };

  const showAll = () => {
    const heading = recentsRef.current?.querySelector('h2');
    recentsRef.current?.scrollIntoView({ block: 'start' });
    if (heading instanceof HTMLElement) heading.focus();
  };

  const closeDelete = () => {
    if (deleting) return;
    restoreDeleteFocusRef.current = true;
    setPendingDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (!pendingDelete || deleting) return;
    const target = pendingDelete;
    setDeleting(true);
    setDeleteError(null);
    void (async () => {
      try {
        await onDelete(target);
        restoreDeleteFocusRef.current = false;
        deleteMenuButtonRef.current = null;
        setPendingDelete(null);
      } catch (error) {
        setDeleteError(errMessage(error));
      } finally {
        setDeleting(false);
      }
    })();
  };

  // Dialog restores whatever was focused when it opened (the menu item, which
  // unmounts with the menu). After that cleanup, put focus back on the row's ⋯.
  useEffect(() => {
    if (pendingDelete || !restoreDeleteFocusRef.current) return;
    restoreDeleteFocusRef.current = false;
    const button = deleteMenuButtonRef.current;
    deleteMenuButtonRef.current = null;
    if (button?.isConnected) button.focus();
  }, [pendingDelete]);

  return (
    <div
      data-library-shell=""
      className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(17.5rem,22rem)_minmax(0,1fr)] lg:items-start"
    >
      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
        <header className="sticky top-0 z-20 order-1 flex items-center justify-between gap-3 bg-bg-base py-2 lg:order-none">
          <h2 className="font-display text-xl font-semibold text-text-primary">Your Classes</h2>
          <CreateMenu onStartClass={onStartClass} onImportPlaylist={onImportPlaylist} />
        </header>

        <section
          ref={recentsRef}
          aria-labelledby="class-recents-heading"
          className="order-3 min-w-0 lg:order-none"
        >
          <div role="group" aria-label="Filter classes" className="flex flex-wrap gap-2">
            <FilterChip
              pressed={!activeTag && discipline === 'all'}
              onClick={() => chooseDiscipline('all')}
            >
              All
            </FilterChip>
            <FilterChip
              pressed={!activeTag && discipline === 'cycle'}
              onClick={() => chooseDiscipline('cycle')}
            >
              Cycle
            </FilterChip>
            <FilterChip
              pressed={!activeTag && discipline === 'sculpt'}
              onClick={() => chooseDiscipline('sculpt')}
            >
              Pilates
            </FilterChip>
            {tagChips.map((tag) => (
              <FilterChip
                key={tag}
                pressed={activeTag === tag}
                onClick={() => {
                  setDiscipline('all');
                  onSelectTag(tag);
                }}
              >
                #{tag}
              </FilterChip>
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor={searchId} className="font-ui text-xs font-semibold text-text-secondary">
              Search classes
            </label>
            <input
              id={searchId}
              type="text"
              role="searchbox"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
              className="mt-1.5 min-h-11 w-full rounded-control border border-border bg-bg-raised px-3 font-ui text-sm text-text-primary rf-focus-ring"
            />
          </div>

          <h2
            id="class-recents-heading"
            tabIndex={-1}
            className="mt-6 font-display text-lg font-semibold text-text-primary focus:outline-none"
          >
            Recents
          </h2>

          {classes.length === 0 && !activeTag ? (
            <p className="mt-3 font-ui text-sm text-text-secondary">There are no classes yet.</p>
          ) : classes.length === 0 && activeTag ? (
            <div className="mt-3">
              <p className="font-ui text-sm text-text-secondary">No classes tagged #{activeTag}.</p>
              <button
                type="button"
                onClick={onClearTag}
                className="mt-3 min-h-11 rounded-control border border-interactive px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
              >
                Clear #{activeTag} filter
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="mt-3">
              <p className="font-ui text-sm text-text-secondary">No classes match this filter.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDiscipline('all');
                  if (activeTag) onClearTag();
                }}
                className="mt-3 min-h-11 rounded-control border border-interactive px-3 font-ui text-sm font-semibold text-interactive rf-focus-ring"
              >
                Show all classes
              </button>
            </div>
          ) : (
            <ol className="mt-2 divide-y divide-border-subtle">
              {visible.map((cls) => (
                <ClassRow
                  key={cls.id}
                  cls={cls}
                  detail={details[cls.id]}
                  plan={plans[cls.id]}
                  onOpen={onOpen}
                  onPreview={onPreview}
                  onDuplicate={onDuplicate}
                  onAskDelete={(target, menuButton) => {
                    deleteMenuButtonRef.current = menuButton;
                    restoreDeleteFocusRef.current = false;
                    setDeleteError(null);
                    setPendingDelete(target);
                  }}
                  onRetryDetails={() => setRetryRevision((revision) => revision + 1)}
                />
              ))}
            </ol>
          )}

          {hasMore && (
            <div className="mt-4">
              <button
                type="button"
                className="min-h-11 rounded-control border border-interactive px-4 font-ui text-sm text-interactive disabled:opacity-40 rf-focus-ring"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more classes'}
              </button>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="template-heading" className="order-2 min-w-0 lg:order-none">
        <h2
          id="template-heading"
          tabIndex={-1}
          className="font-display text-2xl font-semibold tracking-[-0.02em] text-text-primary focus:outline-none"
        >
          Start from a template
        </h2>
        <div role="group" aria-label="Class templates" className="mt-4 grid grid-cols-2 gap-3">
          {LIBRARY_TEMPLATES.map((tile) => (
            <button
              key={tile.template}
              type="button"
              aria-label={`Start from the ${tile.label} template`}
              onClick={() => onStartTemplate(tile.template)}
              className="flex min-h-24 flex-col items-start justify-between rounded-card border border-border-subtle bg-bg-raised p-4 text-left rf-focus-ring hover:border-border"
            >
              <span className="font-display text-xl font-semibold text-text-primary">
                {tile.label}
              </span>
              <span className="mt-2 font-ui text-sm text-text-secondary">{tile.detail}</span>
            </button>
          ))}
        </div>

        {jumpBack.length > 0 && (
          <section aria-labelledby="jump-back-heading" className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <h2
                id="jump-back-heading"
                className="font-display text-2xl font-semibold tracking-[-0.02em] text-text-primary"
              >
                Jump back in
              </h2>
              <button
                type="button"
                onClick={showAll}
                className="min-h-11 shrink-0 rounded-control px-2 font-ui text-sm font-semibold text-interactive rf-focus-ring"
              >
                Show all
              </button>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {jumpBack.map((cls) => (
                <li key={cls.id}>
                  <button
                    type="button"
                    aria-label={`Jump back in to ${cls.title}`}
                    onClick={() => onOpen(cls)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-card border border-border-subtle bg-bg-raised p-3 text-left rf-focus-ring"
                  >
                    <ClassCover cls={cls} />
                    <span className="min-w-0">
                      <span className="block truncate font-display text-base font-semibold text-text-primary">
                        {cls.title}
                      </span>
                      <span className="block truncate font-data text-xs text-text-tertiary">
                        {classMeta(cls)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
      {pendingDelete && (
        <Dialog
          onClose={closeDelete}
          label={deleteClassConfirmMessage(pendingDelete.title)}
          panelClassName="w-full max-w-md rounded-card bg-bg-raised p-5 shadow-lifted"
          initialFocusRef={cancelDeleteRef}
        >
          <p className="font-ui text-base leading-6 text-text-primary">
            {deleteClassConfirmMessage(pendingDelete.title)}
          </p>
          {deleteError && (
            <p role="alert" className="mt-3 font-ui text-sm text-state-danger">
              {deleteError}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-transparent px-3 font-ui text-sm text-state-danger hover:bg-state-danger/10 rf-focus-ring disabled:pointer-events-none disabled:opacity-40"
            >
              <DeleteIcon />
              {deleting ? '…' : 'Delete class'}
            </button>
            <button
              ref={cancelDeleteRef}
              type="button"
              onClick={closeDelete}
              disabled={deleting}
              className="min-h-11 rounded-control border border-border-subtle px-3 font-ui text-sm text-text-secondary rf-focus-ring disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function CreateMenu({
  onStartClass,
  onImportPlaylist,
}: {
  onStartClass: (mode?: CreateClassMode) => void;
  onImportPlaylist: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center gap-1 rounded-pill rf-btn-primary px-4 font-ui text-sm font-semibold text-text-on-accent rf-focus-ring"
      >
        <span aria-hidden="true">+</span>
        Create
      </button>
      {open && (
        <div
          id={menuId}
          role="group"
          aria-label="Create a class"
          className="absolute right-0 z-30 mt-2 flex w-56 flex-col rounded-card border border-border-subtle bg-bg-raised p-1 shadow-lifted"
        >
          <MenuButton onClick={() => choose(() => onStartClass('empty'))}>New class</MenuButton>
          <MenuButton onClick={() => choose(() => onStartClass('scaffold'))}>
            From a template
          </MenuButton>
          <MenuButton onClick={() => choose(onImportPlaylist)}>Import a playlist</MenuButton>
        </div>
      )}
    </div>
  );
}

function MenuButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-control px-3 text-left font-ui text-sm text-text-primary hover:bg-bg-sunken rf-focus-ring"
    >
      {children}
    </button>
  );
}

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-pill border px-3 font-ui text-sm font-semibold rf-focus-ring ${
        pressed
          ? 'border-interactive bg-interactive/15 text-text-primary'
          : 'border-border-subtle text-text-secondary hover:border-interactive/45 hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function classMeta(
  cls: Pick<ClassListItem, 'template' | 'trackCount' | 'totalDurationMs'>,
): string {
  const type = formatTemplateLabel(cls.template) ?? 'Class';
  const tracks = `${cls.trackCount} ${cls.trackCount === 1 ? 'track' : 'tracks'}`;
  return `${type} · ${tracks} · ${formatDuration(cls.totalDurationMs)}`;
}

function ClassCover({ cls }: { cls: Pick<ClassListItem, 'coverImageUrl' | 'template'> }) {
  if (cls.coverImageUrl) {
    return (
      <img
        src={cls.coverImageUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-control object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      data-cover="type-gradient"
      data-template={cls.template ?? 'none'}
      className={`h-10 w-10 shrink-0 rounded-control ${coverGradientClass(cls.template)}`}
    />
  );
}

function ClassRow({
  cls,
  detail,
  plan,
  onOpen,
  onPreview,
  onDuplicate,
  onAskDelete,
  onRetryDetails,
}: {
  cls: ClassListItem;
  detail: ClassDetailState | undefined;
  plan: CreationPlanContext | null | undefined;
  onOpen: (cls: ClassListItem) => void;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onAskDelete: (cls: ClassListItem, menuButton: HTMLButtonElement) => void;
  onRetryDetails: () => void;
}) {
  const step = creationNextStep(cls, detail, plan);
  const mark = readinessMark(step);
  const metaId = `${cls.id}-meta`;
  const readinessId = `${cls.id}-readiness`;
  const payload = detail?.status === 'ready' ? detail.payload : null;

  return (
    <li className="py-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={cls.title}
          aria-describedby={`${metaId} ${readinessId}`}
          onClick={() => onOpen(cls)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-control py-1 text-left rf-focus-ring"
        >
          <ClassCover cls={cls} />
          <span className="min-w-0">
            <span className="block truncate font-display text-base font-semibold text-text-primary">
              {cls.title}
            </span>
            <span id={metaId} className="block truncate font-data text-xs text-text-tertiary">
              {classMeta(cls)}
            </span>
          </span>
        </button>
        <span
          id={readinessId}
          className="inline-flex shrink-0 items-center gap-1.5 font-ui text-xs text-text-secondary"
        >
          {mark.dot ? (
            <span
              aria-hidden="true"
              data-readiness-dot=""
              className="h-2 w-2 shrink-0 rounded-full bg-brand"
            />
          ) : null}
          {mark.label}
        </span>
        <RowMenu
          cls={cls}
          canPreview={payload != null}
          failed={detail?.status === 'error'}
          onPreview={onPreview}
          onDuplicate={onDuplicate}
          onAskDelete={(menuButton) => onAskDelete(cls, menuButton)}
          onRetryDetails={onRetryDetails}
        />
      </div>
    </li>
  );
}

function RowMenu({
  cls,
  canPreview,
  failed,
  onPreview,
  onDuplicate,
  onAskDelete,
  onRetryDetails,
}: {
  cls: ClassListItem;
  canPreview: boolean;
  failed: boolean;
  onPreview: (cls: ClassListItem) => void;
  onDuplicate: (cls: ClassListItem) => Promise<void>;
  onAskDelete: (menuButton: HTMLButtonElement) => void;
  onRetryDetails: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-label={`More actions — ${cls.title}`}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-control font-ui text-lg text-text-tertiary hover:text-text-primary rf-focus-ring"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 min-w-44 rounded-control border border-border-subtle bg-bg-raised p-1 shadow-lifted">
          {canPreview && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onPreview(cls);
              }}
              aria-label={`Rehearsal view — ${cls.title}`}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left font-ui text-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
            >
              Rehearsal view
            </button>
          )}
          {cls.accessLevel === 'owner' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void onDuplicate(cls);
              }}
              aria-label={`Duplicate — ${cls.title}`}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left font-ui text-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
            >
              Duplicate
            </button>
          )}
          {cls.accessLevel === 'owner' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                const menuButton = triggerRef.current;
                if (menuButton) onAskDelete(menuButton);
              }}
              aria-label={`Delete — ${cls.title}`}
              className="flex min-h-11 w-full items-center gap-1.5 rounded-control px-3 text-left font-ui text-sm text-state-danger hover:bg-state-danger/10"
            >
              <DeleteIcon />
              Delete
            </button>
          )}
          {failed && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRetryDetails();
              }}
              aria-label={`Retry details — ${cls.title}`}
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left font-ui text-sm text-text-secondary hover:bg-bg-sunken hover:text-text-primary"
            >
              Retry details
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}
