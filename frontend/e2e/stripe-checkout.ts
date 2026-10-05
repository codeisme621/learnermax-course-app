import type { Page } from '@playwright/test';

/** Fill and submit Stripe's hosted Checkout page with a sandbox test card. */
export async function payOnStripe(page: Page, cardNumber = '4242424242424242') {
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  const card = page.locator('#cardNumber');
  await card.waitFor({ timeout: 30_000 });
  await card.fill(cardNumber);
  await page.locator('#cardExpiry').fill('12 / 34');
  await page.locator('#cardCvc').fill('123');
  await page.locator('#billingName').fill('Test Buyer');
  const postal = page.locator('#billingPostalCode');
  if (await postal.isVisible()) {
    await postal.fill('10001');
  }
  // Stripe pre-checks Link's "save my info", which then requires a phone number. Opt out.
  const saveWithLink = page.getByRole('checkbox', { name: 'Save my information for faster checkout' });
  if ((await saveWithLink.isVisible()) && (await saveWithLink.isChecked())) {
    await saveWithLink.uncheck();
  }
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
}
