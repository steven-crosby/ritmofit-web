import { describe, expect, it } from 'vitest';
import type { ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import {
  classTargetGap,
  classTargetGapLabel,
  DEFAULT_SCAFFOLD_DURATION,
  formatPlannedDurationInput,
  hiitIntervalMismatch,
  hiitIntervalTotalMs,
  parsePlannedDuration,
  planTotalMs,
  guidanceSummary,
  planBlockActualMs,
  planBlockDetailLine,
  planBlockFit,
  planFitLabel,
  nextEmptyPlanBlock,
  planNextStep,
  scaffoldRecipeId,
  syncHiitSequenceFocus,
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
  it('maps discipline and duration onto the current recipe versions', () => {
    expect(scaffoldRecipeId('cycle', 30)).toBe('cycle_30_v2');
    expect(scaffoldRecipeId('sculpt', DEFAULT_SCAFFOLD_DURATION)).toBe('pilates_45_v1');
    expect(scaffoldRecipeId('hiit', 60)).toBe('hiit_60_v2');
    expect(scaffoldRecipeId('hiit', 30)).toBe('hiit_30_v1');
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
    expect(
      planNextStep(blocks, [track('00000000-0000-4000-8000-0000000000a1', blockId)], null),
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
    expect(nextEmptyPlanBlock(blocks, [track(blockId, blockId)], null)?.id).toBe(otherBlockId);
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
    expect(guidanceSummary(pilates)).toBe('Optional band');
    expect(guidanceSummary(hiit)).toBe('30/30 · 6 rounds');
  });

  it('says mixed posture plainly — the peak is not a seated block', () => {
    const block = {
      guidance: {
        kind: 'cycle',
        posture: 'mixed',
        cadenceMinRpm: 85,
        cadenceMaxRpm: 105,
        rpeMin: 8,
        rpeMax: 9,
      },
    } as ClassPlanBlock;
    expect(guidanceSummary(block)).toBe('Mixed · 85–105 rpm · RPE 8–9');
  });

  it('marks Pilates props optional and leaves the mat implied', () => {
    const block = (optionalEquipment: string[]) =>
      ({ guidance: { kind: 'pilates', optionalEquipment } }) as ClassPlanBlock;
    expect(guidanceSummary(block(['mat']))).toBe('');
    expect(guidanceSummary(block(['mat', 'light_weights']))).toBe('Optional light weights');
  });

  it('never repeats the HIIT focus that the card already shows', () => {
    const focus = 'Unilateral legs, upper body, trunk, and locomotion.';
    const timed = {
      movementFocus: focus,
      guidance: {
        kind: 'hiit',
        workMs: 30_000,
        recoveryMs: 30_000,
        rounds: 9,
        sequenceFocus: focus,
        equipment: 'dumbbells_optional',
      },
    } as ClassPlanBlock;
    const continuous = {
      movementFocus: 'Walk, breathe, and review the next sequence.',
      guidance: {
        kind: 'hiit',
        workMs: null,
        recoveryMs: null,
        rounds: null,
        sequenceFocus: 'Walk, breathe, and review the next sequence.',
        equipment: 'bodyweight',
      },
    } as ClassPlanBlock;

    expect(planBlockDetailLine(timed)).toBe(`${focus} · 30/30 · 9 rounds · Optional dumbbells`);
    expect(planBlockDetailLine(continuous)).toBe(
      'Walk, breathe, and review the next sequence. · Continuous',
    );
  });

  it('drops the separator when a block has no extra guidance', () => {
    const matOnly = {
      movementFocus: 'Breath with neutral alignment.',
      guidance: { kind: 'pilates', optionalEquipment: ['mat'] },
    } as ClassPlanBlock;
    expect(planBlockDetailLine(matOnly)).toBe('Breath with neutral alignment.');
  });
});

describe('planned time editing helpers', () => {
  const hiit = {
    kind: 'hiit' as const,
    workMs: 30_000,
    recoveryMs: 30_000,
    rounds: 9,
    sequenceFocus: 'Lower body, upper body, locomotion, trunk.',
    equipment: 'bodyweight' as const,
  };

  it('sums planned block time independently of the class target', () => {
    const blocks = [
      { targetDurationMs: 360_000 },
      { targetDurationMs: 540_000 },
    ] as ClassPlanBlock[];
    expect(planTotalMs(blocks)).toBe(900_000);
    expect(planTotalMs([])).toBe(0);
  });

  it('reports the class-target gap in both directions, and none without a target', () => {
    expect(classTargetGap(null, 900_000)).toBeNull();
    expect(classTargetGap(2_700_000, 2_700_000)).toEqual({ deltaMs: 0, fit: 'on_plan' });
    expect(classTargetGap(2_700_000, 2_820_000)).toEqual({ deltaMs: 120_000, fit: 'over' });
    expect(classTargetGap(2_700_000, 2_640_000)).toEqual({ deltaMs: -60_000, fit: 'under' });
    expect(classTargetGapLabel('on_plan', '0:00')).toBe('On target');
    expect(classTargetGapLabel('over', '2:00')).toBe('2:00 over target');
    expect(classTargetGapLabel('under', '1:00')).toBe('1:00 under target');
  });

  it('totals timed HIIT intervals and ignores continuous or non-HIIT guidance', () => {
    expect(hiitIntervalTotalMs(hiit)).toBe(540_000);
    expect(hiitIntervalTotalMs({ ...hiit, rounds: null, workMs: null, recoveryMs: null })).toBe(
      null,
    );
    expect(hiitIntervalTotalMs({ kind: 'pilates', optionalEquipment: [] })).toBeNull();
  });

  it('flags a HIIT mismatch with both totals and never when they agree', () => {
    expect(hiitIntervalMismatch(hiit, 540_000)).toBeNull();
    expect(hiitIntervalMismatch(hiit, 600_000)).toEqual({
      intervalMs: 540_000,
      plannedMs: 600_000,
    });
    expect(hiitIntervalMismatch({ ...hiit, rounds: 10 }, 540_000)).toEqual({
      intervalMs: 600_000,
      plannedMs: 540_000,
    });
  });

  it('parses m:ss and whole minutes, rejecting zero, junk, and out-of-range values', () => {
    expect(parsePlannedDuration('6:30')).toBe(390_000);
    expect(parsePlannedDuration(' 12 ')).toBe(720_000);
    expect(parsePlannedDuration('0:45')).toBe(45_000);
    expect(parsePlannedDuration('90:00')).toBe(5_400_000);
    for (const bad of ['', '0', '0:00', '6:60', '6:5', '-1', '1.5', 'abc', '1441']) {
      expect(parsePlannedDuration(bad)).toBeNull();
    }
    expect(parsePlannedDuration('1440')).toBe(86_400_000);
  });

  it('formats the field value as minutes and seconds, even past an hour', () => {
    expect(formatPlannedDurationInput(390_000)).toBe('6:30');
    expect(formatPlannedDurationInput(5_400_000)).toBe('90:00');
    expect(parsePlannedDuration(formatPlannedDurationInput(5_400_000))).toBe(5_400_000);
  });
});

describe('syncHiitSequenceFocus', () => {
  const hiit = {
    kind: 'hiit' as const,
    workMs: null,
    recoveryMs: null,
    rounds: null,
    sequenceFocus: 'Walk and breathe.',
    equipment: 'bodyweight' as const,
  };

  it('copies an edited focus into HIIT guidance', () => {
    expect(syncHiitSequenceFocus(hiit, 'Walk, breathe, reset.')).toEqual({
      ...hiit,
      sequenceFocus: 'Walk, breathe, reset.',
    });
  });

  it('returns the same object when there is nothing to sync', () => {
    const cycle = {
      kind: 'cycle' as const,
      posture: 'seated' as const,
      cadenceMinRpm: 80,
      cadenceMaxRpm: 95,
      rpeMin: 2,
      rpeMax: 3,
    };
    expect(syncHiitSequenceFocus(hiit, undefined)).toBe(hiit);
    expect(syncHiitSequenceFocus(hiit, 'Walk and breathe.')).toBe(hiit);
    expect(syncHiitSequenceFocus(cycle, 'Anything.')).toBe(cycle);
  });
});
