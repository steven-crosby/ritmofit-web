// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ClassListItem, ClassPlanBlock, RunPayload } from '@ritmofit/shared';
import { ClassesHome } from './ClassesHome.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

function cls(index: number, over: Partial<ClassListItem> = {}): ClassListItem {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    ownerUserId: 'owner',
    title: `Class ${index}`,
    description: null,
    template: 'cycle',
    status: 'draft',
    visibility: 'private',
    timelineMode: 'sequential',
    targetDurationMs: null,
    scaffoldRecipeId: null,
    featuredCategory: null,
    coverImageUrl: null,
    tags: [],
    createdAt: index,
    updatedAt: index,
    lastOpenedAt: null,
    accessLevel: 'owner',
    trackCount: 1,
    totalDurationMs: 60_000,
    albumArtUrls: [],
    ...over,
  };
}

function payload(title: string): RunPayload {
  return {
    class: { title, totalDurationMs: 120_000 },
    tracks: [0, 1].map((position) => ({
      classTrackId: `${title}-track-${position}`,
      position,
      intensity: 'hard',
      track: { durationMs: 60_000 },
      providerRefs: [],
      cues: [],
      moves: [],
      displayBpm: null,
    })),
  } as unknown as RunPayload;
}

function renderHome(
  classes: ClassListItem[],
  options: {
    status?: 'loading' | 'ready' | 'error';
    activeTag?: string | null;
    knownTags?: string[];
    hasMore?: boolean;
    onOpen?: (cls: ClassListItem) => void;
    onPreview?: (cls: ClassListItem) => void;
    onStartClass?: (mode?: 'scaffold' | 'empty') => void;
    onStartTemplate?: (template: 'cycle' | 'sculpt') => void;
    onImportPlaylist?: () => void;
    onSelectTag?: (tag: string | null) => void;
  } = {},
) {
  return render(
    <ClassesHome
      classes={classes}
      status={options.status ?? 'ready'}
      libraryError={null}
      activeTag={options.activeTag ?? null}
      knownTags={options.knownTags ?? []}
      hasMore={options.hasMore ?? false}
      loadingMore={false}
      onOpen={options.onOpen ?? (() => {})}
      onPreview={options.onPreview ?? (() => {})}
      onDuplicate={async () => {}}
      onSelectTag={options.onSelectTag ?? (() => {})}
      onClearTag={() => {}}
      onRetry={() => {}}
      onLoadMore={() => {}}
      onStartClass={options.onStartClass ?? (() => {})}
      onStartTemplate={options.onStartTemplate ?? (() => {})}
      onImportPlaylist={options.onImportPlaylist ?? (() => {})}
    />,
  );
}

function rowTitles() {
  const recents = screen.getByRole('region', { name: 'Recents' });
  return within(recents)
    .getAllByRole('button', { name: /^(?!More actions|Jump back)/ })
    .map((node) => node.getAttribute('aria-label'))
    .filter((name): name is string => !!name && !name.startsWith('More actions'));
}

