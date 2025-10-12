import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnAuthPage = nextUrl.pathname.startsWith('/signin') ||
                           nextUrl.pathname.startsWith('/signup') ||
                           nextUrl.pathname.startsWith('/verify-email') ||
                           nextUrl.pathname.startsWith('/forgot-password') ||
                           nextUrl.pathname.startsWith('/reset-password');

      // Redirect authenticated users away from auth pages to dashboard
      if (isOnAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      // Protect dashboard routes - redirect unauthenticated users to signin
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user && account) {
        interface UserWithTokens {
          accessToken?: string;
          idToken?: string;
          refreshToken?: string;
        }
        const userWithTokens = user as UserWithTokens;
        return {
          ...token,
          access_token: userWithTokens.accessToken || account.access_token,
          id_token: userWithTokens.idToken || account.id_token,
          refresh_token: userWithTokens.refreshToken || account.refresh_token,
          expires_at: account.expires_at ?? Math.floor(Date.now() / 1000 + 3600),
          userId: user.id,
        };
      }

      // Token still valid - return as is
      if (Date.now() < (token.expires_at as number) * 1000) {
        return token;
      }

      // Token expired - refresh it
      try {
        const cognitoDomain = process.env.COGNITO_USER_POOL_DOMAIN ||
          `learnermax-preview-853219709625.auth.${process.env.COGNITO_REGION || 'us-east-1'}.amazoncognito.com`;

        const response = await fetch(
          `https://${cognitoDomain}/oauth2/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.COGNITO_CLIENT_ID!,
              grant_type: 'refresh_token',
              refresh_token: token.refresh_token as string,
            }),
          }
        );

        const refreshedTokens = await response.json();

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        return {
          ...token,
          access_token: refreshedTokens.access_token,
          id_token: refreshedTokens.id_token,
          expires_at: Math.floor(Date.now() / 1000 + (refreshedTokens.expires_in ?? 3600)),
          refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
        };
      } catch (error) {
        console.error('Token refresh error:', error);
        return {
          ...token,
          error: 'RefreshTokenError',
        };
      }
    },
    async session({ session, token }) {
      // Check for refresh token errors
      if (token.error === 'RefreshTokenError') {
        return {
          ...session,
          error: 'RefreshTokenError',
        };
      }

      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
        },
        // Include tokens in session object (server-side only)
        // These are automatically filtered out when useSession() is called from client
        // Only available when auth() is called server-side
        access_token: token.access_token as string,
        id_token: token.id_token as string,
      };
    },
  },
  providers: [], // Providers will be added in auth.ts
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
