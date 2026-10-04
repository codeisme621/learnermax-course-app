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
