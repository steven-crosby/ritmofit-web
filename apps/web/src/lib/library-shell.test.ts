import { describe, expect, it } from 'vitest';
import { SCAFFOLD_DISCIPLINES } from './class-scaffold.js';
import {
  compareLastOpenedOrTaught,
  coverGradientClass,
  isQaClassTitle,
  LIBRARY_TEMPLATES,
  jumpBackInClasses,
  readinessLabel,
  readinessMark,
  recentClasses,
} from './library-shell.js';

describe('recentClasses', () => {
  it('orders by last opened or taught and ignores last edited', () => {
    const opened = { title: 'Opened', lastOpenedAt: 300, updatedAt: 1 };
    const edited = { title: 'Edited', lastOpenedAt: 100, updatedAt: 9_000 };
    const never = { title: 'Never', lastOpenedAt: null, updatedAt: 8_000 };
    expect(recentClasses([edited, never, opened]).map((cls) => cls.title)).toEqual([
      'Opened',
      'Edited',
      'Never',
    ]);
    expect(compareLastOpenedOrTaught(opened, edited)).toBeLessThan(0);
  });

  it('breaks equal open times by title', () => {
    expect(
      recentClasses([
        { title: 'Zed', lastOpenedAt: 10 },
        { title: 'Ada', lastOpenedAt: 10 },
      ]).map((cls) => cls.title),
    ).toEqual(['Ada', 'Zed']);
  });
});

describe('jumpBackInClasses', () => {
  it('skips names that start with [QA] and keeps four', () => {
    const classes = [
      { title: '[QA] Session expired', lastOpenedAt: 900 },
      { title: 'One', lastOpenedAt: 500 },
      { title: 'Two', lastOpenedAt: 400 },
      { title: 'Three', lastOpenedAt: 300 },
      { title: 'Four', lastOpenedAt: 200 },
      { title: 'Five', lastOpenedAt: 100 },
    ];
    expect(jumpBackInClasses(classes).map((cls) => cls.title)).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
    ]);
    expect(isQaClassTitle('[QA] Session expired')).toBe(true);
    expect(isQaClassTitle('QA ride')).toBe(false);
    expect(recentClasses(classes).some((cls) => cls.title.startsWith('[QA]'))).toBe(true);
  });
});

describe('readinessLabel', () => {
  const step = (eyebrow: string, action: string, teachable = false) => ({
    eyebrow,
    action,
    teachable,
  });

  it('names each library gap, and dots every label except Ready and Checking', () => {
    expect(readinessMark(step('Reading class', 'Add the first track'))).toEqual({
      label: 'Checking',
      dot: false,
    });
    expect(readinessMark(step('Details unavailable', 'Add the first track', true))).toEqual({
      label: 'Unavailable',
      dot: true,
    });
    expect(readinessMark(step('Ready to teach', 'Open class', true))).toEqual({
      label: 'Ready',
      dot: false,
    });
    expect(readinessLabel(step('Ready to teach', 'Open class'))).toBe('Needs work');

    const gaps: Array<[string, string]> = [
      ['Add the missing tempo', 'Needs tempo'],
      ['Set track durations', 'Needs duration'],
      ['Add cues and moves', 'Needs cues'],
      ['Score the effort arc', 'Needs effort'],
      ['Add the first track', 'Needs music'],
      ['Link music to tracks', 'Needs music'],
      ['Add music to the plan', 'Needs music'],
      ['Put songs in the plan', 'Needs music'],
      ['Fix overflowing blocks', 'Over time'],
      ['Finish refinements', 'Needs work'],
    ];
    for (const [action, label] of gaps) {
      expect(readinessMark(step('Refine before teaching', action))).toEqual({ label, dot: true });
    }
  });
});

describe('coverGradientClass', () => {
  it('picks a gradient from the class type', () => {
    expect(coverGradientClass('cycle')).toContain('from-brand');
    expect(coverGradientClass('sculpt')).toContain('from-interactive');
    expect(coverGradientClass(null)).toContain('from-border-strong');
  });
});

describe('LIBRARY_TEMPLATES', () => {
  it('matches the Create dialog disciplines, order and labels (D21)', () => {
    expect(LIBRARY_TEMPLATES.map(({ template, label }) => ({ value: template, label }))).toEqual(
      SCAFFOLD_DISCIPLINES.map(({ value, label }) => ({ value, label })),
    );
  });
});
