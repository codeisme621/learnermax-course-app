import { NextResponse } from 'next/server';
import { getSession } from '@/features/accounts';
import { getCheckoutStatus } from '@/features/purchases';
import { handle } from '@/platform/http';

export function GET(_req: Request, ctx: RouteContext<'/api/checkout/sessions/[sessionId]/status'>) {
  return handle(async () => {
    const { sessionId } = await ctx.params;
    const session = await getSession();
    return NextResponse.json(await getCheckoutStatus(sessionId, session?.user.id ?? null), {
      headers: { 'Cache-Control': 'no-store' },
    });
  });
}
