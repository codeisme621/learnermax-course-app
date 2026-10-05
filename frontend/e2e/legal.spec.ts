import { expect, test } from '@playwright/test';

test('legal pages exist, are linked from the footer, and checkout shows consent', async ({ page }) => {
  for (const [path, heading] of [
    ['/terms', 'Terms of Service'],
    ['/privacy', 'Privacy Policy'],
    ['/refund-policy', 'Refund Policy'],
  ] as const) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
  await expect(page.getByText('30-day satisfaction guarantee.')).toBeVisible();

  await page.goto('/');
  const legalNav = page.getByRole('navigation', { name: 'Legal' });
  await expect(legalNav.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  await expect(legalNav.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  await expect(legalNav.getByRole('link', { name: 'Refund Policy' })).toHaveAttribute('href', '/refund-policy');

  await page.goto('/checkout');
  await expect(page.getByText(/By continuing you agree to our/)).toBeVisible();
});
