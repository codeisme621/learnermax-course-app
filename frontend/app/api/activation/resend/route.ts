import { NextResponse } from 'next/server';
import { requestActivation } from '@/features/accounts';
import { handle } from '@/platform/http';

/** POST { email } → always 202, whether or not the email has an account waiting for activation. */
export function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    if (typeof body?.email === 'string' && body.email.trim()) {
      await requestActivation(body.email);
    }
    return NextResponse.json({ accepted: true }, { status: 202 });
  });
}
