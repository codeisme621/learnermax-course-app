import { clearCapturedEmails } from '../platform/email/testing';
import { resetTestDatabase } from '../platform/db/testing/test-database';

export default async function globalSetup() {
  await resetTestDatabase();
  await clearCapturedEmails(process.env.EMAIL_CAPTURE_DIR ?? '');
}
