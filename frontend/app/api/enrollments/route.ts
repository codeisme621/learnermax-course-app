import { NextResponse } from 'next/server';
import { requireSession } from '@/features/accounts';
import { listEnrollments } from '@/features/enrollment';
import { handle } from '@/platform/http';

export function GET() {
  return handle(async () => {
    const { user } = await requireSession();
    return NextResponse.json(await listEnrollments(user.id));
  });
}
