import {
  classListCursorSchema,
  type ClassListCursor,
  type ClassWithAccess,
} from '@ritmofit/shared';
import { HttpError } from './errors.js';

/** Encode the stable `(updatedAt, id)` keyset boundary as an opaque URL-safe token. */
export function encodeClassListCursor(item: Pick<ClassWithAccess, 'updatedAt' | 'id'>): string {
  return btoa(JSON.stringify({ updatedAt: item.updatedAt, id: item.id }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

/** Decode and validate a cursor without exposing its representation to clients. */
export function decodeClassListCursor(cursor: string): ClassListCursor {
  try {
    const base64 = cursor.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return classListCursorSchema.parse(JSON.parse(atob(padded)));
  } catch {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid class-list cursor.');
  }
}
