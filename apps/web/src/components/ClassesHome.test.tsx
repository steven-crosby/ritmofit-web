// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClassListItem, ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import { ClassesHome, ORGANIZE_THRESHOLD } from './ClassesHome.js';
import * as api from '../lib/api.js';

vi.mock('../lib/api.js');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

function cls(index: number, over: Partial<ClassListItem> = {}): ClassListItem {
  return {
    id: `00000000-0000-4000-8000-00000000000${index}`,
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

function readyPayload(): RunPayload {
  return {
    class: { title: 'Finished class', totalDurationMs: 60_000 },
    tracks: [
      {
        classTrackId: 'ready-track',
        position: 0,
        intensity: 'hard',
        track: { durationMs: 60_000 },
        providerRefs: [{ provider: 'spotify' }],
        cues: [{ id: 'cue-1' }],
        moves: [{ id: 'move-1' }],
        displayBpm: 128,
      },
    ],
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
      onSelectTag={() => {}}
      onClearTag={() => {}}
      onRetry={() => {}}
      onLoadMore={() => {}}
      onStartClass={options.onStartClass ?? (() => {})}
    />,
  );
}

describe('ClassesHome', () => {
  it('states the empty library as a discipline-first start', () => {
    const onStartClass = vi.fn();
    renderHome([], { onStartClass });
    expect(
      screen.getByRole('heading', {
        name: 'Pick a discipline. Ritmo lays out the class. You bring the music.',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start a class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start empty' }));
    expect(onStartClass).toHaveBeenCalledTimes(2);
    expect(onStartClass).toHaveBeenNthCalledWith(1);
    expect(onStartClass).toHaveBeenNthCalledWith(2, 'empty');
    expect(screen.queryByRole('button', { name: /Start Cycle, Pilates, or HIIT/ })).toBeNull();
  });

  it('limits concurrent detail requests to two and ranks before the pool settles', async () => {
    const releases: Array<(value: RunPayload) => void> = [];
    vi.mocked(api.getClassShelfPayload).mockImplementation(
      () =>
        new Promise<RunPayload>((resolve) => {
          releases.push(resolve);
        }),
    );
    const finished = { ...cls(1), title: 'Finished class' };
    const unfinished = { ...cls(2), title: 'Unfinished class' };
    renderHome([unfinished, finished]);

    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(2));
    expect(
      screen
        .getAllByRole('button', { name: /^(Finished class|Unfinished class)$/ })
        .map((node) => node.textContent),
    ).toEqual(['Unfinished class', 'Finished class']);

    releases[1]?.(readyPayload());
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('button', { name: /^(Finished class|Unfinished class)$/ })
          .map((node) => node.textContent),
      ).toEqual(['Finished class', 'Unfinished class']),
    );
    expect(api.getClassShelfPayload).toHaveBeenCalledTimes(2);
  });

  it('reads every loaded class, not a twelve-class shelf pool', async () => {
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) => payload(id));
    const many = Array.from({ length: 14 }, (_, index) => cls(index));
    renderHome(many);
    await waitFor(() => expect(api.getClassShelfPayload).toHaveBeenCalledTimes(14));
  });

  it('keeps a failed detail distinct and retries without hiding the class', async () => {
    vi.mocked(api.getClassShelfPayload).mockRejectedValueOnce(new Error('offline'));
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(payload('Class 1'));
    renderHome([cls(1)]);
    expect(await screen.findByText('The class remains in your library.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Class 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More actions — Class 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry details — Class 1' }));
    expect(
      await screen.findByRole('button', { name: 'Add the missing tempo — Class 1' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More actions — Class 1' }));
    expect(screen.getByRole('button', { name: 'Rehearsal view — Class 1' })).toBeTruthy();
  });

  it('keeps Start empty on the list home', async () => {
    vi.mocked(api.getClassShelfPayload).mockResolvedValue(payload('Class 1'));
    const onStartClass = vi.fn();
    renderHome([cls(1)], { onStartClass });
    await screen.findByRole('heading', { name: 'Pick up where the energy left off.' });
    fireEvent.click(screen.getByRole('button', { name: 'Start empty' }));
    expect(onStartClass).toHaveBeenCalledWith('empty');
  });

  it('puts the copper verb on the top row only', async () => {
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) =>
      id.endsWith('1') ? readyPayload() : payload('unfinished'),
    );
    const finished = { ...cls(1), title: 'Finished class' };
    const unfinished = { ...cls(2), title: 'Unfinished class' };
    const onOpen = vi.fn();
    const onPreview = vi.fn();
    renderHome([finished, unfinished], { onOpen, onPreview });

    expect(await screen.findByRole('button', { name: 'Open class — Finished class' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Add the missing tempo — Unfinished class' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open class — Finished class' }));
    fireEvent.click(screen.getByRole('button', { name: 'More actions — Unfinished class' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rehearsal view — Unfinished class' }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: finished.id }));
    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ id: unfinished.id }));
  });

  it('hides organize controls at eight loaded classes and shows them at nine', async () => {
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) => payload(id));
    const eight = Array.from({ length: ORGANIZE_THRESHOLD }, (_, index) => cls(index));
    const { rerender } = renderHome(eight);
    await screen.findByRole('heading', { name: 'Pick up where the energy left off.' });
    expect(screen.queryByRole('searchbox')).toBeNull();

    const nine = [...eight, cls(8)];
    rerender(
      <ClassesHome
        classes={nine}
        status="ready"
        libraryError={null}
        activeTag={null}
        knownTags={[]}
        hasMore={false}
        loadingMore={false}
        onOpen={() => {}}
        onPreview={() => {}}
        onDuplicate={async () => {}}
        onSelectTag={() => {}}
        onClearTag={() => {}}
        onRetry={() => {}}
        onLoadMore={() => {}}
        onStartClass={() => {}}
      />,
    );
    expect(await screen.findByRole('searchbox')).toBeTruthy();
    expect(screen.getByLabelText('Filter classes by tag')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ready to teach' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'title' } });
    expect(screen.queryByRole('button', { name: 'Ready to teach' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Needs work' })).toBeNull();
    expect(screen.getByText('Sorted by Title A–Z.')).toBeTruthy();
  });

  it('names a 0-track scaffold as plan work, not an empty draft', async () => {
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

    expect(
      await screen.findByRole('button', { name: 'Add music to the plan — UXF-1' }),
    ).toBeTruthy();
    expect(await screen.findByText('Block 1 still needs music')).toBeTruthy();
    expect(screen.queryByText('Empty draft')).toBeNull();
    expect(api.listClassPlanBlocks).toHaveBeenCalledWith(cls(1).id);
    expect(api.listClassTracks).toHaveBeenCalledWith(cls(1).id);
  });

  it('leaves a true empty class on Add the first track', async () => {
    vi.mocked(api.getClassShelfPayload).mockResolvedValue({
      class: { title: 'Empty HIIT', totalDurationMs: 0 },
      tracks: [],
    } as unknown as RunPayload);
    renderHome([cls(1, { title: 'Empty HIIT', trackCount: 0, totalDurationMs: 0 })]);

    expect(
      await screen.findByRole('button', { name: 'Add the first track — Empty HIIT' }),
    ).toBeTruthy();
    expect(screen.getByText('Empty draft')).toBeTruthy();
    expect(api.listClassPlanBlocks).not.toHaveBeenCalled();
    expect(api.listClassTracks).not.toHaveBeenCalled();
  });

  it('keeps a mid-build scaffold on the plan instead of Add the missing tempo', async () => {
    const blockId = '00000000-0000-4000-8000-0000000000b1';
    const emptyId = '00000000-0000-4000-8000-0000000000b2';
    vi.mocked(api.getClassShelfPayload).mockImplementation(async (id: string) =>
      id.endsWith('1') ? readyPayload() : payload('mid-build'),
    );
    vi.mocked(api.listClassPlanBlocks).mockResolvedValue([
      { id: blockId, position: 0, targetDurationMs: 360_000 } as ClassPlanBlock,
      { id: emptyId, position: 1, targetDurationMs: 360_000 } as ClassPlanBlock,
    ]);
    vi.mocked(api.listClassTracks).mockResolvedValue([
      {
        id: 'mid-build-track-0',
        planBlockId: blockId,
      } as ClassTrack,
    ]);
    const finished = { ...cls(1), title: 'Finished class' };
    const midBuild = cls(2, {
      title: 'UXF mid-build',
      scaffoldRecipeId: 'cycle_45_v1',
      trackCount: 2,
    });
    renderHome([finished, midBuild]);

    expect(await screen.findByRole('button', { name: 'Open class — Finished class' })).toBeTruthy();
    expect(await screen.findByText('Block 2 still needs music')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Add the missing tempo — UXF mid-build' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More actions — UXF mid-build' }));
    expect(screen.getByRole('button', { name: 'Rehearsal view — UXF mid-build' })).toBeTruthy();
    expect(api.listClassPlanBlocks).toHaveBeenCalledWith(midBuild.id);
    expect(api.listClassPlanBlocks).not.toHaveBeenCalledWith(finished.id);
  });
});
