/**
 * Stable reference codes for failures the instructor is told about
 * (design audit 2026-07-24, P1-05).
 *
 * User-facing copy must not interpolate a raw upstream message. The class-library
 * error surface rendered "Ritmo could not read the class list: **boom**", where
 * `boom` came verbatim from the failing response — in production that is whatever
 * the upstream happened to say, which is at best meaningless to an instructor and
 * at worst leaks internals.
 *
 * A code replaces it. The code is **derived from the message**, so the same
 * failure always prints the same reference and the owner can tell "it happened
 * again" from "something new broke", and can grep the logs for the message that
 * produces it.
 *
 * It is deliberately **not** presented as a server request id — nothing issues
 * one — and the copy that shows it must not imply otherwise.
 */

/** FNV-1a, 32-bit. Small, dependency-free, and stable across runs and machines. */
function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * A short, stable code for a failure, prefixed by the surface it happened on:
 * `CLS-1A2B3C`. Case- and whitespace-insensitive, so a message that differs only
 * in formatting does not look like a different failure. An absent message still
 * yields a code, so the copy never has to branch on whether one exists.
 */
export function errorReference(surface: string, message: string | null | undefined): string {
  const normalized = (message ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${surface.toUpperCase()}-${hash32(normalized).toString(36).toUpperCase().padStart(6, '0')}`;
}
