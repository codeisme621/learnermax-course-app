# E2E Tests

End-to-end tests for LearnerMax application using Playwright.

## Test Organization

Tests are organized by concern into separate directories:

### `api/` - API Tests
**Purpose**: Test backend API endpoints directly
**When to use**: Testing REST APIs, data validation, business logic

Example:
```typescript
// api/hello.spec.ts
test('should return hello world message', async ({ request }) => {
  const response = await request.get(process.env.API_URL, {
    headers: { 'x-api-key': process.env.API_KEY },
  });
  expect(response.status()).toBe(200);
});
```

### `ui/` - UI Tests
**Purpose**: Test frontend user interface and user flows
**When to use**: Testing pages, user interactions, visual elements

**IMPORTANT**: Every UI test must include Vercel protection bypass headers:

Example:
```typescript
// ui/landing-page.spec.ts
test('should display landing page', async ({ page }) => {
  // Required: Bypass Vercel protection for automated testing
  await page.setExtraHTTPHeaders({
    'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  });

  await page.goto('/');
  await expect(page.getByRole('heading')).toBeVisible();
});
```

## Running Tests

```bash
# Run all tests (both API and UI)
pnpm test

# Run only API tests
pnpm test --project=api

# Run only UI tests
pnpm test --project=ui

# Run with UI mode
pnpm test:ui

# Run in headed mode (see browser)
pnpm test:headed
```

## Environment Setup

Tests use environment variables from `.env`:

- `API_URL` - Backend API endpoint URL
- `API_KEY` - API authentication key
- `BASE_URL` - Frontend application URL
- `VERCEL_AUTOMATION_BYPASS_SECRET` - Required for UI tests to bypass Vercel protection

Use `preview-backend.sh` to configure the preview environment.

## Single Concern Philosophy

Each test file should focus on a **single endpoint or feature**:

✅ Good:
- `api/hello.spec.ts` - Tests only the hello endpoint
- `ui/landing-page.spec.ts` - Tests only the landing page

❌ Avoid:
- `api/all-endpoints.spec.ts` - Tests multiple endpoints
- `ui/everything.spec.ts` - Tests multiple pages
