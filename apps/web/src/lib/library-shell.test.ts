import { describe, expect, it } from 'vitest';
import {
  compareLastOpenedOrTaught,
  coverGradientClass,
  isQaClassTitle,
  jumpBackInClasses,
  readinessLabel,
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
  it('names the tempo gap in words', () => {
    expect(
      readinessLabel({
        eyebrow: 'Refine before teaching',
        action: 'Add the missing tempo',
        teachable: false,
      }),
    ).toBe('Needs tempo');
  });

  it('says Ready when the class can be taught', () => {
    expect(
      readinessLabel({ eyebrow: 'Ready to teach', action: 'Open class', teachable: true }),
    ).toBe('Ready');
  });
});

describe('coverGradientClass', () => {
  it('picks a gradient from the class type', () => {
    expect(coverGradientClass('cycle')).toContain('from-brand');
    expect(coverGradientClass('sculpt')).toContain('from-interactive');
    expect(coverGradientClass(null)).toContain('from-border-strong');
  });
});
