# E2E Tests

End-to-end testing suite for LearnerMax Course App using Playwright.

## Setup

Install dependencies and Playwright browsers:

```bash
npm install
npx playwright install chromium
```

## Running Tests

Run all tests:
```bash
npm test
```

Run tests with UI mode:
```bash
npm run test:ui
```

Run tests in headed mode (see the browser):
```bash
npm run test:headed
```

Run tests for a specific browser:
```bash
npm run test:chromium
```

View test report:
```bash
npm run report
```

## Configuration

The test configuration is in `playwright.config.ts`. By default, tests run against `http://localhost:3000`.

To test against a different URL, set the `BASE_URL` environment variable:

```bash
BASE_URL=https://your-app.vercel.app npm test
```

## Writing Tests

Tests are located in the `tests/` directory. See `tests/example.spec.ts` for an example.

For more information on writing Playwright tests, see the [Playwright documentation](https://playwright.dev/docs/writing-tests).

## CI/CD Integration

In CI environments, tests will:
- Run in headless mode
- Retry failed tests twice
- Generate an HTML report

The test suite will automatically start the frontend dev server if it's not already running.
