import { describe, it, expect } from 'vitest';
import { errMessage } from './errors.js';

describe('errMessage', () => {
  it('uses an Error message', () => {
    expect(errMessage(new Error('boom'))).toBe('boom');
  });

  it('uses a non-empty string', () => {
    expect(errMessage('plain failure')).toBe('plain failure');
  });

  it('falls back for an Error with no message, null, or non-string', () => {
    expect(errMessage(new Error(''))).toBe('Something went wrong.');
    expect(errMessage(null)).toBe('Something went wrong.');
    expect(errMessage(undefined)).toBe('Something went wrong.');
    expect(errMessage({ code: 1 })).toBe('Something went wrong.');
  });

  it('honors a custom fallback', () => {
    expect(errMessage(null, 'Could not load.')).toBe('Could not load.');
  });
});
