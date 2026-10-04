import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
  test('renders the sales page from the seeded course without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/Agentic Engineering/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Become the engineer your team follows into agentic development/ }),
    ).toBeVisible();
    // Never the dev-only "Failed to Load Course Data" screen.
    await expect(page.getByText('Failed to Load Course Data')).toHaveCount(0);

    const offer = page.locator('#enroll');
    await expect(offer.getByText('$399')).toBeVisible();
    await expect(offer.getByRole('button', { name: /Join the founding cohort/ })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
