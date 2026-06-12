import { describe, it, expect } from 'vitest';
import { searchMockCatalog, findMockCandidate } from './mock-catalog.js';

describe('searchMockCatalog', () => {
  it('empty query returns the whole catalog', () => {
    expect(searchMockCatalog('').length).toBeGreaterThan(0);
  });

  it('matches title or artist, case-insensitively', () => {
    const hits = searchMockCatalog('avicii');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((t) => /avicii/i.test(t.artist))).toBe(true);
  });

  it('filters by provider', () => {
    const hits = searchMockCatalog('', 'soundcloud');
    expect(hits.every((t) => t.provider === 'soundcloud')).toBe(true);
  });

  it('never carries a BPM (manual in M1)', () => {
    expect(searchMockCatalog('').every((t) => !('displayBpm' in t))).toBe(true);
  });
});

describe('findMockCandidate', () => {
  it('finds by provider reference', () => {
    expect(findMockCandidate('spotify', 'sp-levels')?.title).toBe('Levels');
  });
  it('returns undefined for unknown refs', () => {
    expect(findMockCandidate('spotify', 'nope')).toBeUndefined();
  });
});
