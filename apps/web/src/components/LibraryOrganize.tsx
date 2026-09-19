import { useId, useState, type FormEvent } from 'react';
import { CLASS_SORT_OPTIONS, type ClassSortKey } from '../lib/library-state.js';

/**
 * Search + sort controls for the loaded class library. Both are labeled and
 * keyboard-reachable; the search clears with an inline button (shown only when
 * there's text) and the sort is a native `<select>` so it stays fully accessible.
 * These organize the already-loaded page set only — they don't refetch.
 */
export function LibraryOrganizeControls({
  query,
  sort,
  onQueryChange,
  onSortChange,
}: {
  query: string;
  sort: ClassSortKey;
  onQueryChange: (value: string) => void;
  onSortChange: (value: ClassSortKey) => void;
}) {
  const sortId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {/* type="text" (not "search") so we own the single clear affordance below
            rather than doubling it with WebKit's native search-field clear button. */}
        <input
          type="text"
          role="searchbox"
          className="min-h-11 w-full rounded-control border border-interactive/30 bg-bg-base pl-3 pr-12 font-ui text-xs text-text-primary sm:min-h-8 sm:rounded-pill sm:pr-9"
          placeholder="Search loaded classes…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search loaded classes by title or type"
        />
        {query.trim() && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 min-h-11 min-w-11 -translate-y-1/2 rounded-control font-ui text-xs text-text-tertiary hover:text-text-primary sm:right-1 sm:min-h-8 sm:min-w-8 sm:rounded-full"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={sortId}
          className="font-ui text-[10px] uppercase tracking-wide text-text-tertiary"
        >
          Sort
        </label>
        <select
          id={sortId}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-interactive/30 bg-bg-base px-3 font-ui text-xs text-text-primary sm:min-h-8 sm:rounded-pill"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ClassSortKey)}
        >
          {CLASS_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Server-side tag (theme) search. The active filter shows as a removable chip;
 * `knownTags` render as quick-fill pills; the input reaches any tag — including
 * ones not on a loaded page — and is normalized (trim + lowercase) to match how
 * the server stores tags.
 */
export function TagFilter({
  knownTags,
  activeTag,
  onSelectTag,
}: {
  knownTags: string[];
  activeTag: string | null;
  onSelectTag: (tag: string | null) => void;
}) {
  const [input, setInput] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const tag = input.trim().toLowerCase();
    if (!tag) return;
    setInput('');
    onSelectTag(tag);
  };
  return (
    <div className="flex flex-col gap-1.5 pb-1">
      <form className="flex gap-1.5" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 rounded-pill border border-interactive/30 bg-bg-base px-3 py-1 font-ui text-xs text-text-primary"
          placeholder="Filter by tag…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Filter classes by tag"
        />
        {input.trim() && (
          <button
            type="submit"
            className="rounded-pill border border-interactive px-3 py-1 font-ui text-xs text-interactive"
          >
            Filter
          </button>
        )}
      </form>
      <div className="flex flex-wrap gap-1.5">
        {activeTag && (
          <button
            type="button"
            onClick={() => onSelectTag(null)}
            className="min-h-11 rounded-control border border-interactive bg-interactive px-2 font-ui text-xs text-bg-base sm:min-h-8 sm:rounded-pill"
            aria-label={`Clear tag filter ${activeTag}`}
          >
            #{activeTag} ×
          </button>
        )}
        {knownTags
          .filter((t) => t !== activeTag)
          .map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onSelectTag(tag)}
              className="min-h-11 rounded-control border border-interactive/30 bg-bg-base px-2 font-ui text-xs text-text-secondary hover:text-text-primary sm:min-h-8 sm:rounded-pill"
            >
              #{tag}
            </button>
          ))}
      </div>
    </div>
  );
}
