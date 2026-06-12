import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, challengeFromVerifier, randomToken } from './pkce.js';

describe('pkce', () => {
  it('matches the RFC 7636 S256 test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(await challengeFromVerifier(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('generates base64url verifiers with no padding', async () => {
    const v = generateCodeVerifier();
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(v.length).toBeGreaterThanOrEqual(43);
    // and a valid challenge derives from it
    expect(await challengeFromVerifier(v)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('randomToken is unique and url-safe', () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
