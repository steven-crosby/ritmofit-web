// Approximate gzip weight per source group: concatenates each group's generated segments and gzips them alone.
// Isolated gzip overstates a group's marginal cost slightly (no shared dictionary with the rest of the chunk).
const fs = require('fs');
const zlib = require('zlib');
const [, , chunkPath, smDir, ...groups] = process.argv;
const { SourceMapConsumer } = require(smDir);
const code = fs.readFileSync(chunkPath, 'utf8');
const consumer = new SourceMapConsumer(JSON.parse(fs.readFileSync(chunkPath + '.map', 'utf8')));
const lines = code.split('\n');
const ms = [];
consumer.eachMapping((m) => ms.push(m));
ms.sort((a, b) => a.generatedLine - b.generatedLine || a.generatedColumn - b.generatedColumn);
const parts = Object.fromEntries(groups.map((g) => [g, []]));
for (let i = 0; i < ms.length; i++) {
  const m = ms[i], n = ms[i + 1];
  const line = lines[m.generatedLine - 1];
  const end = n && n.generatedLine === m.generatedLine ? n.generatedColumn : line.length;
  for (const g of groups) if ((m.source || '').includes(g)) parts[g].push(line.slice(m.generatedColumn, end));
}
console.log(`whole chunk gzip -9: ${zlib.gzipSync(code, { level: 9 }).length}`);
for (const g of groups) {
  const s = parts[g].join('');
  console.log(`${g}: raw ${s.length}, isolated gzip -9 ${zlib.gzipSync(s, { level: 9 }).length}`);
}
