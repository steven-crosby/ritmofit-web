import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'RitmoFit',
        short_name: 'RitmoFit',
        description: 'Premium choreography and class-management tool for rhythm spin instructors.',
        theme_color: '#1a110d',
        icons: [
          {
            src: 'icons/logo-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
  // Vitest reuses this config (and the React/JSX transform above). The default
  // environment is node (enough for the pure-logic suites); component-rendering
  // tests opt into jsdom per file with a `// @vitest-environment jsdom` pragma.
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
