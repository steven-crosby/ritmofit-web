import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // Vitest reuses this config (and the React/JSX transform above). The current
  // suite is pure logic (no DOM), so the node environment is enough; add jsdom
  // here if component-rendering tests arrive.
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
