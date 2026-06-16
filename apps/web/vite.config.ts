import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
