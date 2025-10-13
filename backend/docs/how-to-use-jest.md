# How to Use Jest with ESM in This Project

This guide covers Jest testing patterns for our ESM-based TypeScript backend.

## ESM Configuration

Our project uses ECMAScript Modules (ESM). Key configuration in `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest"
  },
  "jest": {
    "preset": "ts-jest/presets/default-esm",
    "extensionsToTreatAsEsm": [".ts"],
    "moduleNameMapper": {
      "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    "transform": {
      "^.+\\.tsx?$": ["ts-jest", { "useESM": true }]
    }
  }
}
```

## Importing Jest Globals

In ESM, you MUST explicitly import Jest globals:

```typescript
import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
```

## Mocking Strategies

### 1. Spying on Methods (Recommended for Services/Repositories)

Use `jest.spyOn()` inside `beforeAll()` or `beforeEach()` hooks:

```typescript
import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import { studentRepository } from '../student.repository.js';
import { StudentService } from '../student.service.js';

describe('StudentService', () => {
  let service: StudentService;
  let mockGet: jest.SpyInstance;

  beforeAll(() => {
    // Create spy inside beforeAll, not at module level
    mockGet = jest.spyOn(studentRepository, 'get');
  });

  beforeEach(() => {
    service = new StudentService();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGet.mockRestore();
  });

  it('should return student', async () => {
    mockGet.mockResolvedValue({ userId: '123', email: 'test@test.com' });
    const result = await service.getStudent('123');
    expect(mockGet).toHaveBeenCalledWith('123');
  });
});
```

### 2. Mocking Entire Modules (Use Sparingly)

For ESM, use `jest.unstable_mockModule()` with dynamic imports:

```typescript
import { jest } from '@jest/globals';

// Mock BEFORE importing the module that uses it
jest.unstable_mockModule('../auth-utils.js', () => ({
  getUserIdFromContext: jest.fn(),
}));

// Dynamic import AFTER mocking
const { getUserIdFromContext } = await import('../auth-utils.js');
const { default: routes } = await import('../routes.js');
```

**Note**: This approach is complex and should be avoided when possible.

### 3. Testing Express Routes (Recommended Pattern)

Instead of mocking auth utilities, provide proper request context:

```typescript
import { jest, describe, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import studentRoutes from '../student.routes.js';
import { studentService } from '../student.service.js';

// Helper to create auth header
function createAuthHeader(userId: string | null): Record<string, string> {
  if (!userId) return {};
  return {
    'x-amzn-request-context': JSON.stringify({
      authorizer: {
        claims: {
          sub: userId,
          email: 'test@example.com',
        },
      },
    }),
  };
}

describe('Student Routes', () => {
  let app: express.Application;
  let mockGetStudent: jest.SpyInstance;

  beforeAll(() => {
    mockGetStudent = jest.spyOn(studentService, 'getStudent');
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/students', studentRoutes);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGetStudent.mockRestore();
  });

  it('should return 401 without auth', async () => {
    const response = await request(app).get('/api/students/me');
    expect(response.status).toBe(401);
  });

  it('should return student with auth', async () => {
    mockGetStudent.mockResolvedValue({ userId: 'user-123', email: 'test@test.com' });

    const response = await request(app)
      .get('/api/students/me')
      .set(createAuthHeader('user-123'));

    expect(response.status).toBe(200);
    expect(mockGetStudent).toHaveBeenCalledWith('user-123');
  });
});
```

## Common Patterns

### Mocking AWS SDK

Use `aws-sdk-client-mock`:

```typescript
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

it('should put item', async () => {
  ddbMock.on(PutCommand).resolves({});
  // ... test code
  expect(ddbMock.calls()).toHaveLength(1);
});
```

### Mocking Resolved/Rejected Promises

```typescript
mockMethod.mockResolvedValue(data);        // Resolves with data
mockMethod.mockRejectedValue(new Error()); // Rejects with error
```

### Asserting Mock Calls

```typescript
expect(mockMethod).toHaveBeenCalled();
expect(mockMethod).toHaveBeenCalledTimes(2);
expect(mockMethod).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockMethod).not.toHaveBeenCalled();
```

### Clearing Mocks

```typescript
jest.clearAllMocks();      // Clear call history for all mocks
mockMethod.mockClear();    // Clear call history for specific mock
mockMethod.mockRestore();  // Restore original implementation
mockMethod.mockReset();    // Reset implementation and clear calls
```

## Best Practices

1. **Always import jest globals** - Don't rely on global injection in ESM
2. **Spy in lifecycle hooks** - Never call `jest.spyOn()` at module level
3. **Clean up after tests** - Use `afterAll()` to restore mocks
4. **Clear between tests** - Use `beforeEach(() => jest.clearAllMocks())`
5. **Avoid mocking when possible** - Test with real implementations when feasible
6. **Use type assertions** - `jest.SpyInstance` for proper TypeScript support
7. **Test behavior, not implementation** - Focus on inputs/outputs, not internal calls

## Troubleshooting

### "jest is not defined"
Import jest from '@jest/globals':
```typescript
import { jest } from '@jest/globals';
```

### "Cannot assign to read only property"
ES module exports are read-only. Don't spy at module level. Use `beforeAll()`:
```typescript
beforeAll(() => {
  mockFn = jest.spyOn(module, 'fn');
});
```

### "Module not found"
Remember to include `.js` extensions in imports even though files are `.ts`:
```typescript
import { something } from './module.js';  // ✓ Correct
import { something } from './module';      // ✗ Wrong
```

### Mock not working
Ensure mocks are created before the code under test imports dependencies:
- For unit tests with spies: No issue
- For module mocks: Use `jest.unstable_mockModule()` before any imports

## References

- [Jest ES6 Class Mocks](https://jestjs.io/docs/es6-class-mocks)
- [Jest ECMAScript Modules](https://jestjs.io/docs/ecmascript-modules)
- [Jest Bypassing Module Mocks](https://jestjs.io/docs/bypassing-module-mocks)
