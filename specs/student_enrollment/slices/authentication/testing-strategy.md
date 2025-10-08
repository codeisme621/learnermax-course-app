# E2E Testing Strategy: Cognito Authentication

**Date**: 2025-10-07
**Purpose**: Define comprehensive E2E testing strategy for Cognito authentication in both UI and API tests

## Executive Summary

Based on extensive research of 2024-2025 best practices, this document outlines the recommended testing strategy for the LearnerMax authentication system using AWS Cognito. The approach uses **programmatic authentication with pre-created confirmed users** for reliability and speed.

### Key Recommendations

1. **UI E2E Tests (Playwright)**: Use AWS SDK programmatic authentication, bypass Cognito Hosted UI
2. **API E2E Tests**: Use `AdminInitiateAuth` to generate JWT tokens for authenticated requests
3. **Test Users**: Create confirmed users programmatically using `AdminCreateUser` + `AdminSetUserPassword`
4. **Environment**: Separate Cognito User Pool for testing (preview/staging environments)

---

## 1. UI E2E Testing Strategy (Playwright)

### Approach: Programmatic Authentication with Storage State

**Why this approach**:
- ✅ 85-95% faster than UI-based login
- ✅ More reliable (no flaky Cognito Hosted UI interactions)
- ✅ Avoids SSL certificate issues with Cognito domains
- ✅ Reusable across multiple tests
- ✅ Supports testing with multiple user roles

**Implementation Pattern**:

#### Global Setup Script

```typescript
// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";

async function globalSetup(config: FullConfig) {
  const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || "us-east-1"
  });

  // Test user credentials (pre-created in test User Pool)
  const username = process.env.TEST_USER_USERNAME || 'test-student@learnermax.com';
  const password = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

  // Authenticate via Cognito Admin API
  const response = await client.send(new AdminInitiateAuthCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    ClientId: process.env.COGNITO_CLIENT_ID,
    AuthFlow: "ADMIN_NO_SRP_AUTH",
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  }));

  const idToken = response.AuthenticationResult?.IdToken;
  const accessToken = response.AuthenticationResult?.AccessToken;
  const refreshToken = response.AuthenticationResult?.RefreshToken;

  // Create storage state for Playwright
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Set localStorage items that NextAuth/Cognito client expects
  await context.addInitScript(({ clientId, username, idToken, accessToken, refreshToken }) => {
    const prefix = `CognitoIdentityServiceProvider.${clientId}`;
    localStorage.setItem(`${prefix}.LastAuthUser`, username);
    localStorage.setItem(`${prefix}.${username}.idToken`, idToken);
    localStorage.setItem(`${prefix}.${username}.accessToken`, accessToken);
    localStorage.setItem(`${prefix}.${username}.refreshToken`, refreshToken);

    // NextAuth session (if using NextAuth)
    const session = {
      user: { email: username, name: 'Test User' },
      accessToken,
      idToken,
      expires: new Date(Date.now() + 3600000).toISOString() // 1 hour
    };
    localStorage.setItem('nextauth.session', JSON.stringify(session));
  }, {
    clientId: process.env.COGNITO_CLIENT_ID!,
    username,
    idToken: idToken!,
    accessToken: accessToken!,
    refreshToken: refreshToken!,
  });

  // Save storage state to file
  await context.storageState({ path: 'e2e/.auth/user.json' });
  await browser.close();
}

export default globalSetup;
```

#### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    // Use the authenticated storage state
    storageState: 'e2e/.auth/user.json',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

#### Example E2E Test

```typescript
// e2e/student-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authenticated Student Dashboard', () => {
  test('should access protected dashboard page', async ({ page }) => {
    // User is already authenticated via storage state
    await page.goto('/dashboard');

    // Should NOT be redirected to login
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify user content is visible
    await expect(page.locator('text=Welcome, Test User')).toBeVisible();
  });

  test('should view enrolled courses', async ({ page }) => {
    await page.goto('/my-courses');

    await expect(page.locator('[data-testid="course-list"]')).toBeVisible();
  });
});
```

#### Testing Unauthenticated Flows

```typescript
// e2e/auth-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows (No Pre-auth)', () => {
  // Override storage state for this test suite
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should redirect unauthenticated user to signin', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/.*signin/);
  });

  test('should show enrollment page for new users', async ({ page }) => {
    await page.goto('/enroll?courseid=intro-to-programming');

    await expect(page.locator('h1')).toContainText('Enroll');
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});
```

---

## 2. API E2E Testing Strategy

### Approach: AdminInitiateAuth with Token Caching

