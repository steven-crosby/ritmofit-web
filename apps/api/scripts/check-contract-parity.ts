/**
 * CI gate: fail when the vendored iOS run-payload DTOs drift from the contract
 * this backend serves. See `apps/api/src/lib/contract-parity.ts` for the rules
 * and `web-ios-parity.md` › "known seam gaps" for why this exists.
 *
 * Run with: `pnpm --filter @ritmofit/api contract-parity`
 *
 * Exit 0 — no drift, or only allowlisted (tracked) lag.
 * Exit 1 — new drift outside the allowlist, a stale allowlist entry (iOS caught
 *          up and the entry should be removed), or a missing input file.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CONTRACT_PARITY_ALLOWLIST,
  compareContractParity,
  extractOpenApiRunPayloadFields,
  extractSwiftStructFields,
} from '../src/lib/contract-parity.js';

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(here, '..');
const repoRoot = join(apiRoot, '..', '..');

const OPENAPI_PATH = join(apiRoot, 'openapi', 'openapi.json');
const SWIFT_PATH = join(repoRoot, 'ios-snapshot', 'Core', 'Models', 'RunPayload.swift');

function read(path: string, label: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    console.error(`✗ contract-parity: could not read ${label} at ${path}`);
    process.exit(1);
  }
}

const openapi = JSON.parse(read(OPENAPI_PATH, 'openapi.json')) as unknown;
const swiftSource = read(SWIFT_PATH, 'ios-snapshot RunPayload.swift');

const openapiFields = extractOpenApiRunPayloadFields(openapi);
const swiftFields = extractSwiftStructFields(swiftSource);
const { failing, allowlisted, staleAllowlist } = compareContractParity(
  openapiFields,
  swiftFields,
  CONTRACT_PARITY_ALLOWLIST,
);

console.log('iOS ↔ backend run-payload contract parity');
console.log(`  OpenAPI:  ${OPENAPI_PATH.replace(repoRoot + '/', '')}`);
console.log(`  iOS DTOs: ${SWIFT_PATH.replace(repoRoot + '/', '')}`);
console.log('');

if (allowlisted.length > 0) {
  console.log(`Tracked lag (allowlisted, not failing) — ${allowlisted.length}:`);
  for (const drift of allowlisted) {
    console.log(`  • ${drift.struct}.${drift.field} [${drift.kind}] — ${drift.reason ?? ''}`);
  }
  console.log('');
}

let ok = true;

if (staleAllowlist.length > 0) {
  ok = false;
  console.error(`✗ Stale allowlist entries — iOS has caught up; remove these from the allowlist:`);
  for (const entry of staleAllowlist) {
    console.error(`  • ${entry.struct}.${entry.field}`);
  }
  console.error('');
}

if (failing.length > 0) {
  ok = false;
  console.error(`✗ New contract drift (not allowlisted) — ${failing.length}:`);
  for (const drift of failing) {
    if (drift.kind === 'unknown-to-server') {
      console.error(
        `  • ${drift.struct}.${drift.field} — iOS decodes a field the server does NOT serve ` +
          `(client-crash risk: removed/renamed contract field). Restore the field or fix the DTO.`,
      );
    } else {
      console.error(
        `  • ${drift.struct}.${drift.field} — server serves a field the iOS DTO does not decode. ` +
          `Add it to the iOS DTO, or allowlist it with a tracked parity follow-up in ` +
          `apps/api/src/lib/contract-parity.ts.`,
      );
    }
  }
  console.error('');
}

if (ok) {
  console.log('✓ No untracked contract drift.');
  process.exit(0);
}
process.exit(1);
