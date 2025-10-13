import { describe, it, expect } from '@jest/globals';
import { getUserIdFromContext, getUserClaimsFromContext } from '../auth-utils.js';
import type { Request } from 'express';

// Helper to create mock request
function createMockRequest(headers: Record<string, string>): Request {
  return {
    headers,
  } as Request;
}

describe('auth-utils', () => {
  describe('getUserIdFromContext', () => {
    it('should extract userId from v1 context (Cognito User Pool Authorizer)', () => {
      const v1Context = {
        authorizer: {
          claims: {
            sub: 'user-v1-123',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBe('user-v1-123');
    });

    it('should extract userId from v2 context (JWT Authorizer)', () => {
      const v2Context = {
        authorizer: {
          jwt: {
            claims: {
              sub: 'user-v2-456',
              email: 'jwt@example.com',
            },
            scopes: ['read:profile'],
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBe('user-v2-456');
    });

    it('should return null if header is missing', () => {
      const req = createMockRequest({});

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if header is not a string', () => {
      const req = {
        headers: {
          'x-amzn-request-context': ['array', 'value'],
        },
      } as unknown as Request;

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if header contains invalid JSON', () => {
      const req = createMockRequest({
        'x-amzn-request-context': 'invalid-json{',
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if authorizer is missing in v1 context', () => {
      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify({}),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if claims are missing in v1 context', () => {
      const v1Context = {
        authorizer: {},
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if sub is missing in v1 claims', () => {
      const v1Context = {
        authorizer: {
          claims: {
            email: 'test@example.com',
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if jwt is missing in v2 context', () => {
      const v2Context = {
        authorizer: {
          someOtherField: 'value',
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if claims are missing in v2 jwt', () => {
      const v2Context = {
        authorizer: {
          jwt: {
            scopes: ['read:profile'],
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should return null if sub is missing in v2 claims', () => {
      const v2Context = {
        authorizer: {
          jwt: {
            claims: {
              email: 'jwt@example.com',
            },
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBeNull();
    });

    it('should handle context with extra fields', () => {
      const v1Context = {
        authorizer: {
          claims: {
            sub: 'user-extra-123',
            email: 'extra@example.com',
            'custom:role': 'admin',
            iat: 1234567890,
          },
          principalId: 'principal-123',
        },
        requestId: 'request-123',
        stage: 'prod',
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const userId = getUserIdFromContext(req);
      expect(userId).toBe('user-extra-123');
    });
  });

  describe('getUserClaimsFromContext', () => {
    it('should extract full claims from v1 context', () => {
      const v1Context = {
        authorizer: {
          claims: {
            sub: 'user-claims-123',
            email: 'claims@example.com',
            name: 'Claims User',
            'cognito:username': 'claimsuser',
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toEqual({
        sub: 'user-claims-123',
        email: 'claims@example.com',
        name: 'Claims User',
        'cognito:username': 'claimsuser',
      });
    });

    it('should extract full claims from v2 context', () => {
      const v2Context = {
        authorizer: {
          jwt: {
            claims: {
              sub: 'user-jwt-claims-456',
              email: 'jwtclaims@example.com',
              'custom:role': 'user',
            },
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toEqual({
        sub: 'user-jwt-claims-456',
        email: 'jwtclaims@example.com',
        'custom:role': 'user',
      });
    });

    it('should return null if header is missing', () => {
      const req = createMockRequest({});

      const claims = getUserClaimsFromContext(req);
      expect(claims).toBeNull();
    });

    it('should return null if header is not a string', () => {
      const req = {
        headers: {
          'x-amzn-request-context': 123,
        },
      } as unknown as Request;

      const claims = getUserClaimsFromContext(req);
      expect(claims).toBeNull();
    });

    it('should return null if header contains invalid JSON', () => {
      const req = createMockRequest({
        'x-amzn-request-context': 'not valid json',
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toBeNull();
    });

    it('should return null if authorizer is missing', () => {
      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify({ requestId: '123' }),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toBeNull();
    });

    it('should return null if claims are missing in v1 context', () => {
      const v1Context = {
        authorizer: {
          principalId: 'principal-123',
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toBeNull();
    });

    it('should return null if jwt is missing in v2 context', () => {
      const v2Context = {
        authorizer: {
          principalId: 'principal-456',
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toBeNull();
    });

    it('should return null if claims are missing in v2 jwt', () => {
      const v2Context = {
        authorizer: {
          jwt: {
            scopes: ['read:profile'],
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toBeNull();
    });

    it('should preserve all claim properties including custom ones', () => {
      const v1Context = {
        authorizer: {
          claims: {
            sub: 'user-custom-789',
            email: 'custom@example.com',
            'custom:role': 'admin',
            'custom:department': 'engineering',
            iat: 1234567890,
            exp: 1234571490,
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toEqual({
        sub: 'user-custom-789',
        email: 'custom@example.com',
        'custom:role': 'admin',
        'custom:department': 'engineering',
        iat: 1234567890,
        exp: 1234571490,
      });
    });

    it('should handle empty claims object from v1', () => {
      const v1Context = {
        authorizer: {
          claims: {},
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v1Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toEqual({});
    });

    it('should handle empty claims object from v2', () => {
      const v2Context = {
        authorizer: {
          jwt: {
            claims: {},
          },
        },
      };

      const req = createMockRequest({
        'x-amzn-request-context': JSON.stringify(v2Context),
      });

      const claims = getUserClaimsFromContext(req);
      expect(claims).toEqual({});
    });
  });
});
