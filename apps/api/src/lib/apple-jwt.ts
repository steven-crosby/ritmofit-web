/**
 * Apple ES256 JWT helpers for the two distinct Apple integrations:
 * - Sign in with Apple: client_secret JWT (aud = https://appleid.apple.com, sub = Services ID).
 * - Apple Music API: developer token JWT (aud = appstoreconnect-v1).
 *
 * The `.p8` key stays in Worker secrets. This module signs in-memory and never logs
 * secret material.
 */

const textEncoder = new TextEncoder();

export interface AppleJwtInput {
  teamId: string;
  keyId: string;
  privateKey: string;
  audience: string;
  subject?: string;
  expiresInSec?: number;
  now?: () => number;
}

export async function signAppleJwt(input: AppleJwtInput): Promise<string> {
  const now = input.now?.() ?? Math.floor(Date.now() / 1000);
  const expiresInSec = input.expiresInSec ?? 60 * 60 * 24 * 180;
  const header = { alg: 'ES256', kid: input.keyId };
  const payload: Record<string, string | number> = {
    iss: input.teamId,
    iat: now,
    exp: now + expiresInSec,
    aud: input.audience,
  };
  if (input.subject) payload.sub = input.subject;

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const key = await importPkcs8PrivateKey(input.privateKey);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    textEncoder.encode(signingInput),
  );
  return `${signingInput}.${base64Url(ecdsaSignatureToJose(signature))}`;
}

async function importPkcs8PrivateKey(privateKey: string): Promise<CryptoKey> {
  const pkcs8 = pemToArrayBuffer(privateKey);
  return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'sign',
  ]);
}

function pemToArrayBuffer(privateKey: string): ArrayBuffer {
  const normalized = privateKey.replace(/\\n/g, '\n');
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64UrlJson(value: unknown): string {
  return base64Url(textEncoder.encode(JSON.stringify(value)));
}

function base64Url(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * WebCrypto ECDSA signatures are raw r|s in Workers. Some runtimes surface DER;
 * normalize defensively so the JWT is always JOSE ES256's 64-byte form.
 */
function ecdsaSignatureToJose(signature: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(signature);
  if (bytes.length === 64) return bytes;
  if (bytes[0] !== 0x30) return bytes;

  let offset = 2;
  if (bytes[1] === 0x81) offset = 3;
  if (bytes[offset] !== 0x02) return bytes;
  const rLength = bytes[offset + 1];
  if (rLength === undefined) return bytes;
  const r = bytes.slice(offset + 2, offset + 2 + rLength);
  offset = offset + 2 + rLength;
  if (bytes[offset] !== 0x02) return bytes;
  const sLength = bytes[offset + 1];
  if (sLength === undefined) return bytes;
  const s = bytes.slice(offset + 2, offset + 2 + sLength);

  return concatPadded(r, s);
}

function concatPadded(r: Uint8Array, s: Uint8Array): Uint8Array {
  const out = new Uint8Array(64);
  out.set(trimAndPad(r), 0);
  out.set(trimAndPad(s), 32);
  return out;
}

function trimAndPad(value: Uint8Array): Uint8Array {
  let start = 0;
  while (start < value.length - 1 && value[start] === 0) start += 1;
  const trimmed = value.slice(start);
  const out = new Uint8Array(32);
  out.set(trimmed.slice(-32), 32 - Math.min(trimmed.length, 32));
  return out;
}
