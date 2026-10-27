import { describe, expect, it } from 'vitest';
import {
  AUTHED_SMOKE_CHECKS,
  QA_BETA_TOKEN_GITIGNORE,
  QA_BETA_TOKEN_RELATIVE,
  parseQaBetaToken,
  runAuthedSmoke,
  runSmokeCli,
  sessionCookieHeader,
  sessionCookieName,
} from './authed-smoke.js';

const TOKEN = 'qa-session-token.signature';

describe('parseQaBetaToken', () => {
  it('reads a bare token and ignores comments', () => {
    expect(parseQaBetaToken(`# dedicated QA beta account\n\n${TOKEN}\n`)).toBe(TOKEN);
  });

  it('accepts a session cookie line and percent-encoding', () => {
    const encoded = 'tok+en/sig=';
    expect(parseQaBetaToken(`better-auth.session_token=${encodeURIComponent(encoded)}`)).toBe(
      encoded,
    );
    expect(parseQaBetaToken(`Cookie: __Secure-better-auth.session_token=${TOKEN}`)).toBe(TOKEN);
  });

  it('rejects an empty file without echoing contents', () => {
    const hidden = 'do-not-echo-this-token';
    expect(() => parseQaBetaToken(`# ${hidden}\n`)).toThrow(/found 0 lines/);
    try {
      parseQaBetaToken(`# ${hidden}\n`);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toContain(hidden);
    }
  });

  it('rejects multiple tokens without echoing them', () => {
    expect(() => parseQaBetaToken(`${TOKEN}\nother-token`)).toThrow(/found 2 lines/);
    try {
      parseQaBetaToken(`${TOKEN}\nother-token`);
    } catch (err) {
      expect((err as Error).message).not.toContain(TOKEN);
      expect((err as Error).message).not.toContain('other-token');
    }
  });
});

describe('sessionCookieHeader', () => {
  it('uses the __Secure- name when the base URL is https', () => {
    expect(sessionCookieName('https://ritmofit.studio')).toBe('__Secure-better-auth.session_token');
    expect(sessionCookieHeader(TOKEN, 'https://ritmofit.studio')).toBe(
      `__Secure-better-auth.session_token=${TOKEN}`,
    );
    expect(sessionCookieHeader('tok+en/sig=', 'https://ritmofit.studio/')).toBe(
      '__Secure-better-auth.session_token=tok+en/sig=',
    );
  });

  it('uses the plain name for http and localhost', () => {
    for (const baseUrl of [
      'http://localhost:8787',
      'http://127.0.0.1:8787',
      'http://[::1]:8787',
      'https://localhost:8787',
      'https://127.0.0.1:8787',
      'http://ritmofit.studio',
    ]) {
      expect(sessionCookieName(baseUrl)).toBe('better-auth.session_token');
      expect(sessionCookieHeader(TOKEN, baseUrl)).toBe(`better-auth.session_token=${TOKEN}`);
    }
  });
});

describe('runAuthedSmoke', () => {
  it('checks classes and the Spotify connection with the https session cookie', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response('[]', { status: 200 });
    };
    const results = await runAuthedSmoke({
      baseUrl: 'https://ritmofit.studio',
      token: TOKEN,
      fetchImpl,
    });
    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual(
      AUTHED_SMOKE_CHECKS.map((check) => check.path),
    );
    expect(calls[1]?.url).toContain('/api/v1/providers/spotify/playlists');
    for (const call of calls) {
      expect(call.url).not.toContain(TOKEN);
      expect(call.init?.redirect).toBe('manual');
      const headers = new Headers(call.init?.headers);
      expect(headers.get('cookie')).toBe(`__Secure-better-auth.session_token=${TOKEN}`);
    }
  });

  it('sends the plain session cookie for http and localhost', async () => {
    for (const baseUrl of ['http://localhost:8787', 'https://localhost:8787']) {
      const calls: { init: RequestInit | undefined }[] = [];
      const fetchImpl: typeof fetch = async (_input, init) => {
        calls.push({ init });
        return new Response('[]', { status: 200 });
      };
      await runAuthedSmoke({ baseUrl, token: TOKEN, fetchImpl });
      for (const call of calls) {
        const headers = new Headers(call.init?.headers);
        expect(headers.get('cookie')).toBe(`better-auth.session_token=${TOKEN}`);
      }
    }
  });
});

describe('runSmokeCli', () => {
  it('prints status codes only and exits 0 when both checks are 200', async () => {
    const lines: string[] = [];
    const errors: string[] = [];
    const code = await runSmokeCli({
      tokenText: TOKEN,
      log: (line) => lines.push(line),
      error: (line) => errors.push(line),
      fetchImpl: async () => new Response('{"secret":"nope"}', { status: 200 }),
    });
    expect(code).toBe(0);
    expect(errors).toEqual([]);
    expect(lines).toEqual([
      'GET /api/v1/classes 200',
      'GET /api/v1/providers/spotify/playlists 200',
    ]);
    expect(lines.join('\n')).not.toContain(TOKEN);
    expect(lines.join('\n')).not.toContain('nope');
  });

  it('fails when the Spotify connection check is not 200', async () => {
    const lines: string[] = [];
    const errors: string[] = [];
    let n = 0;
    const code = await runSmokeCli({
      tokenText: TOKEN,
      log: (line) => lines.push(line),
      error: (line) => errors.push(line),
      fetchImpl: async () => new Response('', { status: n++ === 0 ? 200 : 409 }),
    });
    expect(code).toBe(1);
    expect(lines).toEqual([
      'GET /api/v1/classes 200',
      'GET /api/v1/providers/spotify/playlists 409',
    ]);
    expect(errors).toEqual(['Authed production smoke failed.']);
    expect(JSON.stringify({ lines, errors })).not.toContain(TOKEN);
  });

  it('redacts the token if a request error includes it', async () => {
    const errors: string[] = [];
    const code = await runSmokeCli({
      tokenText: TOKEN,
      error: (line) => errors.push(line),
      fetchImpl: async () => {
        throw new Error(`connect ${TOKEN}`);
      },
    });
    expect(code).toBe(1);
    expect(errors).toEqual(['connect [redacted]']);
  });

  it('documents the gitignored token path', () => {
    expect(QA_BETA_TOKEN_RELATIVE).toBe('apps/api/.qa-beta-token');
    expect(QA_BETA_TOKEN_GITIGNORE).toBe('apps/api/.qa-beta-token');
  });
});
