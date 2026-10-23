import { describe, expect, it } from 'vitest';
import {
  CUE_INTENSITY_LABEL,
  formatCueDurationInput,
  formatCueDurationLabel,
  parseCueBpm,
  parseCueDurationSeconds,
  parseCueIntensity,
} from './cue-list.js';

describe('parseCueDurationSeconds', () => {
  it('stores the seconds she uses as milliseconds and leaves a blank unset', () => {
    expect(parseCueDurationSeconds('')).toEqual({ ok: true, value: null });
    expect(parseCueDurationSeconds('  ')).toEqual({ ok: true, value: null });
    expect(parseCueDurationSeconds('3')).toEqual({ ok: true, value: 3_000 });
    expect(parseCueDurationSeconds('15')).toEqual({ ok: true, value: 15_000 });
    expect(parseCueDurationSeconds('31')).toEqual({ ok: true, value: 31_000 });
    expect(parseCueDurationSeconds('48')).toEqual({ ok: true, value: 48_000 });
  });

  it('rejects zero, fractions, and text', () => {
    expect(parseCueDurationSeconds('0').ok).toBe(false);
    expect(parseCueDurationSeconds('1.5').ok).toBe(false);
    expect(parseCueDurationSeconds('fifteen').ok).toBe(false);
  });
});

describe('parseCueBpm', () => {
  it('keeps a typed BPM and does not invent one from a blank field', () => {
    expect(parseCueBpm('')).toEqual({ ok: true, value: null });
    expect(parseCueBpm('96')).toEqual({ ok: true, value: 96 });
    expect(parseCueBpm('128')).toEqual({ ok: true, value: 128 });
    expect(parseCueBpm('0').ok).toBe(false);
    expect(parseCueBpm('128.5').ok).toBe(false);
  });
});

describe('cue intensity labels', () => {
  it('names Open and the existing levels in her words', () => {
    expect(CUE_INTENSITY_LABEL.open).toBe('Open');
    expect(CUE_INTENSITY_LABEL.none).toBe('None');
    expect(CUE_INTENSITY_LABEL.easy).toBe('Easy');
    expect(CUE_INTENSITY_LABEL.mod).toBe('Mod');
    expect(CUE_INTENSITY_LABEL.hard).toBe('Hard');
    expect(CUE_INTENSITY_LABEL.all_out).toBe('All Out');
    expect(parseCueIntensity('open')).toBe('open');
    expect(parseCueIntensity('')).toBeNull();
    expect(parseCueIntensity('build')).toBeNull();
  });
});

describe('duration display', () => {
  it('round-trips whole seconds', () => {
    expect(formatCueDurationLabel(48_000)).toBe('48s');
    expect(formatCueDurationLabel(null)).toBeNull();
    expect(formatCueDurationInput(31_000)).toBe('31');
    expect(formatCueDurationInput(null)).toBe('');
  });
});
