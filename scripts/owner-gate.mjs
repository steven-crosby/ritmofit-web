#!/usr/bin/env node
// Owner gate for delegated PRs (AGENTS.md › "Delegation And Merge Policy").
//
// Agents ask the owner before merging any PR. Changes that CI cannot prove or that are hard to undo
// also fail CI until the owner approves them. Every PR is authored as the owner's account, so GitHub review rules
// cannot tell an agent from the owner; this check is the backstop. It fails when a PR touches an
// owner-gated path and does not carry the `owner-approved` label. It guards against an agent
// misjudging its own change, not against one deliberately applying the label.
//
// Usage (CI): OWNER_GATE_LABELS='["a","b"]' node scripts/owner-gate.mjs < changed-files.txt

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const APPROVAL_LABEL = 'owner-approved';

/** Owner-gated change classes. Test files count: weakening a gate's tests weakens the gate. */
export const GATES = [
  {
    name: 'D1 migrations / schema',
    match: (p) => p.startsWith('apps/api/migrations/') || p.startsWith('apps/api/src/db/'),
  },
  {
    name: 'auth / authz',
    match: (p) =>
      /^apps\/api\/src\/(lib|middleware|routes)\/auth[^/]*$/.test(p) ||
      /^apps\/api\/src\/lib\/(authz|team-authz|pkce|crypto)[^/]*$/.test(p) ||
      p.startsWith('apps/web/src/lib/auth-client') ||
      /^apps\/api\/test\/[^/]*(authz|access|auth)[^/]*$/.test(p),
  },
  {
    name: 'provider / playback',
    match: (p) =>
      p.startsWith('packages/music/') ||
      p.startsWith('apps/api/src/lib/music/') ||
      /^apps\/api\/src\/routes\/provider[^/]*$/.test(p) ||
      p.startsWith('apps/api/src/lib/apple-jwt') ||
      p.startsWith('apps/web/src/lib/playback/') ||
      /^apps\/web\/src\/lib\/(musickit|spotify-playback|use-spotify-activation)[^/]*$/.test(p),
  },
  {
    name: 'CI / deploy / infrastructure',
    match: (p) =>
      p.startsWith('.github/') ||
      /^scripts\/(deploy|owner-gate|rf-trace|required-secrets|production-smoke)[^/]*$/.test(p) ||
      p === 'apps/api/wrangler.toml' ||
      p === 'apps/web/public/_headers' ||
      p === 'pnpm-workspace.yaml' ||
      p === '.pnpmfile.cjs',
  },
  {
    name: 'agent rules',
    match: (p) => p === 'AGENTS.md' || p === 'CLAUDE.md',
  },
];

/** Returns { gated: [{ path, gate }], approved, pass }. */
export function evaluate(paths, labels) {
  const gated = [];
  for (const path of paths) {
    const gate = GATES.find((g) => g.match(path));
    if (gate) gated.push({ path, gate: gate.name });
  }
  const approved = labels.includes(APPROVAL_LABEL);
  return { gated, approved, pass: gated.length === 0 || approved };
}

function parseLabels(raw) {
  // Fail closed: an unreadable label list never counts as approval.
  try {
    const parsed = JSON.parse(raw ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((l) => typeof l === 'string') : [];
  } catch {
    return [];
  }
}

function main() {
  const paths = readFileSync(0, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (paths.length === 0) {
    console.error('owner-gate: no changed files read from stdin; refusing to pass blind.');
    process.exit(1);
  }
  const { gated, pass } = evaluate(paths, parseLabels(process.env.OWNER_GATE_LABELS));
  if (gated.length === 0) {
    console.log(
      `owner-gate: ${paths.length} changed files, none owner-gated. Agent merge allowed.`,
    );
    return;
  }
  console.log('owner-gate: this PR touches owner-gated paths:');
  for (const { path, gate } of gated) console.log(`  [${gate}] ${path}`);
  if (pass) {
    console.log(`owner-gate: '${APPROVAL_LABEL}' is present. The owner approved this PR.`);
    return;
  }
  console.error(
    `owner-gate: FAIL. Add 'needs-owner' and ask the owner, who reviews and applies ` +
      `'${APPROVAL_LABEL}'. Agents never apply that label.`,
  );
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
