import { test, expect } from '@playwright/test';

test.describe('Enrollment Page', () => {
  test.beforeEach(async ({ page }) => {
    // Required: Bypass Vercel protection for automated testing
    await page.setExtraHTTPHeaders({
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!
    });
    await page.goto('/enroll?courseid=course-001');
  });

  test('should display header', async ({ page }) => {
    await expect(page.getByText('LearnerMax').first()).toBeVisible();
  });

  test('should display enrollment page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /enroll in the course/i })).toBeVisible();
    await expect(page.getByText(/start your learning journey today/i).first()).toBeVisible();
  });

  test('should display Google sign-in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should display enrollment form fields', async ({ page }) => {
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should display create account button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('should display terms of service text', async ({ page }) => {
    await expect(page.getByText(/by signing up, you agree to our terms/i)).toBeVisible();
  });

  test('should require all form fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.getByRole('button', { name: /create account/i }).click();

    // Check that form validation prevents submission (HTML5 validation)
    const nameInput = page.getByLabel(/full name/i);
    const isRequired = await nameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('should accept form input', async ({ page }) => {
    await page.getByLabel(/full name/i).fill('John Doe');
    await page.getByLabel(/email address/i).fill('john@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Verify input was accepted
    await expect(page.getByLabel(/full name/i)).toHaveValue('John Doe');
    await expect(page.getByLabel(/email address/i)).toHaveValue('john@example.com');
    await expect(page.getByLabel(/password/i)).toHaveValue('password123');
  });

  test('should validate email format', async ({ page }) => {
    const emailInput = page.getByLabel(/email address/i);
    const inputType = await emailInput.getAttribute('type');
    expect(inputType).toBe('email');
  });

  test('should navigate back to home when clicking logo', async ({ page }) => {
    await page.getByText('LearnerMax').first().click();
    await expect(page).toHaveURL('/');
  });

  test('should display footer', async ({ page }) => {
    await expect(page.getByLabel('Facebook')).toBeVisible();
  });
});
