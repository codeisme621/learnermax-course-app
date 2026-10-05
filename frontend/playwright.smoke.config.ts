import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke checks against a deployed environment (no local server, no database access).
 *   SMOKE_URL=https://… pnpm smoke                 read-only checks (safe for production)
 *   SMOKE_URL=https://… pnpm smoke --purchase      + a sandbox purchase (preview only; see scripts/smoke.sh)
 * Protected preview deployments need VERCEL_AUTOMATION_BYPASS_SECRET.
 */
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
