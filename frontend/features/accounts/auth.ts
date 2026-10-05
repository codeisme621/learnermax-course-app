import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, magicLink, oAuthProxy } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/platform/db/client';
import * as schema from '@/platform/db/schema';
import { resolveAppUrl, resolveTrustedOrigins } from '@/platform/app-url';
import { sendEmail } from '@/platform/email';
import { ensureStudentProfile } from '@/features/students';
import { activationEmail, passwordResetEmail } from './accounts.emails';

const ACTIVATION_LINK_TTL_SECONDS = 24 * 60 * 60;

/**
 * Google only accepts exact redirect URLs, and preview URLs are dynamic. With OAUTH_PROXY_SECRET set (preview and
 * production, same value), a preview's Google sign-in goes through production's registered callback and the
 * encrypted profile is handed back to the preview, which signs the user in against its own database.
 * Local development (unset) talks to Google directly via localhost.
 */
const oauthProxy = process.env.OAUTH_PROXY_SECRET
  ? [oAuthProxy({ productionURL: process.env.AUTH_PRODUCTION_URL ?? 'https://www.learnwithrico.com', secret: process.env.OAUTH_PROXY_SECRET })]
  : [];

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined;

/** Exported so tests can run Better Auth's real flows against this exact configuration. */
export const authOptions = {
  baseURL: resolveAppUrl(),
  trustedOrigins: resolveTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),

  // Accounts are created only by a confirmed purchase (or by Google sign-in, which grants no access).
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Not activated yet: a reset would set a password but still not prove the email.
      // Send the activation link instead, which does both.
      if (!user.emailVerified) {
        await sendActivationLink(user.email);
        return;
      }
      await sendEmail(passwordResetEmail(user.email, url));
    },
  },

  socialProviders: google,

  account: {
    accountLinking: {
      // A Google sign-in links to an existing account only when BOTH emails are proven: Google reports
      // email_verified and the local account is activated. Google is deliberately NOT a trusted provider —
      // that would link even when Google says the email is unverified. Never across different emails.
      enabled: true,
      allowDifferentEmails: false,
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureStudentProfile(user.id);
        },
      },
    },
  },

  // Endpoints we only ever call server-side, or never: the HTTP routes 404, auth.api.* still works.
  disabledPaths: [
    '/sign-in/magic-link',
    '/admin/ban-user',
    '/admin/create-user',
    '/admin/get-user',
    '/admin/has-permission',
    '/admin/impersonate-user',
    '/admin/list-user-sessions',
    '/admin/list-users',
    '/admin/remove-user',
    '/admin/revoke-user-session',
    '/admin/revoke-user-sessions',
    '/admin/set-role',
    '/admin/set-user-password',
    '/admin/stop-impersonating',
    '/admin/unban-user',
    '/admin/update-user',
  ],

  plugins: [
    // Only for auth.api.createUser: provisioning a passwordless, unverified buyer account.
    admin(),
    // Only for activation emails we choose to send; verifying the link proves the email and signs in.
    magicLink({
      disableSignUp: true,
      expiresIn: ACTIVATION_LINK_TTL_SECONDS,
      storeToken: 'hashed',
      sendMagicLink: async ({ email, url }) => {
        await sendEmail(activationEmail(email, url));
      },
    }),
    ...oauthProxy,
    nextCookies(), // must stay last
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);

export type Session = typeof auth.$Infer.Session;

/** Email a single-use activation link (verifies the email and signs in, then /activate sets a password). */
export async function sendActivationLink(email: string): Promise<void> {
  await auth.api.signInMagicLink({
    body: { email, callbackURL: '/activate', errorCallbackURL: '/signin?activation=expired' },
    headers: new Headers(),
  });
}
