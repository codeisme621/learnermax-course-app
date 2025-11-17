/**
 * Integration test setup with MSW
 * This file is loaded via setupFilesAfterEnv for integration tests only
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create MSW server instance
export const server = setupServer(...handlers);

// Setup request interception before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers to initial state after each test
// This ensures test isolation
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
