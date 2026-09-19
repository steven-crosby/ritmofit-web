import { describe, expect, it } from 'vitest';
import { scaffoldRecipeIdValues } from '@ritmofit/shared';
import { generateScaffold } from './class-scaffold-recipes.js';

describe('generateScaffold', () => {
  it.each(scaffoldRecipeIdValues)(
    '%s materializes seven validated blocks with an exact total',
    (id) => {
      const scaffold = generateScaffold(id);
      const advertisedMinutes = Number(id.split('_')[1]);

      expect(scaffold.blocks).toHaveLength(7);
      expect(scaffold.blocks.map((block) => block.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(new Set(scaffold.blocks.map((block) => block.recipeBlockKey)).size).toBe(7);
      expect(scaffold.targetDurationMs).toBe(advertisedMinutes * 60_000);
      expect(scaffold.blocks.reduce((sum, block) => sum + block.targetDurationMs, 0)).toBe(
        scaffold.targetDurationMs,
      );
      expect(scaffold.blocks.some((block) => block.intensity === 'all_out')).toBe(false);
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
});
