import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';

const getSession = vi.fn();
vi.mock('../lib/auth.js', () => ({ createAuth: () => ({ api: { getSession } }) }));

const { requireSession } = await import('./auth.js');

const REFRESH = 'better-auth.session_token=tok.sig; Max-Age=604800; Path=/; HttpOnly';
const user = {
  id: 'u1',
  email: 'u@example.com',
  name: 'U',
  image: null,
  emailVerified: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

/** Three routers mounted at '/', each with a blanket requireSession, like index.ts. */
function app() {
  const root = new Hono<AppEnv>();
  for (let i = 0; i < 3; i += 1) {
    const r = new Hono<AppEnv>();
    r.use('*', requireSession);
    if (i === 2) {
      r.get('/thing', (c) => {
        c.header('Set-Cookie', 'route_cookie=1; Path=/', { append: true });
        return c.json({ userId: c.get('userId') });
      });
    }
    root.route('/', r);
  }
  return root;
}

/** Workers types predate Headers.getSetCookie; the Node test runtime has it. */
function setCookiesOf(res: Response): string[] {
  return (res.headers as Headers & { getSetCookie(): string[] }).getSetCookie();
}

function sessionResult(response: unknown, cookies: string[]) {
  const headers = new Headers();
  for (const c of cookies) headers.append('set-cookie', c);
  return { headers, response };
}

describe('requireSession (RF-177)', () => {
  beforeEach(() => getSession.mockReset());

  it('resolves the session once per request and forwards the refresh exactly once', async () => {
    getSession.mockResolvedValue(sessionResult({ user, session: {} }, [REFRESH]));
    const res = await app().request('/thing', {}, {} as AppEnv['Bindings']);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'u1' });
    expect(getSession).toHaveBeenCalledTimes(1);
    const cookies = setCookiesOf(res);
    expect(cookies.filter((c) => c.startsWith('better-auth.session_token='))).toHaveLength(1);
    expect(cookies).toContain('route_cookie=1; Path=/');
  });

  it('adds no Set-Cookie when Better Auth set none', async () => {
    getSession.mockResolvedValue(sessionResult({ user, session: {} }, []));
    const res = await app().request('/thing', {}, {} as AppEnv['Bindings']);
    expect(setCookiesOf(res)).toEqual(['route_cookie=1; Path=/']);
  });

  it('a 401 carries the clearing cookie Better Auth set', async () => {
    const clear = 'better-auth.session_token=; Max-Age=0; Path=/';
    getSession.mockResolvedValue(sessionResult(null, [clear]));
    const res = await app().request('/thing', {}, {} as AppEnv['Bindings']);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(setCookiesOf(res)).toEqual([clear]);
    expect(getSession).toHaveBeenCalledTimes(1);
  });
});
