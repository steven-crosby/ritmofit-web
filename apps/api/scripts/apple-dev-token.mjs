#!/usr/bin/env node
/**
 * Mint an Apple Music **developer token** (ES256 JWT) from a MusicKit `.p8`
 * private key. The token — not the key — is what the API uses, as
 * `APPLE_MUSIC_DEVELOPER_TOKEN` (see packages/music/src/apple-music.ts). The
 * `.p8` stays at the untracked workspace root; this only reads it locally.
 *
 * Usage (token → stdout, notes → stderr, so it pipes cleanly):
 *   node scripts/apple-dev-token.mjs <path-to-.p8> <KeyID> <TeamID> [days]
 *   node scripts/apple-dev-token.mjs ../../../AuthKey_TC32DN9BSN.p8 TC32DN9BSN <TeamID> \
 *     | npx wrangler secret put APPLE_MUSIC_DEVELOPER_TOKEN
 *
 * - KeyID is the 10-char id in the filename `AuthKey_<KeyID>.p8`.
 * - TeamID is your Apple Developer Team ID (Membership page) — the JWT `iss`.
 * - Apple caps expiry at ~6 months; default here is 180 days.
 */
import { readFileSync } from 'node:fs';
import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const [, , p8Path, keyId, teamId, daysArg] = process.argv;
if (!p8Path || !keyId || !teamId) {
  console.error('Usage: node scripts/apple-dev-token.mjs <path-to-.p8> <KeyID> <TeamID> [days]');
  process.exit(1);
}

const days = Number(daysArg ?? 180);
if (!Number.isFinite(days) || days <= 0 || days > 180) {
  console.error('days must be a positive number ≤ 180 (Apple caps developer-token lifetime at ~6 months).');
  process.exit(1);
}

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let privateKey;
try {
  privateKey = createPrivateKey(readFileSync(p8Path, 'utf8'));
} catch (e) {
  console.error(`Could not read/parse the .p8 at ${p8Path}: ${e.message}`);
  process.exit(1);
}

const iat = Math.floor(Date.now() / 1000);
const exp = iat + Math.floor(days * 24 * 60 * 60);

const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
const payload = b64url(JSON.stringify({ iss: teamId, iat, exp }));
const signingInput = `${header}.${payload}`;

// ES256 = ECDSA P-256 + SHA-256; JOSE needs the raw r||s form, not DER.
const signature = cryptoSign('sha256', Buffer.from(signingInput), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
});

process.stderr.write(
  `Minted Apple Music developer token (kid=${keyId}, iss=${teamId}, expires in ${days} days).\n`,
);
process.stdout.write(`${signingInput}.${b64url(signature)}`);
