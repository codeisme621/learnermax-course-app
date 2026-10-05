/**
 * The app's public origin, per environment:
 * - Local and production set BETTER_AUTH_URL explicitly (http://localhost:3000, https://www.learnwithrico.com).
 * - Preview deployments have dynamic URLs, so BETTER_AUTH_URL is left unset there and the origin comes from
 *   Vercel's system variables: the stable per-branch URL, else the per-deployment URL.
 */
type Env = Record<string, string | undefined>; // reads BETTER_AUTH_URL, VERCEL_BRANCH_URL, VERCEL_URL

const https = (host: string) => `https://${host.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

export function resolveAppUrl(env: Env = process.env): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/$/, '');
  if (env.VERCEL_BRANCH_URL) return https(env.VERCEL_BRANCH_URL);
  if (env.VERCEL_URL) return https(env.VERCEL_URL);
  return 'http://localhost:3000';
}

/** Every origin a request to this deployment may legitimately come from. */
export function resolveTrustedOrigins(env: Env = process.env): string[] {
  const origins = [resolveAppUrl(env)];
  if (env.VERCEL_BRANCH_URL) origins.push(https(env.VERCEL_BRANCH_URL));
  if (env.VERCEL_URL) origins.push(https(env.VERCEL_URL));
  return [...new Set(origins)];
}
