import { describe, expect, it } from 'vitest';
import type { ClassPlanBlock, ClassTrack, RunPayload } from '@ritmofit/shared';
import { classNextStep, type ClassDetailState } from './class-ordering.js';
import { creationNextStep } from './creation-next-step.js';

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

function block(id: string, position: number, targetMs: number): ClassPlanBlock {
  return { id, position, targetDurationMs: targetMs } as ClassPlanBlock;
}

function ready(tracks: RunPayload['tracks'] = []): ClassDetailState {
  return {
    status: 'ready',
    payload: {
      class: { title: 'Class', totalDurationMs: 180_000 * tracks.length },
      tracks,
    } as unknown as RunPayload,
  };
}

describe('creationNextStep', () => {
  it('names a 0-track scaffold as plan work, not an empty draft', () => {
    const step = creationNextStep({ scaffoldRecipeId: 'cycle_45_v1', trackCount: 0 }, ready());
    expect(step.action).toBe('Add music to the plan');
    expect(step.detail).toBe('Teaching plan · no music yet');
    expect(step.teachable).toBe(false);
    expect(classNextStep(ready()).detail).toBe('Empty draft');
  });

  it('leaves a true empty class on Add the first track', () => {
    const step = creationNextStep({ scaffoldRecipeId: null, trackCount: 0 }, ready());
    expect(step.action).toBe('Add the first track');
    expect(step.detail).toBe('Empty draft');
  });

  it('lets an unfinished plan outrank Live tempo on a mid-build scaffold', () => {
    const payloadTracks = [
      {
        classTrackId: '00000000-0000-4000-8000-0000000000a2',
        track: { durationMs: 180_000 },
        intensity: 'mod' as const,
        displayBpm: null,
        providerRefs: [{ provider: 'spotify' }],
        cues: [],
        moves: [],
      },
    ];
    const step = creationNextStep(
      { scaffoldRecipeId: 'cycle_45_v1', trackCount: 1 },
      ready(payloadTracks as unknown as RunPayload['tracks']),
      {
        blocks: [block(blockId, 0, 360_000), block(otherBlockId, 1, 360_000)],
        tracks: [track('00000000-0000-4000-8000-0000000000a2', otherBlockId)],
      },
    );
    expect(step.action).toBe('Add music to the plan');
    expect(step.detail).toBe('Block 1 still needs music');
    expect(step.workRank).toBe(0);
    expect(classNextStep(ready(payloadTracks as unknown as RunPayload['tracks'])).action).toBe(
      'Add the missing tempo',
    );
  });

  it('falls through to Live readiness once the plan is filled', () => {
    const payloadTracks = [
      {
        classTrackId: '00000000-0000-4000-8000-0000000000a1',
        track: { durationMs: 180_000 },
        intensity: 'mod' as const,
        displayBpm: null,
        providerRefs: [{ provider: 'spotify' }],
        cues: [],
        moves: [],
      },
    ];
    const step = creationNextStep(
      { scaffoldRecipeId: 'cycle_45_v1', trackCount: 1 },
      ready(payloadTracks as unknown as RunPayload['tracks']),
      {
        blocks: [block(blockId, 0, 360_000)],
        tracks: [track('00000000-0000-4000-8000-0000000000a1', blockId)],
      },
    );
    expect(step.action).toBe('Add the missing tempo');
  });
});
