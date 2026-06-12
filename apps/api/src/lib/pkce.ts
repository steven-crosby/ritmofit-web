/**
 * PKCE (RFC 7636) for the provider OAuth flow — required by SoundCloud's OAuth 2.1.
 * WebCrypto only (Workers/Node ≥18). base64url, no padding.
 */
const encoder = new TextEncoder();

function base64UrlFromBytes(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A high-entropy code verifier (43 chars from 32 random bytes, base64url). */
export function generateCodeVerifier(): string {
  return base64UrlFromBytes(crypto.getRandomValues(new Uint8Array(32)));
}

/** The S256 challenge for a verifier: base64url(SHA-256(verifier)). */
export async function challengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  return base64UrlFromBytes(new Uint8Array(digest));
}

/** A random opaque token (state / nonce), base64url. */
export function randomToken(bytes = 24): string {
  return base64UrlFromBytes(crypto.getRandomValues(new Uint8Array(bytes)));
}
