/**
 * Opaque `/providers/:provider/likes` paging cursor (RF-132). It wraps the
 * provider's **own** continuation (Apple Music's relative `next` subpath,
 * SoundCloud's `next_href`, Spotify's `offset`) with the provider it belongs to,
 * so a cursor from one provider is never replayed against another. Nothing is
 * stored server-side: the client hands the cursor back and the adapter validates
 * the continuation's host and path before any token is sent.
 */
import { z } from 'zod';
import type { Provider } from '@ritmofit/shared';
import { HttpError } from '../errors.js';

/** Longest provider continuation we accept (a SoundCloud `next_href` is ~300 chars). */
const MAX_CONTINUATION_LENGTH = 2048;

const likesCursorSchema = z.object({
  p: z.string(),
  v: z.string().min(1).max(MAX_CONTINUATION_LENGTH),
});

export function invalidLikesCursor(): HttpError {
  return new HttpError(422, 'VALIDATION_ERROR', 'Invalid likes cursor.');
}

/** Encode a provider continuation as an opaque URL-safe token. */
export function encodeLikesCursor(provider: Provider, continuation: string): string {
  const json = JSON.stringify({ p: provider, v: continuation });
  // btoa takes Latin-1; continuations are URL-safe ASCII, but encode UTF-8 anyway.
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** Decode a cursor for `provider`, or throw 422 when it is malformed or another provider's. */
export function decodeLikesCursor(provider: Provider, cursor: string): string {
  let parsed: z.infer<typeof likesCursorSchema>;
  try {
    const base64 = cursor.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    parsed = likesCursorSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw invalidLikesCursor();
  }
  if (parsed.p !== provider) throw invalidLikesCursor();
  return parsed.v;
}
