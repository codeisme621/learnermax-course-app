import { NextResponse } from 'next/server';
import { requireSession } from '@/features/accounts';
import { markPremiumInterest } from '@/features/students';
import { ValidationError } from '@/platform/errors';
import { handle } from '@/platform/http';

export function POST(req: Request) {
  return handle(async () => {
    const { user } = await requireSession();
    const body = await req.json().catch(() => null);
    if (typeof body?.courseId !== 'string' || body.courseId.length === 0) {
      throw new ValidationError('Invalid request', [{ path: ['courseId'], message: 'courseId is required' }]);
    }
    return NextResponse.json(await markPremiumInterest(user.id));
  });
}
