import { describe, expect, it } from 'vitest';
import type { ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import {
  DEFAULT_SCAFFOLD_DURATION,
  guidanceSummary,
  planBlockActualMs,
  planBlockFit,
  planFitLabel,
  nextEmptyPlanBlock,
  planNextStep,
  scaffoldRecipeId,
  tracksForPlanBlock,
  unassignedClassTracks,
} from './class-scaffold.js';

const blockId = '00000000-0000-4000-8000-0000000000b1';
const otherBlockId = '00000000-0000-4000-8000-0000000000b2';

function track(id: string, planBlockId: string | null): ClassTrack {
  return {
    id,
    classId: '00000000-0000-4000-8000-0000000000c1',
    trackId: '00000000-0000-4000-8000-0000000000t1',
    planBlockId,
    position: 0,
    intensity: 'mod',
    displayBpmOverride: null,
    durationMsOverride: null,
    clipStartMs: 0,
    clipEndMs: null,
    beatAnchorMs: 0,
    startOffsetMs: 0,
    notes: null,
    displayRpm: null,
    holdCount: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('scaffoldRecipeId', () => {
  it('maps discipline and duration onto the immutable v1 recipes', () => {
    expect(scaffoldRecipeId('cycle', 30)).toBe('cycle_30_v1');
    expect(scaffoldRecipeId('sculpt', DEFAULT_SCAFFOLD_DURATION)).toBe('pilates_45_v1');
    expect(scaffoldRecipeId('hiit', 60)).toBe('hiit_60_v1');
  });
});

describe('plan-block grouping and duration', () => {
  const tracks = [
    track('00000000-0000-4000-8000-0000000000a1', blockId),
    track('00000000-0000-4000-8000-0000000000a2', otherBlockId),
    track('00000000-0000-4000-8000-0000000000a3', null),
  ];

  it('groups assigned tracks and leaves copies unassigned', () => {
    expect(tracksForPlanBlock(blockId, tracks).map((row) => row.id)).toEqual([
      '00000000-0000-4000-8000-0000000000a1',
    ]);
    expect(unassignedClassTracks(tracks).map((row) => row.id)).toEqual([
      '00000000-0000-4000-8000-0000000000a3',
    ]);
  });

  it('sums payload effective durations for assigned tracks only', () => {
    const payload = {
      tracks: [
        {
          classTrackId: '00000000-0000-4000-8000-0000000000a1',
          track: { durationMs: 180_000 },
        },
        {
          classTrackId: '00000000-0000-4000-8000-0000000000a2',
          track: { durationMs: 240_000 },
        },
      ],
    } as RunPayload;

    expect(planBlockActualMs(blockId, tracks, payload)).toBe(180_000);
    expect(planBlockActualMs(blockId, tracks, null)).toBe(0);
  });

  it('keeps planned and actual durations independent', () => {
    expect(planBlockFit(360_000, 180_000)).toEqual({
      targetMs: 360_000,
      actualMs: 180_000,
      deltaMs: -180_000,
      fit: 'under',
    });
    expect(planBlockFit(360_000, 420_000).fit).toBe('over');
    expect(planFitLabel('on_plan', '0:00')).toBe('On plan');
    expect(planFitLabel('under', '3:00')).toBe('3:00 under');
    expect(planFitLabel('over', '1:00')).toBe('1:00 over');
  });
});

describe('planNextStep', () => {
  const block = (id: string, position: number, targetMs: number): ClassPlanBlock =>
    ({
      id,
      position,
      targetDurationMs: targetMs,
    }) as ClassPlanBlock;

  it('leads with unassigned, then empty blocks, then overflow', () => {
    const blocks = [block(blockId, 0, 360_000), block(otherBlockId, 1, 360_000)];
    const payload = {
      tracks: [
        { classTrackId: '00000000-0000-4000-8000-0000000000a1', track: { durationMs: 180_000 } },
        { classTrackId: '00000000-0000-4000-8000-0000000000a2', track: { durationMs: 480_000 } },
      ],
    } as RunPayload;

    expect(
      planNextStep(blocks, [track('00000000-0000-4000-8000-0000000000a3', null)], payload),
    ).toBe('1 song is not in a plan block');
    expect(
      planNextStep(blocks, [track('00000000-0000-4000-8000-0000000000a2', otherBlockId)], payload),
    ).toBe('Block 1 still needs music');
    expect(
      planNextStep(
        blocks,
        [
          track('00000000-0000-4000-8000-0000000000a1', blockId),
          track('00000000-0000-4000-8000-0000000000a2', otherBlockId),
        ],
        payload,
      ),
    ).toBe('Block 2 is 2:00 over');
    expect(planNextStep(blocks, [], null)).toBe('2 blocks still need music');
  });

  it('stays quiet when every block has music and none overflow', () => {
    const blocks = [block(blockId, 0, 360_000)];
    const payload = {
      tracks: [
        { classTrackId: '00000000-0000-4000-8000-0000000000a1', track: { durationMs: 180_000 } },
      ],
    } as RunPayload;
    expect(
      planNextStep(blocks, [track('00000000-0000-4000-8000-0000000000a1', blockId)], payload),
    ).toBe(null);
  });
});

describe('nextEmptyPlanBlock', () => {
  const block = (id: string, position: number, targetMs: number): ClassPlanBlock =>
    ({
      id,
      position,
      targetDurationMs: targetMs,
    }) as ClassPlanBlock;

  it('returns the first empty block and can skip the one just filled', () => {
    const first = block(blockId, 0, 360_000);
    const second = block(otherBlockId, 1, 360_000);
    const blocks = [second, first];
    expect(nextEmptyPlanBlock(blocks, [], null)?.id).toBe(blockId);
    expect(nextEmptyPlanBlock(blocks, [], null, blockId)?.id).toBe(otherBlockId);
    expect(
      nextEmptyPlanBlock(blocks, [track('00000000-0000-4000-8000-0000000000a1', blockId)], {
        tracks: [
          {
            classTrackId: '00000000-0000-4000-8000-0000000000a1',
            track: { durationMs: 180_000 },
          },
        ],
      } as RunPayload)?.id,
    ).toBe(otherBlockId);
    expect(nextEmptyPlanBlock([first], [track(blockId, blockId)], null, blockId)).toBeNull();
  });
});

describe('guidanceSummary', () => {
  it('renders discipline-specific planning guidance without cues or moves', () => {
    const cycle = {
      guidance: {
        kind: 'cycle',
        posture: 'seated',
        cadenceMinRpm: 80,
        cadenceMaxRpm: 95,
        rpeMin: 2,
        rpeMax: 3,
      },
    } as ClassPlanBlock;
    const pilates = {
      guidance: { kind: 'pilates', optionalEquipment: ['mat', 'band'] },
    } as ClassPlanBlock;
    const hiit = {
      guidance: {
        kind: 'hiit',
        workMs: 30_000,
        recoveryMs: 30_000,
        rounds: 6,
        sequenceFocus: 'Lower body, upper body, locomotion, trunk.',
        equipment: 'bodyweight',
      },
    } as ClassPlanBlock;

    expect(guidanceSummary(cycle)).toBe('Seated · 80–95 rpm · RPE 2–3');
    expect(guidanceSummary(pilates)).toBe('Mat · Band');
    expect(guidanceSummary(hiit)).toContain('30/30');
    expect(guidanceSummary(hiit)).toContain('6 rounds');
  });
});
