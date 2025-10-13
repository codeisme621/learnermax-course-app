import type { Request } from 'express';

// Cognito JWT claims structure
interface CognitoJWTClaims {
  sub: string;
  email?: string;
  name?: string;
  'cognito:username'?: string;
  [key: string]: string | number | boolean | undefined;
}

// API Gateway v1 format - Cognito User Pool Authorizer
interface APIGatewayV1RequestContext {
  authorizer?: {
    claims?: CognitoJWTClaims;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// API Gateway v2 format - JWT Authorizer
interface APIGatewayV2RequestContext {
  authorizer?: {
    jwt?: {
      claims?: CognitoJWTClaims;
      scopes?: string[];
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Union type for both v1 and v2 contexts
type RequestContext = APIGatewayV1RequestContext | APIGatewayV2RequestContext;

/**
 * Type guard to check if context is v1 format
 */
function isV1Context(context: RequestContext): context is APIGatewayV1RequestContext {
  return 'authorizer' in context &&
         context.authorizer !== undefined &&
         'claims' in context.authorizer;
}

/**
 * Type guard to check if context is v2 format
 */
function isV2Context(context: RequestContext): context is APIGatewayV2RequestContext {
  return 'authorizer' in context &&
         context.authorizer !== undefined &&
         'jwt' in context.authorizer;
}

/**
 * Extract user ID from API Gateway authorizer context.
 * Lambda Web Adapter passes the context via x-amzn-request-context header.
 *
 * @param req Express request object
 * @returns User ID (Cognito sub claim) or null if not authenticated
 */
export function getUserIdFromContext(req: Request): string | null {
  try {
    const contextHeader = req.headers['x-amzn-request-context'];

    if (!contextHeader || typeof contextHeader !== 'string') {
      return null;
    }

    const requestContext = JSON.parse(contextHeader) as RequestContext;

    // Handle v1 format (Cognito User Pool Authorizer)
    if (isV1Context(requestContext)) {
      return requestContext.authorizer?.claims?.sub || null;
    }

    // Handle v2 format (JWT Authorizer)
    if (isV2Context(requestContext)) {
      return requestContext.authorizer?.jwt?.claims?.sub || null;
    }

    return null;
  } catch {
    // If header parsing fails, user is not authenticated
    return null;
  }
}

/**
 * Extract full user claims from API Gateway authorizer context.
 *
 * @param req Express request object
 * @returns User claims object or null if not authenticated
 */
export function getUserClaimsFromContext(req: Request): CognitoJWTClaims | null {
  try {
    const contextHeader = req.headers['x-amzn-request-context'];

    if (!contextHeader || typeof contextHeader !== 'string') {
      return null;
    }

    const requestContext = JSON.parse(contextHeader) as RequestContext;

    // Handle v1 format
    if (isV1Context(requestContext)) {
      return requestContext.authorizer?.claims || null;
    }

    // Handle v2 format
    if (isV2Context(requestContext)) {
      return requestContext.authorizer?.jwt?.claims || null;
    }

    return null;
  } catch {
    return null;
  }
}
