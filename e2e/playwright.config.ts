import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '8798';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  // Both viewports share one Worker and one fresh D1; each signs up its own instructor.
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  outputDir: '.state/test-results',
  use: {
    baseURL,
    // `E2E_CHANNEL=chrome` uses the installed Google Chrome instead of Playwright's Chromium.
    channel: process.env.E2E_CHANNEL || undefined,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'phone-390',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: 'node serve.mjs',
    url: `${baseURL}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