**Why this approach**:
- ✅ Generate valid JWT tokens without UI interaction
- ✅ Full control over test user authentication
- ✅ Token caching for performance
- ✅ Supports token refresh for long-running test suites

**Implementation Pattern**:

#### Token Manager Utility

```typescript
// e2e/utils/cognito-token-manager.ts
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  InitiateAuthCommand
} from "@aws-sdk/client-cognito-identity-provider";

interface TokenSet {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class CognitoTokenManager {
  private client: CognitoIdentityProviderClient;
  private tokens: Map<string, TokenSet> = new Map();

  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || "us-east-1"
    });
  }

  /**
   * Get valid access token for a user (cached, auto-refreshed)
   */
  async getAccessToken(username: string, password: string): Promise<string> {
    const cached = this.tokens.get(username);

    // Return cached token if still valid (with 5min buffer)
    if (cached && Date.now() < cached.expiresAt - 5 * 60 * 1000) {
      return cached.accessToken;
    }

    // Refresh token if available
    if (cached?.refreshToken) {
      try {
        const refreshed = await this.refreshToken(cached.refreshToken);
        this.cacheTokens(username, refreshed);
        return refreshed.accessToken;
      } catch (error) {
        console.warn(`Token refresh failed for ${username}, re-authenticating`);
      }
    }

    // Authenticate and cache tokens
    const tokens = await this.authenticate(username, password);
    this.cacheTokens(username, tokens);
    return tokens.accessToken;
  }

  /**
   * Get ID token (contains user claims)
   */
  async getIdToken(username: string, password: string): Promise<string> {
    const cached = this.tokens.get(username);

    if (cached && Date.now() < cached.expiresAt - 5 * 60 * 1000) {
      return cached.idToken;
    }

    const tokens = await this.authenticate(username, password);
    this.cacheTokens(username, tokens);
    return tokens.idToken;
  }

  /**
   * Authenticate using Admin API (server-side only)
   */
  private async authenticate(username: string, password: string): Promise<TokenSet> {
    const response = await this.client.send(new AdminInitiateAuthCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: "ADMIN_NO_SRP_AUTH",
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }));

    if (!response.AuthenticationResult) {
      throw new Error(`Authentication failed for user: ${username}`);
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      refreshToken: response.AuthenticationResult.RefreshToken!,
      expiresAt: Date.now() + (response.AuthenticationResult.ExpiresIn! * 1000),
    };
  }

  /**
   * Refresh access and ID tokens using refresh token
   */
  private async refreshToken(refreshToken: string): Promise<TokenSet> {
    const response = await this.client.send(new InitiateAuthCommand({
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }));

    if (!response.AuthenticationResult) {
      throw new Error('Token refresh failed');
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      refreshToken: refreshToken, // Refresh token doesn't change
      expiresAt: Date.now() + (response.AuthenticationResult.ExpiresIn! * 1000),
    };
  }

  private cacheTokens(username: string, tokens: TokenSet) {
    this.tokens.set(username, tokens);
  }

  /**
   * Clear all cached tokens
   */
  clearCache() {
    this.tokens.clear();
  }
}

// Singleton instance
export const tokenManager = new CognitoTokenManager();
```

#### API Test Examples

