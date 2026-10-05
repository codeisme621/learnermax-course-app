'use client';

import { createAuthClient } from 'better-auth/react';

// Browser-side Better Auth calls (same origin): email sign-in, Google, sign-out, password reset.
export const authClient = createAuthClient();
