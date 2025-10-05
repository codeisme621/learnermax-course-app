import { test, expect } from '@playwright/test';

test.describe('Hello API', () => {
  test('should return hello world message', async ({ request }) => {
    const apiUrl = process.env.API_URL;
    const apiKey = process.env.API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error('API_URL and API_KEY must be set in .env file');
    }

    const response = await request.get(apiUrl, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ message: 'hello world' });
  });
});
