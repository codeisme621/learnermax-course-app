import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Acceptance criterion: the new dashboard runtime makes no Cognito / API Gateway / business
 * Lambda / DynamoDB calls. This scans everything that ships in the Next.js app (not tests)
 * plus the dependency list, so a regression fails the build instead of a review.
 *
 * Allowed AWS: SES (email) via @aws-sdk/client-sesv2, credentials via Vercel OIDC.
 */
const ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIRS = ['app', 'features', 'platform', 'lib', 'components', 'hooks', 'types'];
const RUNTIME_FILES = ['proxy.ts', 'next.config.ts'];

const FORBIDDEN: Array<[string, RegExp]> = [
  ['Cognito', /cognito/i],
  ['API Gateway URL', /execute-api|NEXT_PUBLIC_API_URL/],
  ['DynamoDB', /dynamodb/i],
  ['SNS / SQS / Lambda clients', /@aws-sdk\/client-(sns|sqs|lambda)/],
  ['CloudFront signing / legacy video CDN', /CloudFront-(Policy|Signature|Key-Pair-Id)|cloudfront-signer|NEXT_PUBLIC_VIDEO_CDN_DOMAIN/],
  ['NextAuth', /next-auth|@auth\/core/],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === 'testing' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = [...RUNTIME_DIRS.flatMap((d) => sourceFiles(path.join(ROOT, d))), ...RUNTIME_FILES.map((f) => path.join(ROOT, f))];

describe('runtime boundaries', () => {
  it('scans a meaningful set of runtime files', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(FORBIDDEN)('no runtime code references %s', (_label, pattern) => {
    const hits = files.filter((f) => pattern.test(readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
    expect(hits).toEqual([]);
  });

  it('declares no legacy AWS or auth dependencies; SES is the only AWS service client', () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => d.startsWith('@aws-sdk/'))).toEqual(['@aws-sdk/client-sesv2']);
    expect(deps.filter((d) => /next-auth|@auth\/|cognito|amazon-cognito/.test(d))).toEqual([]);
  });
});
