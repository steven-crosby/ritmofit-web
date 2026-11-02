import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../lib/types.js';

const getSession = vi.fn();
vi.mock('../lib/auth.js', () => ({ createAuth: () => ({ api: { getSession } }) }));

const { refreshSession, requireSession } = await import('./auth.js');

const REFRESH = 'better-auth.session_token=tok.sig; Max-Age=604800; Path=/; HttpOnly';
const CLEAR = 'better-auth.session_token=; Max-Age=0; Path=/';
const ROUTE_COOKIE = 'route_cookie=1; Path=/';
const user = {
  id: 'u1',
  email: 'u@example.com',
  name: 'U',
  image: null,
  emailVerified: false,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const bindings = {} as AppEnv['Bindings'];

/** Three routers mounted at '/', each with a blanket requireSession, like index.ts. */
function stackedApp() {
  const root = new Hono<AppEnv>();
  for (let i = 0; i < 3; i += 1) {
    const r = new Hono<AppEnv>();
    r.use('*', requireSession);
    if (i === 2) {
      r.get('/thing', (c) => {
        c.header('Set-Cookie', ROUTE_COOKIE, { append: true });
        return c.json({ userId: c.get('userId') });
      });
    }
    root.route('/', r);
  }
  return root;
}

function refreshApp() {
  const app = new Hono<AppEnv>();
  app.post('/session', refreshSession, (c) => {
    c.header('Set-Cookie', ROUTE_COOKIE, { append: true });
    return c.json(c.get('user'));
  });
  return app;
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

  it('resolves once with refresh disabled, across stacked routers, and sets no session cookie', async () => {
    // Even if Better Auth emitted a cookie, an ordinary route must not forward it.
    getSession.mockResolvedValue(sessionResult({ user, session: {} }, [REFRESH]));
    const res = await stackedApp().request('/thing', {}, bindings);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: 'u1' });
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(getSession.mock.calls[0]![0]).toMatchObject({ query: { disableRefresh: true } });
    expect(setCookiesOf(res)).toEqual([ROUTE_COOKIE]);
  });

  it('a 401 carries no Set-Cookie', async () => {
    getSession.mockResolvedValue(sessionResult(null, [CLEAR]));
    const res = await stackedApp().request('/thing', {}, bindings);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(setCookiesOf(res)).toEqual([]);
  });
});

describe('refreshSession (RF-177)', () => {
  beforeEach(() => getSession.mockReset());

  it('lets Better Auth refresh and forwards its cookie next to the route cookie', async () => {
    getSession.mockResolvedValue(sessionResult({ user, session: {} }, [REFRESH]));
    const res = await refreshApp().request('/session', { method: 'POST' }, bindings);
    expect(res.status).toBe(200);
    expect(getSession.mock.calls[0]![0]).not.toHaveProperty('query');
    expect(setCookiesOf(res)).toEqual([ROUTE_COOKIE, REFRESH]);
  });

  it('a 401 drops the clearing cookie (same name for every account)', async () => {
    getSession.mockResolvedValue(sessionResult(null, [CLEAR]));
    const res = await refreshApp().request('/session', { method: 'POST' }, bindings);
    expect(res.status).toBe(401);
    expect(setCookiesOf(res)).toEqual([]);
  });
});
