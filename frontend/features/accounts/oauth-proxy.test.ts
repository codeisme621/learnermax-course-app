import { afterEach, describe, expect, it, vi } from 'vitest';

// The auth config is built at import time from env, so each case imports a fresh copy.
async function googleRedirectUri(env: Record<string, string | undefined>): Promise<string> {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  const { auth } = await import('@/features/accounts');
  const { url } = await auth.api.signInSocial({ body: { provider: 'google', callbackURL: '/dashboard' }, headers: new Headers() });
  if (!url) throw new Error('no Google authorization URL');
  return new URL(url).searchParams.get('redirect_uri') ?? '';
}

const GOOGLE = { GOOGLE_CLIENT_ID: 'test-client-id', GOOGLE_CLIENT_SECRET: 'test-client-secret' };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Google OAuth redirect per environment', () => {
  it('local: talks to Google directly with its own callback', async () => {
    expect(await googleRedirectUri({ ...GOOGLE, BETTER_AUTH_URL: 'http://localhost:3000', OAUTH_PROXY_SECRET: undefined })).toBe(
      'http://localhost:3000/api/auth/callback/google',
    );
  });

  it('preview (dynamic URL): goes through production\'s registered callback via the OAuth proxy', async () => {
    const redirect = await googleRedirectUri({
      ...GOOGLE,
      BETTER_AUTH_URL: undefined,
      VERCEL_BRANCH_URL: 'learnermax-course-app-git-feature-x-learner-max.vercel.app',
      VERCEL_URL: 'learnermax-course-abc123-learner-max.vercel.app',
      OAUTH_PROXY_SECRET: 'proxy-secret-for-tests-only-0123456789',
      AUTH_PRODUCTION_URL: 'https://www.learnwithrico.com',
    });
    expect(redirect).toBe('https://www.learnwithrico.com/api/auth/callback/google');
  });

  it('production: its own callback (no proxying)', async () => {
    expect(
      await googleRedirectUri({
        ...GOOGLE,
        BETTER_AUTH_URL: 'https://www.learnwithrico.com',
        VERCEL_URL: 'learnermax-course-prod-learner-max.vercel.app',
        OAUTH_PROXY_SECRET: 'proxy-secret-for-tests-only-0123456789',
        AUTH_PRODUCTION_URL: 'https://www.learnwithrico.com',
      }),
    ).toBe('https://www.learnwithrico.com/api/auth/callback/google');
  });
});
