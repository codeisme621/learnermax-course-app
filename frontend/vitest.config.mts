import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './platform/db/testing/test-env';

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
    env: { DATABASE_URL: testDatabaseUrl() },
    fileParallelism: false,
  },
});
