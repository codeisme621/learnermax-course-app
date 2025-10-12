import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Extended session interface with Cognito tokens and user ID
   *
   * Note: access_token and id_token are only available server-side via auth()
   * They are NOT exposed to client via useSession()
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
    access_token?: string;  // Cognito access token (server-side only)
    id_token?: string;      // Cognito ID token (server-side only)
    error?: 'RefreshTokenError';  // Token refresh failure flag
  }
}

declare module '@auth/core/jwt' {
  /**
   * Extended JWT interface with Cognito tokens and refresh logic
   */
  interface JWT {
    access_token?: string;    // Cognito access token
    id_token?: string;        // Cognito ID token
    refresh_token?: string;   // Cognito refresh token (for rotation)
    expires_at?: number;      // Unix timestamp (seconds) when access token expires
    userId?: string;          // User ID from Cognito
    error?: 'RefreshTokenError';  // Token refresh failure flag
  }
}
