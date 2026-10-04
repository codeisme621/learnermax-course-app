import { resetTestDatabase } from '../platform/db/testing/test-database';

export default async function globalSetup() {
  await resetTestDatabase();
}
