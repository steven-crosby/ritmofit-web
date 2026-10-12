import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const web = resolve(root, 'apps/web');
// Tailwind resolves its app config/content globs against the web cwd.
process.chdir(web);
const require = createRequire(resolve(web, 'package.json'));
const { createServer } = await import(resolve(dirname(require.resolve('vite/package.json')), 'dist/node/index.js'));
const fixture = resolve(here, 'fixture.tsx');
const server = await createServer({
  root: web,
  configFile: resolve(web, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: Number(process.env.BUILDER_PORT ?? 5186), strictPort: true, fs: { allow: [root] } },
  plugins: [{ name: 'builder-refresh-synthetic', configureServer(server) {
    server.middlewares.use('/builder-refresh', async (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(await server.transformIndexHtml('/builder-refresh', `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="root"></div><script type="module" src="/@fs/${fixture}"></script></body></html>`));
    });
  } }],
});
await server.listen();
console.log(`Synthetic Builder fixture: http://127.0.0.1:${process.env.BUILDER_PORT ?? 5186}/builder-refresh`);
