import { describe, it, expect } from 'vitest';
import { isUniqueViolation } from './errors.js';

describe('isUniqueViolation', () => {
  it('detects the SQLite message at the top level', () => {
    expect(isUniqueViolation(new Error('UNIQUE constraint failed: x.y'))).toBe(true);
  });

  it('detects it nested in the cause chain (how Drizzle wraps D1 errors)', () => {
    const driver = new Error(
      'UNIQUE constraint failed: track_provider_ids.provider, track_provider_ids.provider_track_id: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_UNIQUE)',
    );
    const d1 = new Error('D1_ERROR: …', { cause: driver });
    const drizzle = new Error('Failed query: insert into …', { cause: d1 });
    expect(isUniqueViolation(drizzle)).toBe(true);
  });

  it('is false for unrelated errors', () => {
    expect(isUniqueViolation(new Error('Failed query: something else'))).toBe(false);
    expect(isUniqueViolation('not even an error')).toBe(false);
  });
});
