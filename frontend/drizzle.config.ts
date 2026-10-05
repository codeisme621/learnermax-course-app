import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local', quiet: true });

export default defineConfig({
  dialect: 'postgresql',
  schema: './platform/db/schema.ts',
  out: './platform/db/migrations',
  dbCredentials: {
    // Migrations run over a direct (unpooled) connection when one is provided.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '',
  },
  strict: true,
});
