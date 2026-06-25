// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ClassWithAccess } from '@ritmofit/shared';
import { LibraryRail } from './Dashboard.js';

afterEach(cleanup);

const classes = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    ownerUserId: 'owner',
    title: 'First ride',
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    createdAt: 2,
    updatedAt: 2,
    lastOpenedAt: null,
    accessLevel: 'owner',
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    ownerUserId: 'other',
    title: 'Shared ride',
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: null,
    accessLevel: 'view',
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
  },
] satisfies ClassWithAccess[];

function renderRail(
  options: {
    hasMore?: boolean;
    loadingMore?: boolean;
    status?: 'loading' | 'error' | 'ready';
    items?: ClassWithAccess[];
    knownTags?: string[];
    activeTag?: string | null;
    onSelectTag?: (tag: string | null) => void;
  } = {},
) {
  const onLoadMore = vi.fn();
  render(
    <LibraryRail
      classes={options.items ?? classes}
      status={options.status ?? 'ready'}
      hasMore={options.hasMore ?? true}
      loadingMore={options.loadingMore ?? false}
      selectedId={null}
      knownTags={options.knownTags ?? []}
      activeTag={options.activeTag ?? null}
      onSelectTag={options.onSelectTag ?? (() => {})}
      onError={() => {}}
      onCreate={() => {}}
      onOpen={() => {}}
      onLoadMore={onLoadMore}
    />,
  );
  return onLoadMore;
}

describe('LibraryRail pagination', () => {
  it('labels the count as loaded and requests the next page', () => {
    const onLoadMore = renderRail();
    expect(screen.getByText('2 loaded')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('disables the continuation control while another page is loading', () => {
    renderRail({ loadingMore: true });
    expect(screen.getByRole('button', { name: 'Loading…' })).toHaveProperty('disabled', true);
  });

  it('omits the continuation control on the final page', () => {
    renderRail({ hasMore: false });
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });
});

describe('LibraryRail tag search', () => {
  it('selects a known tag pill to drive a server-side filter', () => {
    const onSelectTag = vi.fn();
    renderRail({ knownTags: ['hiit', 'pride'], onSelectTag });
    fireEvent.click(screen.getByRole('button', { name: '#hiit' }));
    expect(onSelectTag).toHaveBeenCalledWith('hiit');
  });

  it('filters by free-text input, normalized to trimmed lowercase', () => {
    const onSelectTag = vi.fn();
    renderRail({ onSelectTag, knownTags: ['hiit'] });
    fireEvent.change(screen.getByLabelText('Filter classes by tag'), {
      target: { value: '  Pride  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(onSelectTag).toHaveBeenCalledWith('pride');
  });

  it('shows the active tag as a clearable chip', () => {
    const onSelectTag = vi.fn();
    renderRail({ activeTag: 'hiit', knownTags: ['hiit'], onSelectTag });
    fireEvent.click(screen.getByRole('button', { name: 'Clear tag filter hiit' }));
    expect(onSelectTag).toHaveBeenCalledWith(null);
  });

  it('distinguishes a filtered-empty result from an empty library', () => {
    renderRail({ items: [], activeTag: 'hiit', knownTags: ['hiit'] });
    expect(screen.getByText(/No classes tagged/i)).toBeTruthy();
    expect(screen.queryByText(/create your first/i)).toBeNull();
  });
});
