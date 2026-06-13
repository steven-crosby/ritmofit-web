import { describe, it, expect } from 'vitest';
import { CUE_COLOR_TAGS, tagLabel } from './cue-colors.js';

// The reserved peak accent — must never be offered as a cue tag (02-color-system.md).
const PLASMA_HEXES = ['#ff2e88', '#ff6aae', '#d11a68'];

describe('CUE_COLOR_TAGS', () => {
  it('excludes the plasma range', () => {
    const hexes = CUE_COLOR_TAGS.map((t) => t.hex.toLowerCase());
    for (const plasma of PLASMA_HEXES) {
      expect(hexes).not.toContain(plasma);
    }
  });

  it('offers the documented copper/cyan/amber/ember/bone tags', () => {
    expect(CUE_COLOR_TAGS.map((t) => t.name)).toEqual(['Copper', 'Cyan', 'Amber', 'Ember', 'Bone']);
  });

  it('has unique, well-formed hex values', () => {
    const hexes = CUE_COLOR_TAGS.map((t) => t.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
    for (const hex of hexes) expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('tagLabel', () => {
  it('resolves a known hex (case-insensitive)', () => {
    expect(tagLabel('#E07E3C')).toBe('Copper');
    expect(tagLabel('#e07e3c')).toBe('Copper');
  });

  it('returns null for an unknown hex', () => {
    expect(tagLabel('#123456')).toBeNull();
    expect(tagLabel('#FF2E88')).toBeNull(); // plasma is not a tag
  });
});
