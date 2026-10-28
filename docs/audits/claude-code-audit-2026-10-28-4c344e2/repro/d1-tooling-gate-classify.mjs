// Usage: node d1-tooling-gate-classify.mjs <worktree> < paths.txt  — prints the owner-gate class per path.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { GATES } = await import(pathToFileURL(`${process.argv[2]}/scripts/owner-gate.mjs`).href);
for (const p of readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
  const g = GATES.find((gate) => gate.match(p));
  console.log(`${g ? g.name : 'UNGATED'}\t${p}`);
}
