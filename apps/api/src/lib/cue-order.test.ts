import { describe, expect, it } from 'vitest';
import { createCueSchema, intensitySchema, updateCueSchema } from '@ritmofit/shared';
import { cueNote, nextCuePosition } from './cue-order.js';

describe('nextCuePosition', () => {
  it('starts an empty song at 0 and appends after the current max', () => {
    expect(nextCuePosition(null)).toBe(0);
    expect(nextCuePosition(0)).toBe(1);
    expect(nextCuePosition(4)).toBe(5);
  });
});

describe('cueNote', () => {
  it('keeps a real note and treats blank as unset', () => {
    expect(cueNote('This is our warm up.')).toBe('This is our warm up.');
    expect(cueNote('  ')).toBeNull();
    expect(cueNote(null)).toBeNull();
    expect(cueNote(undefined)).toBeNull();
  });
});

describe('builder cue fields stay off the track intensity enum', () => {
  it('accepts Open, duration, BPM, and a note on a cue', () => {
    const parsed = createCueSchema.parse({
      anchorMs: 0,
      text: 'Left Leg Lead',
      durationMs: 15_000,
      bpm: 128,
      intensity: 'open',
      note: 'This is our warm up.',
    });
    expect(parsed.intensity).toBe('open');
    expect(parsed.durationMs).toBe(15_000);
    expect(parsed.bpm).toBe(128);
    expect(updateCueSchema.parse({ intensity: 'open', note: null }).intensity).toBe('open');
  });

  it('rejects Open on the track and placed-move intensity enum', () => {
    expect(intensitySchema.safeParse('open').success).toBe(false);
    expect(intensitySchema.safeParse('easy').success).toBe(true);
  });

  it('rejects a non-positive duration or BPM and an empty move name', () => {
    expect(createCueSchema.safeParse({ anchorMs: 0, text: 'Recover', durationMs: 0 }).success).toBe(
      false,
    );
    expect(createCueSchema.safeParse({ anchorMs: 0, text: 'Recover', bpm: 0 }).success).toBe(false);
    expect(createCueSchema.safeParse({ anchorMs: 0, text: '' }).success).toBe(false);
  });
});
