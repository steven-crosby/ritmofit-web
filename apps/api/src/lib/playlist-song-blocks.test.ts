import { describe, expect, it } from 'vitest';
import {
  PLAYLIST_SONG_BLOCK_CAP,
  PLAYLIST_SONG_BLOCK_KEY,
  importClassTracksSchema,
  playlistSongBlockDraft,
  playlistSongEditClearsKey,
  playlistSongGuidance,
  playlistSongIdentifier,
  songBlockIdsToDelete,
  songBlockWriteMode,
  type ClassPlanBlockGuidance,
} from '@ritmofit/shared';

const cycle = {
  mode: 'replace' as const,
  template: 'cycle' as const,
  durationMs: 180_000,
};

const storedGuidance: ClassPlanBlockGuidance = {
  kind: 'cycle',
  posture: 'mixed',
  cadenceMinRpm: 1,
  cadenceMaxRpm: 1,
  rpeMin: 1,
  rpeMax: 1,
};

const marked = {
  recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
  teachingGoal: 'Arrive',
  movementFocus: 'Arrive',
  intensity: 'none',
  targetDurationMs: 180_000,
  guidance: storedGuidance,
};

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('playlist song block labels', () => {
  it('labels one song as warm-up only', () => {
    const block = playlistSongBlockDraft({ ...cycle, title: 'Arrive', index: 0, count: 1 });
    expect(block).toMatchObject({
      recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY,
      label: 'Warm-up',
      segmentType: 'warm_up',
      teachingGoal: 'Arrive',
      movementFocus: 'Arrive',
      intensity: 'none',
      targetDurationMs: 180_000,
    });
    expect(block.guidance).toEqual(playlistSongGuidance('cycle', 'Arrive'));
  });

  it('labels two songs as warm-up then cooldown', () => {
    const blocks = ['A', 'B'].map((title, index) =>
      playlistSongBlockDraft({ ...cycle, title, index, count: 2, template: null }),
    );
    expect(blocks.map((block) => [block.label, block.segmentType])).toEqual([
      ['Warm-up', 'warm_up'],
      ['Cooldown', 'cool_down'],
    ]);
    expect(blocks[0]!.guidance).toEqual({ kind: 'pilates', optionalEquipment: [] });
  });

  it('labels three songs as warm-up, title, then cooldown', () => {
    const titles = ['Opener', 'The Climb', 'Closer'];
    const blocks = titles.map((title, index) =>
      playlistSongBlockDraft({
        ...cycle,
        title,
        index,
        count: 3,
        template: 'hiit',
        durationMs: index === 1 ? null : 90_000,
      }),
    );
    expect(blocks.map((block) => [block.label, block.segmentType, block.targetDurationMs])).toEqual(
      [
        ['Warm-up', 'warm_up', 90_000],
        ['The Climb', null, 60_000],
        ['Cooldown', 'cool_down', 90_000],
      ],
    );
    expect(blocks[1]!.guidance).toEqual({
      kind: 'hiit',
      workMs: null,
      recoveryMs: null,
      rounds: null,
      sequenceFocus: 'The Climb',
      equipment: 'bodyweight',
    });
    expect(blocks[1]!.teachingGoal).toBe('The Climb');
  });

  it('cuts a middle label at 100 characters and the stored title at 500', () => {
    const title = `${'a'.repeat(120)} ${'b'.repeat(400)}`;
    expect(playlistSongIdentifier(title, 4)).toHaveLength(500);
    const block = playlistSongBlockDraft({
      ...cycle,
      title,
      index: 1,
      count: 3,
      mode: 'append',
    });
    expect(block.label).toHaveLength(100);
    expect(block.teachingGoal).toHaveLength(500);
    expect(block.label).toBe(block.teachingGoal.slice(0, 100));
    expect(block.segmentType).toBeNull();
  });

  it('names a blank title Song N from its 1-based place in this write', () => {
    expect(playlistSongIdentifier(' \n\t ', 0)).toBe('Song 1');
    expect(playlistSongIdentifier('   ', 2)).toBe('Song 3');
    const block = playlistSongBlockDraft({
      ...cycle,
      title: '   ',
      index: 2,
      count: 4,
      mode: 'append',
    });
    expect(block.label).toBe('Song 3');
    expect(block.teachingGoal).toBe('Song 3');
  });

  it('collapses whitespace before the label cut', () => {
    const block = playlistSongBlockDraft({
      ...cycle,
      title: '  Hello   there \n now  ',
      index: 1,
      count: 3,
    });
    expect(block.label).toBe('Hello there now');
    expect(block.teachingGoal).toBe('Hello there now');
  });

  it('keeps song titles on every appended block, including the first and last', () => {
    const blocks = ['A', 'B'].map((title, index) =>
      playlistSongBlockDraft({ ...cycle, title, index, count: 2, mode: 'append' }),
    );
    expect(blocks.map((block) => [block.label, block.segmentType])).toEqual([
      ['A', null],
      ['B', null],
    ]);
  });

  it('uses the Pilates guidance object for sculpt and tread', () => {
    expect(playlistSongGuidance('sculpt', 'Mat')).toEqual({
      kind: 'pilates',
      optionalEquipment: [],
    });
    expect(playlistSongGuidance('tread', 'Run')).toEqual({
      kind: 'pilates',
      optionalEquipment: [],
    });
  });
});

