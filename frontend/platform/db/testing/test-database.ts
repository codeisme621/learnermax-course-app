import path from 'node:path';
import { testDatabaseUrl } from './test-env';

/** Drop everything, apply checked-in migrations, seed. Proves a fresh database builds from the repo. */
export async function resetTestDatabase(): Promise<void> {
  process.env.DATABASE_URL = testDatabaseUrl();
  const { db } = await import('../client');
  const { migrate } = await import('drizzle-orm/neon-serverless/migrator');
  const { sql } = await import('drizzle-orm');
  const { seedDatabase } = await import('../seed');

  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'platform/db/migrations') });
  await seedDatabase(db);
  await db.$client.end();
}
