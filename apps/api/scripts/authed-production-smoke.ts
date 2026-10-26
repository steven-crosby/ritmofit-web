/**
 * Authed production smoke for the dedicated QA beta account.
 *
 * Token file: apps/api/.qa-beta-token
 * Gitignore:  apps/api/.qa-beta-token
 *
 * The file is one session-token value (or a `better-auth.session_token` /
 * `__Secure-better-auth.session_token` assignment). Https sends the
 * `__Secure-` name; http and localhost send the plain name.
 * Lines starting with `#` are comments. Never commit it.
 *
 *   pnpm --filter @ritmofit/api exec tsx scripts/authed-production-smoke.ts
 *
 * Optional: SMOKE_BASE_URL (default https://ritmofit.studio).
 * Prints `GET <path> <status>` only. Exits non-zero unless both checks return 200:
 *   GET /api/v1/classes
 *   GET /api/v1/providers/spotify/playlists   (Spotify connection check)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QA_BETA_TOKEN_RELATIVE, runSmokeCli } from '../src/lib/authed-smoke.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const tokenPath = join(repoRoot, QA_BETA_TOKEN_RELATIVE);

let tokenText: string;
try {
  tokenText = readFileSync(tokenPath, 'utf8');
} catch (error) {
  const missing =
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
  if (missing) {
    console.error(`Missing QA beta token file: ${QA_BETA_TOKEN_RELATIVE}`);
    console.error('That path is listed in .gitignore. Never commit the token.');
  } else {
    console.error(`Could not read ${QA_BETA_TOKEN_RELATIVE}.`);
  }
  process.exit(1);
}

const code = await runSmokeCli({
  tokenText,
  baseUrl: process.env.SMOKE_BASE_URL,
});
process.exit(code);
