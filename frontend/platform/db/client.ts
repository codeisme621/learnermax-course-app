import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Node < 22 has no global WebSocket; the Pool driver needs one for transactions.
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return drizzle({ client: new Pool({ connectionString }), schema });
}

export type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { db?: Db };

// Reuse one pool across hot reloads in dev and across invocations on a warm function.
export const db: Db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
