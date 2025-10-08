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
          accessToken: userWithTokens.accessToken,
          idToken: userWithTokens.idToken,
          refreshToken: userWithTokens.refreshToken,
          userId: user.id,
        };
      }

      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
        },
        accessToken: token.accessToken as string,
        idToken: token.idToken as string,
      };
    },
  },
  providers: [], // Providers will be added in auth.ts
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
