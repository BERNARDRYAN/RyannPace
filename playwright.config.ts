import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests. In CI they run against a production build; locally they
 * use the dev server on :3000 (starting it if needed) and never build, because
 * a production build writes into the same .next folder and breaks a running
 * dev server. Point them anywhere else with E2E_BASE_URL=https://... .
 * Locally they drive the installed Microsoft Edge, so no browser download is needed.
 */
const externalBaseUrl = process.env.E2E_BASE_URL;
const isCI = !!process.env.CI;
const baseURL = externalBaseUrl ?? (isCI ? 'http://localhost:3100' : 'http://localhost:3000');

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
        command: isCI ? 'npm run build && npm run start -- -p 3100' : 'npm run dev',
        url: baseURL,
        timeout: 300_000,
        reuseExistingServer: !isCI,
      },
});