```typescript
// e2e/api/student-api.spec.ts
import { test, expect } from '@playwright/test';
import { tokenManager } from '../utils/cognito-token-manager';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.learnermax.com';
const TEST_USERNAME = process.env.TEST_USER_USERNAME || 'test-student@learnermax.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Student API - Authenticated Endpoints', () => {
  let accessToken: string;

  test.beforeAll(async () => {
    // Get valid access token once for all tests
    accessToken = await tokenManager.getAccessToken(TEST_USERNAME, TEST_PASSWORD);
  });

  test('GET /api/students/:userId - should retrieve student profile', async ({ request }) => {
    // Extract userId from ID token
    const idToken = await tokenManager.getIdToken(TEST_USERNAME, TEST_PASSWORD);
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    const userId = payload.sub;

    const response = await request.get(`${API_BASE_URL}/api/students/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);

    const student = await response.json();
    expect(student).toMatchObject({
      userId: userId,
      email: TEST_USERNAME,
      name: expect.any(String),
      enrolledCourses: expect.any(Array),
    });
  });

  test('PATCH /api/students/:userId - should update student profile', async ({ request }) => {
    const idToken = await tokenManager.getIdToken(TEST_USERNAME, TEST_PASSWORD);
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    const userId = payload.sub;

    const response = await request.patch(`${API_BASE_URL}/api/students/${userId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Updated Test User',
      },
    });

    expect(response.status()).toBe(200);

    const updatedStudent = await response.json();
    expect(updatedStudent.name).toBe('Updated Test User');
  });

  test('should reject request with invalid token', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/students/some-user-id`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('should reject request without Authorization header', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/students/some-user-id`);

    expect(response.status()).toBe(401);
  });
});
```

---

## 3. Test User Management Strategy

### Approach: Pre-Created Confirmed Users

**Why this approach**:
- ✅ No email verification required (instant availability)
- ✅ Predictable test environment
- ✅ No cleanup overhead (users persist across test runs)
- ✅ Faster test execution

**Alternative**: Dynamic user creation with cleanup (for isolated tests)

### Pre-Created Users Setup

#### Setup Script

```typescript
// scripts/create-test-users.ts
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDeleteUserCommand,
  ListUsersCommand
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: "us-east-1" });

const TEST_USERS = [
  {
    username: 'test-student@learnermax.com',
    password: 'TestStudent123!',
    email: 'test-student@learnermax.com',
    name: 'Test Student',
    role: 'student'
  },
  {
    username: 'test-student-unverified@learnermax.com',
    password: 'TestStudent123!',
    email: 'test-student-unverified@learnermax.com',
    name: 'Test Student Unverified',
    role: 'student',
    emailVerified: false // For testing email verification flow
  }
];

async function createTestUsers() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }

  for (const user of TEST_USERS) {
    try {
      console.log(`Creating test user: ${user.username}`);

      // Step 1: Create user
      await client.send(new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: user.username,
        UserAttributes: [
          { Name: 'email', Value: user.email },
          { Name: 'email_verified', Value: String(user.emailVerified !== false) },
          { Name: 'name', Value: user.name },
        ],
        MessageAction: 'SUPPRESS', // Don't send invitation email
        TemporaryPassword: 'TempPassword123!' // Will be replaced
      }));

      // Step 2: Set permanent password (auto-confirms user)
      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: user.username,
        Password: user.password,
        Permanent: true, // User status becomes CONFIRMED
      }));

      console.log(`✅ Created: ${user.username}`);

    } catch (error: any) {
      if (error.name === 'UsernameExistsException') {
        console.log(`⚠️  User already exists: ${user.username}`);
      } else {
        console.error(`❌ Failed to create ${user.username}:`, error.message);
      }
    }
  }
}

async function deleteTestUsers() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }

  for (const user of TEST_USERS) {
    try {
      await client.send(new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: user.username,
      }));
      console.log(`🗑️  Deleted: ${user.username}`);
    } catch (error: any) {
      console.error(`❌ Failed to delete ${user.username}:`, error.message);
    }
  }
}

async function listTestUsers() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required');
  }

  const response = await client.send(new ListUsersCommand({
    UserPoolId: userPoolId,
    Filter: 'email ^= "test-"', // Only test users
  }));

  console.log('Test Users:');
  response.Users?.forEach(user => {
    const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
    const emailVerified = user.Attributes?.find(attr => attr.Name === 'email_verified')?.Value;
    const status = user.UserStatus;

    console.log(`  - ${email} (${status}, verified: ${emailVerified})`);
  });
}

// CLI usage
const command = process.argv[2];

if (command === 'create') {
  createTestUsers();
} else if (command === 'delete') {
  deleteTestUsers();
} else if (command === 'list') {
  listTestUsers();
} else {
  console.log('Usage: npm run test:users <create|delete|list>');
}
```

#### Package.json Scripts

```json
{
  "scripts": {
    "test:users:create": "tsx scripts/create-test-users.ts create",
    "test:users:delete": "tsx scripts/create-test-users.ts delete",
    "test:users:list": "tsx scripts/create-test-users.ts list"
  }
}
```

#### Environment Variables

```bash
# .env.test
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
AWS_REGION=us-east-1
TEST_USER_USERNAME=test-student@learnermax.com
TEST_USER_PASSWORD=TestStudent123!
API_BASE_URL=https://preview.api.learnermax.com
FRONTEND_URL=https://preview.learnermax.com
```

---

## 4. Test Environment Setup

### Separate User Pools per Environment

**Infrastructure (SAM Template)**:

```yaml
# backend/template.yaml
Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, preview, prod]

Resources:
  # Preview/Test User Pool (separate from production)
  TestUserPool:
    Type: AWS::Cognito::UserPool
    Condition: IsPreviewOrDev
    Properties:
      UserPoolName: !Sub learnermax-test-${Environment}
      AutoVerifiedAttributes: []  # No auto-verification for tests
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireLowercase: true
          RequireUppercase: true
          RequireNumbers: true
          RequireSymbols: true
      AdminCreateUserConfig:
        AllowAdminCreateUserOnly: false
      EmailConfiguration:
        EmailSendingAccount: DEVELOPER  # Developer mode (no SES needed)
      UserPoolTags:
        Environment: !Ref Environment
        Purpose: testing

  TestUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Condition: IsPreviewOrDev
    Properties:
      ClientName: !Sub learnermax-test-client-${Environment}
      UserPoolId: !Ref TestUserPool
      GenerateSecret: false
      ExplicitAuthFlows:
        - ALLOW_ADMIN_USER_PASSWORD_AUTH  # Enable for API testing
        - ALLOW_USER_PASSWORD_AUTH
        - ALLOW_USER_SRP_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
      SupportedIdentityProviders:
        - COGNITO
        - Google  # If Google OAuth configured
      CallbackURLs:
        - !Sub https://preview-${Environment}.learnermax.com/api/auth/callback/cognito
        - http://localhost:3000/api/auth/callback/cognito
      LogoutURLs:
        - !Sub https://preview-${Environment}.learnermax.com
        - http://localhost:3000
      AllowedOAuthFlows:
        - code
      AllowedOAuthScopes:
        - openid
        - email
        - profile

  # Production User Pool (strict settings)
  ProdUserPool:
    Type: AWS::Cognito::UserPool
    Condition: IsProd
    Properties:
      UserPoolName: learnermax-prod
      AutoVerifiedAttributes:
        - email
      # ... production settings

Conditions:
  IsPreviewOrDev: !Not [!Equals [!Ref Environment, prod]]
  IsProd: !Equals [!Ref Environment, prod]

Outputs:
  UserPoolId:
    Value: !If [IsProd, !Ref ProdUserPool, !Ref TestUserPool]
  UserPoolClientId:
    Value: !If [IsProd, !Ref ProdUserPoolClient, !Ref TestUserPoolClient]
```


## 6. Best Practices Summary

### ✅ Do

1. **Use programmatic authentication** for UI tests (not Hosted UI)
2. **Pre-create confirmed test users** with `AdminCreateUser` + `AdminSetUserPassword`
3. **Cache JWT tokens** in test suites to avoid rate limits
4. **Use separate User Pools** for test/preview environments
5. **Set `email_verified: true`** when creating test users
6. **Implement token refresh** for long-running test suites
7. **Store credentials in environment variables** (never in code)
8. **Clean up dynamic users** in teardown hooks (if using dynamic creation)

### ❌ Don't

1. **Don't test Cognito Hosted UI directly** (SSL cert issues, flaky)
2. **Don't use production User Pool** for testing
3. **Don't forget to set `MessageAction: SUPPRESS`** when creating test users
4. **Don't hardcode JWT tokens** (they expire)
5. **Don't use SRP authentication** in tests (overcomplicated)
6. **Don't skip token validation** in API tests
7. **Don't leave test users** in production User Pool

---

## 7. Implementation Checklist

### Infrastructure
- [ ] Create separate Cognito User Pool for preview/test environment
- [ ] Configure User Pool Client with `ALLOW_ADMIN_USER_PASSWORD_AUTH`
- [ ] Set up Google OAuth for test User Pool (using Secrets Manager)
- [ ] Configure callback URLs for preview environment

### Test User Management
- [ ] Create `scripts/create-test-users.ts` script
- [ ] Define test user profiles (verified, unverified, different roles)
- [ ] Add package.json scripts for user management

### E2E Setup
- [ ] Create `e2e/global-setup.ts` for Playwright authentication
- [ ] Implement `CognitoTokenManager` utility for API tests
- [ ] Configure Playwright to use storage state
- [ ] Set up CI/CD workflow with E2E tests

### Test Suites
- [ ] Write UI E2E tests for authenticated flows
- [ ] Write API E2E tests with JWT authentication
- [ ] Test protected routes (authenticated + unauthenticated)
- [ ] Test student onboarding flow end-to-end
- [ ] Test email verification flow (with unverified test user)

### Environment Variables
- [ ] Add `.env.test` with Cognito credentials
- [ ] Document environment variable requirements

---

## Conclusion

This strategy prioritizes **reliability and speed** by using programmatic authentication instead of UI-based flows. Pre-created confirmed users eliminate email verification delays, while token caching prevents rate limiting.

**Key takeaway**: Avoid testing Cognito Hosted UI directly. Use AWS SDK for authentication in both UI and API tests, mimicking production JWT tokens for realistic E2E validation.
