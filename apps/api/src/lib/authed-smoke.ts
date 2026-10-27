/**
 * Authed production smoke for the dedicated QA beta account.
 *
 * The session token is read from a gitignored file (`apps/api/.qa-beta-token`).
 * This module never logs that token. On an https base URL the cookie name is
 * `__Secure-better-auth.session_token`; http and localhost keep
 * `better-auth.session_token`. The Spotify check is
 * `GET /api/v1/providers/spotify/playlists`: HTTP 200 means the stored grant can
 * read the account's playlists. The response body is discarded so playlist
 * titles and any upstream payload stay out of the smoke log.
 */

export const QA_BETA_TOKEN_RELATIVE = 'apps/api/.qa-beta-token';

/** `.gitignore` line that keeps the QA beta session token out of git. */
export const QA_BETA_TOKEN_GITIGNORE = 'apps/api/.qa-beta-token';

export const DEFAULT_SMOKE_BASE_URL = 'https://ritmofit.studio';

export const AUTHED_SMOKE_CHECKS = [
  { id: 'classes', path: '/api/v1/classes' },
  { id: 'spotify-connection', path: '/api/v1/providers/spotify/playlists' },
] as const;

export interface SmokeResult {
  id: (typeof AUTHED_SMOKE_CHECKS)[number]['id'];
  path: string;
  status: number;
}

const SESSION_COOKIE = /^(?:__Secure-|__Host-)?better-auth\.session_token=(.+)$/i;

/** One session token from the gitignored file. Comments and a cookie prefix are allowed. */
export function parseQaBetaToken(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length !== 1) {
    throw new Error(
      `Expected one session token in ${QA_BETA_TOKEN_RELATIVE}, found ${lines.length} lines.`,
    );
  }
  let value = lines[0] ?? '';
  value = value.replace(/^cookie:\s*/i, '');
  const named = SESSION_COOKIE.exec(value);
  if (named?.[1]) value = named[1];
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (value.includes('%')) {
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep the raw line when it is not valid percent-encoding. Do not echo it.
    }
  }
  if (!value || /\s/.test(value)) {
    throw new Error(`QA beta token file ${QA_BETA_TOKEN_RELATIVE} is empty or not a single token.`);
  }
  return value;
}

const PLAIN_SESSION_COOKIE = 'better-auth.session_token';
const SECURE_SESSION_COOKIE = `__Secure-${PLAIN_SESSION_COOKIE}`;

/** Loopback hosts keep the plain cookie name, including an https dev origin. */
function isLocalSmokeHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host.startsWith('127.')
  );
}

/**
 * Better Auth prefixes the session cookie with `__Secure-` when the origin is
 * https. Local http and localhost stay on the plain name.
 */
export function sessionCookieName(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.protocol === 'https:' && !isLocalSmokeHost(url.hostname)) return SECURE_SESSION_COOKIE;
  return PLAIN_SESSION_COOKIE;
}

export function sessionCookieHeader(token: string, baseUrl: string): string {
  return `${sessionCookieName(baseUrl)}=${token}`;
}

export function smokePassed(results: readonly SmokeResult[]): boolean {
  return (
    results.length === AUTHED_SMOKE_CHECKS.length &&
    results.every((result) => result.status === 200)
  );
}

export async function runAuthedSmoke(options: {
  baseUrl: string;
  token: string;
  fetchImpl: typeof fetch;
}): Promise<SmokeResult[]> {
  const cookie = sessionCookieHeader(options.token, options.baseUrl);
  const results: SmokeResult[] = [];
  for (const check of AUTHED_SMOKE_CHECKS) {
    const url = new URL(check.path, options.baseUrl);
    const response = await options.fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { accept: 'application/json', cookie },
    });
    results.push({ id: check.id, path: check.path, status: response.status });
  }
  return results;
}

function publicErrorMessage(err: Error, token: string): string {
  return token ? err.message.split(token).join('[redacted]') : err.message;
}

/**
 * Run both checks and return a process exit code. Logs paths and status codes
 * only. `tokenText` is the file contents, not a path.
 */
export async function runSmokeCli(options: {
  tokenText: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
  error?: (line: string) => void;
}): Promise<number> {
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  const baseUrl = options.baseUrl ?? DEFAULT_SMOKE_BASE_URL;
  let token: string;
  try {
    token = parseQaBetaToken(options.tokenText);
  } catch (err) {
    error(err instanceof Error ? err.message : 'QA beta token file is invalid.');
    return 1;
  }
  let results: SmokeResult[];
  try {
    results = await runAuthedSmoke({
      baseUrl,
      token,
      fetchImpl: options.fetchImpl ?? fetch,
    });
  } catch (err) {
    error(err instanceof Error ? publicErrorMessage(err, token) : 'Authed smoke request failed.');
    return 1;
  }
  for (const result of results) {
    log(`GET ${result.path} ${result.status}`);
  }
  if (!smokePassed(results)) {
    error('Authed production smoke failed.');
    return 1;
  }
  return 0;
}
