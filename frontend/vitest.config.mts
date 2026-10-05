import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { sandboxStripeKey, testDatabaseUrl } from './platform/db/testing/test-env';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname) },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    // One shared, freshly reset Neon "test" branch per run.
    globalSetup: ['./platform/db/testing/vitest-global-setup.ts'],
    env: {
      DATABASE_URL: testDatabaseUrl(),
      BETTER_AUTH_SECRET: 'vitest-only-secret-not-used-anywhere-else-0123456789',
      BETTER_AUTH_URL: 'http://localhost:3100',
      EMAIL_TRANSPORT: 'capture',
      EMAIL_CAPTURE_DIR: path.resolve(import.meta.dirname, '.email-capture-vitest'),
      STRIPE_SECRET_KEY: sandboxStripeKey(),
      // Tests sign their own webhook payloads with this; it is not a real endpoint secret.
      STRIPE_WEBHOOK_SECRET: 'whsec_vitest_only_secret',
    },
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
