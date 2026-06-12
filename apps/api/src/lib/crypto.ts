/**
 * Symmetric encryption for secrets at rest — provider OAuth tokens in
 * `music_connections`, and the short-lived OAuth state cookie.
 *
 * AES-256-GCM via WebCrypto (present in Workers and Node ≥18). The 32-byte key is
 * derived as SHA-256 of `ENCRYPTION_KEY`, so any sufficiently random key string
 * works (e.g. `openssl rand -base64 32`). Output is base64 of `iv ‖ ciphertext`
 * (GCM appends its auth tag to the ciphertext), so decrypt fails closed on tamper.
 *
 * Never log plaintext tokens or the key (conventions.md).
 */
const IV_BYTES = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encrypt UTF-8 plaintext → base64(iv ‖ ciphertext+tag). */
export async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  const ctBytes = new Uint8Array(ct);
  const out = new Uint8Array(iv.length + ctBytes.length);
  out.set(iv, 0);
  out.set(ctBytes, iv.length);
  return bytesToBase64(out);
}

/** Decrypt a blob from `encryptSecret`. Throws if the key is wrong or it's tampered. */
export async function decryptSecret(blob: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const bytes = base64ToBytes(blob);
  const iv = bytes.slice(0, IV_BYTES);
  const ct = bytes.slice(IV_BYTES);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return decoder.decode(pt);
}
