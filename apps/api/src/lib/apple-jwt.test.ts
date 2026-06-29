import { describe, expect, it } from 'vitest';
import { signAppleJwt } from './apple-jwt.js';

const textDecoder = new TextDecoder();

async function testPrivateKeyPem(): Promise<string> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const pkcs8 = (await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer;
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
}

function decodePart(part: string): unknown {
  const padded = part
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(part.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return JSON.parse(textDecoder.decode(bytes));
}

function decodeBytes(part: string): Uint8Array {
  const padded = part
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(part.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

describe('signAppleJwt', () => {
  it('signs an ES256 JWT with Apple client-secret claims', async () => {
    const token = await signAppleJwt({
      teamId: 'TEAM123',
      keyId: 'KEY123',
      privateKey: await testPrivateKeyPem(),
      audience: 'https://appleid.apple.com',
      subject: 'studio.ritmofit.web',
      expiresInSec: 600,
      now: () => 1_800_000_000,
    });

    const [headerPart, payloadPart, signaturePart] = token.split('.');
    expect(headerPart).toBeTruthy();
    expect(payloadPart).toBeTruthy();
    expect(signaturePart).toBeTruthy();
    expect(decodePart(headerPart!)).toEqual({ alg: 'ES256', kid: 'KEY123' });
    expect(decodePart(payloadPart!)).toEqual({
      iss: 'TEAM123',
      iat: 1_800_000_000,
      exp: 1_800_000_600,
      aud: 'https://appleid.apple.com',
      sub: 'studio.ritmofit.web',
    });
    expect(decodeBytes(signaturePart!)).toHaveLength(64);
  });

  it('accepts private keys stored with escaped newlines', async () => {
    const pem = await testPrivateKeyPem();
    const token = await signAppleJwt({
      teamId: 'TEAM123',
      keyId: 'KEY123',
      privateKey: pem.replace(/\n/g, '\\n'),
      audience: 'appstoreconnect-v1',
      now: () => 1_800_000_000,
    });

    expect(decodePart(token.split('.')[1]!)).toMatchObject({
      iss: 'TEAM123',
      aud: 'appstoreconnect-v1',
    });
  });
});
