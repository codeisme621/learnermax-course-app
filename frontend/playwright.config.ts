import { defineConfig, devices } from '@playwright/test';
import { testDatabaseUrl } from './platform/db/testing/test-env';

import path from 'node:path';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const EMAIL_CAPTURE_DIR = path.resolve(__dirname, '.email-capture-e2e');

// Shared by the app server and the test process (fixtures talk to the same test database and mailbox).
const testEnv = {
  DATABASE_URL: testDatabaseUrl(),
  BETTER_AUTH_URL: baseURL,
  BETTER_AUTH_SECRET: 'e2e-only-secret-not-used-anywhere-else-0123456789',
  EMAIL_TRANSPORT: 'capture',
  EMAIL_CAPTURE_DIR,
};
Object.assign(process.env, testEnv);

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
    env: { ...testEnv, NEXT_DIST_DIR: '.next-e2e' },
  },
});
