import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

// Imported after dotenv so the client sees DATABASE_URL.
async function main() {
  const { db } = await import('./client');
  const { seedDatabase } = await import('./seed');
  await seedDatabase(db);
  console.log('Seed complete');
  await db.$client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
