import { describe, expect, it } from 'vitest';
import { HttpError } from './errors.js';
import { decodeClassListCursor, encodeClassListCursor } from './class-list-pagination.js';

const boundary = {
  updatedAt: 1781502000000,
  id: '00000000-0000-4000-8000-000000000123',
};

describe('class-list cursor', () => {
  it('round-trips the stable timestamp and id boundary', () => {
    const encoded = encodeClassListCursor(boundary);
    expect(encoded).not.toContain('=');
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(decodeClassListCursor(encoded)).toEqual(boundary);
  });

  it.each(['not-base64!', btoa('{}'), btoa(JSON.stringify({ updatedAt: -1, id: 'nope' }))])(
    'rejects malformed cursor %s',
    (cursor) => {
      expect(() => decodeClassListCursor(cursor)).toThrowError(HttpError);
      try {
        decodeClassListCursor(cursor);
      } catch (error) {
        expect(error).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
      }
    },
  );
});
