import { describe, expect, it } from 'vitest';
import { resolveAppUrl, resolveTrustedOrigins } from './app-url';

describe('app URL per environment', () => {
  it('local and production: the explicit BETTER_AUTH_URL wins', () => {
    expect(resolveAppUrl({ BETTER_AUTH_URL: 'http://localhost:3000' })).toBe('http://localhost:3000');
    expect(
      resolveAppUrl({ BETTER_AUTH_URL: 'https://www.learnwithrico.com/', VERCEL_URL: 'learnermax-course-abc-learner-max.vercel.app' }),
    ).toBe('https://www.learnwithrico.com');
  });

  it('preview: the stable branch URL, then the deployment URL', () => {
    const preview = {
      VERCEL_BRANCH_URL: 'learnermax-course-app-git-feature-x-learner-max.vercel.app',
      VERCEL_URL: 'learnermax-course-abc123-learner-max.vercel.app',
    };
    expect(resolveAppUrl(preview)).toBe('https://learnermax-course-app-git-feature-x-learner-max.vercel.app');
    expect(resolveAppUrl({ VERCEL_URL: preview.VERCEL_URL })).toBe('https://learnermax-course-abc123-learner-max.vercel.app');
    expect(resolveTrustedOrigins(preview)).toEqual([
      'https://learnermax-course-app-git-feature-x-learner-max.vercel.app',
      'https://learnermax-course-abc123-learner-max.vercel.app',
    ]);
  });

  it('falls back to localhost when nothing is set', () => {
    expect(resolveAppUrl({})).toBe('http://localhost:3000');
  });
});
