// Sign a headless browser in as a LOCAL fixture user, without knowing a password
// and without touching fixture data.
//
// The seeded/audit fixture accounts have no password anyone knows, and Better Auth
// stores only a hash. Rather than mutate a fixture (or reset a hash), mint one extra
// session row and hand the browser the cookie the server would have set. Additive,
// and `revoke()` removes exactly the row it created.
//
// Cookie format, verified against a real sign-up response:
//   better-auth.session_token = <token>.<base64(HMAC-SHA256(token, BETTER_AUTH_SECRET))>
// URL-encoded. Cookies are not port-scoped, so a cookie on `localhost` set for the
// SPA (:5173) is also sent to the Worker (:8787).
//
// LOCAL ONLY. This reads a local dev secret and writes to the local D1 emulator.
// Never point it at a remote database.
import { execFileSync } from 'node:child_process';
import { randomBytes, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const apiDir = join(repoRoot, 'apps', 'api');

const d1 = (sql) =>
  execFileSync('pnpm', ['exec', 'wrangler', 'd1', 'execute', 'ritmofit', '--local', '--command', sql], {
    cwd: apiDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const secret = () => {
  const vars = readFileSync(join(apiDir, '.dev.vars'), 'utf8');
  const m = vars.match(/^BETTER_AUTH_SECRET=(.*)$/m);
  if (!m || !m[1].trim()) {
    throw new Error('BETTER_AUTH_SECRET is empty in apps/api/.dev.vars — set it first.');
  }
  return m[1].trim();
};

/** The id of a local user, by email. Throws if the fixture is not seeded. */
export function userIdByEmail(email) {
  const out = d1(`SELECT id FROM users WHERE email='${email.replace(/'/g, "''")}';`);
  const m = out.match(/"id":\s*"([^"]+)"/);
  if (!m) throw new Error(`no local user with email ${email} — seed fixtures first`);
  return m[1];
}

/**
 * Mint a session for `email` and return `{ cookie, revoke }`.
 * `cookie` is ready for CDP `Network.setCookie`. ALWAYS call `revoke()` when done.
 */
export function signIn(email, { days = 1 } = {}) {
  const userId = userIdByEmail(email);
  const token = randomBytes(24).toString('base64url');
  const sig = createHmac('sha256', secret()).update(token).digest('base64');
  const id = randomBytes(16).toString('hex');
  const now = Date.now();
  const expires = now + days * 24 * 60 * 60 * 1000;

  d1(
    `INSERT INTO sessions (id, expires_at, token, user_id, created_at, updated_at)
     VALUES ('${id}', ${expires}, '${token}', '${userId}', ${now}, ${now});`,
  );

  return {
    userId,
    cookie: {
      name: 'better-auth.session_token',
      value: `${token}.${sig}`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
    revoke() {
      d1(`DELETE FROM sessions WHERE id='${id}';`);
    },
  };
}
