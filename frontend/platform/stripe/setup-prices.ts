/**
 * Idempotently create the Stripe Product + Price for every course on sale, in whichever
 * account STRIPE_SECRET_KEY belongs to (run once per account: sandbox, then live).
 * Prices are found by lookup key, so the app needs no per-environment price IDs.
 *
 *   pnpm stripe:setup            (uses .env.local)
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

async function main() {
  const { stripe } = await import('./stripe');
  const { db } = await import('../db/client');
  const { courses } = await import('../db/schema');
  const { stripePriceLookupKey } = await import('../../features/courses/courses.service');

  const account = await stripe().accounts.retrieveCurrent();
  console.log(`Stripe account ${account.id} (${account.settings?.dashboard?.display_name ?? 'unnamed'})`);

  for (const course of await db.select().from(courses)) {
    if (course.comingSoon) continue;
    const lookupKey = stripePriceLookupKey(course);
    const existing = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    if (existing.data[0]) {
      console.log(`✓ ${course.id}: price ${existing.data[0].id} already exists (${lookupKey})`);
      continue;
    }
    const product = await stripe().products.create(
      { name: course.name, description: course.description, metadata: { courseId: course.id } },
      { idempotencyKey: `product-${course.id}` },
    );
    const price = await stripe().prices.create(
      {
        product: product.id,
        unit_amount: course.priceCents,
        currency: course.currency,
        lookup_key: lookupKey,
        metadata: { courseId: course.id },
      },
      { idempotencyKey: `price-${lookupKey}` },
    );
    console.log(`+ ${course.id}: created product ${product.id}, price ${price.id} (${lookupKey})`);
  }
  await db.$client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
