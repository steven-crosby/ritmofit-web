import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCAFFOLD_RECIPES,
  generateScaffold,
  scaffoldRecipeIdValues,
  type ClassPlanBlock,
} from '@ritmofit/shared';

const minutes = (blocks: Pick<ClassPlanBlock, 'targetDurationMs'>[]) =>
  blocks.map((block) => block.targetDurationMs / 60_000);

describe('generateScaffold', () => {
  it.each(scaffoldRecipeIdValues)(
    '%s materializes ordered, uniquely keyed blocks with an exact total',
    (id) => {
      const scaffold = generateScaffold(id);
      const advertisedMinutes = Number(id.split('_')[1]);
      const count = scaffold.blocks.length;

      expect(count).toBe(id.startsWith('cycle_') && id.endsWith('_v2') ? 8 : 7);
      expect(scaffold.blocks.map((block) => block.position)).toEqual([...Array(count).keys()]);
      expect(new Set(scaffold.blocks.map((block) => block.recipeBlockKey)).size).toBe(count);
      expect(scaffold.targetDurationMs).toBe(advertisedMinutes * 60_000);
      expect(scaffold.blocks.reduce((sum, block) => sum + block.targetDurationMs, 0)).toBe(
        scaffold.targetDurationMs,
      );
      expect(scaffold.blocks.some((block) => block.intensity === 'all_out')).toBe(false);
    },
  );

  // v1 recipes are immutable: existing classes and older clients depend on their exact content.
  // This snapshot was captured before any v2 work; a diff here is a regression, not an update.
  it.each(scaffoldRecipeIdValues.filter((id) => id.endsWith('_v1')))(
    '%s content is frozen',
    (id) => {
      expect(generateScaffold(id)).toMatchSnapshot();
    },
  );

  it('maps the Pilates display family to the stored sculpt discipline', () => {
    expect(generateScaffold('pilates_45_v1').template).toBe('sculpt');
  });

  it('materializes 30/30 HIIT rounds from each timed block duration', () => {
    const scaffold = generateScaffold('hiit_30_v1');
    const timed = scaffold.blocks.filter(
      (block) => block.guidance.kind === 'hiit' && block.guidance.workMs != null,
    );

    expect(timed.map((block) => block.guidance)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workMs: 30_000, recoveryMs: 30_000, rounds: 4 }),
        expect.objectContaining({ workMs: 30_000, recoveryMs: 30_000, rounds: 6 }),
      ]),
    );
  });

  it.each(['cycle_30_v2', 'cycle_45_v2', 'cycle_60_v2'] as const)(
    '%s makes the peak the one RPE 8–9 block, after an easy valley',
    (id) => {
      const { blocks } = generateScaffold(id);
      const peakIndex = blocks.findIndex((block) => block.recipeBlockKey === 'cycle_peak');
      const topRpe = blocks.filter(
        (block) => block.guidance.kind === 'cycle' && block.guidance.rpeMin >= 8,
      );

      expect(topRpe.map((block) => block.recipeBlockKey)).toEqual(['cycle_peak']);
      expect(blocks[peakIndex - 1]).toMatchObject({
        recipeBlockKey: 'cycle_recover',
        intensity: 'easy',
      });
      expect(blocks.filter((block) => block.intensity === 'hard')).toHaveLength(2);
    },
  );

  it('keeps the Cycle v2 minutes the owner approved', () => {
    expect(minutes(generateScaffold('cycle_30_v2').blocks)).toEqual([4, 4, 5, 3, 5, 2, 3, 4]);
    expect(minutes(generateScaffold('cycle_45_v2').blocks)).toEqual([6, 6, 7, 5, 7, 3, 5, 6]);
    expect(minutes(generateScaffold('cycle_60_v2').blocks)).toEqual([8, 8, 9, 7, 10, 4, 6, 8]);
  });

  it('bounds the current HIIT finisher to four 30/30 rounds at every length', () => {
    for (const id of Object.values(CURRENT_SCAFFOLD_RECIPES.hiit)) {
      const finisher = generateScaffold(id).blocks.find(
        (block) => block.recipeBlockKey === 'hiit_finisher',
      );
      expect(finisher?.targetDurationMs).toBe(4 * 60_000);
      expect(finisher?.guidance).toMatchObject({ workMs: 30_000, recoveryMs: 30_000, rounds: 4 });
    }
    expect(minutes(generateScaffold('hiit_45_v2').blocks)).toEqual([6, 5, 10, 3, 10, 4, 7]);
    expect(minutes(generateScaffold('hiit_60_v2').blocks)).toEqual([8, 7, 14, 4, 14, 4, 9]);
  });

  it('points every current recipe at a valid id for its family and length', () => {
    for (const [family, byLength] of Object.entries(CURRENT_SCAFFOLD_RECIPES)) {
      for (const [length, id] of Object.entries(byLength)) {
        expect(id.startsWith(`${family}_${length}_`)).toBe(true);
        expect(scaffoldRecipeIdValues).toContain(id);
      }
    }
  });
});
