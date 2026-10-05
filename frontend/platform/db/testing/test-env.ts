import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'dotenv';

const ENV_FILE = '.env.test.local';

/**
 * The test database URL. Read only from .env.test.local so a reset can never
 * be pointed at the dev or production database by an inherited DATABASE_URL.
 */
export function testDatabaseUrl(): string {
  let parsed: Record<string, string>;
  try {
    parsed = parse(readFileSync(path.resolve(process.cwd(), ENV_FILE)));
  } catch {
    throw new Error(`${ENV_FILE} is missing. Create it with DATABASE_URL for the Neon "test" branch (see AGENTS.md).`);
  }
  if (!parsed.DATABASE_URL) {
    throw new Error(`${ENV_FILE} has no DATABASE_URL`);
  }
  return parsed.DATABASE_URL;
}

/** The Stripe sandbox key from .env.local (tests create real sandbox Checkout Sessions). Never a live key. */
export function sandboxStripeKey(): string {
  let parsed: Record<string, string> = {};
  try {
    parsed = parse(readFileSync(path.resolve(process.cwd(), '.env.local')));
  } catch {
    // fall through to the error below
  }
  const key = parsed.STRIPE_SECRET_KEY ?? '';
  if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
    throw new Error('STRIPE_SECRET_KEY in .env.local must be a test-mode key (run ./scripts/pull-local-secrets.sh)');
  }
  return key;
}
