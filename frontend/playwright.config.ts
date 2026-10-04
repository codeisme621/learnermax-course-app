import { defineConfig, devices } from '@playwright/test';
import { testDatabaseUrl } from './platform/db/testing/test-env';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Specs share one database, so run them in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next dev --turbopack --port ${PORT}`,
    url: baseURL,
    // Always a fresh server wired to the test branch, never a developer's running server.
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: testDatabaseUrl(),
      NEXT_DIST_DIR: '.next-e2e',
    },
  },
});
