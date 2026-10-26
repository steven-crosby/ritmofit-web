import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { REQUIRED_SECRET_NAMES } from '../src/lib/health.js';
import { call } from './helpers.js';

describe('GET /api/v1/health', () => {
  it('runs against D1 and reports secret presence as booleans', async () => {
    const res = await call('/api/v1/health');
    expect(res.status).toBe(200);
    const text = await res.text();
    const body = JSON.parse(text) as {
      status: string;
      service: string;
      version: string;
      database: boolean;
      secrets: Record<string, unknown>;
    };
    expect(body).toMatchObject({
      status: 'ok',
      service: 'ritmofit-api',
      version: 'v1',
      database: true,
    });
    expect(Object.keys(body.secrets).sort()).toEqual([...REQUIRED_SECRET_NAMES].sort());
    for (const name of REQUIRED_SECRET_NAMES) {
      expect(body.secrets[name]).toBeTypeOf('boolean');
    }
    expect(body.secrets.BETTER_AUTH_SECRET).toBe(true);
    expect(body.secrets.ENCRYPTION_KEY).toBe(true);
    expect(body.secrets.RESEND_API_KEY).toBe(false);
    expect(body.secrets.SPOTIFY_CLIENT_SECRET).toBe(false);
    expect(text).not.toContain(env.BETTER_AUTH_SECRET);
    expect(text).not.toContain(env.ENCRYPTION_KEY);
  });
});
