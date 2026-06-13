import { describe, it, expect } from 'vitest';
import { resolveFlashRowId } from './ChoreographyEditor.js';

const rows = [
  { id: 'a', anchorMs: 500 },
  { id: 'b', anchorMs: 500 }, // same anchor as `a` — the case ids disambiguate
  { id: 'c', anchorMs: 900 },
];

describe('resolveFlashRowId', () => {
  it('returns null when there is no target', () => {
    expect(resolveFlashRowId(rows, null)).toBeNull();
  });

  it('prefers an exact id match — distinguishing two rows at the same anchor', () => {
    expect(resolveFlashRowId(rows, { id: 'b', anchorMs: 500 })).toBe('b');
    expect(resolveFlashRowId(rows, { id: 'a', anchorMs: 500 })).toBe('a');
  });

  it('falls back to the first row at the same anchor when the id is unknown', () => {
    // e.g. a legacy payload without ids, or an id that has since changed.
    expect(resolveFlashRowId(rows, { id: 'gone', anchorMs: 500 })).toBe('a');
  });

  it('returns null when neither the id nor the anchor matches', () => {
    expect(resolveFlashRowId(rows, { id: 'gone', anchorMs: 12345 })).toBeNull();
  });
});
