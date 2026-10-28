// Q-01 repro (Worker level): a transient D1 failure on Better Auth's reset-token lookup
// writes the raw, still-valid reset token to the Worker log via Better Auth's onError.
// Copy to apps/api/test/ and run:
//   pnpm --filter @ritmofit/api exec vitest run --config vitest.integration.config.ts test/d2-quality-q01-reset-token-log.integration.test.ts
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index.js';
import { call, readResetToken, signUpUser } from './helpers.js';

/** D1 binding that fails (like "Network connection lost") only for verification reads. */
function flakyVerificationReads(db: D1Database): D1Database {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'prepare') {
        return (sql: string) => {
          const stmt = target.prepare(sql);
          if (!/select[\s\S]*from "verifications"/i.test(sql)) return stmt;
          const fail = () => Promise.reject(new Error('D1_ERROR: Network connection lost.'));
          const failing = {
            bind: () => failing,
            all: fail,
            raw: fail,
            first: fail,
            run: fail,
          };
          return failing;
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

describe('Q-01 reset token reaches the log on a D1 read failure', () => {
  it('logs the raw token', async () => {
    const user = await signUpUser();
    const requested = await call('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        redirectTo: 'https://test.ritmofit.studio/reset-password',
      }),
    });
    expect(requested.ok).toBe(true);
    const token = await readResetToken(user.userId);
    expect(token).toBeTruthy();

    const lines: string[] = [];
    const capture = (...args: unknown[]) => {
      lines.push(
        args
          .map((a) => (a instanceof Error ? `${a.message} ${String(a.cause)}` : String(a)))
          .join(' '),
      );
    };
    const spies = (['error', 'warn', 'log', 'info'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(capture),
    );
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('https://test.ritmofit.studio/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.11' },
        body: JSON.stringify({ token, newPassword: 'rotated-sup3r-secret-pw' }),
      }),
      { ...env, DB: flakyVerificationReads(env.DB) },
      ctx,
    );
    await waitOnExecutionContext(ctx);
    for (const s of spies) s.mockRestore();
    const leaked = lines.some((l) => l.includes(String(token)));
    console.log(`Q-01 reset status=${res.status} logLines=${lines.length} tokenInLog=${leaked}`);
    for (const l of lines)
      console.log('Q-01 line:', l.split(String(token)).join('<TOKEN>').slice(0, 600));
    expect(leaked).toBe(true);
  });
});
