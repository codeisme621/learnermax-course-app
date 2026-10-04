import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/features/accounts';

export const { GET, POST } = toNextJsHandler(auth);
