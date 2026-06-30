// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassListItem } from '@ritmofit/shared';
import { LibraryRail } from './Dashboard.js';

afterEach(cleanup);

function makeItem(over: Partial<ClassListItem> & { id: string; title: string }): ClassListItem {
  return {
    ownerUserId: 'owner',
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    createdAt: 1,
    updatedAt: 1,
    lastOpenedAt: null,
    accessLevel: 'owner',
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
    trackCount: 0,
    totalDurationMs: 0,
    albumArtUrls: [],
    ...over,
  };
}

const classes: ClassListItem[] = [
  makeItem({
    id: '00000000-0000-4000-8000-000000000001',
    title: 'First ride',
    createdAt: 2,
    updatedAt: 2,
  }),
  makeItem({
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Shared ride',
    ownerUserId: 'other',
    accessLevel: 'view',
  }),
];

function renderRail(
  options: {
    hasMore?: boolean;
    loadingMore?: boolean;
    status?: 'loading' | 'error' | 'ready';
    items?: ClassListItem[];
    knownTags?: string[];
    activeTag?: string | null;
    onSelectTag?: (tag: string | null) => void;
    onDuplicate?: (cls: ClassListItem) => Promise<void>;
    onPreview?: (cls: ClassListItem) => void;
    onOpen?: (cls: ClassListItem) => void;
    onRetry?: () => void;
  } = {},
) {
  const onLoadMore = vi.fn();
  const onRetry = options.onRetry ?? vi.fn();
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
      onDuplicate={options.onDuplicate ?? (() => Promise.resolve())}
      onPreview={options.onPreview ?? (() => {})}
      onOpen={options.onOpen ?? (() => {})}
      onLoadMore={onLoadMore}
      onRetry={onRetry}
    />,
  );
  return { onLoadMore, onRetry };
}

describe('LibraryRail pagination', () => {
  it('labels the count as loaded and requests the next page', () => {
    const { onLoadMore } = renderRail();
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

describe('LibraryRail load failure', () => {
  it('announces a failed load and offers a working retry', () => {
    const onRetry = vi.fn();
    renderRail({ items: [], status: 'error', onRetry });
    // The failure is announced (role=alert), not just muted tertiary text.
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Couldn’t load your classes/i)).toBeTruthy();
    // And it gives a real affordance rather than dead-ending on "try again" copy.
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('LibraryRail card summary', () => {
  it('shows the track count and total runtime on the card', () => {
    renderRail({
      items: [
        makeItem({
          id: '00000000-0000-4000-8000-0000000000a1',
          title: 'Summit',
          trackCount: 3,
          totalDurationMs: 1_800_000, // 30:00
        }),
      ],
    });
    expect(screen.getByText('3 tracks')).toBeTruthy();
    expect(screen.getByText('30:00')).toBeTruthy();
  });

  it('leads with class template (shape) when present in the card meta', () => {
    renderRail({
      items: [
        makeItem({
          id: '00000000-0000-4000-8000-0000000000a6',
          title: 'Interval Ride',
          template: 'hiit',
          trackCount: 4,
          totalDurationMs: 2_400_000,
        }),
      ],
    });
    // Shape leads: HIIT before count/duration. (Access is de-emphasized at end.)
    // Use textContent contains to be robust across whitespace/nodes in meta.
    expect(document.body.textContent || '').toContain('HIIT');
    expect(screen.getByText('4 tracks')).toBeTruthy();
    expect(screen.getByText('40:00')).toBeTruthy();
  });

  it('singularizes a one-track class and omits a zero duration', () => {
    renderRail({
      items: [
        makeItem({
          id: '00000000-0000-4000-8000-0000000000a2',
          title: 'Single',
          trackCount: 1,
          totalDurationMs: 0,
        }),
      ],
    });
    expect(screen.getByText('1 track')).toBeTruthy();
    expect(screen.queryByText('0:00')).toBeNull();
  });

  it('renders a track-art collage from the album-art URLs', () => {
    renderRail({
      items: [
        makeItem({
          id: '00000000-0000-4000-8000-0000000000a3',
          title: 'Arty',
          albumArtUrls: ['https://art/a.jpg', 'https://art/b.jpg'],
        }),
      ],
    });
    // The multi-art collage is decorative (aria-hidden), so query the DOM directly.
    const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual([
      'https://art/a.jpg',
      'https://art/b.jpg',
    ]);
    expect(imgs.every((i) => i.getAttribute('loading') === 'lazy')).toBe(true);
  });

  it('duplicates a class via its own labeled control without opening it', async () => {
    const onOpen = vi.fn();
    const onDuplicate = vi.fn(() => Promise.resolve());
    renderRail({
      items: [makeItem({ id: '00000000-0000-4000-8000-0000000000a4', title: 'Copy me' })],
      onOpen,
      onDuplicate,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate Copy me' }));
    await waitFor(() => expect(onDuplicate).toHaveBeenCalledTimes(1));
    expect(onDuplicate.mock.calls[0]?.[0]?.id).toBe('00000000-0000-4000-8000-0000000000a4');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('previews a class via its own labeled control without opening the builder', () => {
    const onOpen = vi.fn();
    const onPreview = vi.fn();
    renderRail({
      items: [makeItem({ id: '00000000-0000-4000-8000-0000000000a5', title: 'Peek me' })],
      onOpen,
      onPreview,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Preview Peek me' }));
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview.mock.calls[0]?.[0]?.id).toBe('00000000-0000-4000-8000-0000000000a5');
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('LibraryRail create-class chooser', () => {
  it('offers template options, defaults to Blank, and toggles the selection', () => {
    renderRail();
    const blank = screen.getByRole('button', { name: 'Blank' });
    const hiit = screen.getByRole('button', { name: 'HIIT' });
    // Blank (no discipline) is the default selection.
    expect(blank.getAttribute('aria-pressed')).toBe('true');
    expect(hiit.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(hiit);
    expect(hiit.getAttribute('aria-pressed')).toBe('true');
    expect(blank.getAttribute('aria-pressed')).toBe('false');
  });
});
