# Vercel Environment Variables Setup

This document explains how to configure environment variables in the Vercel dashboard for different deployment environments.

## Authentication Strategy by Environment

**Production**: Full OAuth support (Google via Cognito) + Email/Password
**Preview**: Email/Password only (OAuth disabled due to dynamic URLs)
**Local**: Full OAuth support + Email/Password

> **Note**: Auth.js redirect proxy (`AUTH_REDIRECT_PROXY_URL`) does not work with Cognito/OIDC providers - it only supports GitHub. Preview deployments use credentials-based authentication only.

## Environment Variables to Configure

### Production Environment

In Vercel Dashboard → Project Settings → Environment Variables → Production:

```bash
AUTH_URL=https://www.learnwithrico.com
AUTH_SECRET=<your-secret-from-local-env>

# Cognito Configuration
COGNITO_REGION=<your-region>
COGNITO_USER_POOL_ID=<your-user-pool-id>
COGNITO_CLIENT_ID=<your-client-id>
COGNITO_ISSUER_URL=https://cognito-idp.<region>.amazonaws.com/<user-pool-id>
COGNITO_USER_POOL_DOMAIN=<your-cognito-domain>.auth.<region>.amazoncognito.com

# Client-side Cognito
NEXT_PUBLIC_COGNITO_REGION=<your-region>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<your-client-id>

# Backend API
NEXT_PUBLIC_API_URL=<your-api-gateway-url>
```

### Preview Environment

In Vercel Dashboard → Project Settings → Environment Variables → Preview:

```bash
# DO NOT set AUTH_URL - let Auth.js auto-detect from VERCEL_URL
# NOTE: OAuth (Google) is disabled in preview - only credentials work
AUTH_SECRET=<same-secret-as-production>

# Cognito Configuration (same as production)
COGNITO_REGION=<your-region>
COGNITO_USER_POOL_ID=<your-user-pool-id>
COGNITO_CLIENT_ID=<your-client-id>
COGNITO_ISSUER_URL=https://cognito-idp.<region>.amazonaws.com/<user-pool-id>
COGNITO_USER_POOL_DOMAIN=<your-cognito-domain>.auth.<region>.amazoncognito.com

# Client-side Cognito
NEXT_PUBLIC_COGNITO_REGION=<your-region>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<your-client-id>

# Backend API
NEXT_PUBLIC_API_URL=<your-api-gateway-url>
```

### Development Environment (Optional)

In Vercel Dashboard → Project Settings → Environment Variables → Development:

```bash
# These are for `vercel dev` command - local development typically uses .env.local
AUTH_URL=http://localhost:3000
AUTH_SECRET=<same-secret-as-production>
```

## Important Notes

1. **AUTH_SECRET Must Be Identical**: All environments (local, preview, production) must use the same `AUTH_SECRET`. Copy the value from your local `.env.local` file.

2. **Preview Environment - No AUTH_URL**: In preview deployments, do NOT set `AUTH_URL`. Auth.js will automatically detect the deployment URL from Vercel's `VERCEL_URL` system variable.

3. **Production Environment - Explicit AUTH_URL**: In production, explicitly set `AUTH_URL=<Your domain>` to ensure consistent behavior.

4. **Preview OAuth Limitation**: Google OAuth does not work in preview deployments due to dynamic URLs. Users must use email/password sign-in for preview testing.

5. **Replace Placeholders**: Update all `<placeholders>` with your actual values from your local `.env.local` or AWS outputs.

## How It Works

### Production:
1. User visits `<Your Domain>`
2. Clicks "Sign in with Google"
3. Auth.js redirects to Cognito → Google
4. After Google authentication, callback goes to `<Your Domain>/api/auth/callback/cognito`
5. User is authenticated on production

### Preview:
1. User visits preview deployment (e.g., `project-abc123.vercel.app`)
2. Only email/password sign-in available (Google OAuth disabled)
3. User authenticates with credentials via Cognito
4. User is authenticated on preview deployment

### Local:
1. User visits `localhost:3000`
2. Can use both Google OAuth and email/password
3. OAuth callback goes to `http://localhost:3000/api/auth/callback/cognito`

## Verification Steps

After configuring variables in Vercel:

1. Trigger a new preview deployment (push to a branch)
2. Visit the preview URL
3. Try signing in with Google
4. Verify successful authentication

## Troubleshooting

- **Error: "Redirect URI mismatch"**: Ensure Cognito callback URLs in SAM template match your domain (`<Your Domain>/api/auth/callback/cognito` and `http://localhost:3000/api/auth/callback/cognito`)
- **Error: "Invalid state"**: Ensure `AUTH_SECRET` is identical across all environments
- **Google OAuth in preview**: This is not supported - use email/password sign-in for preview testing
- **Production OAuth fails**: Verify production Cognito User Pool has the correct callback URL configured