describe('playlist song block replace and append', () => {
  it('replaces an empty recipe and appends once any authored block or song exists', () => {
    expect(songBlockWriteMode(0, [])).toBe('replace');
    expect(
      songBlockWriteMode(0, [{ recipeBlockKey: 'cycle_warmup' }, { recipeBlockKey: 'cycle_end' }]),
    ).toBe('replace');
    expect(songBlockWriteMode(0, [{ recipeBlockKey: null }])).toBe('append');
    expect(songBlockWriteMode(0, [{ recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY }])).toBe('append');
    expect(songBlockWriteMode(1, [{ recipeBlockKey: 'cycle_warmup' }])).toBe('append');
  });

  it('deletes only empty non-playlist recipe blocks on append', () => {
    const blocks = [
      { id: 'recipe-with-song', recipeBlockKey: 'cycle_warmup', trackCount: 1 },
      { id: 'empty-recipe', recipeBlockKey: 'cycle_end', trackCount: 0 },
      { id: 'song-block', recipeBlockKey: PLAYLIST_SONG_BLOCK_KEY, trackCount: 0 },
      { id: 'instructor', recipeBlockKey: null, trackCount: 0 },
    ];
    expect(songBlockIdsToDelete('append', blocks)).toEqual(['empty-recipe']);
    expect(songBlockIdsToDelete('replace', blocks).sort()).toEqual(
      ['empty-recipe', 'instructor', 'recipe-with-song', 'song-block'].sort(),
    );
  });
});

describe('playlist song block edits', () => {
  it('keeps the marker for a label-only save and for identical teaching fields', () => {
    expect(playlistSongEditClearsKey(marked, {})).toBe(false);
    expect(playlistSongEditClearsKey(marked, { teachingGoal: 'Arrive' })).toBe(false);
    expect(playlistSongEditClearsKey(marked, { guidance: { ...storedGuidance } })).toBe(false);
    expect(
      playlistSongEditClearsKey({ ...marked, recipeBlockKey: null }, { intensity: 'hard' }),
    ).toBe(false);
  });

  it('clears the marker when teaching text, guidance, intensity, or planned time changes', () => {
    expect(playlistSongEditClearsKey(marked, { teachingGoal: 'Coach the climb' })).toBe(true);
    expect(playlistSongEditClearsKey(marked, { movementFocus: 'Standing' })).toBe(true);
    expect(playlistSongEditClearsKey(marked, { intensity: 'mod' })).toBe(true);
    expect(playlistSongEditClearsKey(marked, { targetDurationMs: 120_000 })).toBe(true);
    expect(
      playlistSongEditClearsKey(marked, {
        guidance: { ...storedGuidance, posture: 'seated' },
      }),
    ).toBe(true);
  });
});

describe('importClassTracksSchema songBlocks', () => {
  const body = (count: number, extra: Record<string, unknown> = {}) => {
    const placements = Array.from({ length: count }, (_, index) => ({
      id: uuid(index + 1),
      trackId: uuid(index + 100),
    }));
    return {
      operationId: uuid(900),
      expectedTracks: [],
      placements,
      orderedIds: placements.map((placement) => placement.id),
      ...extra,
    };
  };

  it('accepts 15 song-block placements and still allows 100 without the flag', () => {
    expect(importClassTracksSchema.safeParse({ ...body(15), songBlocks: true }).success).toBe(true);
    expect(importClassTracksSchema.safeParse(body(16)).success).toBe(true);
    expect(importClassTracksSchema.safeParse(body(100)).success).toBe(true);
    expect(importClassTracksSchema.safeParse(body(101)).success).toBe(false);
  });

  it('rejects more than 15 song-block placements and a combined planBlockId', () => {
    const tooMany = importClassTracksSchema.safeParse({ ...body(16), songBlocks: true });
    expect(tooMany.success).toBe(false);
    const combined = importClassTracksSchema.safeParse({
      ...body(1),
      songBlocks: true,
      planBlockId: uuid(50),
    });
    expect(combined.success).toBe(false);
    expect(importClassTracksSchema.safeParse({ ...body(1), songBlocks: false }).success).toBe(
      false,
    );
    expect(importClassTracksSchema.safeParse({ ...body(1), planBlockId: uuid(50) }).success).toBe(
      true,
    );
    expect(PLAYLIST_SONG_BLOCK_CAP).toBe(15);
  });
});
