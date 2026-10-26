import { describe, expect, it } from 'vitest';
import type { Env } from './types.js';
import { REQUIRED_SECRET_NAMES, healthHttpStatus, probeDatabase, readHealth } from './health.js';

const SECRET = 'super-secret-value-do-not-leak';

function env(over: Partial<Env> = {}): Env {
  return {
    DB: fakeDb(async () => ({ '1': 1 })),
    IMAGES_BUCKET: {} as Env['IMAGES_BUCKET'],
    BETTER_AUTH_SECRET: SECRET,
    BETTER_AUTH_URL: 'https://ritmofit.studio',
    ENCRYPTION_KEY: 'enc-key-do-not-leak',
    ...over,
  };
}

function fakeDb(first: () => Promise<unknown>, sql?: { value: string }): D1Database {
  return {
    prepare(statement: string) {
      if (sql) sql.value = statement;
      return { first };
    },
  } as unknown as D1Database;
}

describe('probeDatabase', () => {
  it('runs SELECT 1 and is healthy when a row comes back', async () => {
    const sql = { value: '' };
    const ok = await probeDatabase(fakeDb(async () => ({ '1': 1 }), sql));
    expect(sql.value).toBe('SELECT 1');
    expect(ok).toBe(true);
  });

  it('is unhealthy when the binding is missing', async () => {
    expect(await probeDatabase(undefined)).toBe(false);
  });

  it('is unhealthy when SELECT 1 throws', async () => {
    const ok = await probeDatabase(
      fakeDb(async () => {
        throw new Error('D1_ERROR: no such table');
      }),
    );
    expect(ok).toBe(false);
  });

  it('is unhealthy when SELECT 1 returns no row', async () => {
    expect(await probeDatabase(fakeDb(async () => null))).toBe(false);
  });

  it('is unhealthy when prepare itself throws', async () => {
    const db = {
      prepare() {
        throw new Error('D1 binding missing');
      },
    } as unknown as D1Database;
    expect(await probeDatabase(db)).toBe(false);
  });
});

describe('readHealth', () => {
  it('reports ok, the database, and secret presence without secret values', async () => {
    const report = await readHealth(
      env({
        BETA_ALLOWED_EMAILS: 'qa@example.com',
        RESEND_API_KEY: '   ',
        SPOTIFY_CLIENT_ID: 'spotify-id',
      }),
    );
    expect(report.status).toBe('ok');
    expect(report.service).toBe('ritmofit-api');
    expect(report.version).toBe('v1');
    expect(report.database).toBe(true);
    expect(healthHttpStatus(report)).toBe(200);
    expect(report.secrets.BETTER_AUTH_SECRET).toBe(true);
    expect(report.secrets.ENCRYPTION_KEY).toBe(true);
    expect(report.secrets.BETA_ALLOWED_EMAILS).toBe(true);
    expect(report.secrets.SPOTIFY_CLIENT_ID).toBe(true);
    expect(report.secrets.SPOTIFY_CLIENT_SECRET).toBe(false);
    expect(report.secrets.RESEND_API_KEY).toBe(false);
    expect(report.secrets.EMAIL_FROM).toBe(false);
    expect(Object.keys(report.secrets).sort()).toEqual([...REQUIRED_SECRET_NAMES].sort());
    for (const present of Object.values(report.secrets)) {
      expect(present).toBeTypeOf('boolean');
    }
    const body = JSON.stringify(report);
    expect(body).not.toContain(SECRET);
    expect(body).not.toContain('enc-key-do-not-leak');
    expect(body).not.toContain('qa@example.com');
    expect(body).not.toContain('spotify-id');
  });

  it('does not look healthy when the database probe fails', async () => {
    const report = await readHealth(
      env({
        DB: fakeDb(async () => {
          throw new Error('SELECT 1 failed');
        }),
        APPLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----',
      }),
    );
    expect(report.database).toBe(false);
    expect(report.status).not.toBe('ok');
    expect(report.status).toBe('unavailable');
    expect(healthHttpStatus(report)).toBe(503);
    expect(report.secrets.APPLE_PRIVATE_KEY).toBe(true);
    expect(JSON.stringify(report)).not.toContain('BEGIN PRIVATE KEY');
  });

  it('does not look healthy when the database binding is missing', async () => {
    const report = await readHealth(env({ DB: undefined as unknown as D1Database }));
    expect(report.database).toBe(false);
    expect(report.status).toBe('unavailable');
    expect(healthHttpStatus(report)).toBe(503);
  });
});
