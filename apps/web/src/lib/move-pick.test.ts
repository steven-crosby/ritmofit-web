import { describe, it, expect } from 'vitest';
import {
  CUSTOM,
  NEW,
  formatMovePick,
  parseMovePick,
  pickForPlacement,
  type MovePick,
} from './move-pick.js';

describe('formatMovePick / parseMovePick round-trip', () => {
  const cases: MovePick[] = [
    { kind: 'custom' },
    { kind: 'new' },
    { kind: 'library', id: 'abc-123' },
    { kind: 'user', id: 'def-456' },
  ];
  for (const pick of cases) {
    it(`round-trips ${pick.kind}`, () => {
      expect(parseMovePick(formatMovePick(pick))).toEqual(pick);
    });
  }
});

describe('parseMovePick', () => {
  it('decodes the sentinels and prefixes', () => {
    expect(parseMovePick(CUSTOM)).toEqual({ kind: 'custom' });
    expect(parseMovePick(NEW)).toEqual({ kind: 'new' });
    expect(parseMovePick('m:gid')).toEqual({ kind: 'library', id: 'gid' });
    expect(parseMovePick('u:uid')).toEqual({ kind: 'user', id: 'uid' });
  });

  it('falls back to one-off custom for an unrecognized value', () => {
    expect(parseMovePick('garbage')).toEqual({ kind: 'custom' });
    expect(parseMovePick('')).toEqual({ kind: 'custom' });
  });

  it('does not confuse a library id that happens to contain a colon', () => {
    expect(parseMovePick('m:a:b')).toEqual({ kind: 'library', id: 'a:b' });
  });
});

describe('pickForPlacement', () => {
  it('prefers a library move, then a user move, else one-off custom', () => {
    expect(pickForPlacement('gid', null)).toBe('m:gid');
    expect(pickForPlacement(null, 'uid')).toBe('u:uid');
    expect(pickForPlacement(null, null)).toBe(CUSTOM);
  });
});