describe('ClassesHome library shell', () => {
  it('drops the hero line and the readiness tabs', () => {
    renderHome([cls(1)]);
    expect(
      screen.queryByRole('heading', { name: 'Pick up where the energy left off.' }),
    ).toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: 'Pick a discipline. Ritmo lays out the class. You bring the music.',
      }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ready to teach' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Needs work' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Your Classes' })).toBeTruthy();
  });

  it('offers Cycle and Pilates templates and no HIIT tile', () => {
    const onStartTemplate = vi.fn();
    renderHome([cls(1)], { onStartTemplate });
    const templates = screen.getByRole('group', { name: 'Class templates' });
    const tiles = within(templates).getAllByRole('button');
    expect(tiles).toHaveLength(2);
    expect(
      within(templates).getByRole('button', { name: 'Start from the Cycle template' }),
    ).toBeTruthy();
    expect(
      within(templates).getByRole('button', { name: 'Start from the Pilates template' }),
    ).toBeTruthy();
    expect(within(templates).queryByRole('button', { name: /HIIT/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /HIIT/ })).toBeNull();
    fireEvent.click(
      within(templates).getByRole('button', { name: 'Start from the Cycle template' }),
    );
    expect(onStartTemplate).toHaveBeenCalledWith('cycle');
  });

  it('shows readiness as text, with the dot only repeating it', async () => {
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(payload('Class 1'));
    renderHome([cls(1, { title: 'Needs a tempo' })]);
    const label = await screen.findByText('Needs tempo');
    expect(label.className).not.toContain('sr-only');
    const dot = label.parentElement?.querySelector('[data-readiness-dot]');
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
  });

  it('orders Recents by last opened, not last edited', () => {
    renderHome([
      cls(1, { title: 'Edited lately', lastOpenedAt: 100, updatedAt: 9_000 }),
      cls(2, { title: 'Opened lately', lastOpenedAt: 300, updatedAt: 1 }),
      cls(3, { title: 'Never opened', lastOpenedAt: null, updatedAt: 8_000 }),
    ]);
    expect(rowTitles()).toEqual(['Opened lately', 'Edited lately', 'Never opened']);
  });

  it('keeps [QA] classes in All and out of Jump back in', () => {
    renderHome([
      cls(1, { title: '[QA] Session expired', lastOpenedAt: 900 }),
      cls(2, { title: 'Saturday ride', lastOpenedAt: 400 }),
      cls(3, { title: 'Morning ride', lastOpenedAt: 100 }),
    ]);
    const jump = screen.getByRole('region', { name: 'Jump back in' });
    expect(within(jump).queryByText('[QA] Session expired')).toBeNull();
    expect(within(jump).getByText('Saturday ride')).toBeTruthy();
    expect(within(jump).getByRole('button', { name: 'Show all' })).toBeTruthy();
    const recents = screen.getByRole('region', { name: 'Recents' });
    expect(within(recents).getByRole('button', { name: '[QA] Session expired' })).toBeTruthy();
    expect(rowTitles()[0]).toBe('[QA] Session expired');
  });

  it('hides Jump back in when every class is a [QA] class, and All still lists it', () => {
    renderHome([cls(1, { title: '[QA] Import smoke', lastOpenedAt: 50 })]);
    expect(screen.queryByRole('region', { name: 'Jump back in' })).toBeNull();
    expect(screen.getByRole('button', { name: '[QA] Import smoke' })).toBeTruthy();
  });

  it('limits Jump back in to four classes', () => {
    renderHome(
      [1, 2, 3, 4, 5].map((index) =>
        cls(index, { title: `Ride ${index}`, lastOpenedAt: index * 10 }),
      ),
    );
    const jump = screen.getByRole('region', { name: 'Jump back in' });
    expect(within(jump).getAllByRole('button', { name: /^Jump back in to / })).toHaveLength(4);
    expect(within(jump).queryByText('Ride 1')).toBeNull();
    expect(within(jump).getByText('Ride 5')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ride 1' })).toBeTruthy();
  });

  it('keeps templates and hides Jump back in when there are no classes yet', () => {
    renderHome([]);
    expect(screen.getByText('There are no classes yet.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Start from a template' })).toBeTruthy();
    expect(
      screen.getByRole('group', { name: 'Class templates' }).querySelectorAll('button'),
    ).toHaveLength(2);
    expect(screen.queryByRole('region', { name: 'Jump back in' })).toBeNull();
  });

  it('places templates before the class list on a phone, and keeps Create on screen', () => {
    renderHome([cls(1, { title: 'Saturday ride' })]);
    const templates = screen
      .getByRole('heading', { name: 'Start from a template' })
      .closest('section');
    const recents = screen.getByRole('heading', { name: 'Recents' }).closest('section');
    const create = screen.getByRole('button', { name: 'Create' });
    const header = create.closest('header');
    // Phone is one column. Order puts Create, then templates, then the list.
    expect(header?.className).toContain('order-1');
    expect(templates?.className).toContain('order-2');
    expect(recents?.className).toContain('order-3');
    expect(header?.className).toContain('lg:order-none');
    expect(templates?.className).toContain('lg:order-none');
    expect(recents?.className).toContain('lg:order-none');
    const shell = document.querySelector('[data-library-shell]');
    expect(shell?.className).toContain('flex-col');
    expect(shell?.className).toContain('lg:grid');
    expect(header?.className).toContain('sticky');
    expect(create.className).toContain('rf-btn-primary');
  });

  it('opens New class, From a template, and Import a playlist from Create', () => {
    const onStartClass = vi.fn();
    const onImportPlaylist = vi.fn();
    renderHome([cls(1)], { onStartClass, onImportPlaylist });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('button', { name: 'New class' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'From a template' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import a playlist' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'New class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.click(screen.getByRole('button', { name: 'From a template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import a playlist' }));
    expect(onStartClass).toHaveBeenNthCalledWith(1, 'empty');
    expect(onStartClass).toHaveBeenNthCalledWith(2, 'scaffold');
    expect(onImportPlaylist).toHaveBeenCalledTimes(1);
  });

  it('labels the search field and filters the list without hiding [QA] classes from All', () => {
    renderHome(
      [
        cls(1, { title: 'Saturday ride', tags: ['morning'] }),
        cls(2, { title: '[QA] Session expired' }),
      ],
      { knownTags: ['morning'] },
    );
    expect(screen.getByRole('searchbox', { name: 'Search classes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '#morning' })).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search classes' }), {
      target: { value: 'saturday' },
    });
    expect(screen.getByRole('button', { name: 'Saturday ride' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '[QA] Session expired' })).toBeNull();
  });

  it('uses a stored cover and never provider artwork', () => {
    const art = 'https://i.scdn.co/image/provider-art.jpg';
    const cover = 'https://example.com/stored-cover.jpg';
    renderHome([
      cls(1, { title: 'Covered', coverImageUrl: cover, albumArtUrls: [art] }),
      cls(2, { title: 'Gradient', template: 'sculpt', albumArtUrls: [art] }),
    ]);
    expect(document.body.innerHTML).toContain(cover);
    expect(document.body.innerHTML).not.toContain(art);
    const gradient = document.querySelector('[data-cover="type-gradient"]');
    expect(gradient?.getAttribute('data-template')).toBe('sculpt');
    expect(gradient?.className).toContain('from-interactive');
  });

  it('reads every loaded class for the readiness label', async () => {
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) => payload(id));
    renderHome(Array.from({ length: 3 }, (_, index) => cls(index + 1)));
    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(3));
    expect(await screen.findAllByText('Needs tempo')).toHaveLength(3);
  });

  it('keeps a failed detail distinct and retries without hiding the class', async () => {
    vi.mocked(api.getClassShelfPayload).mockRejectedValueOnce(new Error('offline'));
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(payload('Class 1'));
    renderHome([cls(1)]);
    expect(await screen.findByText('Unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Class 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More actions — Class 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry details — Class 1' }));
    expect(await screen.findByText('Needs tempo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More actions — Class 1' }));
    expect(screen.getByRole('button', { name: 'Rehearsal view — Class 1' })).toBeTruthy();
  });

  it('names an unfinished plan as Needs music', async () => {
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(payload('UXF-1'));
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([
      { id: 'b1', position: 0, targetDurationMs: 360_000 } as ClassPlanBlock,
    ]);
    vi.mocked(api.listClassTracks).mockResolvedValue([]);
    renderHome([
      cls(1, {
        title: 'UXF-1',
        trackCount: 0,
        totalDurationMs: 0,
        scaffoldRecipeId: 'cycle_45_v1',
      }),
    ]);
    expect(await screen.findByText('Needs music')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ready to teach' })).toBeNull();
    expect(api.listClassPlanBlocks).toHaveBeenCalledWith(cls(1).id);
    expect(api.listClassTracks).toHaveBeenCalledWith(cls(1).id);
  });

  it('limits concurrent detail requests to two', async () => {
    const releases: Array<(value: RunPayload) => void> = [];
    vi.mocked(api.getClassShelfPayload).mockImplementation(
      () =>
        new Promise<RunPayload>((resolve) => {
          releases.push(resolve);
        }),
    );
    renderHome([
      cls(1, { title: 'First', lastOpenedAt: 2 }),
      cls(2, { title: 'Second', lastOpenedAt: 1 }),
    ]);
    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(2));
    expect(rowTitles()).toEqual(['First', 'Second']);
    releases[0]?.(payload('First'));
    releases[1]?.(payload('Second'));
    await screen.findAllByText('Needs tempo');
    expect(rowTitles()).toEqual(['First', 'Second']);
  });
});
