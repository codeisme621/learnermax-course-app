import { NextResponse } from 'next/server';
import { requireSession } from '@/features/accounts';
import { submitFeedback } from '@/features/feedback';
import { handle } from '@/platform/http';

export function POST(req: Request) {
  return handle(async () => {
    const { user } = await requireSession();
    const body = await req.json().catch(() => null);
    return NextResponse.json(await submitFeedback(user.id, body), { status: 201 });
  });
}
