import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from './crypto.js';

const KEY = 'unit-test-key-please-rotate';

describe('crypto', () => {
  it('round-trips a secret', async () => {
    const blob = await encryptSecret('sc-access-token-123', KEY);
    expect(blob).not.toContain('sc-access-token-123'); // not plaintext
    expect(await decryptSecret(blob, KEY)).toBe('sc-access-token-123');
  });

  it('produces a different ciphertext each time (random IV)', async () => {
    const a = await encryptSecret('same', KEY);
    const b = await encryptSecret('same', KEY);
    expect(a).not.toBe(b);
    expect(await decryptSecret(a, KEY)).toBe('same');
    expect(await decryptSecret(b, KEY)).toBe('same');
  });

  it('fails to decrypt with the wrong key', async () => {
    const blob = await encryptSecret('secret', KEY);
    await expect(decryptSecret(blob, 'different-key')).rejects.toThrow();
  });

  it('fails closed on tampered ciphertext', async () => {
    const blob = await encryptSecret('secret', KEY);
    const tampered = blob.slice(0, -2) + (blob.endsWith('AA') ? 'BB' : 'AA');
    await expect(decryptSecret(tampered, KEY)).rejects.toThrow();
  });
});
