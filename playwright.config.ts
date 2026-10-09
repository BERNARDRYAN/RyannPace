import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a production build by default (CI).
 * Locally you can point them at a running dev server instead:
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 * Locally they drive the installed Microsoft Edge, so no browser download is needed.
 */
const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? 'http://localhost:3100';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    acceptDownloads: true,
    ...(isCI ? {} : { channel: 'msedge' }),
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run build && npm run start -- -p 3100',
        url: baseURL,
        timeout: 300_000,
        reuseExistingServer: !isCI,
      },
});
