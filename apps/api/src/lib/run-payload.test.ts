import { describe, it, expect } from 'vitest';
import { resolveMoveName } from './run-payload.js';

describe('resolveMoveName', () => {
  it('prefers the global library name', () => {
    expect(resolveMoveName('Climb', 'My Climb', 'Freeform')).toBe('Climb');
  });
  it('falls back to the user-move name', () => {
    expect(resolveMoveName(null, 'My Climb', 'Freeform')).toBe('My Climb');
  });
  it('falls back to the freeform override', () => {
    expect(resolveMoveName(null, null, 'Freeform')).toBe('Freeform');
  });
  it('treats undefined library lookups like null', () => {
    expect(resolveMoveName(undefined, undefined, 'Freeform')).toBe('Freeform');
  });
});
