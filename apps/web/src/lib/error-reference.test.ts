import { describe, expect, it } from 'vitest';
import { errorReference } from './error-reference.js';

describe('errorReference', () => {
  it('is stable for the same failure', () => {
    expect(errorReference('CLS', 'boom')).toBe(errorReference('CLS', 'boom'));
  });

  it('ignores case and whitespace so one failure reads as one failure', () => {
    expect(errorReference('CLS', '  Boom   happened ')).toBe(
      errorReference('CLS', 'boom happened'),
    );
  });

  it('separates genuinely different failures', () => {
    expect(errorReference('CLS', 'boom')).not.toBe(errorReference('CLS', 'timeout'));
  });

  it('scopes the code to the surface it happened on', () => {
    expect(errorReference('CLS', 'boom')).toMatch(/^CLS-/);
    expect(errorReference('acc', 'boom')).toMatch(/^ACC-/);
    expect(errorReference('CLS', 'boom')).not.toBe(errorReference('ACC', 'boom'));
  });

  it('still produces a code when there is no upstream message at all', () => {
    expect(errorReference('CLS', null)).toMatch(/^CLS-[0-9A-Z]+$/);
    expect(errorReference('CLS', undefined)).toBe(errorReference('CLS', ''));
  });

  it('never carries the upstream text into the code', () => {
    const leaky = 'connection refused at 10.0.0.4: password=hunter2';
    const code = errorReference('CLS', leaky);
    expect(code).toMatch(/^CLS-[0-9A-Z]+$/);
    expect(code.toLowerCase()).not.toContain('password');
    expect(code.toLowerCase()).not.toContain('hunter2');
    expect(code.length).toBeLessThan(16);
  });
});
