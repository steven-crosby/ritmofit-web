// Attribute generated (minified) bytes of a Vite chunk to source modules via its sourcemap.
// Usage: node d-entry-composition.cjs <chunk.js> <source-map-js dir>
// Raw-byte attribution only; gzip share is not per-module separable, so treat it as relative weight.
const fs = require('fs');
const [, , chunkPath, smDir] = process.argv;
const { SourceMapConsumer } = require(smDir);
const code = fs.readFileSync(chunkPath, 'utf8');
const map = JSON.parse(fs.readFileSync(chunkPath + '.map', 'utf8'));
const consumer = new SourceMapConsumer(map);
const lines = code.split('\n');
const mappings = [];
consumer.eachMapping((m) => mappings.push(m));
mappings.sort((a, b) => a.generatedLine - b.generatedLine || a.generatedColumn - b.generatedColumn);
const bytes = new Map();
for (let i = 0; i < mappings.length; i++) {
  const m = mappings[i];
  const next = mappings[i + 1];
  const lineLen = lines[m.generatedLine - 1].length;
  const end = next && next.generatedLine === m.generatedLine ? next.generatedColumn : lineLen;
  const src = m.source || '(unmapped)';
  bytes.set(src, (bytes.get(src) || 0) + Math.max(0, end - m.generatedColumn));
}
const group = (src) => {
  const nm = src.match(/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/);
  if (nm) return 'npm:' + nm[1];
  const app = src.match(/(apps\/web\/src\/.*|packages\/[^/]+\/src\/.*)/);
  return app ? app[1] : src;
};
const byGroup = new Map();
for (const [src, n] of bytes) byGroup.set(group(src), (byGroup.get(group(src)) || 0) + n);
const total = [...byGroup.values()].reduce((a, b) => a + b, 0);
console.log(`chunk ${chunkPath}: ${code.length} raw bytes, ${total} attributed`);
const npmTotal = [...byGroup].filter(([k]) => k.startsWith('npm:')).reduce((a, [, n]) => a + n, 0);
console.log(`npm deps: ${npmTotal} (${((100 * npmTotal) / total).toFixed(1)}%)`);
for (const [k, n] of [...byGroup].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(`${String(n).padStart(8)}  ${((100 * n) / total).toFixed(1).padStart(5)}%  ${k}`);
}
