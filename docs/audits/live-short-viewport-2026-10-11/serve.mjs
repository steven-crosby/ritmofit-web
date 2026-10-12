// Run from the repository root after pnpm install; use a dedicated local port.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const repo = process.cwd();
const web = resolve(repo, 'apps/web');
const requireWeb = createRequire(resolve(web, 'package.json'));
const { createServer } = await import(
  resolve(dirname(requireWeb.resolve('vite/package.json')), 'dist/node/index.js')
);
const { default: react } = await import(requireWeb.resolve('@vitejs/plugin-react'));
const fixture = resolve(repo, 'docs/audits/live-short-viewport-2026-10-11/fixture.tsx');
// Tailwind's repo config resolves content globs from the web package's cwd.
process.chdir(web);
const server = await createServer({
  root: web,
  configFile: false,
  optimizeDeps: { entries: [fixture] },
  resolve: {
    alias: {
      react: resolve(web, 'node_modules/react'),
      'react-dom': resolve(web, 'node_modules/react-dom'),
    },
  },
  plugins: [
    {
      name: 'synthetic-recovery-adapter',
      resolveId(source) {
        if (source.includes('soundcloud-adapter')) return '\0synthetic-recovery-adapter';
      },
      load(id) {
        if (id !== '\0synthetic-recovery-adapter') return;
        // This adapter never contacts a provider. Only the evidence server aliases it.
        return `export const soundcloudAdapterFactory = () => ({
          provider: 'soundcloud',
          prepare: async () => {
            if (new URLSearchParams(location.search).get('state') === 'error') throw Error('Synthetic playback failure');
            return new Promise(() => {});
          },
          play: async () => {}, pause: async () => {}, seek: async () => {},
          stop: async () => {}, destroy: () => {},
        });`;
      },
    },
    react(),
    {
      name: 'synthetic-live-glance',
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url?.split('?')[0] !== '/live-short-viewport') return next();
          const html = await vite.transformIndexHtml(
            '/live-short-viewport',
            `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic Live glance</title></head><body><div id="root"></div><script type="module" src="/@fs/${fixture}"></script></body></html>`,
          );
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        });
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.GLANCE_PORT ?? 5185),
    strictPort: true,
    fs: { allow: [repo] },
  },
});
await server.listen();
server.printUrls();
