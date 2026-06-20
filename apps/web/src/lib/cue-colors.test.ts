import { describe, it, expect } from 'vitest';
import { CUE_COLOR_TAGS, tagLabel } from './cue-colors.js';
// Imported as a JSON module (resolveJsonModule) — a test-only dependency, never in
// the production bundle — so the guard reads the real token source, not a copy.
import tokens from '../../../../ritmofit_design_system/tokens.json';

// The reserved peak accent — must never be offered as a cue tag (02-color-system.md).
const PLASMA_HEXES = ['#ff2e88', '#ff6aae', '#d11a68'];

// `cues.color` persists a free hex, so the palette can't reference CSS `var(--rf-*)`
// at rest — the literal hexes must stay equal to the design-token primitives in
// `tokens.json`. This map + guard fail if either side drifts, keeping the single
// source of truth honest.
const p = tokens.color.primitive;
const TOKEN_PRIMITIVE: Record<string, string> = {
  Copper: p.copper['400'],
  Cyan: p.cyan['400'],
  Amber: p.amber['400'],
  Ember: p.ember['400'],
  Bone: p.bone['300'],
};

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

  it('each tag hex matches its design-token primitive in tokens.json', () => {
    // Guards against drift between the hardcoded palette and the token source.
    expect(CUE_COLOR_TAGS.map((t) => t.name)).toEqual(Object.keys(TOKEN_PRIMITIVE));
    for (const { name, hex } of CUE_COLOR_TAGS) {
      expect(hex.toLowerCase(), `${name} drifted from its token primitive`).toBe(
        TOKEN_PRIMITIVE[name]?.toLowerCase(),
      );
    }
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
