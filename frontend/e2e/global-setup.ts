import { spawn } from 'node:child_process';
import { clearCapturedEmails } from '../platform/email/testing';
import { resetTestDatabase } from '../platform/db/testing/test-database';
import { sandboxStripeKey } from '../platform/db/testing/test-env';

/** Forward real sandbox webhooks to the Playwright server, like `pnpm stripe:listen 3100`. */
async function startStripeListen(port: number): Promise<() => void> {
  const proc = spawn(
    'stripe',
    [
      'listen',
      '--api-key', sandboxStripeKey(),
      '--events', 'checkout.session.completed,checkout.session.expired,refund.created,refund.updated',
      '--forward-to', `localhost:${port}/api/webhooks/stripe`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stripe listen did not become ready')), 30_000);
    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes('Ready!')) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', (code) => reject(new Error(`stripe listen exited (${code})`)));
  });
  return () => proc.kill();
}

export default async function globalSetup() {
  await resetTestDatabase();
  await clearCapturedEmails(process.env.EMAIL_CAPTURE_DIR ?? '');
  const stopListening = await startStripeListen(3100);
  return async () => stopListening();
}
