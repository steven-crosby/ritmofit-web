import { describe, expect, it } from 'vitest';
import { withNativeSignOutOrigin } from './auth.js';

const env = { BETTER_AUTH_URL: 'https://ritmofit.studio' };
const BASE = 'https://ritmofit.studio';

function req(path: string, headers: Record<string, string>, method = 'POST') {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { cookie: 'a=b', ...headers },
    body: method === 'POST' ? '{}' : undefined,
  });
}

describe('withNativeSignOutOrigin (RF-177, AUD-009)', () => {
  it.each(['application/json', 'application/json; charset=utf-8', 'Application/JSON'])(
    'stamps the server origin on a native JSON sign-out (%s)',
    (contentType) => {
      const out = withNativeSignOutOrigin(
        req('/api/auth/sign-out', { 'content-type': contentType }),
        env,
      );
      expect(out.headers.get('origin')).toBe(BASE);
      expect(out.headers.get('cookie')).toBe('a=b');
    },
  );

  it.each([
    ['another auth route', '/api/auth/sign-in/email', {}],
    ['a sign-out sub-path', '/api/auth/sign-out/extra', {}],
    ['an existing Origin', '/api/auth/sign-out', { origin: 'https://evil.example' }],
    ['a Referer', '/api/auth/sign-out', { referer: 'https://evil.example/' }],
    ['Sec-Fetch-Site', '/api/auth/sign-out', { 'sec-fetch-site': 'same-origin' }],
    ['Sec-Fetch-Mode', '/api/auth/sign-out', { 'sec-fetch-mode': 'cors' }],
    ['Sec-Fetch-Dest', '/api/auth/sign-out', { 'sec-fetch-dest': 'empty' }],
  ])('leaves the request untouched with %s', (_, path, extra) => {
    const original = req(path, { 'content-type': 'application/json', ...extra });
    expect(withNativeSignOutOrigin(original, env)).toBe(original);
  });

  it.each([
    'text/plain',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'application/jsonp',
  ])('leaves a %s body untouched (a cross-site form can send it)', (contentType) => {
    const original = req('/api/auth/sign-out', { 'content-type': contentType });
    expect(withNativeSignOutOrigin(original, env)).toBe(original);
  });

  it('leaves a non-POST untouched', () => {
    const original = req('/api/auth/sign-out', { 'content-type': 'application/json' }, 'GET');
    expect(withNativeSignOutOrigin(original, env)).toBe(original);
  });
});
