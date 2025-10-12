import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from '@/auth.config';
import { signInWithCognito } from './cognito-auth';

interface CognitoProfile {
  'cognito:username': string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
}

// Get Cognito domain from environment
const cognitoDomain = process.env.COGNITO_USER_POOL_DOMAIN;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    // Cognito OAuth Provider with Google Federation
    {
      id: 'cognito',
      name: 'Cognito',
      type: 'oidc',
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: '', // Not needed for public clients
      client: {
        token_endpoint_auth_method: 'none',
      },
      issuer: process.env.COGNITO_ISSUER_URL,
      checks: ['state', 'nonce'],
      authorization: {
        url: `https://${cognitoDomain}/oauth2/authorize`,
        params: {
          response_type: 'code',
          client_id: process.env.COGNITO_CLIENT_ID,
          identity_provider: 'Google',
          scope: 'openid email profile',
        },
      },
      token: {
        url: `https://${cognitoDomain}/oauth2/token`,
      },
      profile(profile: CognitoProfile, tokens: { access_token?: string; id_token?: string; refresh_token?: string }) {
        return {
          id: profile['cognito:username'], // Cognito username
          email: profile.email,
          name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || profile.email,
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token,
        };
      },
    },
    Credentials({
      id: 'cognito-credentials',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const cognitoUser = await signInWithCognito(
          credentials.email as string,
          credentials.password as string
        );

        if (!cognitoUser) {
          return null;
        }

        return {
          id: cognitoUser.id,
          email: cognitoUser.email,
          name: cognitoUser.username,
          accessToken: cognitoUser.accessToken,
          idToken: cognitoUser.idToken,
          refreshToken: cognitoUser.refreshToken,
        };
      },
    }),
  ],
});
