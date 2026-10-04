import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/platform/db/client';
import * as schema from '@/platform/db/schema';

// Phase 1: enough configuration to generate the Better Auth tables.
// Providers, email senders and lock-down options are added in phase 2.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, disableSignUp: true, requireEmailVerification: true },
  plugins: [
    admin(),
    magicLink({
      disableSignUp: true,
      sendMagicLink: async () => {
        throw new Error('Activation email sending is not configured yet');
      },
    }),
    nextCookies(),
  ],
});
